import React, { useState, useRef, useEffect } from 'react';
import { chatWithElias, saveChatToLocalStorage } from '../services/chatService';

interface Theologian {
  name: string;
  quote: string;
  work: string;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  scriptures?: string[];
  theologians?: Theologian[];
  principle?: string;
  tags?: string[];
  timestamp: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantMessageId = Date.now() + 1;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      reasoning: '',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      
      let currentContent = '';
      let currentReasoning = '';

      await chatWithElias(userMessage.content, history, (content: string, reasoning: string, data?: any) => {
        if (data?.is_final) {
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content: data.answer || msg.content,
                  scriptures: data.scripture,
                  theologians: data.baptist_theologians,
                  principle: data.baptist_principle,
                  tags: data.tags
                }
              : msg
          ));
          return;
        }

        if (content) currentContent += content;
        if (reasoning) currentReasoning += reasoning;

        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: currentContent, reasoning: currentReasoning }
            : msg
        ));
      });

      saveChatToLocalStorage(userMessage.content, currentContent);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Ha ocurrido un error en la conexión. Por favor, intenta nuevamente.' }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const formatInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-blue-400 font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="text-slate-300 italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="bg-slate-800/80 px-1.5 py-0.5 rounded text-[13px] font-mono text-blue-300"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const formatContent = (content: string) => {
    if (!content) return null;

    const lines = content.split('\n');
    return lines.map((line, lineIndex) => {
      if (line.startsWith('### ')) {
        return (
          <h3 key={lineIndex} className="text-lg font-bold text-white mt-6 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-500 rounded-full" />
            {line.slice(4)}
          </h3>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={lineIndex} className="text-xl font-black text-white mt-8 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
            {line.slice(3)}
          </h2>
        );
      }
      if (line.match(/^(\d+\.|\*|-)\s/)) {
        return (
          <div key={lineIndex} className="ml-2 pl-4 border-l border-slate-700/50 my-3 py-0.5 text-[15px] md:text-base">
            {formatInline(line)}
          </div>
        );
      }
      if (!line.trim()) return <div key={lineIndex} className="h-3" />;
      return <p key={lineIndex} className="mb-4 last:mb-0 leading-relaxed text-slate-200 text-[15px] md:text-base">{formatInline(line)}</p>;
    });
  };

  const renderMessageContent = (message: Message) => {
    return (
      <div className="space-y-6">
        <div className="whitespace-pre-wrap leading-relaxed">
          {formatContent(message.content)}
          {isLoading && message.content && !message.scriptures && (
            <span className="typing-cursor" />
          )}
        </div>

        {message.scriptures && (
          <div className="pt-6 mt-6 border-t border-white/5 space-y-8 animate-fade-up">
            {message.principle && (
              <div className="relative p-6 bg-blue-900/10 rounded-2xl border border-blue-500/20">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 opacity-70">
                  Sustento Teológico
                </h4>
                <p className="text-white text-base md:text-lg font-medium leading-relaxed italic">
                  "{message.principle}"
                </p>
              </div>
            )}

            {message.scriptures.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {message.scriptures.map((ref, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-blue-300"
                  >
                    {ref}
                  </span>
                ))}
              </div>
            )}

            {message.theologians && message.theologians.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {message.theologians.map((theo, i) => (
                  <div
                    key={i}
                    className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl group"
                  >
                    <p className="text-slate-300 text-sm italic mb-4 leading-relaxed group-hover:text-white transition-colors">
                      "{theo.quote}"
                    </p>
                    <div className="flex flex-col gap-0.5 border-l border-blue-500/30 pl-3">
                      <span className="text-sm font-bold text-white">{theo.name}</span>
                      <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">{theo.work}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleQuickAction = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <div className="h-screen w-full bg-[#020617] text-slate-100 flex flex-col font-body overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] pointer-events-none" />
      
      {/* Navbar Statica */}
      <header className="h-16 md:h-20 w-full flex-shrink-0 glass-morphism border-b border-white/5 px-6 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-white leading-none">Elias</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Protocolo Teológico</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">1689 LONDON CONFESSION</span>
        </div>
      </header>

      {/* Main Chat Area (Scrollable Middle) */}
      <main className="flex-1 w-full overflow-hidden relative">
        <div className="h-full w-full overflow-y-auto chat-scroll flex flex-col items-center">
          <div className="w-full max-w-3xl px-4 md:px-6 py-10 space-y-10">
            {messages.length === 0 && (
              <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-10 animate-fade-up">
                <div className="space-y-4 max-w-xl">
                  <h2 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tighter">
                    Indaga en la <span className="text-blue-500 text-glow">Sabiduría</span> Eterna.
                  </h2>
                  <p className="text-slate-400 text-base md:text-lg leading-relaxed">
                    Mentor teológico avanzado para la exploración profunda de las Escrituras y la doctrina reformada.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                  {[
                    { label: 'Soberanía de Dios', icon: '◈' },
                    { label: 'Doctrinas de la Gracia', icon: '✧' },
                    { label: 'Exégesis de Romanos', icon: '📖' },
                    { label: 'Teología Federal', icon: '⚓' }
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleQuickAction(item.label)}
                      className="glass-card group relative p-4 rounded-2xl text-left flex items-center gap-3"
                    >
                      <span className="text-blue-500 text-lg group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                      <span className="text-xs md:text-sm font-bold text-slate-300 group-hover:text-white transition-colors">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} animate-fade-up`}
              >
                <div className={`flex items-start gap-3 max-w-[95%] md:max-w-[85%]`}>
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20 mt-1">
                      <span className="text-[10px] font-bold text-white">E</span>
                    </div>
                  )}
                  <div
                    className={`rounded-2xl p-5 md:p-7 ${
                      message.role === 'user'
                        ? 'bubble-user rounded-tr-sm text-white'
                        : 'bubble-assistant rounded-tl-sm text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${message.role === 'user' ? 'text-blue-100' : 'text-blue-400'}`}>
                        {message.role === 'user' ? 'BUSCADOR' : 'PROTOCOLO ELIAS'}
                      </span>
                      <span className="text-[9px] text-white/20 font-mono">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[15px] md:text-[17px] leading-relaxed">
                      {message.role === 'assistant' ? renderMessageContent(message) : (
                        <p className="font-medium">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </main>

      {/* Footer Input Area */}
      <footer className="w-full flex-shrink-0 glass-morphism border-t border-white/5 p-4 md:p-6 relative z-50">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="bg-white/5 rounded-xl md:rounded-2xl p-1.5 flex items-center gap-2 border border-white/10 focus-within:border-blue-500/40 focus-within:bg-white/[0.07] transition-all duration-300">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Busca sabiduría en las Escrituras..."
                className="flex-1 px-4 py-3 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm md:text-base font-medium"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg md:rounded-xl text-white disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-blue-500/20"
              >
                {isLoading ? (
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
          <p className="text-center text-[9px] text-slate-600 mt-3 font-bold tracking-[0.3em] uppercase">
            Soli Deo Gloria — La sabiduría viene de lo alto
          </p>
        </div>
      </footer>
    </div>
  );
}