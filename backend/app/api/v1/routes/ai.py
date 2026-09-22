"""AI-assisted diagnosis and chat API routes.

These endpoints integrate local AI with the existing expert system.
The AI extracts symptoms from natural language, but the final diagnosis
comes from the existing rule-based expert system.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ai.config import ai_config
from ai.schemas.ai_schemas import (
    AIChatRequest,
    AIChatResponse,
    AIDiagnosisRequest,
    AIDiagnosisResponse,
    AIHealthResponse,
    DiseaseDraftRequest,
    DiseaseDraftResponse,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    ImageAnalysisRequest,
    ImageAnalysisResponse,
    SymptomExtractionRequest,
    SymptomExtractionResponse,
)
from ai.services.chatbot_service import get_chatbot_service
from ai.services.admin_chat_service import get_admin_chat_service
from ai.services.disease_assistant import get_disease_assistant
from ai.services.ollama_service import OllamaError, get_ollama_service
from ai.services.symptom_extractor import get_symptom_extractor
from ai.services.vision_service import get_vision_service
from app.core.deps import get_current_user, get_db, require_permission
from app.models.auth import User
from app.repositories.diagnosis import DiagnosisRepository
from app.schemas.diagnosis import DiagnosisRequest
from app.services.engine.runner import DiagnosisRunner

router = APIRouter(prefix="/ai", tags=["ai"])


# ============================================================================
# Health Check
# ============================================================================

@router.get(
    "/health",
    response_model=AIHealthResponse,
    summary="Check AI service health",
)
async def check_ai_health() -> AIHealthResponse:
    """Check if Ollama server is available and which models are loaded.
    
    Returns health status and available models.
    """
    if not ai_config.AI_ENABLED:
        return AIHealthResponse(
            ollama_available=False,
            status="disabled",
            error="AI features are disabled in configuration",
        )
    
    ollama = get_ollama_service()
    
    try:
        is_healthy, error, models = await ollama.check_health()
        
        if not is_healthy:
            return AIHealthResponse(
                ollama_available=False,
                status="error",
                error=error,
            )
        
        # Check if configured models are available
        model_loaded = None
        vision_model_loaded = None
        
        for model in models:
            if ai_config.AI_MODEL in model:
                model_loaded = model
            if ai_config.AI_VISION_MODEL in model:
                vision_model_loaded = model
        
        status_msg = "ready" if model_loaded else "model_not_loaded"
        
        return AIHealthResponse(
            ollama_available=True,
            model_loaded=model_loaded,
            vision_model_loaded=vision_model_loaded,
            status=status_msg,
            error=None if model_loaded else f"Model {ai_config.AI_MODEL} not found",
        )
    
    except Exception as e:
        return AIHealthResponse(
            ollama_available=False,
            status="error",
            error=str(e),
        )


# ============================================================================
# User Chat
# ============================================================================

@router.post(
    "/chat",
    response_model=AIChatResponse,
    summary="Chat with AI assistant",
)
async def chat_with_ai(
    request: AIChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> AIChatResponse:
    """Conversational AI assistant for plant disease questions.
    
    Supports English and Khmer. Helps users describe symptoms and provides
    guidance. If symptoms are detected, suggests using the diagnosis system.
    """
    if not ai_config.AI_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are currently disabled",
        )
    
    chatbot = get_chatbot_service()
    
    try:
        response = await chatbot.chat(request)
        return response
    
    except OllamaError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}",
        ) from e
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat failed: {str(e)}",
        ) from e


# ============================================================================
# Symptom Extraction
# ============================================================================

@router.post(
    "/extract-symptoms",
    response_model=SymptomExtractionResponse,
    summary="Extract symptoms from natural language",
)
async def extract_symptoms(
    request: SymptomExtractionRequest,
    current_user: Annotated[User, Depends(require_permission("diagnosis:run"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SymptomExtractionResponse:
    """Extract structured symptom information from user's natural language description.
    
    Converts text like "My sunflower leaves have brown spots" into structured
    symptom data that can be mapped to database symptom IDs.
    """
    if not ai_config.AI_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are currently disabled",
        )
    
    extractor = get_symptom_extractor()
    
    try:
        response = await extractor.extract_and_map(request, db)
        return response
    
    except OllamaError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}",
        ) from e
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Symptom extraction failed: {str(e)}",
        ) from e


# ============================================================================
# AI-Assisted Diagnosis
# ============================================================================

@router.post(
    "/diagnose",
    response_model=AIDiagnosisResponse,
    summary="AI-assisted diagnosis using expert system",
)
async def ai_assisted_diagnosis(
    request: AIDiagnosisRequest,
    current_user: Annotated[User, Depends(require_permission("diagnosis:run"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AIDiagnosisResponse:
    """Diagnose plant disease using natural language description.
    
    Workflow:
    1. AI extracts symptoms from user's message
    2. Symptoms are mapped to database symptom IDs
    3. Existing expert system performs diagnosis
    4. AI generates natural language explanation
    
    The final diagnosis comes from the rule-based expert system, NOT the AI.
    """
    if not ai_config.AI_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are currently disabled",
        )
    
    extractor = get_symptom_extractor()
    
    try:
        # Step 1: Extract symptoms from message (and image if provided)
        extracted = await extractor.extract_symptoms(
            message=request.message,
            locale=request.locale,
        )
        
        # If image provided, also extract from image and merge
        if request.image_base64:
            vision = get_vision_service()
            image_symptoms = await vision.extract_symptoms_from_image(
                image_base64=request.image_base64,
            )
            # Merge image symptoms with text symptoms
            # (simplified - in production, do smarter merging)
            extracted.symptoms.extend(image_symptoms.get("symptoms", []))
            extracted.plant_part.extend(image_symptoms.get("plant_part", []))
        
        # Step 2: Map to database symptom IDs
        mapped_ids, unmapped = await extractor.map_to_database_symptoms(
            extracted=extracted,
            db=db,
        )
        
        if not mapped_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not identify any known symptoms from your description. Please try describing more specific symptoms.",
            )
        
        # Step 3: Run existing expert system diagnosis
        # Build answers dict: symptom_id -> "yes"
        answers = {symptom_id: "yes" for symptom_id in mapped_ids}
        
        diagnosis_request = DiagnosisRequest(
            answers=answers,
            locale=request.locale,
        )
        
        repo = DiagnosisRepository(db)
        runner = DiagnosisRunner(repo)
        
        # Run diagnosis and persist session
        diagnosis_result = await runner.create_session(
            diagnosis_request,
            current_user,
        )
        
        # Step 4: Generate AI explanation
        explanation = await _generate_diagnosis_explanation(
            extracted=extracted,
            diagnosis_result=diagnosis_result.model_dump(),
            locale=request.locale,
        )
        
        return AIDiagnosisResponse(
            extracted_symptoms=extracted,
            diagnosis_session_id=str(diagnosis_result.session_id) if diagnosis_result.session_id else None,
            expert_system_results=diagnosis_result.model_dump(),
            ai_explanation=explanation,
        )
    
    except HTTPException:
        raise
    
    except OllamaError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}",
        ) from e
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagnosis failed: {str(e)}",
        ) from e


async def _generate_diagnosis_explanation(
    extracted: any,
    diagnosis_result: dict,
    locale: str,
) -> str:
    """Generate natural language explanation of diagnosis results."""
    ollama = get_ollama_service()
    
    results = diagnosis_result.get("results", [])
    
    if not results:
        if locale == "km":
            return "យើងមិនអាចកំណត់ជំងឺដែលត្រូវគ្នាបានទេ។ សូមពិគ្រោះជាមួយអ្នកជំនាញកសិកម្ម។"
        return "We could not identify a matching disease. Please consult with an agronomist."
    
    top_disease = results[0]
    
    prompt = f"""Generate a clear, helpful explanation of these diagnosis results for a farmer.

