import React, { useState, useRef, useEffect } from 'react';
import {
  chatWithElias,
  getSessionsFromLocalStorage,
  saveSessionMessages,
  deleteSessionFromLocalStorage,
  generateTitleFromQuery
} from '../services/chatService';
import type { ChatSession } from '../services/chatService';

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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Cargar lista de sesiones al montar el componente e iniciar en la más reciente
  useEffect(() => {
    const list = getSessionsFromLocalStorage();
    setSessions(list);

    // Autocargar la conversación más reciente para dar continuidad inmediata
    if (list.length > 0) {
      setCurrentSessionId(list[0].id);
      setMessages(list[0].messages);
    }
  }, []);

  // Adaptar sidebar por defecto según el tamaño de la pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize(); // Carga inicial
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    // Cerrar sidebar en dispositivos móviles al iniciar nuevo chat
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);

      // Cerrar en móviles tras seleccionar
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    }
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar seleccionar la sesión al hacer clic en eliminar

    const updatedList = deleteSessionFromLocalStorage(sessionId);
    setSessions(updatedList);

    // Si eliminamos la sesión que estamos visualizando actualmente
    if (sessionId === currentSessionId) {
      if (updatedList.length > 0) {
        // Cargar la siguiente disponible
        setCurrentSessionId(updatedList[0].id);
        setMessages(updatedList[0].messages);
      } else {
        // No quedan más: limpiar pantalla
        setCurrentSessionId(null);
        setMessages([]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    let activeSessionId = currentSessionId;
    let isNewSession = false;

    // Si es una conversación nueva, generamos el ID de sesión
    if (!activeSessionId) {
      activeSessionId = Date.now().toString();
      setCurrentSessionId(activeSessionId);
      isNewSession = true;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const assistantMessageId = Date.now() + 1;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      reasoning: '',
      timestamp: new Date().toISOString()
    };

    const messagesWithAssistant = [...newMessages, assistantMessage];
    setMessages(messagesWithAssistant);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      let currentContent = '';
      let currentReasoning = '';

      // Título sugerido para el primer mensaje de la sesión
      const sessionTitle = isNewSession ? generateTitleFromQuery(userText) : undefined;

      await chatWithElias(userText, history, (content: string, reasoning: string, data?: any) => {
        let finalMessages = [];
        if (data?.is_final) {
          finalMessages = messagesWithAssistant.map(msg =>
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
          );
          setMessages(finalMessages);

          // Persistencia en LocalStorage e impacto en el Sidebar
          const updated = saveSessionMessages(activeSessionId!, finalMessages, sessionTitle);
          setSessions(updated);
          return;
        }

        if (content) currentContent += content;
        if (reasoning) currentReasoning += reasoning;

        finalMessages = messagesWithAssistant.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: currentContent, reasoning: currentReasoning }
            : msg
        );
        setMessages(finalMessages);

        // Guardado en tiempo real de los chunks
        saveSessionMessages(activeSessionId!, finalMessages, sessionTitle);
      });
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: 'Ha ocurrido un error al intentar conectarse con el servidor. Por favor, intenta de nuevo.' }
          : msg
      ));
    } finally {
      setIsLoading(false);
      // Forzar recarga fresca de las sesiones
      setSessions(getSessionsFromLocalStorage());
    }
  };

  const handleQuickAction = async (text: string) => {
    if (isLoading) return;

    let activeSessionId = currentSessionId;
    let isNewSession = false;

    if (!activeSessionId) {
      activeSessionId = Date.now().toString();
      setCurrentSessionId(activeSessionId);
      isNewSession = true;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const assistantMessageId = Date.now() + 1;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      reasoning: '',
      timestamp: new Date().toISOString()
    };

    const messagesWithAssistant = [...newMessages, assistantMessage];
    setMessages(messagesWithAssistant);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      let currentContent = '';
      let currentReasoning = '';

      const sessionTitle = isNewSession ? generateTitleFromQuery(text) : undefined;

      await chatWithElias(text, history, (content: string, reasoning: string, data?: any) => {
        let finalMessages = [];
        if (data?.is_final) {
          finalMessages = messagesWithAssistant.map(msg =>
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
          );
          setMessages(finalMessages);

          const updated = saveSessionMessages(activeSessionId!, finalMessages, sessionTitle);
          setSessions(updated);
          return;
        }

        if (content) currentContent += content;
        if (reasoning) currentReasoning += reasoning;

        finalMessages = messagesWithAssistant.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: currentContent, reasoning: currentReasoning }
            : msg
        );
        setMessages(finalMessages);
        saveSessionMessages(activeSessionId!, finalMessages, sessionTitle);
      });
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: 'Ha ocurrido un error al intentar conectarse con el servidor. Por favor, intenta de nuevo.' }
          : msg
      ));
    } finally {
      setIsLoading(false);
      setSessions(getSessionsFromLocalStorage());
    }
  };

  const formatInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-amber-300 font-bold font-body">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="text-amber-100/90 font-serif italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="bg-amber-950/40 border border-amber-900/30 px-1.5 py-0.5 rounded text-[13px] font-mono text-amber-200"
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
          <h3 key={lineIndex} className="text-lg font-heading font-semibold text-amber-100 mt-6 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-amber-500 rounded-full" />
            {line.slice(4)}
          </h3>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={lineIndex} className="text-xl font-heading font-bold text-amber-400 mt-8 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-amber-600 rounded-full" />
            {line.slice(3)}
          </h2>
        );
      }
      if (line.match(/^(\d+\.|\*|-)\s/)) {
        return (
          <div key={lineIndex} className="ml-2 pl-4 border-l-2 border-amber-500/20 my-4 py-1 text-[15px] md:text-[17px] font-serif text-stone-300 leading-relaxed">
            {formatInline(line)}
          </div>
        );
      }
      if (!line.trim()) return <div key={lineIndex} className="h-3" />;
      return <p key={lineIndex} className="mb-4 last:mb-0 leading-relaxed text-stone-200 font-serif text-[16px] md:text-[18px]">{formatInline(line)}</p>;
    });
  };

  const renderMessageContent = (message: Message) => {
    if (!message.content && isLoading) {
      return (
        <div className="flex items-center gap-3 text-amber-400/80 text-sm font-serif italic py-3">
          <div className="flex space-x-1.5">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>Escudriñando las Escrituras y la doctrina...</span>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="whitespace-pre-wrap leading-relaxed">
          {formatContent(message.content)}
          {isLoading && message.content && !message.scriptures && (
            <span className="typing-cursor" />
          )}
        </div>

        {message.scriptures && (
          <div className="pt-6 mt-6 border-t border-amber-500/10 space-y-8 animate-fade-up">
            {message.principle && (
              <div className="relative p-6 md:p-8 bg-amber-950/15 rounded-2xl border-l-4 border-amber-500/75 border-y border-r border-amber-500/10 shadow-inner">
                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3.5 opacity-90">
                  Sustento Doctrinario
                </h4>
                <p className="text-amber-100/90 text-base md:text-lg font-serif italic leading-relaxed">
                  "{message.principle}"
                </p>
              </div>
            )}

            {message.scriptures.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Pasajes Referenciados</h5>
                <div className="flex flex-wrap gap-2">
                  {message.scriptures.map((ref, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-3.5 py-1.5 bg-amber-950/20 border border-amber-500/20 rounded-xl text-xs font-bold font-serif text-amber-300 hover:bg-amber-950/40 hover:border-amber-400/40 transition-all duration-300 shadow-sm"
                    >
                      📖 {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {message.theologians && message.theologians.length > 0 && (
              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Voces Históricas Bautistas</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {message.theologians.map((theo, i) => (
                    <div
                      key={i}
                      className="p-5 bg-stone-900/30 border border-stone-800/80 rounded-2xl group hover:border-amber-500/20 transition-all duration-300 shadow-sm"
                    >
                      <p className="text-stone-300 text-sm font-serif italic mb-5 leading-relaxed group-hover:text-amber-100 transition-colors">
                        "{theo.quote}"
                      </p>
                      <div className="flex flex-col gap-0.5 border-l border-amber-500/30 pl-3">
                        <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">{theo.name}</span>
                        <span className="text-[9px] text-amber-500/70 font-bold uppercase tracking-widest">{theo.work}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-[#0d0b0a] text-stone-100 flex flex-col font-body overflow-hidden relative">
      {/* Background Decor & Warm Divine Glow */}
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] pointer-events-none" />
      <div className="fixed inset-0 divine-glow pointer-events-none" />

      {/* Navbar Estática */}
      <header className="h-16 md:h-20 w-full flex-shrink-0 glass-morphism border-b border-amber-500/10 px-6 flex items-center justify-between relative z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-11 md:h-11 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/15 border border-amber-400/20 flex-shrink-0">
            {/* Elegant Open Bible SVG with Cross symbol inside */}
            <svg className="w-5 h-5 text-stone-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v6M10 10h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 text-glow leading-none">
              ELÍAS
            </h1>
            <p className="text-[9px] text-amber-500/80 font-bold uppercase tracking-[0.25em] mt-1.5">
              Consejo y Doctrina Bíblica
            </p>
          </div>
        </div>

        {/* Navbar Actions: Hamburger Drawer Trigger & London Badge */}
        <div className="flex items-center gap-3.5">
          <span className="hidden lg:inline text-[10px] font-bold text-amber-400/90 border border-amber-500/20 bg-amber-950/15 px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm select-none">
            Doctrina Bautista Fundamental
          </span>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`w-10 h-10 flex md:hidden items-center justify-center rounded-xl border transition-all duration-300 shadow-sm active:scale-95 cursor-pointer ${isSidebarOpen
              ? 'bg-amber-950/30 border-amber-500/35 text-amber-300 shadow-lg shadow-amber-500/5'
              : 'bg-stone-900/40 border-stone-800/80 text-stone-300 hover:border-amber-500/20 hover:text-amber-400'
              }`}
            title={isSidebarOpen ? "Ocultar Historial" : "Mostrar Historial"}
          >
            {/* Elegant bold hamburger SVG matching the user's icon */}
            <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Area Central: Chat a la izquierda y Sidebar a la derecha */}
      <div className="flex-1 w-full flex overflow-hidden relative">

        {/* Lado Izquierdo: Ventana de Chat Principal */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <main className="flex-1 w-full overflow-hidden relative">
            <div className="h-full w-full overflow-y-auto chat-scroll flex flex-col items-center">
              <div className="w-full max-w-3xl px-6 md:px-10 pt-8 pb-32 space-y-12">

                {messages.length === 0 && (
                  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-12 animate-fade-up">

                    {/* Brand Emblem & Welcome Title */}
                    <div className="space-y-4 max-w-xl">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/10 relative border border-amber-400/20">
                        <div className="absolute inset-0 rounded-full bg-amber-500/15 blur-md animate-pulse" />
                        <svg className="w-8 h-8 text-stone-950 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v6M10 10h4" />
                        </svg>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-heading text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-200 to-amber-400 leading-tight tracking-tight text-glow">
                        ELÍAS
                      </h2>
                      <p className="text-xs md:text-sm font-heading text-amber-400/90 uppercase tracking-[0.25em] font-semibold mt-1">
                        Tu Consejero Teológico y Pastoral
                      </p>
                    </div>

                    {/* Acronym Explainer Card */}
                    <div className="max-w-2xl mx-auto p-8 md:p-10 rounded-3xl bg-amber-950/10 border border-amber-500/10 text-stone-300 text-sm md:text-base leading-relaxed space-y-6 shadow-2xl shadow-black/40">
                      <div className="flex flex-wrap justify-center items-center gap-3 text-xs md:text-sm font-bold tracking-wider text-amber-300/90">
                        <div className="px-3 py-1.5 bg-amber-950/60 border border-amber-500/20 rounded-xl flex items-center gap-1.5 shadow-sm">
                          <span className="text-white text-base font-heading">EL</span>
                          <span className="text-[10px] text-stone-400 font-normal font-body">Él es Dios</span>
                        </div>
                        <span>•</span>
                        <div className="px-3 py-1.5 bg-amber-950/60 border border-amber-500/20 rounded-xl flex items-center gap-1.5 shadow-sm">
                          <span className="text-white text-base font-heading">IA</span>
                          <span className="text-[10px] text-stone-400 font-normal font-body">Inteligencia Artificial</span>
                        </div>
                        <span>•</span>
                        <div className="px-3 py-1.5 bg-amber-950/60 border border-amber-500/20 rounded-xl flex items-center gap-1.5 shadow-sm">
                          <span className="text-white text-base font-heading">S</span>
                          <span className="text-[10px] text-stone-400 font-normal font-body">De Dios (Pertenencia)</span>
                        </div>
                      </div>
                      <p className="text-stone-200 font-serif leading-relaxed text-center text-base md:text-lg italic px-4">
                        "La sabiduría al servicio del Señor. Un mentor doctrinal y pastoral diseñado para guiarte en el estudio de las Escrituras, arraigado en la herencia bautista."
                      </p>
                      <div className="h-[1px] w-1/3 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent mx-auto" />
                      <p className="text-[10px] text-amber-500/70 font-semibold text-center uppercase tracking-widest">
                        Soli Deo Gloria — La sabiduría viene de lo alto
                      </p>
                    </div>

                    {/* Quick study prompts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl mt-8">
                      {[
                        { label: 'Soberanía de Dios', icon: '🔥' },
                        { label: 'Doctrinas de la Gracia', icon: '🕊️' },
                        { label: 'Exégesis de Romanos', icon: '📖' },
                        { label: 'Pactos y Teología Federal', icon: '⚓' }
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => handleQuickAction(item.label)}
                          className="glass-card group relative p-4 rounded-2xl text-left flex items-center gap-4 border border-stone-800/80 shadow-md hover:shadow-lg hover:shadow-amber-500/5 duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                        >
                          <span className="text-amber-500 text-xl group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                          <span className="text-sm font-serif font-medium text-stone-200 group-hover:text-white transition-colors tracking-wide">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conversación activa */}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} animate-fade-up`}
                  >
                    <div className="flex items-start gap-4 max-w-[95%] md:max-w-[85%]">
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/15 mt-1.5 border border-amber-400/20">
                          <span className="text-xs font-heading font-black text-stone-950">E</span>
                        </div>
                      )}
                      <div
                        className={`rounded-3xl shadow-lg border border-amber-500/5 ${message.role === 'user'
                          ? 'bubble-user rounded-tr-sm text-white py-5 px-6 md:py-6 md:px-8'
                          : 'bubble-assistant rounded-tl-sm text-stone-100 py-6 px-7 md:py-8 md:px-10'
                          }`}
                      >
                        {/* Cabecera interna del globo */}
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-500/10">
                          <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${message.role === 'user' ? 'text-amber-200' : 'text-amber-400 font-heading'}`}>
                            {message.role === 'user' ? 'BUSCADOR DE LA VERDAD' : 'ELÍAS — SABIDURÍA DE DIOS'}
                          </span>
                          <span className="text-[9px] text-white/20 font-mono">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Contenido del globo */}
                        <div className="leading-relaxed">
                          {message.role === 'assistant' ? renderMessageContent(message) : (
                            <p className="font-serif italic text-stone-100 text-[16px] md:text-[18px] leading-relaxed">"{message.content}"</p>
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

          {/* Footer Flotante */}
          <footer className="w-full flex-shrink-0 glass-morphism border-t border-amber-500/10 px-6 pt-4 pb-8 md:pb-10 relative z-50 shadow-inner">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="relative group">
                <div className="bg-stone-900/40 rounded-xl md:rounded-2xl p-2 flex items-center gap-3.5 border border-stone-800/80 focus-within:border-amber-500/35 focus-within:bg-stone-900/70 transition-all duration-300 shadow-md">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escudriña las Escrituras o consulta una doctrina..."
                    className="flex-1 px-4 py-3 bg-transparent text-white placeholder-stone-500 focus:outline-none text-sm md:text-base font-serif"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="flex items-center justify-center w-11 h-11 md:w-13 md:h-13 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg md:rounded-xl text-stone-950 disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-amber-500/20 border border-amber-400/20 flex-shrink-0 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-stone-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
              <p className="text-center text-[10px] text-amber-500/50 mt-3.5 font-bold tracking-[0.25em] uppercase font-heading">
                Soli Deo Gloria — La sabiduría viene de lo alto
              </p>
            </div>
          </footer>
        </div>

        {/* Backdrop Oscuro de Cierre para Móviles (Drawer Backdrop) */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          />
        )}

        {/* Lado Derecho: Sidebar de Pergaminos (ChatGPT-style drawer) */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 w-[280px] bg-[#12100e] border-l border-amber-500/10 flex flex-col shadow-2xl transition-transform duration-300 ease-out md:relative md:translate-x-0 md:w-[300px] md:z-20 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          {/* Header del Sidebar */}
          <div className="p-5 border-b border-amber-500/10 flex items-center justify-between flex-shrink-0 bg-[#0d0b0a]/80">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-sm">📜</span>
              <h3 className="text-xs font-heading font-black tracking-widest text-amber-400">MIS CONSULTAS</h3>
            </div>
            {/* Botón de cierre visible solo en móviles */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-stone-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Botón + Nueva Consulta */}
          <div className="p-4 flex-shrink-0">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-gradient-to-r from-amber-950/40 to-amber-900/10 hover:from-amber-950/60 hover:to-amber-900/30 border border-amber-500/20 hover:border-amber-400/40 rounded-xl text-xs font-bold text-amber-300 hover:text-amber-200 transition-all duration-300 shadow-md active:scale-98 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-heading tracking-wider">NUEVO ESTUDIO</span>
            </button>
          </div>

          {/* Listado de Pergaminos (Bibliografía) */}
          <div className="flex-1 overflow-y-auto chat-scroll p-4 space-y-3">
            {sessions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-40">
                <span className="text-4xl">📚</span>
                <p className="text-xs font-serif text-stone-400 leading-relaxed">
                  No hay estudios archivados. Inicia tu consulta doctrinal en el panel izquierdo.
                </p>
              </div>
            ) : (
              sessions.map((session) => {
                const isActive = session.id === currentSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={`group relative w-full flex items-center justify-between p-4 rounded-xl border text-left cursor-pointer transition-all duration-300 hover:bg-stone-900/40 ${isActive
                      ? 'bg-amber-950/15 border-amber-500/30 shadow-md shadow-amber-500/5'
                      : 'bg-stone-900/10 border-stone-900/80 hover:border-amber-500/10'
                      }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-6">
                      <span className={`text-sm transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-amber-400' : 'text-stone-500 group-hover:text-amber-500/70'}`}>
                        📖
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[13px] font-medium truncate tracking-wide leading-snug transition-colors ${isActive
                          ? 'text-amber-200 font-semibold font-serif'
                          : 'text-stone-300 group-hover:text-stone-100 font-serif'
                          }`}>
                          {session.title}
                        </span>
                        <span className="text-[9px] text-stone-500/80 font-mono mt-1 uppercase tracking-wider">
                          {new Date(session.lastInteraction).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(session.lastInteraction).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Botón de eliminar (Papelera) */}
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="absolute right-3.5 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 text-stone-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-all duration-200 cursor-pointer"
                      title="Eliminar consulta"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer del Sidebar */}
          <div className="p-4 border-t border-amber-500/10 flex flex-col items-center justify-center flex-shrink-0 bg-[#0d0b0a]/40 text-center gap-3">
            <a 
              href="https://paypal.me/recursosbautistas" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors text-amber-300 text-xs font-bold hover:text-amber-200 w-full shadow-sm cursor-pointer"
            >
              ☕ Invítame un café
            </a>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-[0.25em]">Soli Deo Gloria</span>
              <span className="text-[8px] text-stone-500 font-semibold uppercase tracking-wider mt-1">Archivador de Gracia</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}