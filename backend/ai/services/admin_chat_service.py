"""AI Admin Chat Service

Allows admin/expert users to modify diseases and symptoms through natural language.
Provides a conversational interface for database operations.
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.config import ai_config
from ai.schemas.ai_schemas import AIChatRequest, AIChatResponse
from ai.services.ollama_service import get_ollama_service
from app.models.disease import Disease
from app.models.symptom import Symptom


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
        print(f"\n[ADMIN CHAT] ===== NEW REQUEST =====")
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
            print(f"[ADMIN CHAT] DELETE keyword detected!")
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
            print(f"[ADMIN CHAT] CREATE keyword detected!")
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
        locale: str
    ) -> tuple[str, list[str]]:
        """List all diseases in the database."""
        
        result = await db.execute(
            select(Disease).where(Disease.is_published == True).order_by(Disease.name)
        )
        diseases = result.scalars().all()
        
        if not diseases:
            message = self._translate(
                "No diseases found in the database.",
                "រកមិនឃើញជំងឺក្នុងមូលដ្ឋានទិន្នន័យទេ។",
                locale
            )
            return message, []
        
        disease_list = "\n".join([
            f"• {d.name} ({d.pathogen_type})" for d in diseases[:20]
        ])
        
        total = len(diseases)
        showing = min(20, total)
        
        message = self._translate(
            f"Found {total} diseases. Showing first {showing}:\n\n{disease_list}",
            f"រកឃើញជំងឺ {total}។ បង្ហាញ {showing} ដំបូង:\n\n{disease_list}",
            locale
        )
        
        return message, [{"action": "listed_diseases", "count": total}]
    
    async def _list_symptoms(
        self,
        db: AsyncSession,
        locale: str
    ) -> tuple[str, list[str]]:
        """List all symptoms in the database."""
        
        result = await db.execute(
            select(Symptom).order_by(Symptom.category, Symptom.label_en)
        )
        symptoms = result.scalars().all()
        
        if not symptoms:
            message = self._translate(
                "No symptoms found in the database.",
                "រកមិនឃើញរោគសញ្ញាក្នុងមូលដ្ឋានទិន្នន័យទេ។",
                locale
            )
            return message, []
        
        # Group by category
        by_category: dict[str, list] = {}
        for s in symptoms:
            if s.category not in by_category:
                by_category[s.category] = []
            by_category[s.category].append(s)
        
        symptom_list = []
        for category, items in by_category.items():
            symptom_list.append(f"\n**{category.upper()}:**")
            for item in items[:10]:
                symptom_list.append(f"  • {item.label_en} ({item.code})")
        
        message = self._translate(
            f"Found {len(symptoms)} symptoms:\n" + "\n".join(symptom_list),
            f"រកឃើញរោគសញ្ញា {len(symptoms)}:\n" + "\n".join(symptom_list),
            locale
        )
        
        return message, [{"action": "listed_symptoms", "count": len(symptoms)}]
    
    async def _create_disease(
        self,
        data: dict,
        db: AsyncSession,
        locale: str
    ) -> tuple[str, list[str]]:
        """Create a new disease in the database."""
        
        # Extract data (this is a simplified version)
        # In production, you'd want more validation
        
        if not data.get("name"):
            message = self._translate(
                "Please provide a disease name. Example: 'Create disease Rust with pathogen fungal'",
                "សូមផ្តល់ឈ្មោះជំងឺ។ ឧទាហរណ៍: 'បង្កើតជំងឺ Rust ដែលមានមេរោគ fungal'",
                locale
            )
            return message, []
        
        try:
            # Check if disease already exists
            result = await db.execute(
                select(Disease).where(Disease.name == data["name"])
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                message = self._translate(
                    f"Disease '{data['name']}' already exists.",
                    f"ជំងឺ '{data['name']}' មានរួចហើយ។",
                    locale
                )
                return message, []
            
            # Create new disease
            new_disease = Disease(
                name=data["name"],
                pathogen_type=data.get("pathogen_type", "fungal"),
                description_en=data.get("description", f"New disease: {data['name']}"),
                is_published=False,  # Draft by default
            )
            
            db.add(new_disease)
            await db.commit()
            await db.refresh(new_disease)
            
            message = self._translate(
                f"✅ Successfully created disease '{data['name']}' (ID: {new_disease.id}).\n\nIt's currently in DRAFT mode. You can edit it in the admin panel to add symptoms, treatment, and translations, then publish it.",
                f"✅ បានបង្កើតជំងឺ '{data['name']}' ដោយជោគជ័យ (ID: {new_disease.id})។\n\nវាស្ថិតក្នុងរបៀបសេចក្តីព្រាងបច្ចុប្បន្ន។ អ្នកអាចកែសម្រួលវានៅក្នុងផ្ទាំងអ្នកគ្រប់គ្រង ដើម្បីបន្ថែមរោគសញ្ញា ការព្យាបាល និងការបកប្រែ បន្ទាប់មកផ្សព្វផ្សាយវា។",
                locale
            )
            
            return message, [{
                "action": "created_disease",
                "disease_id": new_disease.id,
                "disease_name": new_disease.name
            }]
        
        except Exception as e:
            message = self._translate(
                f"❌ Failed to create disease: {str(e)}",
                f"❌ បរាជ័យក្នុងការបង្កើតជំងឺ: {str(e)}",
                locale
            )
            return message, []
    
    async def _update_disease(
        self,
        data: dict,
        db: AsyncSession,
        locale: str
    ) -> tuple[str, list[str]]:
        """Update an existing disease."""
        
        disease_name = data.get("disease_name") or data.get("name")
        
        if not disease_name:
            message = self._translate(
                "Please specify which disease to update.",
                "សូមបញ្ជាក់ជំងឺមួយណាដែលត្រូវធ្វើបច្ចុប្បន្នភាព។",
                locale
            )
            return message, []
        
        try:
            result = await db.execute(
                select(Disease).where(Disease.name.ilike(f"%{disease_name}%"))
            )
            disease = result.scalar_one_or_none()
            
            if not disease:
                message = self._translate(
                    f"Disease '{disease_name}' not found.",
                    f"រកមិនឃើញជំងឺ '{disease_name}' ទេ។",
                    locale
                )
                return message, []
            
            # Update fields
            updated_fields = []
            if "description" in data:
                disease.description_en = data["description"]
                updated_fields.append("description")
            
            if "pathogen_type" in data:
                disease.pathogen_type = data["pathogen_type"]
                updated_fields.append("pathogen_type")
            
            await db.commit()
            
            message = self._translate(
                f"✅ Updated disease '{disease.name}'. Fields updated: {', '.join(updated_fields)}",
                f"✅ បានធ្វើបច្ចុប្បន្នភាពជំងឺ '{disease.name}'។ វាលធ្វើបច្ចុប្បន្នភាព: {', '.join(updated_fields)}",
                locale
            )
            
            return message, [{
                "action": "updated_disease",
                "disease_id": disease.id,
                "disease_name": disease.name,
                "fields_updated": updated_fields
            }]
        
        except Exception as e:
            message = self._translate(
                f"❌ Failed to update disease: {str(e)}",
                f"❌ បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពជំងឺ: {str(e)}",
                locale
            )
            return message, []
    
    async def _delete_disease(
        self,
        data: dict,
        db: AsyncSession,
        locale: str
    ) -> tuple[str, list[str]]:
        """Delete a disease from the database."""
        
        disease_name = data.get("disease_name") or data.get("name")
        disease_id = data.get("disease_id") or data.get("id")
        
        if not disease_name and not disease_id:
            message = self._translate(
                "Please specify which disease to delete. Example: 'delete disease Rust' or 'delete disease 1'",
                "សូមបញ្ជាក់ជំងឺមួយណាដែលត្រូវលុប។ ឧទាហរណ៍: 'លុបជំងឺ Rust' ឬ 'លុបជំងឺ 1'",
                locale
            )
            return message, []
        
        try:
            # Try to find by ID first (if it's a number)
            disease = None
            
            if disease_id or (disease_name and disease_name.isdigit()):
                disease_id_to_find = disease_id or int(disease_name)
                result = await db.execute(
                    select(Disease).where(Disease.id == disease_id_to_find)
                )
                disease = result.scalar_one_or_none()
            
            # If not found by ID, try by name
            if not disease and disease_name:
                result = await db.execute(
                    select(Disease).where(Disease.name.ilike(f"%{disease_name}%"))
                )
                disease = result.scalar_one_or_none()
            
            if not disease:
                message = self._translate(
                    f"Disease '{disease_name or disease_id}' not found. Try 'list diseases' to see available diseases.",
                    f"រកមិនឃើញជំងឺ '{disease_name or disease_id}' ទេ។ សាកល្បង 'បង្ហាញជំងឺទាំងអស់' ដើម្បីមើលជំងឺដែលមាន។",
                    locale
                )
                return message, []
            
            disease_id = disease.id
            disease_full_name = disease.name
            
            await db.delete(disease)
            await db.commit()
            
            message = self._translate(
                f"✅ Successfully deleted disease '{disease_full_name}' (ID: {disease_id}).",
                f"✅ បានលុបជំងឺ '{disease_full_name}' (ID: {disease_id}) ដោយជោគជ័យ។",
                locale
            )
            
            return message, [{
                "action": "deleted_disease",
                "disease_id": disease_id,
                "disease_name": disease_full_name
            }]
        
        except Exception as e:
            message = self._translate(
                f"❌ Failed to delete disease: {str(e)}",
                f"❌ បរាជ័យក្នុងការលុបជំងឺ: {str(e)}",
                locale
            )
            return message, []
    
    async def _create_symptom(
        self,
        data: dict,
        db: AsyncSession,
        locale: str
    ) -> tuple[str, list[str]]:
        """Create a new symptom in the database."""
        
        if not data.get("label"):
            message = self._translate(
                "Please provide a symptom name. Example: 'Create symptom yellow spots on leaves'",
                "សូមផ្តល់ឈ្មោះរោគសញ្ញា។ ឧទាហរណ៍: 'បង្កើតរោគសញ្ញា ស្នាមលឿងលើស្លឹក'",
                locale
            )
            return message, []
        
        try:
            # Check if symptom already exists
            result = await db.execute(
                select(Symptom).where(Symptom.label_en.ilike(f"%{data['label']}%"))
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                message = self._translate(
                    f"Symptom '{data['label']}' already exists.",
                    f"រោគសញ្ញា '{data['label']}' មានរួចហើយ។",
                    locale
                )
                return message, []
            
            # Generate code automatically
            category = data.get("category", "leaf").upper()
            # Get count of symptoms in this category
            count_result = await db.execute(
                select(Symptom).where(Symptom.category == category.lower())
            )
            existing_count = len(count_result.scalars().all())
            code = f"{category[:4]}-{existing_count + 1:03d}"
            
            # Create new symptom
            new_symptom = Symptom(
                code=code,
                label_en=data["label"],
                label_km=data.get("label_km", data["label"]),  # Default to English if Khmer not provided
                category=category.lower(),
            )
            
            db.add(new_symptom)
            await db.commit()
            await db.refresh(new_symptom)
            
            message = self._translate(
                f"✅ Successfully created symptom '{data['label']}' (Code: {code}, ID: {new_symptom.id}).",
                f"✅ បានបង្កើតរោគសញ្ញា '{data['label']}' (កូដ: {code}, ID: {new_symptom.id}) ដោយជោគជ័យ។",
                locale
            )
            
            return message, [{
                "action": "created_symptom",
                "symptom_id": new_symptom.id,
                "symptom_code": code,
                "symptom_label": new_symptom.label_en
            }]
        
        except Exception as e:
            message = self._translate(
                f"❌ Failed to create symptom: {str(e)}",
                f"❌ បរាជ័យក្នុងការបង្កើតរោគសញ្ញា: {str(e)}",
                locale
            )
            return message, []
    
    async def _update_symptom(
        self,
        data: dict,
        db: AsyncSession,
        locale: str
    ) -> tuple[str, list[str]]:
        """Update an existing symptom."""
        
        symptom_label = data.get("symptom_label") or data.get("label")
        
        if not symptom_label:
            message = self._translate(
                "Please specify which symptom to update.",
                "សូមបញ្ជាក់រោគសញ្ញាមួយណាដែលត្រូវធ្វើបច្ចុប្បន្នភាព។",
                locale
            )
            return message, []
        
        try:
            result = await db.execute(
                select(Symptom).where(Symptom.label_en.ilike(f"%{symptom_label}%"))
            )
            symptom = result.scalar_one_or_none()
            
            if not symptom:
                message = self._translate(
                    f"Symptom '{symptom_label}' not found.",
                    f"រកមិនឃើញរោគសញ្ញា '{symptom_label}' ទេ។",
                    locale
                )
                return message, []
            
            # Update fields
            updated_fields = []
            if "label_en" in data and data["label_en"]:
                symptom.label_en = data["label_en"]
                updated_fields.append("label_en")
            
            if "label_km" in data and data["label_km"]:
                symptom.label_km = data["label_km"]
                updated_fields.append("label_km")
            
            if "category" in data and data["category"]:
                symptom.category = data["category"].lower()
                updated_fields.append("category")
            
            await db.commit()
            
            message = self._translate(
                f"✅ Updated symptom '{symptom.label_en}'. Fields updated: {', '.join(updated_fields)}",
                f"✅ បានធ្វើបច្ចុប្បន្នភាពរោគសញ្ញា '{symptom.label_en}'។ វាលធ្វើបច្ចុប្បន្នភាព: {', '.join(updated_fields)}",
                locale
            )
            
            return message, [{
                "action": "updated_symptom",
                "symptom_id": symptom.id,
                "symptom_label": symptom.label_en,
                "fields_updated": updated_fields
            }]
        
        except Exception as e:
            message = self._translate(
                f"❌ Failed to update symptom: {str(e)}",
                f"❌ បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពរោគសញ្ញា: {str(e)}",
                locale
            )
            return message, []
    
    async def _delete_symptom(
        self,
        data: dict,
        db: AsyncSession,
        locale: str
    ) -> tuple[str, list[str]]:
        """Delete a symptom from the database."""
        
        symptom_label = data.get("symptom_label") or data.get("label")
        symptom_id = data.get("symptom_id") or data.get("id")
        
        if not symptom_label and not symptom_id:
            message = self._translate(
                "Please specify which symptom to delete. Example: 'delete symptom yellow spots' or 'delete symptom 1'",
                "សូមបញ្ជាក់រោគសញ្ញាមួយណាដែលត្រូវលុប។ ឧទាហរណ៍: 'លុបរោគសញ្ញា ស្នាមលឿង' ឬ 'លុបរោគសញ្ញា 1'",
                locale
            )
            return message, []
        
        try:
            # Try to find by ID first (if it's a number)
            symptom = None
            
            if symptom_id or (symptom_label and symptom_label.isdigit()):
                symptom_id_to_find = symptom_id or int(symptom_label)
                result = await db.execute(
                    select(Symptom).where(Symptom.id == symptom_id_to_find)
                )
                symptom = result.scalar_one_or_none()
            
            # If not found by ID, try by label
            if not symptom and symptom_label:
                result = await db.execute(
                    select(Symptom).where(Symptom.label_en.ilike(f"%{symptom_label}%"))
                )
                symptom = result.scalar_one_or_none()
            
            if not symptom:
                message = self._translate(
                    f"Symptom '{symptom_label or symptom_id}' not found. Try 'list symptoms' to see available symptoms.",
                    f"រកមិនឃើញរោគសញ្ញា '{symptom_label or symptom_id}' ទេ។ សាកល្បង 'បង្ហាញរោគសញ្ញាទាំងអស់' ដើម្បីមើលរោគសញ្ញាដែលមាន។",
                    locale
                )
                return message, []
            
            symptom_id = symptom.id
            symptom_full_label = symptom.label_en
            
            await db.delete(symptom)
            await db.commit()
            
            message = self._translate(
                f"✅ Successfully deleted symptom '{symptom_full_label}' (ID: {symptom_id}).",
                f"✅ បានលុបរោគសញ្ញា '{symptom_full_label}' (ID: {symptom_id}) ដោយជោគជ័យ។",
                locale
            )
            
            return message, [{
                "action": "deleted_symptom",
                "symptom_id": symptom_id,
                "symptom_label": symptom_full_label
            }]
        
        except Exception as e:
            message = self._translate(
                f"❌ Failed to delete symptom: {str(e)}",
                f"❌ បរាជ័យក្នុងការលុបរោគសញ្ញា: {str(e)}",
                locale
            )
            return message, []
    
    async def _search_data(
        self,
        query: str,
        db: AsyncSession,
        locale: str
    ) -> tuple[str, list[str]]:
        """Search for diseases or symptoms."""
        
        # Search diseases
        disease_result = await db.execute(
            select(Disease).where(
                Disease.name.ilike(f"%{query}%") |
                Disease.description_en.ilike(f"%{query}%")
            ).limit(10)
        )
        diseases = disease_result.scalars().all()
        
        # Search symptoms
        symptom_result = await db.execute(
            select(Symptom).where(
                Symptom.label_en.ilike(f"%{query}%") |
                Symptom.code.ilike(f"%{query}%")
            ).limit(10)
        )
        symptoms = symptom_result.scalars().all()
        
        result_parts = []
        
        if diseases:
            disease_list = "\n".join([f"• {d.name} ({d.pathogen_type})" for d in diseases])
            result_parts.append(self._translate(
                f"**Diseases ({len(diseases)}):**\n{disease_list}",
                f"**ជំងឺ ({len(diseases)}):**\n{disease_list}",
                locale
            ))
        
        if symptoms:
            symptom_list = "\n".join([f"• {s.label_en} ({s.code})" for s in symptoms])
            result_parts.append(self._translate(
                f"\n**Symptoms ({len(symptoms)}):**\n{symptom_list}",
                f"\n**រោគសញ្ញា ({len(symptoms)}):**\n{symptom_list}",
                locale
            ))
        
        if not diseases and not symptoms:
            message = self._translate(
                f"No results found for '{query}'.",
                f"រកមិនឃើញលទ្ធផលសម្រាប់ '{query}' ទេ។",
                locale
            )
            return message, []
        
        message = "\n".join(result_parts)
        
        return message, [{
            "action": "searched",
            "query": query,
            "diseases_found": len(diseases),
            "symptoms_found": len(symptoms)
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
