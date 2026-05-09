import { useState, useRef, useEffect } from 'react';
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

      await chatWithElias(userMessage.content, history, (content, reasoning, data) => {
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

  const formatContent = (content: string) => {
    if (!content) return null;
    
    const parts = content.split(/(\*\*.*?\*\*|`.*?`|\n)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-white font-medium">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="bg-white/10 px-1.5 py-0.5 rounded-md text-sm border border-white/10 font-mono text-[#E5B05C]">{part.slice(1, -1)}</code>;
      }
      if (part === '\n') {
        return <br key={index} />;
      }
      return part;
    });
  };

  const renderMessageContent = (message: Message) => {
    const content = message.content;
    
    return (
      <div className="space-y-6">
        <div className="whitespace-pre-wrap leading-relaxed font-inter text-gray-300 text-[15px]">
          {formatContent(content)}
          {isLoading && !message.scriptures && (
            <span className="typing-cursor" />
          )}
        </div>

        {message.scriptures && (
          <div className="pt-6 mt-4 border-t border-white/5 space-y-6 animate-fade-in">
            {message.principle && (
              <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#E5B05C]/30 to-transparent" />
                <span className="text-[11px] text-[#E5B05C] font-medium tracking-[0.2em] uppercase">
                  {message.principle}
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#E5B05C]/30 to-transparent" />
              </div>
            )}

            {message.scriptures.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {message.scriptures.map((ref, i) => (
                  <span key={i} className="text-[13px] px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all cursor-default">
                    <span className="text-[#E5B05C] mr-1">✦</span> {ref}
                  </span>
                ))}
              </div>
            )}

            {message.theologians && message.theologians.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {message.theologians.map((theo, i) => (
                  <div key={i} className="p-5 rounded-2xl glass-panel group hover:shadow-[0_0_20px_rgba(229,176,92,0.1)] transition-all duration-500">
                    <p className="text-sm italic text-gray-400 group-hover:text-gray-200 transition-colors leading-relaxed">
                      "{theo.quote}"
                    </p>
                    <div className="mt-4 flex flex-col gap-1">
                      <span className="text-[13px] font-medium text-white">{theo.name}</span>
                      <span className="text-[11px] text-[#E5B05C]/80 uppercase tracking-wider">{theo.work}</span>
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
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-10">
      <header className="flex flex-col items-center py-10">
        <div className="relative modern-glow">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E5B05C] to-[#C19A6B] p-[1px]">
            <div className="w-full h-full rounded-2xl bg-[#030305] flex items-center justify-center">
              <svg className="w-7 h-7 text-[#E5B05C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>
        <h1 className="mt-8 text-3xl font-light tracking-[0.25em] text-white">
          ELIAS
        </h1>
        <p className="mt-2 text-[11px] text-gray-500 uppercase tracking-[0.35em]">
          Theological Assistant
        </p>
      </header>

      <main className="flex-1 overflow-y-auto pb-48 space-y-12 scroll-smooth no-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-2xl font-medium text-white mb-4">La Verdad en las Escrituras</h2>
            <p className="text-gray-400 text-base max-w-xl mx-auto leading-relaxed mb-12">
              Explora doctrinas, principios históricos e interpretaciones bíblicas guiadas por siglos de sabiduría.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-3xl">
              {[
                { label: 'La Soberanía de Dios', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064' },
                { label: 'Doctrina de la Gracia', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
                { label: 'Exégesis de Romanos', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                { label: 'Historia de la Iglesia', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
              ].map((btn, i) => (
                <button
                  key={btn.label}
                  onClick={() => handleQuickAction(`Explícame sobre: ${btn.label}`)}
                  className="flex items-center gap-5 p-5 text-left glass-panel rounded-2xl transition-all duration-300 hover:bg-white/5 hover:-translate-y-1 group"
                  style={{ animationDelay: `${0.3 + (i * 0.1)}s` }}
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#E5B05C]/20 transition-colors shrink-0">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-[#E5B05C] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={btn.icon} />
                    </svg>
                  </div>
                  <span className="text-[15px] text-gray-300 font-medium">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-in w-full`}
          >
            {message.role === 'assistant' && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E5B05C]/20 to-[#C19A6B]/20 flex items-center justify-center mr-5 flex-shrink-0 border border-[#E5B05C]/20 mt-1">
                <span className="text-xs font-medium text-[#E5B05C]">E</span>
              </div>
            )}
            <div
              className={`max-w-[90%] md:max-w-[85%] ${
                message.role === 'user'
                  ? 'bg-white/10 text-white px-8 py-5 rounded-[28px] rounded-tr-[10px] backdrop-blur-md border border-white/5'
                  : 'text-gray-200'
              }`}
            >
              <div className="font-inter">
                {message.role === 'assistant' ? renderMessageContent(message) : (
                  <p className="text-[16px] leading-relaxed">{message.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#030305] via-[#030305] to-transparent pt-24 pb-8 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto relative">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#E5B05C]/0 via-[#E5B05C]/20 to-[#E5B05C]/0 rounded-[32px] blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu consulta teológica..."
                className="w-full glass-panel rounded-[28px] px-8 py-6 text-[16px] text-white placeholder-gray-500 focus:outline-none focus:bg-white/5 transition-all duration-300 pr-20 border border-white/10"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-4 p-3.5 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all duration-300"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-6 h-6 translate-x-[1px] -translate-y-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
          <p className="text-center text-[11px] text-gray-600 mt-5 tracking-[0.08em]">
            La fe que busca entender. Las respuestas generadas son para estudio y reflexión.
          </p>
        </div>
      </div>
    </div>
  );
}