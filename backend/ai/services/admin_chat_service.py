"""AI Admin Chat Service

Allows admin/expert users to modify diseases and symptoms through natural language.
Provides a conversational interface for database operations.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ai.schemas.ai_schemas import AIChatRequest, AIChatResponse
from ai.services.ollama_service import get_ollama_service
from app.models.disease import Disease
from app.models.enums import PathogenType
from app.models.symptom import Symptom, SymptomCategory
from app.models.translation import Translation


class AdminChatService:
    """AI-powered admin chat for database operations."""
    
    def __init__(self):
        self.ollama = get_ollama_service()
        self.conversation_history: dict[str, list[dict]] = {}
    
    async def handle_admin_chat(
        self,
        request: AIChatRequest,
        db: AsyncSession,
        user_role: str,
    ) -> AIChatResponse:
        """Process admin/expert chat message with database modification capabilities.
        
        Args:
            request: Chat request with message
            db: Database session
            user_role: User's role (admin or agronomist)
        
        Returns:
            Response with AI message and possible actions taken
        """
        # Debug logging
        print("\n[ADMIN CHAT] ===== NEW REQUEST =====")
        print(f"[ADMIN CHAT] User role: {user_role}")
        print(f"[ADMIN CHAT] Message: {request.message}")
        print(f"[ADMIN CHAT] Locale: {request.locale}")
        
        conversation_id = request.conversation_id or "default"
        
        # Get conversation history
        if conversation_id not in self.conversation_history:
            self.conversation_history[conversation_id] = []
        
        history = self.conversation_history[conversation_id]
        
        # Step 1: Analyze intent using AI
        intent = await self._analyze_intent(request.message, request.locale)
        
        print(f"[ADMIN CHAT] Detected intent: {intent}")
        
        response_message = ""
        actions_taken = []
        
        # Step 2: Handle different intents
        if intent["action"] == "list_diseases":
            response_message, actions = await self._list_diseases(db, request.locale)
            actions_taken.extend(actions)
        
        elif intent["action"] == "list_symptoms":
            response_message, actions = await self._list_symptoms(db, request.locale)
            actions_taken.extend(actions)
        
        elif intent["action"] == "create_disease":
            if user_role not in ["admin", "agronomist"]:
                response_message = self._translate(
                    "You don't have permission to create diseases. Only experts and admins can modify data.",
                    "អ្នកមិនមានសិទ្ធិបង្កើតជំងឺទេ។ តែអ្នកជំនាញ និងអ្នកគ្រប់គ្រងប៉ុណ្ណោះអាចកែប្រែទិន្នន័យបាន។",
                    request.locale
                )
            else:
                response_message, actions = await self._create_disease(
                    intent.get("data", {}),
                    db,
                    request.locale
                )
                actions_taken.extend(actions)
        
        elif intent["action"] == "update_disease":
            if user_role not in ["admin", "agronomist"]:
                response_message = self._translate(
                    "You don't have permission to update diseases. Only experts and admins can modify data.",
                    "អ្នកមិនមានសិទ្ធិធ្វើបច្ចុប្បន្នភាពជំងឺទេ។ តែអ្នកជំនាញ និងអ្នកគ្រប់គ្រងប៉ុណ្ណោះអាចកែប្រែទិន្នន័យបាន។",
                    request.locale
                )
            else:
                response_message, actions = await self._update_disease(
                    intent.get("data", {}),
                    db,
                    request.locale
                )
                actions_taken.extend(actions)
        
        elif intent["action"] == "delete_disease":
            if user_role != "admin":
                response_message = self._translate(
                    "Only admins can delete diseases. Experts can edit but cannot delete.",
                    "តែអ្នកគ្រប់គ្រងប៉ុណ្ណោះអាចលុបជំងឺបាន។ អ្នកជំនាញអាចកែប៉ុន្តែមិនអាចលុបបានទេ។",
                    request.locale
                )
            else:
                response_message, actions = await self._delete_disease(
                    intent.get("data", {}),
                    db,
                    request.locale
                )
                actions_taken.extend(actions)
        
        elif intent["action"] == "create_symptom":
            if user_role not in ["admin", "agronomist"]:
                response_message = self._translate(
                    "You don't have permission to create symptoms. Only experts and admins can modify data.",
                    "អ្នកមិនមានសិទ្ធិបង្កើតរោគសញ្ញាទេ។ តែអ្នកជំនាញ និងអ្នកគ្រប់គ្រងប៉ុណ្ណោះអាចកែប្រែទិន្នន័យបាន។",
                    request.locale
                )
            else:
                response_message, actions = await self._create_symptom(
                    intent.get("data", {}),
                    db,
                    request.locale
                )
                actions_taken.extend(actions)
        
        elif intent["action"] == "update_symptom":
            if user_role not in ["admin", "agronomist"]:
                response_message = self._translate(
                    "You don't have permission to update symptoms. Only experts and admins can modify data.",
                    "អ្នកមិនមានសិទ្ធិធ្វើបច្ចុប្បន្នភាពរោគសញ្ញាទេ។ តែអ្នកជំនាញ និងអ្នកគ្រប់គ្រងប៉ុណ្ណោះអាចកែប្រែទិន្នន័យបាន។",
                    request.locale
                )
            else:
                response_message, actions = await self._update_symptom(
                    intent.get("data", {}),
                    db,
                    request.locale
                )
                actions_taken.extend(actions)
        
        elif intent["action"] == "delete_symptom":
            if user_role != "admin":
                response_message = self._translate(
                    "Only admins can delete symptoms. Experts can edit but cannot delete.",
                    "តែអ្នកគ្រប់គ្រងប៉ុណ្ណោះអាចលុបរោគសញ្ញាបាន។ អ្នកជំនាញអាចកែប៉ុន្តែមិនអាចលុបបានទេ។",
                    request.locale
                )
            else:
                response_message, actions = await self._delete_symptom(
                    intent.get("data", {}),
                    db,
                    request.locale
                )
                actions_taken.extend(actions)
        
        elif intent["action"] == "search":
            response_message, actions = await self._search_data(
                intent.get("query", ""),
                db,
                request.locale
            )
            actions_taken.extend(actions)
        
        elif intent["action"] == "help":
            response_message = await self._get_help_message(request.locale)
        
        else:
            # General chat
            response_message = await self._general_chat(
                request.message,
                history,
                request.locale
            )
        
        # Update history
        history.append({"role": "user", "content": request.message})
        history.append({"role": "assistant", "content": response_message})
        
        # Keep only last 10 messages
        if len(history) > 20:
            self.conversation_history[conversation_id] = history[-20:]
        
        return AIChatResponse(
            message=response_message,
            conversation_id=conversation_id,
            needs_diagnosis=False,
            extracted_symptoms=None,
            metadata={
                "intent": intent["action"],
                "actions_taken": actions_taken,
                "is_admin_mode": True,
            }
        )
    
    async def _analyze_intent(self, message: str, locale: str) -> dict[str, Any]:
        """Analyze user message to determine intent and extract data.
        
        Uses keyword pattern matching first, then falls back to AI if no match.
        """
        
        message_lower = message.lower()
        
        # Debug logging
        print(f"[ADMIN CHAT] Analyzing message: '{message}'")
        print(f"[ADMIN CHAT] Message lowercase: '{message_lower}'")
        
        # KEYWORD PATTERN MATCHING (runs first for reliable detection)
        
        # DELETE patterns
        delete_keywords = ["delete", "remove", "លុប", "drop"]
        if any(keyword in message_lower for keyword in delete_keywords):
            print("[ADMIN CHAT] DELETE keyword detected!")
            if "disease" in message_lower or "ជំងឺ" in message_lower:
                # Extract disease name (rough extraction)
                # Look for patterns like "delete disease X", "delete X disease"
                name = self._extract_entity_name(message, ["disease", "ជំងឺ"])
                print(f"[ADMIN CHAT] DELETE DISEASE - Extracted name: '{name}'")
                return {
                    "action": "delete_disease",
                    "data": {"disease_name": name, "name": name},
                    "query": ""
                }
            elif "symptom" in message_lower or "រោគសញ្ញា" in message_lower:
                name = self._extract_entity_name(message, ["symptom", "រោគសញ្ញា"])
                print(f"[ADMIN CHAT] DELETE SYMPTOM - Extracted name: '{name}'")
                return {
                    "action": "delete_symptom",
                    "data": {"symptom_label": name, "label": name},
                    "query": ""
                }
        
        # LIST patterns
        list_keywords = ["list", "show", "display", "បង្ហាញ", "all"]
        if any(keyword in message_lower for keyword in list_keywords):
            if "disease" in message_lower or "ជំងឺ" in message_lower:
                return {"action": "list_diseases", "data": {}, "query": ""}
            elif "symptom" in message_lower or "រោគសញ្ញា" in message_lower:
                return {"action": "list_symptoms", "data": {}, "query": ""}
        
        # CREATE patterns
        create_keywords = ["create", "add", "new", "បង្កើត", "បន្ថែម"]
        if any(keyword in message_lower for keyword in create_keywords):
            print("[ADMIN CHAT] CREATE keyword detected!")
            if "disease" in message_lower or "ជំងឺ" in message_lower:
                name = self._extract_entity_name(message, ["disease", "ជំងឺ"])
                print(f"[ADMIN CHAT] CREATE DISEASE - Extracted name: '{name}'")
                return {
                    "action": "create_disease",
                    "data": {
                        "name": name,
                        "pathogen_type": self._extract_pathogen_type(message),
                        "description": message
                    },
                    "query": ""
                }
            elif "symptom" in message_lower or "រោគសញ្ញា" in message_lower:
                name = self._extract_entity_name(message, ["symptom", "រោគសញ្ញា"])
                print(f"[ADMIN CHAT] CREATE SYMPTOM - Extracted name: '{name}'")
                return {
                    "action": "create_symptom",
                    "data": {"label": name, "category": "leaf"},
                    "query": ""
                }
        
        # UPDATE patterns
        update_keywords = ["update", "edit", "modify", "change", "កែសម្រួល", "ធ្វើបច្ចុប្បន្នភាព"]
        if any(keyword in message_lower for keyword in update_keywords):
            if "disease" in message_lower or "ជំងឺ" in message_lower:
                name = self._extract_entity_name(message, ["disease", "ជំងឺ"])
                return {
                    "action": "update_disease",
                    "data": {"disease_name": name, "name": name, "description": message},
                    "query": ""
                }
            elif "symptom" in message_lower or "រោគសញ្ញា" in message_lower:
                name = self._extract_entity_name(message, ["symptom", "រោគសញ្ញា"])
                return {
                    "action": "update_symptom",
                    "data": {"symptom_label": name, "label": name},
                    "query": ""
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
        
        # FALLBACK TO AI (if keyword matching failed)
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
- help: Show available commands
- chat: General conversation

Return JSON only:
{{
  "action": "action_name",
  "data": {{}},  // extracted entities if any
  "query": ""  // search query if search action
}}
"""
        
        try:
            response = await self.ollama.generate(
                prompt=prompt,
                temperature=0.1,
                json_mode=True
            )
            
            # Parse JSON
            intent = json.loads(response)
            return intent
        
        except Exception:
            # Fallback to chat
            return {"action": "chat", "data": {}, "query": ""}
    
    def _extract_entity_name(self, message: str, keywords: list[str]) -> str:
        """Extract entity name from message by removing keywords."""
        message_lower = message.lower()
        
        # Remove common action words
        for word in ["delete", "remove", "create", "add", "update", "edit", "list", "show", 
                     "លុប", "បង្កើត", "កែសម្រួល", "បង្ហាញ", "new", "the", "a", "an"]:
            message_lower = message_lower.replace(word, " ")
        
        # Remove entity type keywords
        for keyword in keywords:
            message_lower = message_lower.replace(keyword, " ")
        
        # Extract remaining text (likely the entity name)
        name = " ".join(message_lower.split()).strip()
        
        # If name is just a number (like "1"), return it as-is
        # If empty, return "unknown"
        return name if name else "unknown"
    
    def _extract_pathogen_type(self, message: str) -> str:
        """Extract pathogen type from message."""
        message_lower = message.lower()
        
        if "fungal" in message_lower or "fungus" in message_lower:
            return "fungal"
        elif "bacterial" in message_lower or "bacteria" in message_lower:
            return "bacterial"
        elif "viral" in message_lower or "virus" in message_lower:
            return "viral"
        elif "pest" in message_lower or "insect" in message_lower:
            return "pest"
        else:
            return "fungal"  # Default
    
    async def _list_diseases(
        self,
        db: AsyncSession,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        """List all diseases in the database."""
        result = await db.execute(
            select(Disease).where(Disease.is_published == True).order_by(Disease.slug)
        )
        diseases = list(result.scalars().all())

        if not diseases:
            message = self._translate(
                "No diseases found in the database.",
                "រកមិនឃើញជំងឺក្នុងមូលដ្ឋានទិន្នន័យទេ។",
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

    async def _create_disease(
        self,
        data: dict,
        db: AsyncSession,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Create a new disease in the database."""
        name = data.get("name") or data.get("disease_name")

        if not name:
            message = self._translate(
                "Please provide a disease name. Example: 'Create disease Rust with pathogen fungal'",
                "សូមផ្តល់ឈ្មោះជំងឺ។ ឧទាហរណ៍: 'បង្កើតជំងឺ Rust ដែលមានមេរោគ fungal'",
                locale,
            )
            return message, []

        try:
            slug = str(name).lower().strip().replace(" ", "-").replace("_", "-")
            result = await db.execute(select(Disease).where(Disease.slug == slug))
            existing = result.scalar_one_or_none()

            if existing:
                message = self._translate(
                    f"Disease '{name}' already exists.",
                    f"ជំងឺ '{name}' មានរួចហើយ។",
                    locale,
                )
                return message, []

            raw_pathogen = str(data.get("pathogen_type", "fungal")).lower()
            try:
                pathogen_type = PathogenType(raw_pathogen)
            except ValueError:
                pathogen_type = PathogenType.FUNGAL

            new_disease = Disease(
                slug=slug,
                pathogen_type=pathogen_type,
                is_published=False,  # Draft by default
            )

            db.add(new_disease)
            await db.flush()

            # Add English name translation
            db.add(
                Translation(
                    entity_type="disease",
                    entity_id=new_disease.id,
                    locale="en",
                    field="name",
                    value=str(name),
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

            await db.commit()
            await db.refresh(new_disease)

            message = self._translate(
                f"✅ Successfully created disease '{name}' (ID: {new_disease.id}).\n\nIt's currently in DRAFT mode. You can edit it in the admin panel to add symptoms, treatment, and translations, then publish it.",
                f"✅ បានបង្កើតជំងឺ '{name}' ដោយជោគជ័យ (ID: {new_disease.id})។\n\nវាស្ថិតក្នុងរបៀបសេចក្តីព្រាងបច្ចុប្បន្ន។ អ្នកអាចកែសម្រួលវានៅក្នុងផ្ទាំងអ្នកគ្រប់គ្រង ដើម្បីបន្ថែមរោគសញ្ញា ការព្យាបាល និងការបកប្រែ បន្ទាប់មកផ្សព្វផ្សាយវា។",
                locale,
            )

            return message, [{
                "action": "created_disease",
                "disease_id": new_disease.id,
                "disease_name": name,
            }]

        except Exception as e:
            message = self._translate(
                f"❌ Failed to create disease: {e!s}",
                f"❌ បរាជ័យក្នុងការបង្កើតជំងឺ: {e!s}",
                locale,
            )
            return message, []

    async def _update_disease(
        self,
        data: dict,
        db: AsyncSession,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Update an existing disease."""
        disease_name = data.get("disease_name") or data.get("name")

        if not disease_name:
            message = self._translate(
                "Please specify which disease to update.",
                "សូមបញ្ជាក់ជំងឺមួយណាដែលត្រូវធ្វើបច្ចុប្បន្នភាព។",
                locale,
            )
            return message, []

        try:
            disease = None
            if str(disease_name).isdigit():
                res = await db.execute(select(Disease).where(Disease.id == int(disease_name)))
                disease = res.scalar_one_or_none()

            if not disease:
                slug_query = str(disease_name).lower().strip().replace(" ", "-")
                res = await db.execute(select(Disease).where(Disease.slug.ilike(f"%{slug_query}%")))
                disease = res.scalar_one_or_none()

            if not disease:
                res_trans = await db.execute(
                    select(Translation.entity_id).where(
                        Translation.entity_type == "disease",
                        Translation.field == "name",
                        Translation.value.ilike(f"%{disease_name}%"),
                    )
                )
                matching_id = res_trans.scalar_one_or_none()
                if matching_id:
                    res_by_id = await db.execute(select(Disease).where(Disease.id == matching_id))
                    disease = res_by_id.scalar_one_or_none()

            if not disease:
                message = self._translate(
                    f"Disease '{disease_name}' not found.",
                    f"រកមិនឃើញជំងឺ '{disease_name}' ទេ។",
                    locale,
                )
                return message, []

            updated_fields: list[str] = []
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
                if trans:
                    trans.value = str(data["description"])
                else:
                    db.add(
                        Translation(
                            entity_type="disease",
                            entity_id=disease.id,
                            locale="en",
                            field="description",
                            value=str(data["description"]),
                        )
                    )
                updated_fields.append("description")

            if "pathogen_type" in data:
                try:
                    disease.pathogen_type = PathogenType(str(data["pathogen_type"]).lower())
                    updated_fields.append("pathogen_type")
                except ValueError:
                    pass

            await db.commit()
            display_name = disease.slug.replace("-", " ").title()

            message = self._translate(
                f"✅ Updated disease '{display_name}'. Fields updated: {', '.join(updated_fields)}",
                f"✅ បានធ្វើបច្ចុប្បន្នភាពជំងឺ '{display_name}'។ វាលធ្វើបច្ចុប្បន្នភាព: {', '.join(updated_fields)}",
                locale,
            )

            return message, [{
                "action": "updated_disease",
                "disease_id": disease.id,
                "disease_name": display_name,
                "fields_updated": updated_fields,
            }]

        except Exception as e:
            message = self._translate(
                f"❌ Failed to update disease: {e!s}",
                f"❌ បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពជំងឺ: {e!s}",
                locale,
            )
            return message, []

    async def _delete_disease(
        self,
        data: dict,
        db: AsyncSession,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Delete a disease from the database."""
        disease_name = data.get("disease_name") or data.get("name")
        disease_id = data.get("disease_id") or data.get("id")

        if not disease_name and not disease_id:
            message = self._translate(
                "Please specify which disease to delete. Example: 'delete disease Rust' or 'delete disease 1'",
                "សូមបញ្ជាក់ជំងឺមួយណាដែលត្រូវលុប។ ឧទាហរណ៍: 'លុបជំងឺ Rust' ឬ 'លុបជំងឺ 1'",
                locale,
            )
            return message, []

        try:
            disease = None
            if disease_id is not None or (disease_name and str(disease_name).isdigit()):
                did = int(disease_id if disease_id is not None else str(disease_name))
                result = await db.execute(select(Disease).where(Disease.id == did))
                disease = result.scalar_one_or_none()

            if not disease and disease_name:
                slug_query = str(disease_name).lower().strip().replace(" ", "-")
                result = await db.execute(select(Disease).where(Disease.slug == slug_query))
                disease = result.scalar_one_or_none()

            if not disease and disease_name:
                res_trans = await db.execute(
                    select(Translation.entity_id).where(
                        Translation.entity_type == "disease",
                        Translation.field == "name",
                        Translation.value.ilike(f"%{disease_name}%"),
                    )
                )
                matching_id = res_trans.scalar_one_or_none()
                if matching_id:
                    result = await db.execute(select(Disease).where(Disease.id == matching_id))
                    disease = result.scalar_one_or_none()

            if not disease:
                message = self._translate(
                    f"Disease '{disease_name or disease_id}' not found. Try 'list diseases' to see available diseases.",
                    f"រកមិនឃើញជំងឺ '{disease_name or disease_id}' ទេ។ សាកល្បង 'បង្ហាញជំងឺទាំងអស់' ដើម្បីមើលជំងឺដែលមាន។",
                    locale,
                )
                return message, []

            did = disease.id
            display_name = disease.slug.replace("-", " ").title()

            # Delete associated translations
            t_res = await db.execute(
                select(Translation).where(
                    Translation.entity_type == "disease",
                    Translation.entity_id == did,
                )
            )
            for t in t_res.scalars().all():
                await db.delete(t)

            await db.delete(disease)
            await db.commit()

            message = self._translate(
                f"✅ Successfully deleted disease '{display_name}' (ID: {did}).",
                f"✅ បានលុបជំងឺ '{display_name}' (ID: {did}) ដោយជោគជ័យ។",
                locale,
            )

            return message, [{
                "action": "deleted_disease",
                "disease_id": did,
                "disease_name": display_name,
            }]

        except Exception as e:
            message = self._translate(
                f"❌ Failed to delete disease: {e!s}",
                f"❌ បរាជ័យក្នុងការលុបជំងឺ: {e!s}",
                locale,
            )
            return message, []

    async def _create_symptom(
        self,
        data: dict,
        db: AsyncSession,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Create a new symptom in the database."""
        label = data.get("label") or data.get("symptom_label")

        if not label:
            message = self._translate(
                "Please provide a symptom name. Example: 'Create symptom yellow spots on leaves'",
                "សូមផ្តល់ឈ្មោះរោគសញ្ញា។ ឧទាហរណ៍: 'បង្កើតរោគសញ្ញា ស្នាមលឿងលើស្លឹក'",
                locale,
            )
            return message, []

        try:
            cat_code = str(data.get("category", "leaf")).lower()
            cat_res = await db.execute(
                select(SymptomCategory).where(SymptomCategory.code == cat_code)
            )
            category = cat_res.scalar_one_or_none()
            if not category:
                first_cat = await db.execute(select(SymptomCategory).order_by(SymptomCategory.id))
                category = first_cat.scalars().first()
            category_id = category.id if category else 1

            code = f"SYM-{str(label).lower().strip().replace(' ', '-')[:30]}"
            existing_s = await db.execute(select(Symptom).where(Symptom.code == code))
            if existing_s.scalar_one_or_none():
                code = f"{code}-{uuid.uuid4().hex[:4]}"

            new_symptom = Symptom(
                code=code,
                category_id=category_id,
                is_environmental=False,
            )

            db.add(new_symptom)
            await db.flush()

            # Add translation
            db.add(
                Translation(
                    entity_type="symptom",
                    entity_id=new_symptom.id,
                    locale="en",
                    field="label",
                    value=str(label),
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

            await db.commit()
            await db.refresh(new_symptom)

            message = self._translate(
                f"✅ Successfully created symptom '{label}' (Code: {code}, ID: {new_symptom.id}).",
                f"✅ បានបង្កើតរោគសញ្ញា '{label}' (កូដ: {code}, ID: {new_symptom.id}) ដោយជោគជ័យ។",
                locale,
            )

            return message, [{
                "action": "created_symptom",
                "symptom_id": new_symptom.id,
                "symptom_code": code,
                "symptom_label": str(label),
            }]

        except Exception as e:
            message = self._translate(
                f"❌ Failed to create symptom: {e!s}",
                f"❌ បរាជ័យក្នុងការបង្កើតរោគសញ្ញា: {e!s}",
                locale,
            )
            return message, []

    async def _update_symptom(
        self,
        data: dict,
        db: AsyncSession,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Update an existing symptom."""
        symptom_label = data.get("symptom_label") or data.get("label")

        if not symptom_label:
            message = self._translate(
                "Please specify which symptom to update.",
                "សូមបញ្ជាក់រោគសញ្ញាមួយណាដែលត្រូវធ្វើបច្ចុប្បន្នភាព។",
                locale,
            )
            return message, []

        try:
            symptom = None
            if str(symptom_label).isdigit():
                res = await db.execute(select(Symptom).where(Symptom.id == int(symptom_label)))
                symptom = res.scalar_one_or_none()

            if not symptom:
                res = await db.execute(select(Symptom).where(Symptom.code.ilike(f"%{symptom_label}%")))
                symptom = res.scalar_one_or_none()

            if not symptom:
                res_trans = await db.execute(
                    select(Translation.entity_id).where(
                        Translation.entity_type == "symptom",
                        Translation.field == "label",
                        Translation.value.ilike(f"%{symptom_label}%"),
                    )
                )
                matching_id = res_trans.scalar_one_or_none()
                if matching_id:
                    res_s = await db.execute(select(Symptom).where(Symptom.id == matching_id))
                    symptom = res_s.scalar_one_or_none()

            if not symptom:
                message = self._translate(
                    f"Symptom '{symptom_label}' not found.",
                    f"រកមិនឃើញរោគសញ្ញា '{symptom_label}' ទេ។",
                    locale,
                )
                return message, []

            updated_fields: list[str] = []
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
                    trans.value = str(val_en)
                else:
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
                    trans.value = str(data["label_km"])
                else:
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

            await db.commit()

            message = self._translate(
                f"✅ Updated symptom '{symptom.code}'. Fields updated: {', '.join(updated_fields)}",
                f"✅ បានធ្វើបច្ចុប្បន្នភាពរោគសញ្ញា '{symptom.code}'។ វាលធ្វើបច្ចុប្បន្នភាព: {', '.join(updated_fields)}",
                locale,
            )

            return message, [{
                "action": "updated_symptom",
                "symptom_id": symptom.id,
                "symptom_code": symptom.code,
                "fields_updated": updated_fields,
            }]

        except Exception as e:
            message = self._translate(
                f"❌ Failed to update symptom: {e!s}",
                f"❌ បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពរោគសញ្ញា: {e!s}",
                locale,
            )
            return message, []

    async def _delete_symptom(
        self,
        data: dict,
        db: AsyncSession,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Delete a symptom from the database."""
        symptom_label = data.get("symptom_label") or data.get("label")
        symptom_id = data.get("symptom_id") or data.get("id")

        if not symptom_label and not symptom_id:
            message = self._translate(
                "Please specify which symptom to delete. Example: 'delete symptom yellow spots' or 'delete symptom 1'",
                "សូមបញ្ជាក់រោគសញ្ញាមួយណាដែលត្រូវលុប។ ឧទាហរណ៍: 'លុបរោគសញ្ញា ស្នាមលឿង' ឬ 'លុបរោគសញ្ញា 1'",
                locale,
            )
            return message, []

        try:
            symptom = None
            if symptom_id is not None or (symptom_label and str(symptom_label).isdigit()):
                sid = int(symptom_id if symptom_id is not None else str(symptom_label))
                result = await db.execute(select(Symptom).where(Symptom.id == sid))
                symptom = result.scalar_one_or_none()

            if not symptom and symptom_label:
                result = await db.execute(select(Symptom).where(Symptom.code == str(symptom_label)))
                symptom = result.scalar_one_or_none()

            if not symptom and symptom_label:
                res_trans = await db.execute(
                    select(Translation.entity_id).where(
                        Translation.entity_type == "symptom",
                        Translation.field == "label",
                        Translation.value.ilike(f"%{symptom_label}%"),
                    )
                )
                matching_id = res_trans.scalar_one_or_none()
                if matching_id:
                    result = await db.execute(select(Symptom).where(Symptom.id == matching_id))
                    symptom = result.scalar_one_or_none()

            if not symptom:
                message = self._translate(
                    f"Symptom '{symptom_label or symptom_id}' not found. Try 'list symptoms' to see available symptoms.",
                    f"រកមិនឃើញរោគសញ្ញា '{symptom_label or symptom_id}' ទេ។ សាកល្បង 'បង្ហាញរោគសញ្ញាទាំងអស់' ដើម្បីមើលរោគសញ្ញាដែលមាន។",
                    locale,
                )
                return message, []

            sid = symptom.id
            scode = symptom.code

            # Delete translations
            t_res = await db.execute(
                select(Translation).where(
                    Translation.entity_type == "symptom",
                    Translation.entity_id == sid,
                )
            )
            for t in t_res.scalars().all():
                await db.delete(t)

            await db.delete(symptom)
            await db.commit()

            message = self._translate(
                f"✅ Successfully deleted symptom '{scode}' (ID: {sid}).",
                f"✅ បានលុបរោគសញ្ញា '{scode}' (ID: {sid}) ដោយជោគជ័យ។",
                locale,
            )

            return message, [{
                "action": "deleted_symptom",
                "symptom_id": sid,
                "symptom_code": scode,
            }]

        except Exception as e:
            message = self._translate(
                f"❌ Failed to delete symptom: {e!s}",
                f"❌ បរាជ័យក្នុងការលុបរោគសញ្ញា: {e!s}",
                locale,
            )
            return message, []

    async def _search_data(
        self,
        query: str,
        db: AsyncSession,
        locale: str,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Search for diseases or symptoms."""
        # Search diseases in translations and slugs
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

        # Search symptoms in translations and codes
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
            disease_list = "\n".join([f"• {d.slug.replace('-', ' ').title()} ({d.pathogen_type.value if hasattr(d.pathogen_type, 'value') else d.pathogen_type})" for d in diseases])
            result_parts.append(self._translate(
                f"**Diseases ({len(diseases)}):**\n{disease_list}",
                f"**ជំងឺ ({len(diseases)}):**\n{disease_list}",
                locale,
            ))

        if symptoms:
            symptom_list = "\n".join([f"• {s.code}" for s in symptoms])
            result_parts.append(self._translate(
                f"\n**Symptoms ({len(symptoms)}):**\n{symptom_list}",
                f"\n**រោគសញ្ញា ({len(symptoms)}):**\n{symptom_list}",
                locale,
            ))

        if not diseases and not symptoms:
            message = self._translate(
                f"No results found for '{query}'.",
                f"រកមិនឃើញលទ្ធផលសម្រាប់ '{query}' ទេ។",
                locale,
            )
            return message, []

        message = "\n".join(result_parts)

        return message, [{
            "action": "searched",
            "query": query,
            "diseases_found": len(diseases),
            "symptoms_found": len(symptoms),
        }]
    
    async def _general_chat(
        self,
        message: str,
        history: list[dict],
        locale: str
    ) -> str:
        """Handle general conversation."""
        
        context = "\n".join([
            f"{msg['role']}: {msg['content']}" for msg in history[-6:]
        ])
        
        prompt = f"""You are an AI assistant for the Sunflower Expert System admin panel.
You can help admins and agronomists manage diseases and symptoms in the database.

Conversation history:
{context}

User: {message}

{"Respond in Khmer language." if locale == "km" else "Respond in English."}
Be helpful and guide them on available commands if they seem unsure.

Available commands:
- List all diseases
- List all symptoms
- Create a new disease
- Update existing disease
- Delete a disease
- Search for data

Keep response under 100 words.
"""
        
        try:
            response = await self.ollama.generate(prompt=prompt, temperature=0.7)
            return response
        except Exception:
            return self._translate(
                "I'm here to help you manage diseases and symptoms. What would you like to do?",
                "ខ្ញុំនៅទីនេះដើម្បីជួយអ្នកគ្រប់គ្រងជំងឺនិងរោគសញ្ញា។ តើអ្នកចង់ធ្វើអ្វី?",
                locale
            )
    
    async def _get_help_message(self, locale: str) -> str:
        """Get help message with available commands."""
        
        help_en = """🤖 **AI Admin Assistant - Available Commands:**

**View Data (All Users):**
• "List all diseases"
• "List all symptoms"
• "Search for [query]"

**Create (Experts & Admins Only):**
• "Create disease [name] with pathogen [type]"
• "Add symptom [description]"

**Update (Experts & Admins Only):**
• "Update disease [name] description to [text]"
• "Change symptom [name]"

**Delete (Admins Only):**
• "Delete disease [name]"
• "Delete symptom [name]"

**Permission Levels:**
• Growers: View only, AI chat assistance
• Experts: View, Create, Update (no delete)
• Admins: Full access (View, Create, Update, Delete)

Just ask naturally and I'll understand! 😊
"""
        
        help_km = """🤖 **ជំនួយការអ្នកគ្រប់គ្រង AI - ពាក្យបញ្ជាដែលមាន:**

**មើលទិន្នន័យ (អ្នកប្រើទាំងអស់):**
• "បង្ហាញជំងឺទាំងអស់"
• "បង្ហាញរោគសញ្ញាទាំងអស់"
• "ស្វែងរក [query]"

**បង្កើត (អ្នកជំនាញ និងអ្នកគ្រប់គ្រងប៉ុណ្ណោះ):**
• "បង្កើតជំងឺ [name]"
• "បង្កើតរោគសញ្ញា [description]"

**ធ្វើបច្ចុប្បន្នភាព (អ្នកជំនាញ និងអ្នកគ្រប់គ្រងប៉ុណ្ណោះ):**
• "ធ្វើបច្ចុប្បន្នភាពជំងឺ [name]"
• "ផ្លាស់ប្តូររោគសញ្ញា [name]"

**លុប (អ្នកគ្រប់គ្រងប៉ុណ្ណោះ):**
• "លុបជំងឺ [name]"
• "លុបរោគសញ្ញា [name]"

**កម្រិតសិទ្ធិ:**
• កសិករ: មើលតែប៉ុណ្ណោះ, AI ជួយ
• អ្នកជំនាញ: មើល, បង្កើត, កែប្រែ (មិនអាចលុប)
• អ្នកគ្រប់គ្រង: សិទ្ធិពេញលេញ (មើល, បង្កើត, កែប្រែ, លុប)

គ្រាន់តែសួរធម្មតា ហើយខ្ញុំនឹងយល់! 😊
"""
        
        return help_km if locale == "km" else help_en
    
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
