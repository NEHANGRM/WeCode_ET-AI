'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, Bot, User, ExternalLink } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  loading?: boolean;
}

const STARTER_QUESTIONS = [
  'How many events were auto-resolved?',
  'What happened with IP 185.150.11.23?',
  'Show me recent actions taken',
  'Are there any active campaigns?',
];

export function ChatCopilot() {
  const [open, setOpen] = useState(false);
  
  const DEFAULT_MESSAGE: Message = {
    id: 'welcome',
    role: 'assistant',
    content: "Hi! I'm **WatchDog's Copilot**. Ask me anything about your cases, metrics, campaigns, or specific IP addresses. I only answer using real data from your database.",
    sources: []
  };

  const [messages, setMessages] = useState<Message[]>([DEFAULT_MESSAGE]);
  const [isClient, setIsClient] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    setIsClient(true);
    const saved = sessionStorage.getItem('watchdog_copilot_chat');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        // fallback to default
      }
    }
  }, []);

  // Save to sessionStorage on update
  useEffect(() => {
    if (isClient) {
      sessionStorage.setItem('watchdog_copilot_chat', JSON.stringify(messages));
    }
  }, [messages, isClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async (text?: string) => {
    const question = (text || input).trim();
    if (!question || sending) return;

    setInput('');
    setSending(true);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question
    };
    const loadingMsg: Message = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      loading: true
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question })
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || "I couldn't generate a response. Please try again.",
        sources: data.sources || []
      };

      setMessages(prev => prev.filter(m => !m.loading).concat(assistantMsg));
    } catch {
      setMessages(prev => prev.filter(m => !m.loading).concat({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm unable to process your question right now — the service may be temporarily unavailable. Please try again.",
        sources: []
      }));
    } finally {
      setSending(false);
    }
  };

  const isObjectId = (s: string) => /^[0-9a-f]{24}$/i.test(s);
  const isCampaignId = (s: string) => s.startsWith('CAMP-');

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-900/50 flex items-center justify-center hover:scale-110 transition-transform duration-200"
          >
            <MessageSquare className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0a0a0f]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-3rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/10"
            style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1a 100%)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">WatchDog Copilot</p>
                  <p className="text-xs text-emerald-400">Database-grounded answers only</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-blue-600/20 border border-blue-500/30'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    {msg.role === 'user'
                      ? <User className="w-3.5 h-3.5 text-blue-400" />
                      : <Bot className="w-3.5 h-3.5 text-gray-400" />
                    }
                  </div>

                  <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {/* Bubble */}
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white/8 border border-white/10 text-gray-200 rounded-tl-sm'
                    }`}>
                      {msg.loading ? (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-xs">Querying database…</span>
                        </div>
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map(src => (
                          <a
                            key={src}
                            href={
                              isCampaignId(src)
                                ? `/dashboard/campaigns/${src}`
                                : isObjectId(src)
                                  ? `/cases?highlight=${src}`
                                  : '#'
                            }
                            target={isCampaignId(src) ? '_blank' : undefined}
                            className="flex items-center gap-1 text-xs bg-blue-950/60 hover:bg-blue-900/60 border border-blue-500/20 text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded-md transition-colors"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            {isObjectId(src) ? `Case ${src.substring(0, 8)}…` : src}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Starter prompts (only when only welcome msg) */}
            {messages.length === 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {STARTER_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white px-3 py-1.5 rounded-full transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-white/10">
              <form
                onSubmit={e => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-blue-500/40 transition-colors"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about cases, IPs, metrics…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="text-blue-400 hover:text-blue-300 disabled:text-gray-700 transition-colors p-0.5"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