Symptoms observed: {", ".join(extracted.symptoms)}
Plant parts affected: {", ".join(extracted.plant_part)}

Top diagnosis: {top_disease.get("disease", {}).get("name", "Unknown")}
Confidence: {top_disease.get("confidence", 0) * 100:.0f}%

{"Write in Khmer language." if locale == "km" else "Write in English."}

Be empathetic, clear, and actionable. Explain what the disease is, why it matches, and what to do next.
Keep it under 150 words.
"""
    
    try:
        explanation = await ollama.generate(prompt=prompt, temperature=0.7)
        return explanation
    except Exception:
        # Fallback
        if locale == "km":
            return f"ជំងឺដែលគ្រោងទុកគឺ {top_disease.get('disease', {}).get('name', 'Unknown')}។"
        return f"The suspected disease is {top_disease.get('disease', {}).get('name', 'Unknown')}."


# ============================================================================
# Image Analysis
# ============================================================================

@router.post(
    "/analyze-image",
    response_model=ImageAnalysisResponse,
    summary="Analyze plant disease image",
)
async def analyze_image(
    request: ImageAnalysisRequest,
    current_user: Annotated[User, Depends(get_current_user)],
) -> ImageAnalysisResponse:
    """Analyze a plant image for disease symptoms using vision AI.
    
    Returns visible observations. This is NOT a diagnosis - use the
    diagnosis endpoint to get an expert system evaluation.
    """
    if not ai_config.AI_ENABLED or not ai_config.AI_VISION_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vision AI features are currently disabled",
        )
    
    vision = get_vision_service()
    
    try:
        response = await vision.analyze_plant_image(
            image_base64=request.image_base64,
            locale=request.locale,
            additional_context=request.additional_context,
        )
        return response
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    
    except OllamaError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}",
        ) from e
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image analysis failed: {str(e)}",
        ) from e


# ============================================================================
# Admin/Expert Chat with Database Modification
# ============================================================================

@router.post(
    "/admin/chat",
    response_model=AIChatResponse,
    summary="Admin AI chat with database modification capabilities",
)
async def admin_chat(
    request: AIChatRequest,
    current_user: Annotated[User, Depends(require_permission("disease:read"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AIChatResponse:
    """AI assistant for admins and experts with database modification capabilities.
    
    This endpoint allows admin/expert users to:
    - List all diseases and symptoms
    - Create new diseases (requires disease:create permission)
    - Update existing diseases (requires disease:update permission)
    - Delete diseases (requires disease:delete permission)
    - Search for diseases and symptoms
    
    The AI understands natural language commands like:
    - "List all diseases"
    - "Create disease Powdery Mildew with pathogen fungal"
    - "Update disease Rust description to affects leaves"
    - "Delete disease Test Disease"
    - "Search for downy"
    
    **Permissions Required:**
    - View operations: disease:read
    - Create operations: disease:create
    - Update operations: disease:update
    - Delete operations: disease:delete (admin only)
    """
    if not ai_config.AI_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are currently disabled",
        )
    
    # Get user's highest role
    user_role = current_user.role.name if current_user.role else "grower"
    
    admin_chat_service = get_admin_chat_service()
    
    try:
        response = await admin_chat_service.handle_admin_chat(
            request=request,
            db=db,
            user_role=user_role,
        )
        return response
    
    except OllamaError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}",
        ) from e
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Admin chat failed: {str(e)}",
        ) from e


# ============================================================================
# Admin/Expert Endpoints
# ============================================================================

@router.post(
    "/expert/disease-draft",
    response_model=DiseaseDraftResponse,
    summary="Generate disease knowledge draft",
)
async def generate_disease_draft(
    request: DiseaseDraftRequest,
    current_user: Annotated[User, Depends(require_permission("disease:create"))],
) -> DiseaseDraftResponse:
    """Generate AI-assisted disease knowledge base draft for expert review.
    
    IMPORTANT: This is a DRAFT only. Experts must review, edit, and
    explicitly approve before it becomes official knowledge.
    """
    if not ai_config.AI_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are currently disabled",
        )
    
    assistant = get_disease_assistant()
    
    try:
        response = await assistant.generate_disease_draft(request)
        return response
    
    except OllamaError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}",
        ) from e
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Draft generation failed: {str(e)}",
        ) from e


@router.post(
    "/expert/duplicate-check",
    response_model=DuplicateCheckResponse,
    summary="Check for duplicate diseases",
)
async def check_duplicate_disease(
    request: DuplicateCheckRequest,
    current_user: Annotated[User, Depends(require_permission("disease:create"))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DuplicateCheckResponse:
    """Check if a proposed disease might be a duplicate of existing entries.
    
    Compares disease name, symptoms, and characteristics with existing
    diseases to identify potential duplicates.
    """
    if not ai_config.AI_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are currently disabled",
        )
    
    assistant = get_disease_assistant()
    
    try:
        response = await assistant.check_duplicate_disease(request, db)
        return response
    
    except OllamaError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(e)}",
        ) from e
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Duplicate check failed: {str(e)}",
        ) from e
