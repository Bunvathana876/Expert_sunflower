"""Vision service for image analysis using Qwen-VL or similar vision models."""

from __future__ import annotations

import base64
import logging
from io import BytesIO
from typing import Any

from PIL import Image

from ai.config import ai_config
from ai.schemas.ai_schemas import ImageAnalysisResponse, ImageObservation
from ai.services.json_parser import extract_json_from_response
from ai.services.ollama_service import OllamaService, get_ollama_service
from ai.services.prompt_loader import load_prompt

logger = logging.getLogger(__name__)


class VisionService:
    """Service for plant disease image analysis."""
    
    def __init__(self, ollama_service: OllamaService | None = None) -> None:
        self.ollama = ollama_service or get_ollama_service()
    
    def validate_image(self, image_base64: str) -> tuple[bool, str]:
        """Validate image data.
        
        Args:
            image_base64: Base64-encoded image
        
        Returns:
            (is_valid, error_message)
        """
        try:
            # Remove data URL prefix if present
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]
            
            # Decode base64
            image_data = base64.b64decode(image_base64)
            
            # Check size
            size_mb = len(image_data) / (1024 * 1024)
            if size_mb > ai_config.MAX_IMAGE_SIZE_MB:
                return False, f"Image too large: {size_mb:.1f}MB (max {ai_config.MAX_IMAGE_SIZE_MB}MB)"
            
            # Try to open with PIL
            image = Image.open(BytesIO(image_data))
            image.verify()
            
            return True, ""
        
        except base64.binascii.Error:
            return False, "Invalid base64 encoding"
        except Exception as e:
            return False, f"Invalid image: {e}"
    
    def _prepare_image_data(self, image_base64: str) -> str:
        """Prepare image data for Ollama.
        
        Args:
            image_base64: Base64-encoded image
        
        Returns:
            Clean base64 string without data URL prefix
        """
        # Remove data URL prefix if present (e.g., "data:image/png;base64,")
        if "," in image_base64:
            return image_base64.split(",", 1)[1]
        return image_base64
    
    async def analyze_plant_image(
        self,
        image_base64: str,
        locale: str = "en",
        additional_context: str | None = None,
    ) -> ImageAnalysisResponse:
        """Analyze a plant disease image.
        
        Args:
            image_base64: Base64-encoded image
            locale: Language for response
            additional_context: Additional context from user
        
        Returns:
            ImageAnalysisResponse with structured observations
        
        Raises:
            ValueError: If image is invalid
            OllamaError: If analysis fails
        """
        # Validate image
        is_valid, error = self.validate_image(image_base64)
        if not is_valid:
            raise ValueError(error)
        
        # Prepare image data
        clean_image_data = self._prepare_image_data(image_base64)
        
        # Load image analysis prompt
        base_prompt = load_prompt("image_analysis")
        
        # Add locale-specific instructions
        if locale == "km":
            language_instruction = "\n\nProvide your analysis in Khmer language."
            base_prompt += language_instruction
        
        # Add additional context if provided
        if additional_context:
            base_prompt += f"\n\nAdditional context: {additional_context}"
        
        # Request structured output
        structured_request = """

After your analysis, provide a structured summary as JSON:
{
  "crop_identified": "plant name or null",
  "crop_confidence": 0.0-1.0 or null,
  "plant_parts": ["list of visible parts"],
  "visible_symptoms": ["list of symptoms"],
  "color_abnormalities": ["list of color issues"],
  "spots_lesions": ["description of spots/lesions"],
  "pests_visible": ["list of visible pests"],
  "image_quality": "assessment",
  "possible_diseases": ["list if any"]
}
"""
        full_prompt = base_prompt + structured_request
        
        try:
            # Get analysis from vision model
            response = await self.ollama.analyze_image(
                image_base64=clean_image_data,
                prompt=full_prompt,
            )
            
            # Extract structured data
            observation_data = self._extract_observations(response)
            
            return ImageAnalysisResponse(
                observations=ImageObservation(**observation_data),
                analysis_text=response,
                warning="This is visual analysis only. Diagnosis requires expert system evaluation.",
            )
        
        except Exception as e:
            logger.error(f"Image analysis failed: {e}")
            raise
    
    def _extract_observations(self, response: str) -> dict[str, Any]:
        """Extract structured observations from analysis response.
        
        Args:
            response: AI analysis text
        
        Returns:
            Observation data dict
        """
        # Try to extract JSON structure
        try:
            data = extract_json_from_response(response)
            return data
        except ValueError:
            # If no JSON found, return minimal structure
            logger.warning("Could not extract structured data from image analysis")
            return {
                "crop_identified": None,
                "crop_confidence": None,
                "plant_parts": [],
                "visible_symptoms": [],
                "color_abnormalities": [],
                "spots_lesions": [],
                "pests_visible": [],
                "image_quality": "unknown",
                "possible_diseases": [],
            }
    
    async def extract_symptoms_from_image(
        self,
        image_base64: str,
    ) -> dict[str, Any]:
        """Extract symptom information from image for diagnosis.
        
        This is a simplified extraction focused on symptoms that can feed
        into the expert system.
        
        Args:
            image_base64: Base64-encoded image
        
        Returns:
            Dict with extracted symptom information
        """
        analysis = await self.analyze_plant_image(image_base64)
        
        # Convert observations to symptom format
        return {
            "crop": analysis.observations.crop_identified,
            "plant_part": analysis.observations.plant_parts,
            "symptoms": analysis.observations.visible_symptoms,
            "color_changes": analysis.observations.color_abnormalities,
            "spots": analysis.observations.spots_lesions,
            "pests": analysis.observations.pests_visible,
            "possible_diseases": analysis.observations.possible_diseases,
            "confidence": analysis.observations.crop_confidence or 0.0,
        }


def get_vision_service() -> VisionService:
    """Get VisionService instance.
    
    Returns:
        VisionService instance
    """
    return VisionService()
