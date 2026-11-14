"""Database execution engine for verified AI-proposed administrative actions.

Performs validated mutations, ensures referential integrity, cleans up translations,
and records immutable audit log entries.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.services.action_confirmation import ProposedAction
from app.core.errors import BadRequestError, ConflictError, NotFoundError
from app.models.auth import User
from app.models.disease import Disease, DiseaseSymptom
from app.models.enums import PathogenType
from app.models.symptom import Symptom, SymptomCategory
from app.models.translation import Translation
from app.services.audit import AuditService


class ActionExecutor:
    """Executes confirmed administrative actions with audit logging and referential checks."""

    @staticmethod
    def _translate(en: str, km: str, locale: str) -> str:
        return km if locale == "km" else en

    async def execute_action(
        self,
        action: ProposedAction,
        db: AsyncSession,
        current_user: User,
        locale: str = "en",
    ) -> tuple[str, list[dict[str, Any]]]:
        """Execute a confirmed action against the database and record audit logs.

        Args:
            action: The verified and consumed ProposedAction.
            db: Active asynchronous database session.
            current_user: The authenticated administrative user executing the action.
            locale: Response language code ('en' or 'km').

        Returns:
            Tuple of (human-readable response message, list of actions taken details).
        """
        audit = AuditService(db)
        action_type = action.action_type
        details = action.details

        if action_type == "create_disease":
            return await self._execute_create_disease(details, db, current_user, audit, locale)
        elif action_type == "update_disease":
            return await self._execute_update_disease(details, db, current_user, audit, locale)
        elif action_type == "delete_disease":
            return await self._execute_delete_disease(details, db, current_user, audit, locale)
        elif action_type == "create_symptom":
            return await self._execute_create_symptom(details, db, current_user, audit, locale)
        elif action_type == "update_symptom":
            return await self._execute_update_symptom(details, db, current_user, audit, locale)
        elif action_type == "delete_symptom":
            return await self._execute_delete_symptom(details, db, current_user, audit, locale)
        else:
            raise BadRequestError(detail=f"Unknown action type: {action_type}")

    async def _execute_create_disease(
        self,
        data: dict[str, Any],
        db: AsyncSession,
        user: User,
        audit: AuditService,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        name = str(data.get("name") or "").strip()
        if not name:
            raise BadRequestError(detail="Disease name is required.")

        slug = data.get("slug") or name.lower().replace(" ", "-").replace("_", "-")
        # Check if already exists
        existing = await db.execute(select(Disease).where(Disease.slug == slug))
        if existing.scalar_one_or_none():
            raise ConflictError(detail=f"Disease with slug '{slug}' already exists.")

        raw_pathogen = str(data.get("pathogen_type", "fungal")).lower()
        try:
            pathogen_type = PathogenType(raw_pathogen)
        except ValueError:
            pathogen_type = PathogenType.FUNGAL

        new_disease = Disease(
            slug=slug,
            pathogen_type=pathogen_type,
            is_published=False,  # Draft by default
            created_by_id=user.id,
            updated_by_id=user.id,
        )
        db.add(new_disease)
        await db.flush()

        # Add name translation
        db.add(
            Translation(
                entity_type="disease",
                entity_id=new_disease.id,
                locale="en",
                field="name",
                value=name,
            )
        )
        if data.get("name_km"):
            db.add(
                Translation(
                    entity_type="disease",
                    entity_id=new_disease.id,
                    locale="km",
                    field="name",
                    value=str(data["name_km"]),
                )
            )

        if data.get("description"):
            db.add(
                Translation(
                    entity_type="disease",
                    entity_id=new_disease.id,
                    locale="en",
                    field="description",
                    value=str(data["description"]),
                )
            )

        await audit.record(
            actor_id=user.id,
            action="ai_create_disease",
            entity_type="disease",
            entity_id=new_disease.id,
            diff={"slug": slug, "pathogen_type": pathogen_type.value, "is_published": False},
        )
        await db.commit()

        msg = self._translate(
            f"✅ Confirmed and created disease '{name}' (ID: {new_disease.id}, slug: {slug}) "
            "in draft mode.",
            f"✅ បានបញ្ជាក់និងបង្កើតជំងឺ '{name}' (ID: {new_disease.id}, slug: {slug}) ក្នុងរបៀបសេចក្តីព្រាង។",
            locale,
        )
        return msg, [{"action": "created_disease", "id": new_disease.id, "slug": slug}]

    async def _execute_update_disease(
        self,
        data: dict[str, Any],
        db: AsyncSession,
        user: User,
        audit: AuditService,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        disease_id = data.get("disease_id")
        if not disease_id:
            raise BadRequestError(detail="disease_id is required.")

        res = await db.execute(select(Disease).where(Disease.id == int(disease_id)))
        disease = res.scalar_one_or_none()
        if not disease:
            raise NotFoundError(detail=f"Disease with ID {disease_id} not found.")

        updated_fields: list[str] = []
        diff: dict[str, Any] = {}

        if "pathogen_type" in data:
            try:
                new_pathogen = PathogenType(str(data["pathogen_type"]).lower())
                diff["pathogen_type"] = {
                    "old": disease.pathogen_type.value,
                    "new": new_pathogen.value,
                }
                disease.pathogen_type = new_pathogen
                updated_fields.append("pathogen_type")
            except ValueError:
                pass

        if "description" in data:
            t_res = await db.execute(
                select(Translation).where(
                    Translation.entity_type == "disease",
                    Translation.entity_id == disease.id,
                    Translation.locale == "en",
                    Translation.field == "description",
                )
            )
            trans = t_res.scalar_one_or_none()
            new_desc = str(data["description"])
            if trans:
                diff["description_en"] = {"old": trans.value, "new": new_desc}
                trans.value = new_desc
            else:
                diff["description_en"] = {"old": None, "new": new_desc}
                db.add(
                    Translation(
                        entity_type="disease",
                        entity_id=disease.id,
                        locale="en",
                        field="description",
                        value=new_desc,
                    )
                )
            updated_fields.append("description")

        disease.updated_by_id = user.id

        await audit.record(
            actor_id=user.id,
            action="ai_update_disease",
            entity_type="disease",
            entity_id=disease.id,
            diff=diff,
        )
        await db.commit()

        display_name = disease.slug.replace("-", " ").title()
        fields_str = ", ".join(updated_fields)
        msg = self._translate(
            f"✅ Confirmed and updated disease '{display_name}' (ID: {disease.id}). "
            f"Updated fields: {fields_str}",
            f"✅ បានបញ្ជាក់និងធ្វើបច្ចុប្បន្នភាពជំងឺ '{display_name}' (ID: {disease.id})។ "
            f"វាលកែប្រែ: {fields_str}",
            locale,
        )
        return msg, [{"action": "updated_disease", "id": disease.id, "fields": updated_fields}]

    async def _execute_delete_disease(
        self,
        data: dict[str, Any],
        db: AsyncSession,
        user: User,
        audit: AuditService,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        disease_id = data.get("disease_id")
        if not disease_id:
            raise BadRequestError(detail="disease_id is required.")

        res = await db.execute(select(Disease).where(Disease.id == int(disease_id)))
        disease = res.scalar_one_or_none()
        if not disease:
            raise NotFoundError(detail=f"Disease with ID {disease_id} not found.")

        did = disease.id
        dslug = disease.slug
        display_name = dslug.replace("-", " ").title()

        # Delete associated polymorphic translations
        await db.execute(
            delete(Translation).where(
                Translation.entity_type == "disease",
                Translation.entity_id == did,
            )
        )

        await audit.record(
            actor_id=user.id,
            action="ai_delete_disease",
            entity_type="disease",
            entity_id=did,
            diff={"deleted": True, "slug": dslug},
        )

        await db.delete(disease)
        await db.commit()

        msg = self._translate(
            f"✅ Confirmed and deleted disease '{display_name}' (ID: {did}). "
            "All associated rules and translations were removed.",
            f"✅ បានបញ្ជាក់និងលុបជំងឺ '{display_name}' (ID: {did})។ "
            "ក្បួន និងការបកប្រែពាក់ព័ន្ធត្រូវបានលុបចេញ។",
            locale,
        )
        return msg, [{"action": "deleted_disease", "id": did, "slug": dslug}]

    async def _execute_create_symptom(
        self,
        data: dict[str, Any],
        db: AsyncSession,
        user: User,
        audit: AuditService,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        label = str(data.get("label") or "").strip()
        if not label:
            raise BadRequestError(detail="Symptom label is required.")

        cat_code = str(data.get("category", "leaf")).lower()
        cat_res = await db.execute(
            select(SymptomCategory).where(SymptomCategory.code == cat_code)
        )
        category = cat_res.scalar_one_or_none()
        if not category:
            first_cat = await db.execute(select(SymptomCategory).order_by(SymptomCategory.id))
            category = first_cat.scalars().first()
        category_id = category.id if category else 1

        code = data.get("code")
        if not code:
            code = f"SYM-{label.lower().strip().replace(' ', '-')[:30]}"
            existing_s = await db.execute(select(Symptom).where(Symptom.code == code))
            if existing_s.scalar_one_or_none():
                code = f"{code}-{uuid.uuid4().hex[:4]}"

        new_symptom = Symptom(
            code=code,
            category_id=category_id,
            is_environmental=False,
            created_by_id=user.id,
            updated_by_id=user.id,
        )
        db.add(new_symptom)
        await db.flush()

        db.add(
            Translation(
                entity_type="symptom",
                entity_id=new_symptom.id,
                locale="en",
                field="label",
                value=label,
            )
        )
        if data.get("label_km"):
            db.add(
                Translation(
                    entity_type="symptom",
                    entity_id=new_symptom.id,
                    locale="km",
                    field="label",
                    value=str(data["label_km"]),
                )
            )

        await audit.record(
            actor_id=user.id,
            action="ai_create_symptom",
            entity_type="symptom",
            entity_id=new_symptom.id,
            diff={"code": code, "label": label, "category_id": category_id},
        )
        await db.commit()

        msg = self._translate(
            f"✅ Confirmed and created symptom '{label}' (Code: {code}, ID: {new_symptom.id}).",
            f"✅ បានបញ្ជាក់និងបង្កើតរោគសញ្ញា '{label}' (កូដ: {code}, ID: {new_symptom.id})។",
            locale,
        )
        return msg, [{"action": "created_symptom", "id": new_symptom.id, "code": code}]

    async def _execute_update_symptom(
        self,
        data: dict[str, Any],
        db: AsyncSession,
        user: User,
        audit: AuditService,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        symptom_id = data.get("symptom_id")
        if not symptom_id:
            raise BadRequestError(detail="symptom_id is required.")

        res = await db.execute(select(Symptom).where(Symptom.id == int(symptom_id)))
        symptom = res.scalar_one_or_none()
        if not symptom:
            raise NotFoundError(detail=f"Symptom with ID {symptom_id} not found.")

        updated_fields: list[str] = []
        diff: dict[str, Any] = {}

        val_en = data.get("label_en") or data.get("label")
        if val_en:
            t_res = await db.execute(
                select(Translation).where(
                    Translation.entity_type == "symptom",
                    Translation.entity_id == symptom.id,
                    Translation.locale == "en",
                    Translation.field == "label",
                )
            )
            trans = t_res.scalar_one_or_none()
            if trans:
                diff["label_en"] = {"old": trans.value, "new": str(val_en)}
                trans.value = str(val_en)
            else:
                diff["label_en"] = {"old": None, "new": str(val_en)}
                db.add(
                    Translation(
                        entity_type="symptom",
                        entity_id=symptom.id,
                        locale="en",
                        field="label",
                        value=str(val_en),
                    )
                )
            updated_fields.append("label_en")

        if data.get("label_km"):
            t_res = await db.execute(
                select(Translation).where(
                    Translation.entity_type == "symptom",
                    Translation.entity_id == symptom.id,
                    Translation.locale == "km",
                    Translation.field == "label",
                )
            )
            trans = t_res.scalar_one_or_none()
            if trans:
                diff["label_km"] = {"old": trans.value, "new": str(data["label_km"])}
                trans.value = str(data["label_km"])
            else:
                diff["label_km"] = {"old": None, "new": str(data["label_km"])}
                db.add(
                    Translation(
                        entity_type="symptom",
                        entity_id=symptom.id,
                        locale="km",
                        field="label",
                        value=str(data["label_km"]),
                    )
                )
            updated_fields.append("label_km")

        symptom.updated_by_id = user.id

        await audit.record(
            actor_id=user.id,
            action="ai_update_symptom",
            entity_type="symptom",
            entity_id=symptom.id,
            diff=diff,
        )
        await db.commit()

        fields_str = ", ".join(updated_fields)
        msg = self._translate(
            f"✅ Confirmed and updated symptom '{symptom.code}'. Fields updated: {fields_str}",
            f"✅ បានបញ្ជាក់និងធ្វើបច្ចុប្បន្នភាពរោគសញ្ញា '{symptom.code}'។ "
            f"វាលកែប្រែ: {fields_str}",
            locale,
        )
        return msg, [{"action": "updated_symptom", "id": symptom.id, "fields": updated_fields}]

    async def _execute_delete_symptom(
        self,
        data: dict[str, Any],
        db: AsyncSession,
        user: User,
        audit: AuditService,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        symptom_id = data.get("symptom_id")
        if not symptom_id:
            raise BadRequestError(detail="symptom_id is required.")

        res = await db.execute(select(Symptom).where(Symptom.id == int(symptom_id)))
        symptom = res.scalar_one_or_none()
        if not symptom:
            raise NotFoundError(detail=f"Symptom with ID {symptom_id} not found.")

        sid = symptom.id
        scode = symptom.code

        # Referential guard: ensure no active disease rule references this symptom
        blocking_res = await db.execute(
            select(Disease.slug)
            .join(DiseaseSymptom, DiseaseSymptom.disease_id == Disease.id)
            .where(DiseaseSymptom.symptom_id == sid)
        )
        blocking = list(blocking_res.scalars().all())
        if blocking:
            blocking_preview = ", ".join(blocking[:5])
            msg = (
                f"Cannot delete symptom: referenced by {len(blocking)} "
                f"disease(s): {blocking_preview}"
            )
            raise ConflictError(detail=msg)

        # Delete translations
        await db.execute(
            delete(Translation).where(
                Translation.entity_type == "symptom",
                Translation.entity_id == sid,
            )
        )

        await audit.record(
            actor_id=user.id,
            action="ai_delete_symptom",
            entity_type="symptom",
            entity_id=sid,
            diff={"deleted": True, "code": scode},
        )

        await db.delete(symptom)
        await db.commit()

        msg = self._translate(
            f"✅ Confirmed and deleted symptom '{scode}' (ID: {sid}).",
            f"✅ បានបញ្ជាក់និងលុបរោគសញ្ញា '{scode}' (ID: {sid})។",
            locale,
        )
        return msg, [{"action": "deleted_symptom", "id": sid, "code": scode}]


# Singleton instance
action_executor = ActionExecutor()
