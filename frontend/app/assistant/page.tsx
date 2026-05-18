'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { gsap } from '@/lib/gsap';
import {
 ArrowLeft, ShieldCheck, BookOpen, Copy,
 HelpCircle, Mic, Paperclip, Send, ThumbsUp, ThumbsDown, RotateCcw,
 Search, Menu, Volume2, VolumeX
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import TopSearch from '@/components/dashboard/TopSearch';
import { TerminalHeader } from '@/components/ui/TerminalHeader';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import PureMultimodalInput, { Attachment } from '@/components/chat/multimodal-ai-chat-input';
import { useGeolocation } from '@/lib/geolocation';
import { logClientError } from '@/lib/client-logger';
import { PUBLIC_CHATBOT_BASE_URL } from '@/lib/public-env';
import { getLanguageByCode } from '@/lib/languages';

const CHATBOT_URL = PUBLIC_CHATBOT_BASE_URL;

async function* streamChat(
 message: string,
 session_id: string,
 lat?: number,
 lon?: number,
): AsyncGenerator<{ type: string; text?: string; intent?: string; sources?: string[]; session_id?: string; message?: string }> {
 const resp = await fetch(`${CHATBOT_URL}/api/v1/chat/stream`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ message, session_id, lat, lon }),
 });
 if (!resp.ok || !resp.body) throw new Error(`Chat error: ${resp.status}`);
 const reader = resp.body.getReader();
 const decoder = new TextDecoder();
 let buffer = '';
 while (true) {
 const { done, value } = await reader.read();
 if (done) break;
 buffer += decoder.decode(value, { stream: true });
 const lines = buffer.split('\n');
 buffer = lines.pop() ?? '';
 for (const line of lines) {
 if (line.startsWith('data: ')) {
 try { yield JSON.parse(line.slice(6)); } catch { /* skip */ }
 }
 }
 }
}
interface Message {
 id: string;
 role: 'user' | 'ai' | 'system';
 text: string;
 timestamp: string;
 citations?: string[];
 suggestedQueries?: string[];
}

import TypingText from '@/components/dashboard/TypingText';

const INITIAL_MESSAGES: Message[] = [
 {
 id: 'sys-1',
 role: 'system',
 text: 'Session encrypted with SafeVixAI Protocol v2.4',
 timestamp: '',
 }
];

const MOCK_RESPONSES: Record<string, Message> = {
 dui: {
 id: 'mock-dui',
 role: 'ai',
 text: 'Under current regulations, first-time offenders face imprisonment up to 6 months and/or a fine up to â‚¹10,000 for Drunk Driving (BAC > 30mg/100ml). Subsequent offenses within 3 years increase the penalty significantly.',
 timestamp: '',
 citations: ['MV Act Â§185', 'Fine: â‚¹10,000', 'Custody: Max 6 Mo.'],
 suggestedQueries: ['What if the breathalyzer test was faulty?', 'Bail procedure details']
 },
 default: {
 id: 'mock-default',
 role: 'ai',
 text: 'Under the Motor Vehicles Act 1988, the general penalty for traffic violations not covered under specific sections is â‚¹500 for the first offense and â‚¹1,500 for repeat violations.',
 timestamp: '',
 citations: ['MV Act Â§177', 'Gen. Penalty: â‚¹500']
 }
};

const SUGGESTED_STARTERS = [
 " Help! I've been in an accident, what do I do?",
 " Send an ambulance to my current location",
 "Explain the hit-and-run legal procedure",
 "What are my rights during a police inspection?"
];

