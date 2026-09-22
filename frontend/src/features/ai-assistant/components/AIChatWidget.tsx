/**
 * AI Chat Widget - Futuristic Design
 * 
 * Floating chat widget for conversational AI assistance.
 * Enhanced with admin capabilities for database management.
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Loader2, Image as ImageIcon, Bot, Zap, Brain, Shield } from 'lucide-react';
import { chatWithAI, adminChatWithAI, analyzeImage, type AIChatResponse } from '@/api/ai';
import { useAuth } from '@/features/auth';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIChatWidget() {
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

  // Check if user is admin or expert (MUST BE BEFORE handleSend)
  const isAdminOrExpert = user?.role?.name === 'admin' || user?.role?.name === 'agronomist';
  
  // Debug logging
  useEffect(() => {
    if (user) {
      console.log('[AI CHAT WIDGET] User loaded:', {
        email: user.email,
        role: user.role?.name,
        isAdminOrExpert
      });
    }
  }, [user, isAdminOrExpert]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading || !user) return;

    const userMessage: Message = {
      role: 'user',
      content: selectedImage 
        ? `${input.trim() || 'Analyze this image'} [Image attached]`
        : input.trim(),
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
              resolve(base64Data); // Remove data:image/...;base64, prefix
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
          additional_context: input.trim(),
        });

        // Convert image analysis to chat response format
        response = {
          message: imageAnalysis.analysis_text,
          conversation_id: conversationId || crypto.randomUUID(),
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
        console.log('[AI CHAT WIDGET] isAdminOrExpert:', isAdminOrExpert);
        console.log('[AI CHAT WIDGET] Using endpoint:', isAdminOrExpert ? '/ai/admin/chat' : '/ai/chat');
        
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

      // If AI suggests diagnosis, show a subtle notification
      if (response.needs_diagnosis && response.extracted_symptoms) {
        const symptomsDetected = [
          ...response.extracted_symptoms.symptoms,
          ...response.extracted_symptoms.color_changes,
        ].filter(Boolean);

        if (symptomsDetected.length > 0) {
          console.log('Symptoms detected:', symptomsDetected);
          // TODO: Show toast notification suggesting to run diagnosis
        }
      }
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
      handleSend();
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

  return (
    <>
      {/* Floating Button - Futuristic Design */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label={t('ai.openChat', 'Open AI Assistant')}
        >
          {/* Animated rings */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${isAdminOrExpert ? 'from-yellow-500 via-orange-500 to-red-600' : 'from-cyan-500 via-blue-500 to-purple-600'} animate-pulse opacity-75`}></div>
          <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${isAdminOrExpert ? 'from-yellow-500 via-orange-500 to-red-600' : 'from-cyan-500 via-blue-500 to-purple-600'} animate-ping opacity-30`}></div>
          
          {/* Main button */}
          <div className={`relative flex items-center gap-3 bg-gradient-to-r ${isAdminOrExpert ? 'from-yellow-500 via-orange-600 to-red-600' : 'from-cyan-500 via-blue-600 to-purple-600'} text-white px-5 py-3 rounded-full shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105`}>
            {/* Robot Icon with glow */}
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full blur-md opacity-50 animate-pulse"></div>
              <Bot className="w-6 h-6 relative z-10" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm flex items-center gap-1">
                {t('ai.assistant', 'AI Assistant')}
                {isAdminOrExpert ? (
                  <Shield className="w-3 h-3 text-yellow-100 animate-pulse" />
                ) : (
                  <Zap className="w-3 h-3 text-yellow-300 animate-pulse" />
                )}
              </span>
              <span className="text-xs opacity-90">
                {isAdminOrExpert ? 'Admin Mode' : 'Powered by AI'}
              </span>
            </div>
          </div>
        </button>
      )}

      {/* Chat Window - Futuristic Design */}
      {isOpen && (
        <div 
          className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border-2 border-cyan-500/30"
          dir={i18n.language === 'km' ? 'ltr' : 'ltr'}
          style={{
            boxShadow: '0 0 40px rgba(6, 182, 212, 0.3), 0 0 80px rgba(139, 92, 246, 0.2)',
          }}
        >
          {/* Header - Futuristic with animated background */}
          <div className="relative bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-700 text-white px-4 py-4 flex items-center justify-between overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>
            </div>
            
            <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10">
              {/* Robot Avatar with animated glow */}
              <div className="relative">
                <div className="absolute inset-0 bg-white rounded-full blur-md opacity-60 animate-pulse"></div>
                <div className="relative bg-white/10 backdrop-blur-sm p-2 rounded-full border border-white/20">
                  <Bot className="w-6 h-6" />
                </div>
              </div>
              
              <div className="min-w-0 flex-1">
                <h3 className={`font-bold text-lg truncate flex items-center gap-2 ${i18n.language === 'km' ? 'leading-relaxed' : ''}`}>
                  {t('ai.assistant', 'AI Assistant')}
                  {isAdminOrExpert ? (
                    <Shield className="w-4 h-4 text-yellow-300 animate-pulse" title="Admin Mode" />
                  ) : (
                    <Brain className="w-4 h-4 text-cyan-300 animate-pulse" />
                  )}
                </h3>
                <p className={`text-xs opacity-90 truncate ${i18n.language === 'km' ? 'leading-relaxed' : ''}`}>
                  {isAdminOrExpert 
                    ? (i18n.language === 'km' ? 'របៀបអ្នកគ្រប់គ្រង - អាចកែប្រែទិន្នន័យ' : 'Admin Mode - Can modify data')
                    : t('ai.tagline', 'Ask me about plant diseases')
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-lg p-2 transition-all hover:rotate-90 duration-300 relative z-10"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages - Dark theme with neon accents */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900/50 to-gray-800/50 backdrop-blur-sm">
            {messages.length === 0 && (
              <div className="text-center text-gray-300 py-8">
                {/* Animated Robot Icon */}
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-cyan-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-cyan-500 to-purple-600 p-4 rounded-full">
                    <Bot className="w-12 h-12 text-white" />
                  </div>
                </div>
                
                <p className={`font-semibold mb-2 text-cyan-300 ${i18n.language === 'km' ? 'leading-relaxed' : ''}`}>
                  {t('ai.welcome', 'Hello! How can I help you today?')}
                </p>
                <p className={`text-sm text-gray-400 ${i18n.language === 'km' ? 'leading-relaxed' : ''}`}>
                  {isAdminOrExpert 
                    ? (i18n.language === 'km' 
                        ? 'អ្នកអាចសួរខ្ញុំអំពីជំងឺរុក្ខជាតិ ឬប្រើពាក្យបញ្ជាដើម្បីគ្រប់គ្រងទិន្នន័យ។ សាកល្បង "បង្ហាញជំងឺទាំងអស់" ឬ "ជំនួយ"។'
                        : 'You can ask me about plant diseases or use commands to manage data. Try "list all diseases" or "help".')
                    : t(
                        'ai.welcomeHint',
                        "Describe your plant symptoms and I'll help you understand what might be wrong."
                      )
                  }
                </p>
                
                {/* Feature badges */}
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {isAdminOrExpert ? (
                    <>
                      <span className="text-xs px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-300 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Admin Mode
                      </span>
                      <span className="text-xs px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-300 flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        Data Control
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-300 flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        Smart Analysis
                      </span>
                      <span className="text-xs px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        Image Recognition
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                {/* AI Avatar for assistant messages */}
                {message.role === 'assistant' && (
                  <div className="mr-2 flex-shrink-0">
                    <div className="relative">
                      <div className="absolute inset-0 bg-cyan-500 rounded-full blur-sm opacity-50"></div>
                      <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-full">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-gray-700/50 backdrop-blur-sm text-gray-100 border border-cyan-500/20 shadow-lg'
                  } ${i18n.language === 'km' ? 'leading-relaxed' : ''}`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === 'user'
                        ? 'text-cyan-100'
                        : 'text-gray-400'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString(i18n.language, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-fadeIn">
                <div className="mr-2 flex-shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500 rounded-full blur-sm opacity-50 animate-pulse"></div>
                    <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-full">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-700/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span className="text-sm text-gray-300">Analyzing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input - Futuristic style */}
          <div className="border-t border-cyan-500/30 bg-gray-800/80 backdrop-blur-sm p-4">
            {messages.length > 0 && (
              <button
                onClick={handleReset}
                className="text-xs text-cyan-400 hover:text-cyan-300 mb-2 flex items-center gap-1 transition-colors"
              >
                <Zap className="w-3 h-3" />
                {t('ai.newConversation', 'Start new conversation')}
              </button>
            )}
            
            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-2 relative inline-block">
                <img
                  src={imagePreview}
                  alt="Upload preview"
                  className="max-h-20 rounded-lg border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="flex gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {/* Image upload button - Futuristic */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-700/50 border border-cyan-500/30 text-cyan-400 px-3 py-2 rounded-lg hover:bg-gray-600/50 hover:border-cyan-400/50 transition-all hover:shadow-lg hover:shadow-cyan-500/20"
                disabled={isLoading}
                aria-label="Upload image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t(
                  'ai.inputPlaceholder',
                  'Describe your plant symptoms...'
                )}
                className={`flex-1 px-4 py-2 bg-gray-700/50 border border-cyan-500/30 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm ${
                  i18n.language === 'km' ? 'leading-relaxed' : ''
                }`}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-cyan-500/50 disabled:shadow-none flex items-center gap-2"
                aria-label={t('common.send', 'Send')}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
