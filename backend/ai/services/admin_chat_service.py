"""AI Admin Chat Service

Provides conversational interface for administrative queries and two-phase confirmed
database modifications.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ai.schemas.ai_schemas import AIChatRequest, AIChatResponse, ProposedActionDTO
from ai.services.action_confirmation import ProposedAction, pending_action_store
from ai.services.action_executor import action_executor
from ai.services.ollama_service import get_ollama_service
from app.models.auth import User
from app.models.disease import Disease, DiseaseSymptom
from app.models.enums import PathogenType
from app.models.symptom import Symptom
from app.models.translation import Translation

log = structlog.get_logger(__name__)


class AdminChatService:
    """AI-powered admin chat with two-phase confirmed database modifications."""

    def __init__(self) -> None:
        self.ollama = get_ollama_service()
        self.conversation_history: dict[str, list[dict[str, str]]] = {}

    async def handle_admin_chat(
        self,
        request: AIChatRequest,
        db: AsyncSession,
        current_user: User,
        user_role: str | None = None,
    ) -> AIChatResponse:
        """Process admin/expert chat message with two-phase confirmed database modification.

        Args:
            request: Chat request with message
            db: Database session
            current_user: Authenticated administrative user

        Returns:
            Response with message and optional proposed action awaiting confirmation.
        """
        conversation_id = request.conversation_id or "default"
        msg_clean = request.message.strip()
        msg_lower = msg_clean.lower()

        log.info(
            "admin_chat.received",
            user_id=current_user.id,
            role=current_user.role.name if current_user.role else "unknown",
            conversation_id=conversation_id,
            locale=request.locale,
        )

        if conversation_id not in self.conversation_history:
            self.conversation_history[conversation_id] = []
        history = self.conversation_history[conversation_id]

        # -------------------------------------------------------------------
        # Step 1: Check for conversational confirmation or cancellation
        # -------------------------------------------------------------------
        pending = await pending_action_store.get_pending_for_conversation(
            db=db,
            conversation_id=conversation_id,
            user_id=current_user.id,
        )

        has_negation = any(
            neg in msg_lower
            for neg in ["don't", "dont", "do not", "not ", "never ", "កុំ", "មិន"]
        )
        is_cancellation = (
            any(t in msg_lower for t in ["cancel", "abort", "reject", "nevermind", "បោះបង់", "ឈប់"])
            or msg_lower in {"no", "ទេ"}
            or (
                pending is not None
                and has_negation
                and any(t in msg_lower for t in ["confirm", "delete", "proceed", "លុប", "អនុវត្ត"])
            )
        )

        if pending and is_cancellation:
            # User cancelled the pending action conversationally
            await pending_action_store.cancel_action(
                db=db,
                action_id=pending.action_id,
                current_user=current_user,
                confirmation_token=None,
            )
            cancel_msg = self._translate(
                f"🚫 Action '{pending.summary}' was cancelled. No database changes were made.",
                f"🚫 សកម្មភាព '{pending.summary}' ត្រូវបានបោះបង់។ គ្មានការកែប្រែទិន្នន័យឡើយ។",
                request.locale,
            )
            history.append({"role": "user", "content": request.message})
            history.append({"role": "assistant", "content": cancel_msg})

            return AIChatResponse(
                message=cancel_msg,
                conversation_id=conversation_id,
                needs_diagnosis=False,
                metadata={"cancelled_action_id": pending.action_id},
            )

        if pending:
            is_destructive = pending.action_type in ("delete_disease", "delete_symptom")

            # Casual affirmations ("ok", "yes", "agree", "do it") must NEVER trigger mutations
            is_casual_reply = msg_lower in {
                "yes",
                "ok",
                "okay",
                "agree",
                "do it",
                "sure",
                "sounds good",
                "go ahead",
                "បាទ",
                "ចាស",
                "យល់ព្រម",
            }

            if is_destructive:
                # Destructive actions strictly require confirmation containing explicit keywords
                is_confirmed = (
                    not has_negation
                    and not is_casual_reply
                    and (
                        any(
                            t in msg_lower
                            for t in ["confirm delete", "delete", "លុប", "យល់ព្រមលុប"]
                        )
                        or msg_lower in {"confirm", "អនុវត្ត"}
                    )
                )
            else:
                # Non-destructive proposals require explicit confirmation keywords
                is_confirmed = (
                    not has_negation
                    and not is_casual_reply
                    and (
                        any(
                            t in msg_lower
                            for t in ["confirm", "proceed", "អនុវត្ត", "confirm action"]
                        )
                        or msg_lower in {"yes confirm", "confirm yes"}
                    )
                )

            if is_confirmed:
                try:
                    consumed = await pending_action_store.validate_and_consume_conversational(
                        db=db,
                        action_id=pending.action_id,
                        conversation_id=conversation_id,
                        current_user=current_user,
                    )
                    try:
                        exec_msg, actions = await action_executor.execute_action(
                            action=consumed,
                            db=db,
                            current_user=current_user,
                            locale=request.locale,
                        )
                    except Exception as exec_err:
                        await db.rollback()
                        await pending_action_store.mark_failed(
                            db, consumed.action_id, str(exec_err)
                        )
                        raise

                    history.append({"role": "user", "content": request.message})
                    history.append({"role": "assistant", "content": exec_msg})

                    return AIChatResponse(
                        message=exec_msg,
                        conversation_id=conversation_id,
                        needs_diagnosis=False,
                        actions_taken=actions,
                        metadata={"confirmed_action_id": consumed.action_id},
                    )
                except Exception as exc:
                    err_msg = self._translate(
                        f"❌ Execution failed: {exc!s}",
                        f"❌ ការអនុវត្តបានបរាជ័យ: {exc!s}",
                        request.locale,
                    )
                    return AIChatResponse(
                        message=err_msg,
                        conversation_id=conversation_id,
                        needs_diagnosis=False,
                    )
            elif is_casual_reply or (
                is_destructive and any(t in msg_lower for t in ["proceed", "yes"])
            ):
                # Guard prompt: notify the user that an action is pending explicit confirmation.
                # Omit proposed_action here so the client retains the original card + token.
                guard_msg = (
                    self._translate(
                        f"⚠️ **Destructive Action Pending**: You have an unconfirmed request "
                        f"to delete '{pending.summary}'. "
                        "To execute this permanent deletion, please click **Confirm Action** "
                        "or reply **confirm delete**.",
                        f"⚠️ **សកម្មភាពលុបកំពុងរង់ចាំ**: អ្នកមានសំណើស្នើសុំលុប '{pending.summary}'។ "
                        "ដើម្បីអនុវត្តការលុបជាអចិន្ត្រៃយ៍ សូមចុច **Confirm Action** "
                        "ឬឆ្លើយតប **confirm delete**។",
                        request.locale,
                    )
                    if is_destructive
                    else self._translate(
                        f"Action '{pending.summary}' is awaiting your confirmation. "
                        "Please click **Confirm Action** or reply **confirm** to execute.",
                        f"សកម្មភាព '{pending.summary}' កំពុងរង់ចាំការបញ្ជាក់របស់អ្នក។ "
                        "សូមចុច **Confirm Action** ឬឆ្លើយតប **confirm** ដើម្បីអនុវត្ត។",
                        request.locale,
                    )
                )
                return AIChatResponse(
                    message=guard_msg,
                    conversation_id=conversation_id,
                    needs_diagnosis=False,
                    proposed_action=None,
                    metadata={"pending_action_id": pending.action_id},
                )

        # -------------------------------------------------------------------
        # Step 2: Analyze intent
        # -------------------------------------------------------------------
        intent = await self._analyze_intent(request.message, request.locale)
        action_name = intent.get("action", "chat")
        data = intent.get("data", {})

        response_message = ""
        actions_taken: list[dict[str, Any]] = []
        proposed_action_dto: ProposedActionDTO | None = None

        if action_name == "list_diseases":
            response_message, actions = await self._list_diseases(db, request.locale)
            actions_taken.extend(actions)

        elif action_name == "list_symptoms":
            response_message, actions = await self._list_symptoms(db, request.locale)
            actions_taken.extend(actions)

        elif action_name == "search":
            response_message, actions = await self._search_data(intent.get("query", ""), db, request.locale)
            actions_taken.extend(actions)

        elif action_name == "help":
            response_message = await self._get_help_message(request.locale)

        # -------------------------------------------------------------------
        # Step 3: Propose Mutating Actions (Never execute immediately)
        # -------------------------------------------------------------------
        elif action_name == "create_disease":
            response_message, proposal = await self._propose_create_disease(
                data, db, current_user, conversation_id, request.locale
            )
            if proposal:
                proposed_action_dto = proposal.to_dto()
                actions_taken.append({"action": "proposed_create_disease", "action_id": proposal.action_id})

        elif action_name == "update_disease":
            response_message, proposal = await self._propose_update_disease(
                data, db, current_user, conversation_id, request.locale
            )
            if proposal:
                proposed_action_dto = proposal.to_dto()
                actions_taken.append({"action": "proposed_update_disease", "action_id": proposal.action_id})

        elif action_name == "delete_disease":
            response_message, proposal = await self._propose_delete_disease(
                data, db, current_user, conversation_id, request.locale
            )
            if proposal:
                proposed_action_dto = proposal.to_dto()
                actions_taken.append({"action": "proposed_delete_disease", "action_id": proposal.action_id})

        elif action_name == "create_symptom":
            response_message, proposal = await self._propose_create_symptom(
                data, db, current_user, conversation_id, request.locale
            )
            if proposal:
                proposed_action_dto = proposal.to_dto()
                actions_taken.append({"action": "proposed_create_symptom", "action_id": proposal.action_id})

        elif action_name == "update_symptom":
            response_message, proposal = await self._propose_update_symptom(
                data, db, current_user, conversation_id, request.locale
            )
            if proposal:
                proposed_action_dto = proposal.to_dto()
                actions_taken.append({"action": "proposed_update_symptom", "action_id": proposal.action_id})

        elif action_name == "delete_symptom":
            response_message, proposal = await self._propose_delete_symptom(
                data, db, current_user, conversation_id, request.locale
            )
            if proposal:
                proposed_action_dto = proposal.to_dto()
                actions_taken.append({"action": "proposed_delete_symptom", "action_id": proposal.action_id})

        else:
            # General conversation
            response_message = await self._general_chat(request.message, history, request.locale)

        # Update conversational history
        history.append({"role": "user", "content": request.message})
        history.append({"role": "assistant", "content": response_message})
        if len(history) > 20:
            self.conversation_history[conversation_id] = history[-20:]

        return AIChatResponse(
            message=response_message,
            conversation_id=conversation_id,
            needs_diagnosis=False,
            extracted_symptoms=None,
            actions_taken=actions_taken,
            proposed_action=proposed_action_dto,
        )

    # =========================================================================
    # Helpers for Finding Entities
    # =========================================================================

    async def _find_disease(self, identifier: Any, db: AsyncSession) -> Disease | None:
        """Find a disease by ID, slug, or translated name."""
        if not identifier:
            return None
        raw_str = str(identifier).strip()

        # Check numeric ID
        if raw_str.isdigit():
            res = await db.execute(select(Disease).where(Disease.id == int(raw_str)))
            d = res.scalar_one_or_none()
            if d:
                return d

        # Check exact slug
        slug_query = raw_str.lower().replace(" ", "-").replace("_", "-")
        res = await db.execute(select(Disease).where(Disease.slug == slug_query))
        d = res.scalar_one_or_none()
        if d:
            return d

        # Check slug pattern
        res = await db.execute(select(Disease).where(Disease.slug.ilike(f"%{slug_query}%")))
        d = res.scalar_one_or_none()
        if d:
            return d

        # Check translations table
        res_t = await db.execute(
            select(Translation.entity_id).where(
                Translation.entity_type == "disease",
                Translation.field == "name",
                Translation.value.ilike(f"%{raw_str}%"),
            )
        )
        matching_id = res_t.scalar_one_or_none()
        if matching_id:
            res_by_id = await db.execute(select(Disease).where(Disease.id == matching_id))
            return res_by_id.scalar_one_or_none()

        return None

    async def _find_symptom(self, identifier: Any, db: AsyncSession) -> Symptom | None:
        """Find a symptom by ID, code, or translated label."""
        if not identifier:
            return None
        raw_str = str(identifier).strip()

        # Check numeric ID
        if raw_str.isdigit():
            res = await db.execute(select(Symptom).where(Symptom.id == int(raw_str)))
            s = res.scalar_one_or_none()
            if s:
                return s

        # Check exact code
        res = await db.execute(select(Symptom).where(Symptom.code == raw_str))
        s = res.scalar_one_or_none()
        if s:
            return s

        # Check code pattern
        res = await db.execute(select(Symptom).where(Symptom.code.ilike(f"%{raw_str}%")))
        s = res.scalar_one_or_none()
        if s:
            return s

        # Check translations table
        res_t = await db.execute(
            select(Translation.entity_id).where(
                Translation.entity_type == "symptom",
                Translation.field == "label",
                Translation.value.ilike(f"%{raw_str}%"),
            )
        )
        matching_id = res_t.scalar_one_or_none()
        if matching_id:
            res_by_id = await db.execute(select(Symptom).where(Symptom.id == matching_id))
            return res_by_id.scalar_one_or_none()

        return None

    # =========================================================================
    # Action Proposals (Two-Phase Confirmation)
    # =========================================================================

    async def _propose_create_disease(
        self,
        data: dict[str, Any],
        db: AsyncSession,
        current_user: User,
        conversation_id: str,
        locale: str,
    ) -> tuple[str, ProposedAction | None]:
        if not current_user.has_permission("disease:create"):
            return (
                self._translate(
                    "Permission denied: You do not have permission 'disease:create' to create diseases.",
                    "ការអនុញ្ញាតត្រូវបានបដិសេធ: អ្នកមិនមានសិទ្ធិ 'disease:create' ដើម្បីបង្កើតជំងឺទេ។",
                    locale,
                ),
                None,
            )

        name = data.get("name") or data.get("disease_name")
        if not name or not str(name).strip():
            return (
                self._translate(
                    "Please provide a disease name. Example: 'Create disease Rust with pathogen fungal'",
                    "សូមផ្តល់ឈ្មោះជំងឺ។ ឧទាហរណ៍: 'បង្កើតជំងឺ Rust ដែលមានមេរោគ fungal'",
                    locale,
                ),
                None,
            )

        name_str = str(name).strip()
        slug = name_str.lower().replace(" ", "-").replace("_", "-")
        existing = await self._find_disease(slug, db)
        if existing:
            return (
                self._translate(
                    f"Disease '{name_str}' (slug: {existing.slug}) already exists in the database.",
                    f"ជំងឺ '{name_str}' (slug: {existing.slug}) មានរួចហើយក្នុងមូលដ្ឋានទិន្នន័យ។",
                    locale,
                ),
                None,
            )

        raw_pathogen = str(data.get("pathogen_type", "fungal")).lower()
        try:
            pathogen_type = PathogenType(raw_pathogen)
        except ValueError:
            pathogen_type = PathogenType.FUNGAL

        details = {
            "name": name_str,
            "slug": slug,
            "pathogen_type": pathogen_type.value,
            "description": data.get("description"),
        }
        summary = f"Create disease '{name_str}' (Pathogen: {pathogen_type.value})"
        affected = [{"entity_type": "disease", "name": name_str, "pathogen_type": pathogen_type.value}]

        proposal = await pending_action_store.create_proposal(
            db=db,
            user_id=current_user.id,
            conversation_id=conversation_id,
            action_type="create_disease",
            required_permission="disease:create",
            summary=summary,
            details=details,
            affected_records=affected,
        )

        msg = self._translate(
            f"⚠️ **Action Proposed: Create Disease**\n\n"
            f"• **Name:** {name_str}\n"
            f"• **Slug:** {slug}\n"
            f"• **Pathogen Type:** {pathogen_type.value}\n"
            f"• **Initial Status:** Draft (unpublished)\n\n"
            f"Please click **Confirm** or reply **confirm** to execute this change (expires in 5 minutes).",
            f"⚠️ **សកម្មភាពស្នើឡើង: បង្កើតជំងឺ**\n\n"
            f"• **ឈ្មោះ:** {name_str}\n"
            f"• **Slug:** {slug}\n"
            f"• **ប្រភេទមេរោគ:** {pathogen_type.value}\n"
            f"• **ស្ថានភាពដំបូង:** សេចក្តីព្រាង (មិនទាន់ផ្សព្វផ្សាយ)\n\n"
            f"សូមចុច **បញ្ជាក់** ឬឆ្លើយតប **confirm** ដើម្បីអនុវត្ត (ផុតកំណត់ក្នុងរយៈពេល ៥ នាទី)។",
            locale,
        )
        return msg, proposal

    async def _propose_update_disease(
        self,
        data: dict[str, Any],
        db: AsyncSession,
        current_user: User,
        conversation_id: str,
        locale: str,
    ) -> tuple[str, ProposedAction | None]:
        if not current_user.has_permission("disease:update"):
            return (
                self._translate(
                    "Permission denied: You do not have permission 'disease:update' to update diseases.",
                    "ការអនុញ្ញាតត្រូវបានបដិសេធ: អ្នកមិនមានសិទ្ធិ 'disease:update' ដើម្បីធ្វើបច្ចុប្បន្នភាពជំងឺទេ។",
                    locale,
                ),
                None,
            )

        disease_ident = data.get("disease_name") or data.get("name") or data.get("disease_id") or data.get("id")
        if not disease_ident:
            return (
                self._translate(
                    "Please specify which disease to update.",
                    "សូមបញ្ជាក់ជំងឺមួយណាដែលត្រូវធ្វើបច្ចុប្បន្នភាព។",
                    locale,
                ),
                None,
            )

        disease = await self._find_disease(disease_ident, db)
        if not disease:
            return (
                self._translate(
                    f"Disease '{disease_ident}' not found.",
                    f"រកមិនឃើញជំងឺ '{disease_ident}' ទេ។",
                    locale,
                ),
                None,
            )

        display_name = disease.slug.replace("-", " ").title()
        details = {
            "disease_id": disease.id,
            "disease_name": display_name,
            "slug": disease.slug,
            "description": data.get("description"),
            "pathogen_type": data.get("pathogen_type"),
        }
        summary = f"Update disease '{display_name}' (ID: {disease.id})"
        affected = [{"entity_type": "disease", "id": disease.id, "name": display_name, "slug": disease.slug}]

        proposal = await pending_action_store.create_proposal(
            db=db,
            user_id=current_user.id,
            conversation_id=conversation_id,
            action_type="update_disease",
            required_permission="disease:update",
            summary=summary,
            details=details,
            affected_records=affected,
        )

        msg = self._translate(
            f"⚠️ **Action Proposed: Update Disease**\n\n"
            f"• **Target:** {display_name} (ID: {disease.id})\n"
            f"• **Fields to update:** {', '.join([k for k in ['description', 'pathogen_type'] if data.get(k)]) or 'Details'}\n\n"
            f"Please click **Confirm** or reply **confirm** to execute this change (expires in 5 minutes).",
            f"⚠️ **សកម្មភាពស្នើឡើង: ធ្វើបច្ចុប្បន្នភាពជំងឺ**\n\n"
            f"• **គោលដៅ:** {display_name} (ID: {disease.id})\n"
            f"• **វាលដែលត្រូវកែប្រែ:** {', '.join([k for k in ['description', 'pathogen_type'] if data.get(k)]) or 'ព័ត៌មានលម្អិត'}\n\n"
            f"សូមចុច **បញ្ជាក់** ឬឆ្លើយតប **confirm** ដើម្បីអនុវត្ត (ផុតកំណត់ក្នុងរយៈពេល ៥ នាទី)។",
            locale,
        )
        return msg, proposal

    async def _propose_delete_disease(
        self,
        data: dict[str, Any],
        db: AsyncSession,
        current_user: User,
        conversation_id: str,
        locale: str,
    ) -> tuple[str, ProposedAction | None]:
        if not current_user.has_permission("disease:delete"):
            return (
                self._translate(
                    "Permission denied: You do not have permission 'disease:delete' to delete diseases.",
                    "ការអនុញ្ញាតត្រូវបានបដិសេធ: អ្នកមិនមានសិទ្ធិ 'disease:delete' ដើម្បីលុបជំងឺទេ។",
                    locale,
                ),
                None,
            )

        disease_ident = data.get("disease_name") or data.get("name") or data.get("disease_id") or data.get("id")
        if not disease_ident:
            return (
                self._translate(
                    "Please specify which disease to delete. Example: 'Delete disease Rust' or 'Delete disease 1'",
                    "សូមបញ្ជាក់ជំងឺមួយណាដែលត្រូវលុប។ ឧទាហរណ៍: 'លុបជំងឺ Rust' ឬ 'លុបជំងឺ 1'",
                    locale,
                ),
                None,
            )

        disease = await self._find_disease(disease_ident, db)
        if not disease:
            return (
                self._translate(
                    f"Disease '{disease_ident}' not found in the database.",
                    f"រកមិនឃើញជំងឺ '{disease_ident}' ក្នុងមូលដ្ឋានទិន្នន័យទេ។",
                    locale,
                ),
                None,
            )

        display_name = disease.slug.replace("-", " ").title()
        details = {
            "disease_id": disease.id,
            "disease_name": display_name,
            "slug": disease.slug,
        }
        summary = f"Permanently delete disease '{display_name}' (ID: {disease.id}, slug: {disease.slug})"
        affected = [
            {"entity_type": "disease", "id": disease.id, "name": display_name, "slug": disease.slug}
        ]

        proposal = await pending_action_store.create_proposal(
            db=db,
            user_id=current_user.id,
            conversation_id=conversation_id,
            action_type="delete_disease",
            required_permission="disease:delete",
            summary=summary,
            details=details,
            affected_records=affected,
        )

        msg = self._translate(
            f"⚠️ **Action Proposed: Permanently Delete Disease**\n\n"
            f"• **Target:** {display_name} (ID: {disease.id}, Pathogen: {disease.pathogen_type.value})\n"
            f"• **Impact:** This will permanently delete the disease record, its symptom weights, and all associated translations.\n\n"
            f"Please click **Confirm** or reply **confirm** to execute this change (expires in 5 minutes).",
            f"⚠️ **សកម្មភាពស្នើឡើង: លុបជំងឺជាអចិន្ត្រៃយ៍**\n\n"
            f"• **គោលដៅ:** {display_name} (ID: {disease.id}, មេរោគ: {disease.pathogen_type.value})\n"
            f"• **ផលប៉ះពាល់:** វានឹងលុបទិន្នន័យជំងឺ ក្បួនទម្ងន់រោគសញ្ញា និងការបកប្រែពាក់ព័ន្ធជារៀងរហូត។\n\n"
            f"សូមចុច **បញ្ជាក់** ឬឆ្លើយតប **confirm** ដើម្បីអនុវត្ត (ផុតកំណត់ក្នុងរយៈពេល ៥ នាទី)។",
            locale,
        )
        return msg, proposal

    async def _propose_create_symptom(
        self,
        data: dict[str, Any],
        db: AsyncSession,
        current_user: User,
        conversation_id: str,
        locale: str,
    ) -> tuple[str, ProposedAction | None]:
        if not current_user.has_permission("symptom:create"):
            return (
                self._translate(
                    "Permission denied: You do not have permission 'symptom:create' to create symptoms.",
                    "ការអនុញ្ញាតត្រូវបានបដិសេធ: អ្នកមិនមានសិទ្ធិ 'symptom:create' ដើម្បីបង្កើតរោគសញ្ញាទេ។",
                    locale,
                ),
                None,
            )

        label = data.get("label") or data.get("symptom_label")
        if not label or not str(label).strip():
            return (
                self._translate(
                    "Please provide a symptom name. Example: 'Create symptom yellow spots on leaves'",
                    "សូមផ្តល់ឈ្មោះរោគសញ្ញា។ ឧទាហរណ៍: 'បង្កើតរោគសញ្ញា ស្នាមលឿងលើស្លឹក'",
                    locale,
                ),
                None,
            )

        label_str = str(label).strip()
        cat_code = str(data.get("category", "leaf")).lower()
        code = f"SYM-{label_str.lower().replace(' ', '-')[:30]}"
        existing_s = await db.execute(select(Symptom).where(Symptom.code == code))
        if existing_s.scalar_one_or_none():
            code = f"{code}-{uuid.uuid4().hex[:4]}"

        details = {
            "label": label_str,
            "label_km": data.get("label_km"),
            "category": cat_code,
            "code": code,
        }
        summary = f"Create symptom '{label_str}' (Category: {cat_code}, code: {code})"
        affected = [{"entity_type": "symptom", "label": label_str, "category": cat_code, "code": code}]

        proposal = await pending_action_store.create_proposal(
            db=db,
            user_id=current_user.id,
            conversation_id=conversation_id,
            action_type="create_symptom",
            required_permission="symptom:create",
            summary=summary,
            details=details,
            affected_records=affected,
        )

        msg = self._translate(
            f"⚠️ **Action Proposed: Create Symptom**\n\n"
            f"• **Label:** {label_str}\n"
            f"• **Generated Code:** {code}\n"
            f"• **Category:** {cat_code}\n\n"
            f"Please click **Confirm** or reply **confirm** to execute this change (expires in 5 minutes).",
            f"⚠️ **សកម្មភាពស្នើឡើង: បង្កើតរោគសញ្ញា**\n\n"
            f"• **ស្លាក:** {label_str}\n"
            f"• **កូដស្វ័យប្រវត្តិ:** {code}\n"
            f"• **ប្រភេទ:** {cat_code}\n\n"
            f"សូមចុច **បញ្ជាក់** ឬឆ្លើយតប **confirm** ដើម្បីអនុវត្ត (ផុតកំណត់ក្នុងរយៈពេល ៥ នាទី)។",
            locale,
        )
        return msg, proposal

    async def _propose_update_symptom(
        self,
        data: dict[str, Any],
        db: AsyncSession,
        current_user: User,
        conversation_id: str,
        locale: str,
    ) -> tuple[str, ProposedAction | None]:
        if not current_user.has_permission("symptom:update"):
            return (
                self._translate(
                    "Permission denied: You do not have permission 'symptom:update' to update symptoms.",
                    "ការអនុញ្ញាតត្រូវបានបដិសេធ: អ្នកមិនមានសិទ្ធិ 'symptom:update' ដើម្បីធ្វើបច្ចុប្បន្នភាពរោគសញ្ញាទេ។",
                    locale,
                ),
                None,
            )

        symptom_ident = data.get("symptom_label") or data.get("label") or data.get("symptom_id") or data.get("id")
        if not symptom_ident:
            return (
                self._translate(
                    "Please specify which symptom to update.",
                    "សូមបញ្ជាក់រោគសញ្ញាមួយណាដែលត្រូវធ្វើបច្ចុប្បន្នភាព។",
                    locale,
                ),
                None,
            )

        symptom = await self._find_symptom(symptom_ident, db)
        if not symptom:
            return (
                self._translate(
                    f"Symptom '{symptom_ident}' not found.",
                    f"រកមិនឃើញរោគសញ្ញា '{symptom_ident}' ទេ។",
                    locale,
                ),
                None,
            )

        details = {
            "symptom_id": symptom.id,
            "symptom_code": symptom.code,
            "label_en": data.get("label_en") or data.get("label"),
            "label_km": data.get("label_km"),
        }
        summary = f"Update symptom '{symptom.code}' (ID: {symptom.id})"
        affected = [{"entity_type": "symptom", "id": symptom.id, "code": symptom.code}]

        proposal = await pending_action_store.create_proposal(
            db=db,
            user_id=current_user.id,
            conversation_id=conversation_id,
            action_type="update_symptom",
            required_permission="symptom:update",
            summary=summary,
            details=details,
            affected_records=affected,
        )

        msg = self._translate(
            f"⚠️ **Action Proposed: Update Symptom**\n\n"
            f"• **Target:** {symptom.code} (ID: {symptom.id})\n"
            f"• **Changes:** Update localized symptom labels\n\n"
            f"Please click **Confirm** or reply **confirm** to execute this change (expires in 5 minutes).",
            f"⚠️ **សកម្មភាពស្នើឡើង: ធ្វើបច្ចុប្បន្នភាពរោគសញ្ញា**\n\n"
            f"• **គោលដៅ:** {symptom.code} (ID: {symptom.id})\n"
            f"• **ការផ្លាស់ប្តូរ:** កែប្រែការបកប្រែរោគសញ្ញា\n\n"
            f"សូមចុច **បញ្ជាក់** ឬឆ្លើយតប **confirm** ដើម្បីអនុវត្ត (ផុតកំណត់ក្នុងរយៈពេល ៥ នាទី)។",
            locale,
        )
        return msg, proposal

    async def _propose_delete_symptom(
        self,
        data: dict[str, Any],
        db: AsyncSession,
        current_user: User,
        conversation_id: str,
        locale: str,
    ) -> tuple[str, ProposedAction | None]:
        if not current_user.has_permission("symptom:delete"):
            return (
                self._translate(
                    "Permission denied: You do not have permission 'symptom:delete' to delete symptoms.",
                    "ការអនុញ្ញាតត្រូវបានបដិសេធ: អ្នកមិនមានសិទ្ធិ 'symptom:delete' ដើម្បីលុបរោគសញ្ញាទេ។",
                    locale,
                ),
                None,
            )

        symptom_ident = data.get("symptom_label") or data.get("label") or data.get("symptom_id") or data.get("id")
        if not symptom_ident:
            return (
                self._translate(
                    "Please specify which symptom to delete. Example: 'Delete symptom yellow spots' or 'Delete symptom 1'",
                    "សូមបញ្ជាក់រោគសញ្ញាមួយណាដែលត្រូវលុប។ ឧទាហរណ៍: 'លុបរោគសញ្ញា ស្នាមលឿង' ឬ 'លុបរោគសញ្ញា 1'",
                    locale,
                ),
                None,
            )

        symptom = await self._find_symptom(symptom_ident, db)
        if not symptom:
            return (
                self._translate(
                    f"Symptom '{symptom_ident}' not found in the database.",
                    f"រកមិនឃើញរោគសញ្ញា '{symptom_ident}' ក្នុងមូលដ្ឋានទិន្នន័យទេ។",
                    locale,
                ),
                None,
            )

        # Referential guard
        blocking_res = await db.execute(
            select(Disease.slug)
            .join(DiseaseSymptom, DiseaseSymptom.disease_id == Disease.id)
            .where(DiseaseSymptom.symptom_id == symptom.id)
        )
        blocking = list(blocking_res.scalars().all())
        if blocking:
            return (
                self._translate(
                    f"Cannot delete symptom '{symptom.code}': referenced by {len(blocking)} disease(s): {', '.join(blocking[:5])}. Remove it from disease rules first.",
                    f"មិនអាចលុបរោគសញ្ញា '{symptom.code}' បានទេ: ត្រូវបានយោងដោយជំងឺ {len(blocking)}: {', '.join(blocking[:5])}។ សូមលុបចេញពីក្បួនជំងឺជាមុនសិន។",
                    locale,
                ),
                None,
            )

        details = {
            "symptom_id": symptom.id,
            "symptom_code": symptom.code,
        }
        summary = f"Delete symptom '{symptom.code}' (ID: {symptom.id})"
        affected = [{"entity_type": "symptom", "id": symptom.id, "code": symptom.code}]

        proposal = await pending_action_store.create_proposal(
            db=db,
            user_id=current_user.id,
            conversation_id=conversation_id,
            action_type="delete_symptom",
            required_permission="symptom:delete",
            summary=summary,
            details=details,
            affected_records=affected,
        )

        msg = self._translate(
            f"⚠️ **Action Proposed: Delete Symptom**\n\n"
            f"• **Target:** {symptom.code} (ID: {symptom.id})\n"
            f"• **Referential Check:** No active disease rules reference this symptom.\n"
            f"• **Impact:** This will permanently remove the symptom and its localized translations.\n\n"
            f"Please click **Confirm** or reply **confirm** to execute this change (expires in 5 minutes).",
            f"⚠️ **សកម្មភាពស្នើឡើង: លុបរោគសញ្ញា**\n\n"
            f"• **គោលដៅ:** {symptom.code} (ID: {symptom.id})\n"
            f"• **ការត្រួតពិនិត្យ:** គ្មានក្បួនជំងឺសកម្មណាយោងរោគសញ្ញានេះទេ។\n"
            f"• **ផលប៉ះពាល់:** វានឹងលុបរោគសញ្ញា និងការបកប្រែពាក់ព័ន្ធជាអចិន្ត្រៃយ៍។\n\n"
            f"សូមចុច **បញ្ជាក់** ឬឆ្លើយតប **confirm** ដើម្បីអនុវត្ត (ផុតកំណត់ក្នុងរយៈពេល ៥ នាទី)។",
            locale,
        )
        return msg, proposal

    # =========================================================================
    # Read-Only Operations
    # =========================================================================

    async def _list_diseases(
        self,
        db: AsyncSession,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        """List all diseases in the database."""
        result = await db.execute(
            select(Disease).where(Disease.is_published == True).order_by(Disease.slug)  # noqa: E712
        )
        diseases = list(result.scalars().all())

        if not diseases:
            message = self._translate(
                "No published diseases found in the database.",
                "រកមិនឃើញជំងឺដែលបានផ្សព្វផ្សាយក្នុងមូលដ្ឋានទិន្នន័យទេ។",
                locale,
            )
            return message, []

        disease_ids = [d.id for d in diseases]
        trans_res = await db.execute(
            select(Translation).where(
                Translation.entity_type == "disease",
                Translation.entity_id.in_(disease_ids),
                Translation.field == "name",
                Translation.locale.in_([locale, "en"]),
            )
        )
        translations = list(trans_res.scalars().all())
        name_map: dict[int, str] = {}
        for t in translations:
            if t.locale == "en":
                name_map[t.entity_id] = t.value
        for t in translations:
            if t.locale == locale:
                name_map[t.entity_id] = t.value

        disease_list = "\n".join([
            f"• {name_map.get(d.id, d.slug.replace('-', ' ').title())} ({d.pathogen_type.value if hasattr(d.pathogen_type, 'value') else d.pathogen_type})"
            for d in diseases[:20]
        ])

        total = len(diseases)
        showing = min(20, total)

        message = self._translate(
            f"Found {total} diseases. Showing first {showing}:\n\n{disease_list}",
            f"រកឃើញជំងឺ {total}។ បង្ហាញ {showing} ដំបូង:\n\n{disease_list}",
            locale,
        )
        return message, [{"action": "listed_diseases", "count": total}]

    async def _list_symptoms(
        self,
        db: AsyncSession,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        """List all symptoms in the database."""
        result = await db.execute(
            select(Symptom).options(selectinload(Symptom.category)).order_by(Symptom.code)
        )
        symptoms = list(result.scalars().all())

        if not symptoms:
            message = self._translate(
                "No symptoms found in the database.",
                "រកមិនឃើញរោគសញ្ញាក្នុងមូលដ្ឋានទិន្នន័យទេ។",
                locale,
            )
            return message, []

        symptom_ids = [s.id for s in symptoms]
        trans_res = await db.execute(
            select(Translation).where(
                Translation.entity_type == "symptom",
                Translation.entity_id.in_(symptom_ids),
                Translation.field == "label",
                Translation.locale.in_([locale, "en"]),
            )
        )
        translations = list(trans_res.scalars().all())
        label_map: dict[int, str] = {}
        for t in translations:
            if t.locale == "en":
                label_map[t.entity_id] = t.value
        for t in translations:
            if t.locale == locale:
                label_map[t.entity_id] = t.value

        by_category: dict[str, list[Symptom]] = {}
        for s in symptoms:
            cat_code = s.category.code if s.category else "general"
            if cat_code not in by_category:
                by_category[cat_code] = []
            by_category[cat_code].append(s)

        symptom_list: list[str] = []
        for category, items in by_category.items():
            symptom_list.append(f"\n**{category.upper()}:**")
            for item in items[:10]:
                lbl = label_map.get(item.id, item.code)
                symptom_list.append(f"  • {lbl} ({item.code})")

        message = self._translate(
            f"Found {len(symptoms)} symptoms:\n" + "\n".join(symptom_list),
            f"រកឃើញរោគសញ្ញា {len(symptoms)}:\n" + "\n".join(symptom_list),
            locale,
        )
        return message, [{"action": "listed_symptoms", "count": len(symptoms)}]

    async def _search_data(
        self,
        query: str,
        db: AsyncSession,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Search for diseases or symptoms."""
        trans_d = await db.execute(
            select(Translation.entity_id).where(
                Translation.entity_type == "disease",
                Translation.value.ilike(f"%{query}%"),
            ).limit(10)
        )
        d_ids = list(trans_d.scalars().all())
        disease_res = await db.execute(
            select(Disease).where(
                (Disease.id.in_(d_ids)) | (Disease.slug.ilike(f"%{query}%"))
            ).limit(10)
        )
        diseases = list(disease_res.scalars().all())

        trans_s = await db.execute(
            select(Translation.entity_id).where(
                Translation.entity_type == "symptom",
                Translation.value.ilike(f"%{query}%"),
            ).limit(10)
        )
        s_ids = list(trans_s.scalars().all())
        symptom_res = await db.execute(
            select(Symptom).where(
                (Symptom.id.in_(s_ids)) | (Symptom.code.ilike(f"%{query}%"))
            ).limit(10)
        )
        symptoms = list(symptom_res.scalars().all())

        result_parts: list[str] = []

        if diseases:
            disease_list = "\n".join([
                f"• {d.slug.replace('-', ' ').title()} ({d.pathogen_type.value if hasattr(d.pathogen_type, 'value') else d.pathogen_type})"
                for d in diseases
            ])
            result_parts.append(
                self._translate(
                    f"**Diseases ({len(diseases)}):**\n{disease_list}",
                    f"**ជំងឺ ({len(diseases)}):**\n{disease_list}",
                    locale,
                )
            )

        if symptoms:
            symptom_list = "\n".join([f"• {s.code}" for s in symptoms])
            result_parts.append(
                self._translate(
                    f"\n**Symptoms ({len(symptoms)}):**\n{symptom_list}",
                    f"\n**រោគសញ្ញា ({len(symptoms)}):**\n{symptom_list}",
                    locale,
                )
            )

        if not diseases and not symptoms:
            message = self._translate(
                f"No results found for '{query}'.",
                f"រកមិនឃើញលទ្ធផលសម្រាប់ '{query}' ទេ។",
                locale,
            )
            return message, []

        return "\n".join(result_parts), [
            {
                "action": "searched",
                "query": query,
                "diseases_found": len(diseases),
                "symptoms_found": len(symptoms),
            }
        ]

    # =========================================================================
    # Intent Detection
    # =========================================================================

    async def _analyze_intent(self, message: str, locale: str) -> dict[str, Any]:
        """Analyze user message to determine intent and extract parameters."""
        message_lower = message.lower()

        # DELETE patterns
        delete_keywords = ["delete", "remove", "drop", "លុប"]
        if any(keyword in message_lower for keyword in delete_keywords):
            if "disease" in message_lower or "ជំងឺ" in message_lower:
                name = self._extract_entity_name(message, ["disease", "ជំងឺ"])
                return {
                    "action": "delete_disease",
                    "data": {"disease_name": name, "name": name},
                    "query": "",
                }
            elif "symptom" in message_lower or "រោគសញ្ញា" in message_lower:
                name = self._extract_entity_name(message, ["symptom", "រោគសញ្ញា"])
                return {
                    "action": "delete_symptom",
                    "data": {"symptom_label": name, "label": name},
                    "query": "",
                }

        # LIST patterns
        list_keywords = ["list", "show", "display", "all", "បង្ហាញ"]
        if any(keyword in message_lower for keyword in list_keywords):
            if "disease" in message_lower or "ជំងឺ" in message_lower:
                return {"action": "list_diseases", "data": {}, "query": ""}
            elif "symptom" in message_lower or "រោគសញ្ញា" in message_lower:
                return {"action": "list_symptoms", "data": {}, "query": ""}

        # CREATE patterns
        create_keywords = ["create", "add", "new", "បង្កើត", "បន្ថែម"]
        if any(keyword in message_lower for keyword in create_keywords):
            if "disease" in message_lower or "ជំងឺ" in message_lower:
                name = self._extract_entity_name(message, ["disease", "ជំងឺ"])
                return {
                    "action": "create_disease",
                    "data": {
                        "name": name,
                        "pathogen_type": self._extract_pathogen_type(message),
                        "description": message,
                    },
                    "query": "",
                }
            elif "symptom" in message_lower or "រោគសញ្ញា" in message_lower:
                name = self._extract_entity_name(message, ["symptom", "រោគសញ្ញា"])
                return {
                    "action": "create_symptom",
                    "data": {"label": name, "category": "leaf"},
                    "query": "",
                }

        # UPDATE patterns
        update_keywords = ["update", "edit", "modify", "change", "កែសម្រួល", "ធ្វើបច្ចុប្បន្នភាព"]
        if any(keyword in message_lower for keyword in update_keywords):
            if "disease" in message_lower or "ជំងឺ" in message_lower:
                name = self._extract_entity_name(message, ["disease", "ជំងឺ"])
                return {
                    "action": "update_disease",
                    "data": {"disease_name": name, "name": name, "description": message},
                    "query": "",
                }
            elif "symptom" in message_lower or "រោគសញ្ញា" in message_lower:
                name = self._extract_entity_name(message, ["symptom", "រោគសញ្ញា"])
                return {
                    "action": "update_symptom",
                    "data": {"symptom_label": name, "label": name},
                    "query": "",
                }

        # SEARCH patterns
        search_keywords = ["search", "find", "look for", "ស្វែងរក"]
        if any(keyword in message_lower for keyword in search_keywords):
            query = message.replace("search", "").replace("find", "").replace("look for", "").strip()
            return {"action": "search", "data": {}, "query": query}

        # HELP patterns
        help_keywords = ["help", "commands", "what can you do", "ជំនួយ"]
        if any(keyword in message_lower for keyword in help_keywords):
            return {"action": "help", "data": {}, "query": ""}

        # FALLBACK TO AI
        prompt = f"""Analyze this admin message and determine the intent.

Message: "{message}"

Available actions:
- list_diseases: List all diseases
- list_symptoms: List all symptoms
- create_disease: Create a new disease (extract: name, pathogen_type, description)
- update_disease: Update existing disease (extract: disease_name or id, fields to update)
- delete_disease: Delete a disease (extract: disease_name or id)
- create_symptom: Create a new symptom (extract: label, code, category)
- delete_symptom: Delete a symptom (extract: symptom_label or id)
- update_symptom: Update existing symptom (extract: symptom_label, fields to update)
- search: Search for diseases or symptoms (extract: query)
- help: Ask for help or available commands
- chat: General conversation

Respond ONLY with valid JSON:
{{
  "action": "action_name",
  "data": {{}},
  "query": ""
}}
"""
        try:
            ai_response = await self.ollama.generate(prompt=prompt, temperature=0.1)
            parsed = self._extract_json(ai_response)
            if parsed and "action" in parsed:
                return parsed
        except Exception as exc:
            log.warning("admin_chat.ai_intent_fallback_failed", error=str(exc))

        return {"action": "chat", "data": {}, "query": ""}

    def _extract_entity_name(self, message: str, keywords: list[str]) -> str:
        """Extract entity name from command string."""
        import re

        action_verbs = [
            "delete", "remove", "drop", "create", "add", "new", "update", "edit", "modify",
            "លុប", "បង្កើត", "បន្ថែម", "កែសម្រួល", "ធ្វើបច្ចុប្បន្នភាព",
        ]

        pattern = r"\b(" + "|".join(action_verbs) + r")\s+(" + "|".join(keywords) + r")\s+(.+)$"
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            raw_name = match.group(3).strip()
            for prep in [" with ", " using ", " as ", " ដែលមាន "]:
                if prep in raw_name.lower():
                    raw_name = raw_name.split(prep)[0]
            return raw_name.strip()

        words = message.split()
        if len(words) >= 3:
            return " ".join(words[2:]).strip()
        return message.strip()

    def _extract_pathogen_type(self, message: str) -> str:
        """Extract pathogen type from message."""
        msg_lower = message.lower()
        if "bacterial" in msg_lower or "បាក់តេរី" in msg_lower:
            return "bacterial"
        elif "viral" in msg_lower or "វីរុស" in msg_lower:
            return "viral"
        elif "abiotic" in msg_lower:
            return "abiotic"
        elif "other" in msg_lower:
            return "other"
        else:
            return "fungal"

    def _extract_json(self, text: str) -> dict[str, Any] | None:
        """Extract JSON from LLM generation."""
        import re

        clean = text.strip()
        if clean.startswith("```"):
            clean = re.sub(r"^```(?:json)?\s*\n", "", clean)
            clean = re.sub(r"\n```\s*$", "", clean)

        match = re.search(r"\{.*\}", clean, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        return None

    async def _general_chat(self, message: str, history: list[dict[str, str]], locale: str) -> str:
        """Handle general conversation."""
        prompt = f"""You are the Sunflower Expert System AI Administrator Assistant.
Language: {'Khmer' if locale == 'km' else 'English'}

User message: "{message}"

Respond helpfully and concisely. Mention that you can list diseases, search symptoms, or propose database modifications upon command.
"""
        try:
            return await self.ollama.generate(prompt=prompt, temperature=0.7)
        except Exception:
            return self._translate(
                "I am your botanical admin assistant. You can ask me to list diseases, search symptoms, or propose creating, updating, or deleting records.",
                "ខ្ញុំជាជំនួយការរដ្ឋបាលឆ្លាតវៃ។ អ្នកអាចស្នើឱ្យខ្ញុំបង្ហាញបញ្ជីជំងឺ ស្វែងរករោគសញ្ញា ឬស្នើបង្កើត កែសម្រួល ឬលុបទិន្នន័យ។",
                locale,
            )

    async def _get_help_message(self, locale: str) -> str:
        """Return formatted help message."""
        return self._translate(
            """**Available Admin Commands:**

• **View Data:**
  - `list diseases` — Display published sunflower diseases
  - `list symptoms` — Display categorized symptoms
  - `search <query>` — Search diseases and symptoms

• **Modify Data (Two-Phase Confirmed):**
  - `create disease <name> with pathogen <type>`
  - `update disease <name>`
  - `delete disease <name>`
  - `create symptom <label>`
  - `update symptom <label>`
  - `delete symptom <label>`

*All modifications propose an action that requires your explicit confirmation before applying.*""",
            """**ពាក្យបញ្ជាអ្នកគ្រប់គ្រងដែលអាចប្រើបាន:**

• **មើលទិន្នន័យ:**
  - `បង្ហាញជំងឺទាំងអស់` — បង្ហាញជំងឺផ្កាឈូករ័ត្ន
  - `បង្ហាញរោគសញ្ញាទាំងអស់` — បង្ហាញរោគសញ្ញាតាមផ្នែក
  - `ស្វែងរក <ពាក្យ>` — ស្វែងរកជំងឺ និងរោគសញ្ញា

• **កែប្រែទិន្នន័យ (ត្រូវការការបញ្ជាក់ពីរដំណាក់កាល):**
  - `បង្កើតជំងឺ <ឈ្មោះ>`
  - `កែសម្រួលជំងឺ <ឈ្មោះ>`
  - `លុបជំងឺ <ឈ្មោះ>`
  - `បង្កើតរោគសញ្ញា <ឈ្មោះ>`
  - `កែសម្រួលរោគសញ្ញា <ឈ្មោះ>`
  - `លុបរោគសញ្ញា <ឈ្មោះ>`

*រាល់ការកែប្រែទិន្នន័យនឹងត្រូវស្នើឡើងជាមុន និងទាមទារការបញ្ជាក់ពីអ្នកមុននឹងអនុវត្ត។*""",
            locale,
        )

    def _translate(self, en: str, km: str, locale: str) -> str:
        """Simple translation helper."""
        return km if locale == "km" else en


# Singleton instance
_admin_chat_service: AdminChatService | None = None


def get_admin_chat_service() -> AdminChatService:
    """Get or create admin chat service instance."""
    global _admin_chat_service
    if _admin_chat_service is None:
        _admin_chat_service = AdminChatService()
    return _admin_chat_service
