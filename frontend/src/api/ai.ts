/**
 * AI Assistant API
 * 
 * Handles communication with the AI-powered assistant endpoints.
 */

import { apiFetch } from './client';

export interface AIChatRequest {
  message: string;
  locale?: string;
  conversation_id?: string;
}

export interface ProposedActionDTO {
  action_id: string;
  confirmation_token: string;
  action_type: string;
  summary: string;
  details: Record<string, unknown>;
  affected_records: Array<Record<string, unknown>>;
  expires_at: string;
  requires_confirmation: boolean;
}

export interface ActionConfirmRequest {
  action_id: string;
  confirmation_token: string;
  locale?: string;
}

export interface ActionCancelRequest {
  action_id: string;
  confirmation_token?: string;
  locale?: string;
}

export interface ActionExecutionResponse {
  success: boolean;
  message: string;
  action_id: string;
  action_type: string;
  actions_taken: Array<Record<string, unknown>>;
}

export interface AIChatResponse {
  message: string;
  conversation_id: string;
  needs_diagnosis: boolean;
  extracted_symptoms?: {
    crop?: string;
    plant_part: string[];
    symptoms: string[];
    color_changes: string[];
    spots: string[];
    pests: string[];
    environment: string[];
    duration?: string;
    severity?: string;
    confidence: number;
  };
  actions_taken?: unknown[];
  proposed_action?: ProposedActionDTO;
}

export interface SymptomExtractionRequest {
  message: string;
  locale?: string;
}

export interface ExtractedSymptom {
  crop?: string;
  plant_part: string[];
  symptoms: string[];
  color_changes: string[];
  spots: string[];
  pests: string[];
  environment: string[];
  duration?: string;
  severity?: string;
  confidence: number;
}

export interface SymptomExtractionResponse {
  extracted: ExtractedSymptom;
  mapped_symptom_ids: number[];
  unmapped_descriptions: string[];
}

export interface AIDiagnosisRequest {
  message: string;
  locale?: string;
  image_base64?: string;
}

export interface AIDiagnosisResponse {
  extracted_symptoms: ExtractedSymptom;
  diagnosis_session_id: string | null;
  expert_system_results: unknown;
  ai_explanation: string;
}

export interface ImageAnalysisRequest {
  image_base64: string;
  locale?: string;
  additional_context?: string;
}

export interface ImageAnalysisResponse {
  observations: {
    crop_identified?: string;
    crop_confidence?: number;
    plant_parts: string[];
    visible_symptoms: string[];
    color_abnormalities: string[];
    spots_lesions: string[];
    pests_visible: string[];
    image_quality?: string;
    possible_diseases: string[];
  };
  analysis_text: string;
  warning: string;
}

export interface AIHealthResponse {
  ollama_available: boolean;
  model_loaded?: string;
  vision_model_loaded?: string;
  status: string;
  error?: string;
}

/**
 * Chat with AI assistant
 */
export async function chatWithAI(request: AIChatRequest): Promise<AIChatResponse> {
  return apiFetch<AIChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Admin chat with AI assistant (can modify database)
 */
export async function adminChatWithAI(request: AIChatRequest): Promise<AIChatResponse> {
  return apiFetch<AIChatResponse>('/ai/admin/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Extract symptoms from natural language
 */
export async function extractSymptoms(
  request: SymptomExtractionRequest
): Promise<SymptomExtractionResponse> {
  return apiFetch<SymptomExtractionResponse>('/ai/extract-symptoms', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get AI-assisted diagnosis
 */
export async function getAIDiagnosis(
  request: AIDiagnosisRequest
): Promise<AIDiagnosisResponse> {
  return apiFetch<AIDiagnosisResponse>('/ai/diagnose', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Analyze plant disease image
 */
export async function analyzeImage(
  request: ImageAnalysisRequest
): Promise<ImageAnalysisResponse> {
  return apiFetch<ImageAnalysisResponse>('/ai/analyze-image', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Confirm and execute an AI-proposed administrative database action
 */
export async function confirmAdminAction(
  request: ActionConfirmRequest
): Promise<ActionExecutionResponse> {
  return apiFetch<ActionExecutionResponse>('/ai/admin/actions/confirm', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Cancel an AI-proposed administrative database action
 */
export async function cancelAdminAction(
  request: ActionCancelRequest
): Promise<ActionExecutionResponse> {
  return apiFetch<ActionExecutionResponse>('/ai/admin/actions/cancel', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Check AI service health
 */
export async function checkAIHealth(): Promise<AIHealthResponse> {
  return apiFetch<AIHealthResponse>('/ai/health');
}