export default function ChatPage() {
 const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
 const [input, setInput] = useState('');
 const [loading, setLoading] = useState(false);
 const [toastMessage, setToastMessage] = useState<string | null>(null);
 const [showSuggestions, setShowSuggestions] = useState(false);
 const setSystemSidebarOpen = useAppStore((state) => state.setSystemSidebarOpen);
 const { location } = useGeolocation();
 const [sessionId] = useState(() => `assistant-${Date.now()}`);
 const [selectedLanguage, setSelectedLanguage] = useState('en');
 const scrollRef = useRef<HTMLDivElement>(null);
 const textareaRef = useRef<HTMLTextAreaElement>(null);
 const welcomeAdded = useRef(false);
 const [autoRead, setAutoRead] = useState(false);

 const [isSpeaking, setIsSpeaking] = useState(false);

 const speakText = useCallback((text: string) => {
   if (!('speechSynthesis' in window)) return;
   window.speechSynthesis.cancel();
   
   const utterance = new SpeechSynthesisUtterance(text);
   const langObj = getLanguageByCode(selectedLanguage);
   utterance.lang = langObj?.synthesisCode || 'en-IN';
   
   utterance.onstart = () => setIsSpeaking(true);
   utterance.onend = () => setIsSpeaking(false);
   utterance.onerror = () => setIsSpeaking(false);
   
   window.speechSynthesis.speak(utterance);
 }, [selectedLanguage]);

 const stopSpeaking = useCallback(() => {
   if (!('speechSynthesis' in window)) return;
   window.speechSynthesis.cancel();
   setIsSpeaking(false);
 }, []);

 useEffect(() => {
 // Guard against React StrictMode double-mount
 if (welcomeAdded.current) return;
 welcomeAdded.current = true;
 document.title = 'AI Assistant | SafeVixAI';
 const welcomeMsg: Message = {
 id: 'ai-1',
 role: 'ai',
 text: 'SafeVixAI assistant online. I can answer questions about the Motor Vehicles Act, traffic penalties, your rights during a police stop, and road safety laws across India. What do you need?',
 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 };
 setMessages(prev => [...prev, welcomeMsg]);
 }, []);

 useEffect(() => {
 if (scrollRef.current) {
 scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
 }
 }, [messages, loading]);

 useEffect(() => {
 if (toastMessage) {
 const timer = setTimeout(() => setToastMessage(null), 3000);
 return () => clearTimeout(timer);
 }
 }, [toastMessage]);

 useEffect(() => {
 if (textareaRef.current) {
 textareaRef.current.style.height = 'auto';
 textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
 }
 }, [input]);

 const handleSend = useCallback(async (text: string) => {
  if (!text.trim()) return;

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const userMsg: Message = { id: Date.now().toString(), role: 'user', text, timestamp: time };
  setMessages(prev => [...prev, userMsg]);
  setInput('');
  setLoading(true);

  // Streaming assistant placeholder
  const assistantId = `ai-${Date.now() + 1}`;
  setMessages(prev => [...prev, { id: assistantId, role: 'ai', text: '', timestamp: time }]);

  try {
  let accumulated = '';
  for await (const event of streamChat(text, sessionId, location?.lat, location?.lon)) {
  if (event.type === 'token' && event.text) {
  accumulated += event.text;
  setMessages(prev =>
  prev.map(m => m.id === assistantId ? { ...m, text: accumulated } : m)
  );
  } else if (event.type === 'done') {
  const sources = event.sources ?? [];
  setMessages(prev =>
  prev.map(m =>
  m.id === assistantId
  ? { ...m, text: accumulated || 'No response received.', citations: sources }
  : m
  )
  );
  if (autoRead && accumulated) {
     speakText(accumulated);
   }
  } else if (event.type === 'error') {
  throw new Error(event.message ?? 'Stream error');
  }
  }
  } catch (err) {
  logClientError('Chat error:', err);
  setMessages(prev =>
  prev.map(m =>
  m.id === assistantId
  ? { ...m, text: 'Neural link interrupted. Please verify connectivity and retry protocol.' }
  : m
  )
  );
  } finally {
  setLoading(false);
  }
  }, [sessionId, location, autoRead, speakText]);

 return (
 <div className="absolute inset-0 flex flex-col w-full overflow-hidden bg-surface-1">
 {/* â”€â”€ Background Decorative Lines (SafeVixAI Pro Aesthetic) â”€â”€ */}
 <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
 {/* Spots removed per user request */}

 {/* Ambient Glows */}
 <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-brand/5 dark:bg-brand/10 blur-[120px] hidden dark:block" />
 <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-brand-light/5 dark:bg-brand-light/10 blur-[100px] hidden dark:block" />
 </div>

  {/* â”€â”€ Unified Tactical Navigation Header â”€â”€ */}
    <TerminalHeader title="Assistant HUD" subtitle="TACTICAL INTEL & LEGAL" rightElement={
      <div className="flex items-center gap-2">
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="p-2 rounded-full transition-all bg-red-500/10 text-red-500 border border-red-500/30 animate-pulse"
            title="Stop Reading"
          >
            <VolumeX size={16} />
          </button>
        )}
        <button
          onClick={() => {
            setAutoRead(!autoRead);
            if (autoRead) stopSpeaking();
            setToastMessage(autoRead ? "Audio disabled" : "Audio enabled");
          }}
          className={`p-2 rounded-full transition-colors border ${autoRead ? 'bg-brand/20 text-brand border-brand/30 shadow-[0_0_15px_rgba(0,200,150,0.2)]' : 'bg-surface-2 text-text-3 border-border hover:text-text-1'}`}
          title={autoRead ? "Disable Auto-read" : "Enable Auto-read"}
        >
          {autoRead ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
    } />

 <div className="lg:hidden relative z-40">
 <TopSearch isMapPage={false} forceShow={true} showBack={false} />
 </div>

 {/* â”€â”€ Toast Notification â”€â”€ */}
 
 {toastMessage && (
 <div style={{ animation: "fadeInDown 0.2s ease-out" }}
 className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-surface-3 text-text-1 px-4 py-2 rounded-full shadow-lg text-sm font-medium"
 >
 {toastMessage}
 </div>
 )}
 

 {/* â”€â”€ Chat Canvas â”€â”€ */}
 <main ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 overflow-x-hidden pt-28 lg:pt-24 pb-48 lg:pb-36 flex flex-col max-w-4xl mx-auto w-full relative z-10 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
 <div className="space-y-8 flex flex-col w-full pb-8">
 
 {messages.map((msg) => {
 if (msg.role === 'system') {
 return (
 <div key={msg.id} className="self-center mt-2" style={{ animation: "fadeInUp 0.3s ease-out" }}
 >
 <div className="bg-white dark:bg-white/5 px-4 py-2 rounded-full border border-border shadow-sm backdrop-blur-md">
 <span className="text-brand dark:text-brand-light text-[10px] uppercase tracking-[0.1em] font-black font-space">
 {msg.text}
 </span>
 </div>
 </div>
 );
 }

 if (msg.role === 'user') {
 return (
 <div key={msg.id} style={{ animation: "slideInRight 0.3s ease-out" }} className="self-end max-w-[85%] sm:max-w-[75%]"
 >
 <div className="flex flex-col items-end gap-2">
 <div className="bg-brand/20 rounded-t-2xl rounded-bl-2xl px-5 py-3.5 shadow-lg shadow-brand/10 border border-brand/30">
 <p className="text-text-1 text-[15px] leading-relaxed font-medium">{msg.text}</p>
 </div>
 <time dateTime={msg.timestamp} suppressHydrationWarning className="text-[10px] text-text-3 mr-2 font-medium tracking-wide shadow-sm">{msg.timestamp} â€¢ SafeVixAI</time>
 </div>
 </div>
 );
 }

 if (msg.role === 'ai') {
 return (
 <div key={msg.id} style={{ animation: "slideInLeft 0.3s ease-out" }} className="self-start max-w-[90%] sm:max-w-[85%]"
 >
 <div className="flex flex-col items-start gap-2 w-full">
 <SurfaceCard padding="lg" className="rounded-tl-sm shadow-md shadow-black/10 bg-surface-2 backdrop-blur-xl border-border">
 <div className="flex items-center gap-2 mb-3">
 <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
 <ShieldCheck size={16} />
 </div>
 <span className="text-brand text-[11px] font-semibold uppercase tracking-[0.15em] font-mono">SafeVixAI</span>
 </div>
 <p className="text-text-1 text-[15px] leading-relaxed font-medium">
 <TypingText text={msg.text} />
 </p>

 {msg.citations && msg.citations.length > 0 && (
 <div className="mt-5 flex flex-wrap gap-2">
 {msg.citations.map((cite, i) => (
 <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${i === 0 ? 'bg-brand/10 border border-brand/20 text-brand' : 'bg-surface-3 border border-border text-text-2'}`}>
 {i === 0 && <BookOpen size={12} />}
 <span className={`text-[11px] font-semibold tracking-wide ${!i && 'uppercase'}`}>{cite}</span>
 </div>
 ))}
 </div>
 )}
 </SurfaceCard>

 <div className="flex items-center gap-4 ml-2 mb-1">
 <time dateTime={msg.timestamp} suppressHydrationWarning className="text-[10px] text-text-3 font-medium tracking-wide">{msg.timestamp} â€¢ SafeVixAI</time>
 <div className="flex gap-1.5 ml-1">
  <button 
  onClick={() => setToastMessage("Copied to clipboard!")}
  className="text-text-3 hover:text-text-2 transition-colors p-1 rounded hover:bg-surface-2"
  title="Copy"
  >
  <Copy size={13} strokeWidth={2} />
  </button>
  <button 
  onClick={() => {
    speakText(msg.text);
    setToastMessage("Reading aloud...");
  }}
  className="text-text-3 hover:text-text-2 transition-colors p-1 rounded hover:bg-surface-2"
  title="Read Aloud"
  >
  <Volume2 size={13} strokeWidth={2} />
  </button>
 <button 
 onClick={() => setToastMessage("Feedback recorded")}
 className="text-text-3 hover:text-text-2 transition-colors p-1 rounded hover:bg-surface-2"
 >
 <ThumbsUp size={13} strokeWidth={2} />
 </button>
 <button 
 onClick={() => setToastMessage("Feedback recorded")}
 className="text-text-3 hover:text-text-2 transition-colors p-1 rounded hover:bg-surface-2"
 >
 <ThumbsDown size={13} strokeWidth={2} />
 </button>
 <button 
 onClick={() => setToastMessage("Retrying...")}
 className="text-text-3 hover:text-text-2 transition-colors p-1 rounded hover:bg-surface-2 ml-1"
 >
 <RotateCcw size={13} strokeWidth={2} />
 </button>
 </div>
 </div>

 {msg.suggestedQueries && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 w-full">
 {msg.suggestedQueries.map((q, i) => (
 <button
 key={i}
 onClick={() => handleSend(q)}
 className="group bg-surface-2 hover:bg-surface-3 backdrop-blur-md transition-all duration-200 p-4 rounded-xl flex items-start gap-3 text-left border border-border hover:border-brand/30 hover:shadow-sm"
 >
 <div className="mt-0.5 p-1 rounded bg-brand/10 text-brand group-hover:scale-110 transition-transform">
 <HelpCircle size={14} />
 </div>
 <span className="text-text-1 text-[13px] font-medium leading-snug">{q}</span>
 </button>
 ))}
 </div>
 )}
 </div>
 </div>
 );
 }
 })}

 {((messages.length <= 2) || showSuggestions) && !loading && (
 <div style={{ animation: "fadeInUp 0.3s ease-out" }}
 className="self-start w-full mt-2"
 >
 <p className="text-xs text-text-3 mb-3 font-semibold px-2 uppercase tracking-widest">Suggested Inquiries</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {SUGGESTED_STARTERS.map((text, i) => (
 <button
 key={i}
 onClick={() => handleSend(text)}
 className="group bg-surface-2 hover:bg-surface-3 backdrop-blur-md transition-all duration-200 px-4 py-3 rounded-xl text-left border border-border hover:border-brand/30 hover:shadow-sm flex items-start gap-3"
 >
 <div className="mt-0.5 p-1 rounded bg-brand/10 text-brand group-hover:scale-110 transition-transform flex-shrink-0">
 <HelpCircle size={14} />
 </div>
 <span className="text-[13px] text-text-1 font-medium leading-snug">{text}</span>
 </button>
 ))}
 </div>
 {messages.length > 2 && (
 <button 
 onClick={() => setShowSuggestions(false)}
 className="mt-4 text-xs font-semibold text-text-3 hover:text-text-1 underline underline-offset-2 transition-colors mx-auto block"
 >
 Hide Suggestions
 </button>
 )}
 </div>
 )}

 {messages.length > 2 && !showSuggestions && !loading && (
 <div style={{ animation: "fadeIn 0.3s ease-out" }} className="self-center">
 <button 
 onClick={() => setShowSuggestions(true)}
 className="px-4 py-2 rounded-full bg-white/50 dark:bg-white/5 border border-border text-xs font-semibold text-text-2 hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm"
 >
 Show Suggested Inquiries
 </button>
 </div>
 )}

 {/* Skeleton Loading State */}
 {loading && (
 <div style={{ animation: "slideInLeft 0.3s ease-out" }}
 className="self-start max-w-[90%] sm:max-w-[85%]"
 >
 <SurfaceCard padding="lg" className="rounded-tl-sm shadow-md shadow-black/10 bg-surface-2 backdrop-blur-xl border-border flex gap-1.5 items-center w-fit">
 <span className="w-2.5 h-2.5 bg-brand/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
 <span className="w-2.5 h-2.5 bg-brand/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
 <span className="w-2.5 h-2.5 bg-brand/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
 </SurfaceCard>
 </div>
 )}

 
 </div>
 </main>

 {/* â”€â”€ Bottom Input Shell â”€â”€ */}
 <div className="absolute bottom-0 w-full z-50 flex justify-between items-end bg-gradient-to-t from-surface-1 via-surface-1/90 to-transparent pt-16 pb-28 lg:pb-6 px-4 sm:px-6 pointer-events-none">
 <div className="max-w-4xl mx-auto w-full flex flex-col relative items-end pointer-events-none">
 <div className="w-full flex items-end gap-2 sm:gap-3 pointer-events-auto">
  <PureMultimodalInput
  value={input}
  onChange={setInput}
  onSendMessage={({ input }) => handleSend(input)}
  isGenerating={loading}
  canSend={!loading}
  selectedLanguage={selectedLanguage}
  onLanguageChange={setSelectedLanguage}
  />
 </div>
 </div>
 </div>
 </div>
 );
}

