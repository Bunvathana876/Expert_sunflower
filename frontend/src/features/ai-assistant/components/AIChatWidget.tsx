/**
 * AI Assistant Chat Widget - Sunflower Botanical Theme
 *
 * Floating conversational AI crop advisor crafted to match the Sunflower
 * Expert System's botanical glassmorphic visual language (Amber & Emerald).
 */

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Send,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Shield,
  Trash2,
  Sprout,
} from 'lucide-react';
import { chatWithAI, adminChatWithAI, analyzeImage, type AIChatResponse } from '@/api/ai';
import { useAuth } from '@/features/auth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  {
    en: 'How to identify Downy Mildew?',
    km: 'តើត្រូវសម្គាល់ជំងឺស្រឡទឹករោយយ៉ាងដូចម្តេច?',
    icon: '🌻',
  },
  {
    en: 'What causes yellow spots on leaves?',
    km: 'តើអ្វីបណ្តាលឱ្យមានស្នាមលឿងលើស្លឹក?',
    icon: '🍂',
  },
  {
    en: 'Treatment for Sclerotinia Head Rot',
    km: 'វិធីព្យាបាលជំងឺក្បាលផ្ការលួយ Sclerotinia',
    icon: '🛡️',
  },
];

export function AIChatWidget(): React.JSX.Element | null {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is admin or expert
  const isAdminOrExpert = user?.role === 'admin' || user?.role === 'agronomist';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText ?? input).trim();
    if ((!textToSend && !selectedImage) || isLoading || !user) return;

    const userMessage: Message = {
      role: 'user',
      content: selectedImage
        ? `${textToSend || 'Analyze this crop photo'} [Photo attached]`
        : textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let response: AIChatResponse;

      // If image is selected, use image analysis
      if (selectedImage) {
        const reader = new FileReader();
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            const parts = base64.split(',');
            const base64Data = parts[1];
            if (base64Data) {
              resolve(base64Data);
            } else {
              reject(new Error('Invalid image format'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(selectedImage);
        });

        const imageAnalysis = await analyzeImage({
          image_base64: imageBase64,
          locale: i18n.language,
          additional_context: textToSend,
        });

        response = {
          message: imageAnalysis.analysis_text,
          conversation_id: conversationId ?? crypto.randomUUID(),
          needs_diagnosis: imageAnalysis.observations.visible_symptoms.length > 0,
          extracted_symptoms: {
            crop: imageAnalysis.observations.crop_identified || '',
            plant_part: imageAnalysis.observations.plant_parts,
            symptoms: imageAnalysis.observations.visible_symptoms,
            color_changes: imageAnalysis.observations.color_abnormalities,
            spots: imageAnalysis.observations.spots_lesions,
            pests: imageAnalysis.observations.pests_visible,
            environment: [],
            duration: '',
            severity: '',
            confidence: imageAnalysis.observations.crop_confidence || 0,
          },
        };

        // Clear image after sending
        setSelectedImage(null);
        setImagePreview(null);
      } else {
        // Regular chat - use admin endpoint for admin/expert users
        if (isAdminOrExpert) {
          response = await adminChatWithAI({
            message: userMessage.content,
            locale: i18n.language,
            conversation_id: conversationId || '',
          });
        } else {
          response = await chatWithAI({
            message: userMessage.content,
            locale: i18n.language,
            conversation_id: conversationId || '',
          });
        }
      }

      setConversationId(response.conversation_id);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: t('ai.error', 'Sorry, I encountered an error. Please try again.'),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setConversationId(undefined);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!user) return null;

  const isKhmer = i18n.language === 'km';

  return (
    <>
      {/* Floating Button - Sunflower Botanical Design */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center focus:outline-hidden"
          aria-label={t('ai.openChat', 'Open AI Assistant')}
        >
          {/* Subtle sunflower golden halo animation */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-500 opacity-60 blur-md group-hover:opacity-90 group-hover:blur-lg transition-all duration-300 animate-pulse" />

          {/* Main button pill */}
          <div className="relative flex items-center gap-3 bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 text-white pl-4 pr-5 py-3.5 rounded-full shadow-xl shadow-amber-900/20 border border-amber-300/30 transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl">
            {/* Sunflower emblem avatar */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs border border-white/30 shrink-0">
              <span className="text-base select-none">🌻</span>
            </div>

            <div className="flex flex-col items-start text-left">
              <span className="font-bold text-xs sm:text-sm tracking-tight flex items-center gap-1.5 drop-shadow-xs">
                {t('ai.assistant', 'AI Assistant')}
                {isAdminOrExpert ? (
                  <Shield className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                )}
              </span>
              <span className="text-[0.68rem] text-amber-100/90 font-medium">
                {t('ai.tagline', 'Ask me about plant diseases')}
              </span>
            </div>
          </div>
        </button>
      )}

      {/* Chat Window - Botanical Glassmorphism */}
      {isOpen && (
        <div
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[410px] h-[580px] max-h-[85vh] bg-white/95 dark:bg-[#1E2615]/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-stone-900/20 dark:shadow-black/60 flex flex-col overflow-hidden border border-stone-200/90 dark:border-white/15 animate-in fade-in zoom-in-95 duration-200"
          dir={isKhmer ? 'ltr' : 'ltr'}
        >
          {/* Header - Botanical Sunflower Amber to Emerald */}
          <div className="relative bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 text-white px-4.5 py-4 flex items-center justify-between border-b border-amber-400/20 shadow-xs">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Avatar */}
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 shadow-xs shrink-0">
                <span className="text-xl select-none">🌻</span>
                {/* Live Online Badge */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-amber-600" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className={`font-bold text-base text-white truncate ${isKhmer ? 'leading-relaxed' : ''}`}>
                    {t('ai.assistant', 'AI Assistant')}
                  </h3>
                  {isAdminOrExpert && (
                    <span className="px-1.5 py-0.2 rounded text-[0.62rem] font-bold bg-amber-400/30 text-amber-100 border border-white/20 shrink-0">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className={`text-[0.72rem] text-amber-100/90 truncate ${isKhmer ? 'leading-relaxed' : ''}`}>
                  {isAdminOrExpert
                    ? isKhmer
                      ? 'របៀបអ្នកគ្រប់គ្រង - អាចកែប្រែទិន្នន័យ'
                      : 'Agronomist Admin Command Mode'
                    : t('ai.tagline', 'Ask me about plant diseases')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                  title={t('ai.newConversation', 'New conversation')}
                  aria-label={t('ai.newConversation', 'New conversation')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                aria-label={t('common.close', 'Close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-50/50 dark:bg-[#161D10]/50">
            {messages.length === 0 && (
              <div className="text-center py-6 px-2 space-y-4">
                {/* Botanical Icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
                  <Sprout className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h4 className={`font-bold text-sm text-gray-900 dark:text-white ${isKhmer ? 'leading-relaxed' : ''}`}>
                    {t('ai.welcome', 'Hello! How can I help you today?')}
                  </h4>
                  <p className={`text-xs text-gray-600 dark:text-gray-300 max-w-xs mx-auto leading-relaxed ${isKhmer ? 'leading-relaxed' : ''}`}>
                    {isAdminOrExpert
                      ? isKhmer
                        ? 'អ្នកអាចសួរអំពីជំងឺរុក្ខជាតិ ឬគ្រប់គ្រងទិន្នន័យជំងឺ។'
                        : 'Ask plant disease questions or manage catalog knowledge base.'
                      : t('ai.welcomeHint', "Describe your plant symptoms and I'll help you understand what might be wrong.")}
                  </p>
                </div>

                {/* Quick Suggestion Prompt Chips */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    Suggested Questions
                  </span>
                  <div className="flex flex-col gap-1.5 text-left">
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => void handleSend(isKhmer ? prompt.km : prompt.en)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-[#1E2615] hover:bg-amber-50/80 dark:hover:bg-[#2A3420] text-gray-800 dark:text-gray-200 text-xs border border-stone-200/80 dark:border-white/10 shadow-2xs hover:border-amber-400/50 transition-all text-left"
                      >
                        <span className="text-sm shrink-0">{prompt.icon}</span>
                        <span className="truncate flex-1 font-medium">
                          {isKhmer ? prompt.km : prompt.en}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
              >
                {/* Assistant botanical badge */}
                {message.role === 'assistant' && (
                  <div className="mr-2 shrink-0 self-end mb-1">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 text-xs select-none">
                      🌻
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-[#253018] text-gray-800 dark:text-gray-100 border border-stone-200/80 dark:border-white/10 rounded-bl-xs'
                  } ${isKhmer ? 'leading-relaxed' : ''}`}
                >
                  <p className="text-xs sm:text-[0.82rem] whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                  </p>
                  <span
                    className={`block text-[0.62rem] mt-1 text-right font-mono ${
                      message.role === 'user' ? 'text-amber-100' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start items-center gap-2 animate-in fade-in">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 text-xs select-none">
                  🌻
                </div>
                <div className="bg-white dark:bg-[#253018] border border-stone-200/80 dark:border-white/10 rounded-2xl px-3.5 py-2.5 flex items-center gap-2 shadow-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                    {isKhmer ? 'កំពុងវិភាគរោគសញ្ញា...' : 'Analyzing plant symptoms...'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white/95 dark:bg-[#1E2615]/95 border-t border-stone-200/80 dark:border-white/10 space-y-2">
            {/* Image Preview if attached */}
            {imagePreview && (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Crop preview"
                  className="max-h-16 rounded-xl border border-amber-400 shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-rose-600 transition-colors shadow-xs"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {/* Photo Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-stone-100 hover:bg-amber-50 dark:bg-[#253018] dark:hover:bg-[#2A3420] text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 border border-stone-200/80 dark:border-white/10 transition-colors"
                disabled={isLoading}
                title="Attach plant photo"
                aria-label="Attach plant photo"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t('ai.inputPlaceholder', 'Describe your plant symptoms...')}
                className={`flex-1 px-3.5 py-2 rounded-xl bg-stone-100/90 dark:bg-[#253018]/90 border border-stone-200/80 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-300 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all ${
                  isKhmer ? 'leading-relaxed' : ''
                }`}
                disabled={isLoading}
              />

              {/* Send Button */}
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs shadow-amber-600/20 transition-all shrink-0"
                aria-label={t('common.send', 'Send')}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
