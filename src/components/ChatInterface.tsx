import React, { useState, useRef, useEffect } from 'react';
import {
  chatWithElias,
  getSessionsFromLocalStorage,
  saveSessionMessages,
  deleteSessionFromLocalStorage,
  generateTitleFromQuery
} from '../services/chatService';
import type { ChatSession } from '../services/chatService';
import { confessionChapters } from '../data/confesion1689';

// Componente del Logo Premium de ELÍAS
const EliasLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGoldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#78350f" />
        <stop offset="30%" stopColor="#b88a3e" />
        <stop offset="70%" stopColor="#dfb15b" />
        <stop offset="100%" stopColor="#fef3c7" />
      </linearGradient>
      
      <linearGradient id="logoFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#b45309" stopOpacity={0.9} />
        <stop offset="50%" stopColor="#d97706" stopOpacity={0.8} />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.95} />
      </linearGradient>

      <linearGradient id="logoGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#dfb15b" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
      
      <filter id="logoDivineGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    <circle cx="50" cy="50" r="46" stroke="url(#logoGoldGrad)" strokeWidth="1" strokeDasharray="4 6" opacity="0.25" />
    <circle cx="50" cy="50" r="42" stroke="url(#logoGoldGrad)" strokeWidth="0.5" opacity="0.15" />

    <path d="M 50,14 C 28,34 26,56 46,67 C 32,58 35,38 50,25 C 65,38 68,58 54,67 C 74,56 72,34 50,14 Z" 
          fill="url(#logoFlameGrad)" 
          filter="url(#logoDivineGlow)" 
          opacity="0.85" />

    <path d="M 50,22 C 37,36 37,50 48,59 C 40,52 42,40 50,32 C 58,40 60,52 52,59 C 63,50 63,36 50,22 Z" 
          fill="url(#logoGoldGrad)" 
          opacity="0.95" />

    <path d="M 50,72 C 38,68 22,68 14,73 L 14,84 C 22,79 38,79 50,83 Z" 
          fill="url(#logoGoldGrad)" 
          stroke="#1c1917" 
          strokeWidth="0.5" />
    
    <path d="M 50,72 C 62,68 78,68 86,73 L 86,84 C 78,79 62,79 50,83 Z" 
          fill="url(#logoGoldGrad)" 
          stroke="#1c1917" 
          strokeWidth="0.5" />

    <path d="M 14,75 C 22,70 38,70 50,74 C 62,70 78,70 86,75" stroke="url(#logoGoldGrad)" strokeWidth="1" fill="none" opacity="0.6" />
    <path d="M 14,77 C 22,72 38,72 50,76 C 62,72 78,72 86,77" stroke="url(#logoGoldGrad)" strokeWidth="1" fill="none" opacity="0.4" />

    <path d="M 50,33 L 50,56" stroke="url(#logoGlowGrad)" strokeWidth="2" strokeLinecap="round" />
    <path d="M 43,41 L 57,41" stroke="url(#logoGlowGrad)" strokeWidth="2" strokeLinecap="round" />
    
    <circle cx="50" cy="31" r="2" fill="#ffffff" filter="url(#logoDivineGlow)" />
    <circle cx="41" cy="41" r="2" fill="#ffffff" filter="url(#logoDivineGlow)" />
    <circle cx="59" cy="41" r="2" fill="#ffffff" filter="url(#logoDivineGlow)" />
    <circle cx="50" cy="58" r="2.5" fill="#ffffff" filter="url(#logoDivineGlow)" />

    <line x1="50" y1="72" x2="50" y2="67" stroke="url(#logoGoldGrad)" strokeWidth="1" strokeDasharray="1 1" />
  </svg>
);

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Estados de nuevas funcionalidades
  const [activeTab, setActiveTab] = useState<'history' | 'confession'>('history');
  const [searchQuery, setSearchQuery] = useState('');

  // Lector Bíblico (Modal)
  const [activeVerseRef, setActiveVerseRef] = useState<string | null>(null);
  const [verseContent, setVerseContent] = useState<{
    reference: string;
    verses: { number: number; text: string }[];
  } | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);
  const [verseError, setVerseError] = useState<string | null>(null);

  // Reproductor de Audio (TTS) y Copiado
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<number | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);

  // Filtrado de capítulos de la Confesión de 1689
  const filteredChapters = confessionChapters.filter(ch =>
    ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ch.number.toString() === searchQuery.trim()
  );

  // Función para parsear referencias bíblicas
  const parseBibleReference = (ref: string) => {
    const cleanRef = ref.trim().replace(/\s+/g, ' ');
    const regex = /^(.+?)\s+(\d+):(\d+)(?:\s*-\s*(\d+))?$/;
    const match = cleanRef.match(regex);
    if (!match) return null;

    const bookName = match[1];
    const chapter = parseInt(match[2], 10);
    const startVerse = parseInt(match[3], 10);
    const endVerse = match[4] ? parseInt(match[4], 10) : undefined;

    let bookSlug = bookName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    bookSlug = bookSlug.replace(/^([123])\s*(?:a|o|°)?\s*/i, "$1-");
    bookSlug = bookSlug.replace(/\s+/g, "-");

    if (bookSlug === "salmo") bookSlug = "salmos";
    if (bookSlug === "hechos-de-los-apostoles") bookSlug = "hechos";
    if (bookSlug === "cantar-de-los-cantares" || bookSlug === "cantar") bookSlug = "cantares";
    if (bookSlug === "apocalipsis-de-juan" || bookSlug === "revelacion") bookSlug = "apocalipsis";

    return { book: bookSlug, chapter, startVerse, endVerse };
  };

  // Función para abrir y consultar el versículo en la API Deno de RVR1960
  const handleOpenVerse = async (ref: string) => {
    setActiveVerseRef(ref);
    setVerseLoading(true);
    setVerseError(null);
    setVerseContent(null);

    const parsed = parseBibleReference(ref);
    if (!parsed) {
      setVerseError(`No se pudo interpretar la referencia "${ref}".`);
      setVerseLoading(false);
      return;
    }

    try {
      const url = `https://bible-api.deno.dev/api/read/rv1960/${parsed.book}/${parsed.chapter}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("No se pudo obtener el texto bíblico.");
      }
      const data = await res.json();

      const filteredVerses = data.vers
        .filter((v: any) => {
          const num = v.number;
          if (parsed.endVerse) {
            return num >= parsed.startVerse && num <= parsed.endVerse;
          }
          return num === parsed.startVerse;
        })
        .map((v: any) => ({
          number: v.number,
          text: v.verse
        }));

      if (filteredVerses.length === 0) {
        throw new Error(`No se encontró el versículo ${parsed.startVerse} en el Capítulo ${parsed.chapter}.`);
      }

      setVerseContent({
        reference: ref,
        verses: filteredVerses
      });
    } catch (err: any) {
      console.error(err);
      setVerseError(err.message || "Error al conectar con la base de datos bíblica.");
    } finally {
      setVerseLoading(false);
    }
  };

  // Función para reproducir por audio el consejo (TTS)
  const handleSpeak = (text: string, messageId: number) => {
    if (typeof window === 'undefined') return;

    if (currentlySpeakingId === messageId) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Limpiar Markdown básico del texto
    const cleanText = text
      .replace(/###\s+/g, '')
      .replace(/##\s+/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => setCurrentlySpeakingId(null);
    utterance.onerror = () => setCurrentlySpeakingId(null);

    setCurrentlySpeakingId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // Función para copiar estudio formateado en Markdown
  const handleCopyMessage = (message: Message) => {
    if (typeof navigator === 'undefined') return;

    let formattedText = `${message.content}\n\n`;

    if (message.principle) {
      formattedText += `### Sustento Doctrinario:\n> "${message.principle}"\n\n`;
    }

    if (message.scriptures && message.scriptures.length > 0) {
      formattedText += `### Pasajes Referenciados:\n${message.scriptures.map(s => `- 📖 ${s}`).join('\n')}\n\n`;
    }

    if (message.theologians && message.theologians.length > 0) {
      formattedText += `### Voces Históricas Bautistas:\n`;
      message.theologians.forEach(t => {
        formattedText += `> "${t.quote}" — ${t.name} (${t.work})\n\n`;
      });
    }

    formattedText += `*Estudio compartido desde ELÍAS — Mentor Teológico Bautista Fundamental*`;

    navigator.clipboard.writeText(formattedText).then(() => {
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

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
      if (window.innerWidth < 1024) {
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
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);

      // Cerrar en móviles tras seleccionar
      if (window.innerWidth < 1024) {
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
                <h5 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Pasajes Referenciados (Haz clic para leer)</h5>
                <div className="flex flex-wrap gap-2">
                  {message.scriptures.map((ref, i) => (
                    <button
                      key={i}
                      onClick={() => handleOpenVerse(ref)}
                      className="inline-flex items-center px-3.5 py-1.5 bg-amber-950/25 border border-amber-500/25 rounded-xl text-xs font-bold font-serif text-amber-300 hover:bg-amber-950/45 hover:border-amber-400/50 hover:text-amber-100 hover:scale-[1.03] transition-all duration-300 shadow-sm cursor-pointer"
                      title="Haga clic para leer en tiempo real"
                    >
                      📖 {ref}
                    </button>
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
    <div className="h-full w-full bg-[#0d0b0a] text-stone-100 flex flex-col font-body overflow-hidden relative">
      {/* Background Decor & Warm Divine Glow */}
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] pointer-events-none" />
      <div className="fixed inset-0 divine-glow pointer-events-none" />

      {/* Navbar Estática */}
      <header className="h-16 md:h-20 w-full flex-shrink-0 glass-morphism border-b border-amber-500/10 px-4 md:px-6 flex items-center justify-between relative z-30 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 md:w-11 md:h-11 bg-gradient-to-br from-amber-950/40 to-amber-900/10 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/5 border border-amber-500/20 flex-shrink-0">
            <EliasLogo className="w-6.5 h-6.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-heading font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 text-glow leading-none">
              ELÍAS
            </h1>
            <p className="text-[8px] md:text-[9px] text-amber-500/80 font-bold uppercase tracking-wider md:tracking-[0.25em] mt-1 md:mt-1.5 truncate max-w-[140px] xs:max-w-none">
              Consejo y Doctrina Bíblica
            </p>
          </div>
        </div>

        {/* Navbar Actions: Hamburger Drawer Trigger & London Badge */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <span className="hidden lg:inline text-[10px] font-bold text-amber-400/90 border border-amber-500/20 bg-amber-950/15 px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm select-none">
            Doctrina Bautista Fundamental
          </span>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`w-10 h-10 flex lg:hidden items-center justify-center rounded-xl border transition-all duration-300 shadow-md active:scale-95 cursor-pointer ${isSidebarOpen
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/10'
              : 'bg-stone-900/60 border-amber-500/25 text-amber-400 hover:border-amber-500/40 hover:text-amber-300 shadow-md shadow-amber-500/5'
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
              <div className="w-full max-w-3xl px-3.5 sm:px-6 md:px-10 pt-8 pb-32 space-y-12">

                {messages.length === 0 && (
                  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-12 animate-fade-up">

                    {/* Brand Emblem & Welcome Title */}
                    <div className="space-y-4 max-w-xl">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-950/30 to-amber-900/10 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/5 relative border border-amber-500/20">
                        <div className="absolute inset-0 rounded-full bg-amber-500/5 blur-md animate-pulse" />
                        <EliasLogo className="w-10 h-10 relative z-10" />
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
                    <div className="flex items-start gap-2.5 md:gap-4 w-full max-w-[98%] md:max-w-[85%]">
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-950/60 to-amber-900/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/5 mt-1.5 border border-amber-500/20">
                          <EliasLogo className="w-5.5 h-5.5" />
                        </div>
                      )}
                      <div
                        className={`rounded-3xl shadow-lg border border-amber-500/5 ${message.role === 'user'
                          ? 'bubble-user rounded-tr-sm text-white py-4 px-5 md:py-6 md:px-8'
                          : 'bubble-assistant rounded-tl-sm text-stone-100 py-4.5 px-5 md:py-8 md:px-10'
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

                        {/* Barra de Herramientas para el Asistente */}
                        {message.role === 'assistant' && message.content && (
                          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-amber-500/10 text-xs text-stone-400">
                            <button
                              onClick={() => handleSpeak(message.content, message.id)}
                              className="flex items-center gap-1.5 hover:text-amber-300 transition-colors duration-200 cursor-pointer"
                              title="Escuchar consejo"
                            >
                              {currentlySpeakingId === message.id ? (
                                <>
                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                                  <span className="font-heading uppercase tracking-wider text-[10px]">Detener</span>
                                </>
                              ) : (
                                <>
                                  <span>🔊 Escuchar</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleCopyMessage(message)}
                              className="flex items-center gap-1.5 hover:text-amber-300 transition-colors duration-200 cursor-pointer"
                              title="Copiar reporte completo en Markdown"
                            >
                              {copiedMessageId === message.id ? (
                                <span className="text-amber-400 font-semibold">✓ Copiado</span>
                              ) : (
                                <span>📋 Copiar Estudio</span>
                              )}
                            </button>
                          </div>
                        )}
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
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          />
        )}

        {/* Lado Derecho: Sidebar de Pergaminos (ChatGPT-style drawer) */}
        <aside
          className={`fixed inset-y-0 right-0 z-50 w-[280px] bg-[#12100e] border-l border-amber-500/10 flex flex-col shadow-2xl transition-transform duration-300 ease-out lg:relative lg:translate-x-0 lg:w-[300px] lg:z-20 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          {/* Header del Sidebar */}
          <div className="p-5 border-b border-amber-500/10 flex items-center justify-between flex-shrink-0 bg-[#0d0b0a]/80">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 text-sm">📜</span>
              <h3 className="text-xs font-heading font-black tracking-widest text-amber-400 uppercase">FUNDAMENTOS BÍBLICOS</h3>
            </div>
            {/* Botón de cierre visible solo en móviles */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-stone-400 hover:text-white cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex border-b border-amber-500/10 bg-[#0d0b0a]/40 text-[10px] font-heading font-bold uppercase tracking-wider">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 text-center transition-all border-b-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'border-amber-500 text-amber-300 bg-amber-950/5'
                  : 'border-transparent text-stone-500 hover:text-stone-300'
              }`}
            >
              Estudios
            </button>
            <button
              onClick={() => setActiveTab('confession')}
              className={`flex-1 py-3 text-center transition-all border-b-2 cursor-pointer ${
                activeTab === 'confession'
                  ? 'border-amber-500 text-amber-300 bg-amber-950/5'
                  : 'border-transparent text-stone-500 hover:text-stone-300'
              }`}
            >
              Fundamentos
            </button>
          </div>

          {activeTab === 'history' ? (
            <>
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
            </>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Buscador de Capítulos */}
              <div className="p-3 border-b border-amber-500/10 bg-[#0d0b0a]/35 flex-shrink-0">
                <p className="text-[9px] text-stone-500 font-serif italic mb-2.5 px-1 leading-snug">
                  Artículos basados en la histórica Confesión de Fe de 1689
                </p>
                <input
                  type="text"
                  placeholder="Buscar capítulo o doctrina..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-900/60 border border-stone-850 rounded-xl text-xs placeholder-stone-500 text-stone-200 focus:outline-none focus:border-amber-500/30 transition-all font-serif"
                />
              </div>
              {/* Listado de Capítulos de la Confesión */}
              <div className="flex-1 overflow-y-auto chat-scroll p-3 space-y-3.5 bg-stone-950/15">
                {filteredChapters.map((ch) => (
                  <div 
                    key={ch.number} 
                    className="p-4 bg-stone-900/25 border border-stone-850 rounded-2xl space-y-2.5 hover:border-amber-500/10 hover:bg-stone-900/40 transition-all duration-300 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest font-heading">
                        Capítulo {ch.number}
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-amber-100 font-serif leading-snug">
                      {ch.title}
                    </h4>
                    <p className="text-[11px] text-stone-400 font-serif leading-relaxed italic">
                      "{ch.summary}"
                    </p>
                    
                    {/* Referencias Bíblicas de Soporte */}
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {ch.keyScriptures.map((scr, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOpenVerse(scr)}
                          className="inline-flex items-center px-2 py-1 bg-amber-950/20 border border-amber-500/10 rounded-lg text-[9px] font-serif text-amber-300/90 hover:bg-amber-950/45 hover:border-amber-500/20 transition-all cursor-pointer hover:scale-[1.02]"
                        >
                          📖 {scr}
                        </button>
                      ))}
                    </div>

                    {/* Botón de consultar con el mentor */}
                    <button
                      onClick={() => {
                        const query = `Explícame el Capítulo ${ch.number}: "${ch.title}" de la Confesión de Fe de 1689 desde una perspectiva bautista fundamental.`;
                        setInput(query);
                        if (inputRef.current) {
                          inputRef.current.focus();
                        }
                        handleQuickAction(query);
                        if (window.innerWidth < 1024) {
                          setIsSidebarOpen(false);
                        }
                      }}
                      className="w-full py-2 bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/10 hover:border-amber-500/30 rounded-xl text-[10px] font-bold text-amber-300 hover:text-amber-200 transition-all cursor-pointer font-heading tracking-widest uppercase mt-2.5 text-center shadow-inner"
                    >
                      Estudiar con Elías
                    </button>
                  </div>
                ))}
                {filteredChapters.length === 0 && (
                  <p className="text-center text-[10px] text-stone-500 p-4 font-serif italic">
                    Ningún capítulo coincide con su búsqueda doctrinal.
                  </p>
                )}
              </div>
            </div>
          )}

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

      {/* Modal / Overlay del Lector Bíblico */}
      {activeVerseRef && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-up"
          onClick={() => setActiveVerseRef(null)}
        >
          <div 
            className="w-full max-w-lg bg-[#12100e] border border-amber-500/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div className="p-5 border-b border-amber-500/10 flex items-center justify-between bg-stone-950/40">
              <div className="flex items-center gap-3">
                <span className="text-amber-500 text-lg">📖</span>
                <div>
                  <h3 className="text-sm font-heading font-black tracking-widest text-amber-400 uppercase">
                    Lectura Bíblica
                  </h3>
                  <p className="text-[10px] text-stone-400 font-serif italic mt-0.5">
                    Reina-Valera 1960 (RVR1960)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveVerseRef(null)}
                className="w-8 h-8 rounded-full bg-stone-900 border border-stone-850 flex items-center justify-center text-stone-400 hover:text-white hover:border-amber-500/30 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            {/* Contenido del Modal */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto chat-scroll space-y-4">
              {verseLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-amber-500/80 italic font-serif">
                  <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                  <span>Abriendo las Escrituras...</span>
                </div>
              ) : verseError ? (
                <div className="py-6 text-center space-y-4">
                  <p className="text-red-400 font-serif text-sm">
                    {verseError}
                  </p>
                  <p className="text-stone-400 text-xs leading-relaxed font-serif">
                    Puedes consultar el pasaje directamente en:
                  </p>
                  <a
                    href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(activeVerseRef)}&version=RVR1960`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Bible Gateway ↗
                  </a>
                </div>
              ) : verseContent ? (
                <div className="space-y-4">
                  <h4 className="text-lg font-heading text-amber-300 font-bold mb-4 text-center">
                    {verseContent.reference}
                  </h4>
                  <div className="space-y-4 pl-4 border-l-2 border-amber-500/20 py-1">
                    {verseContent.verses.map((v) => (
                      <p key={v.number} className="text-stone-200 font-serif text-base md:text-lg leading-relaxed">
                        <sup className="text-amber-500 font-bold mr-1.5 text-xs">{v.number}</sup>
                        {v.text}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            
            {/* Footer del Modal */}
            <div className="p-4 border-t border-amber-500/10 bg-stone-950/20 flex justify-end gap-3">
              {verseContent && (
                <button
                  onClick={() => {
                    const textToCopy = verseContent.verses.map(v => `${v.number}. ${v.text}`).join('\n');
                    navigator.clipboard.writeText(`"${textToCopy}" (${verseContent.reference} RVR1960)`);
                    alert("Versículo copiado al portapapeles");
                  }}
                  className="px-4 py-2 bg-stone-900 border border-stone-850 hover:border-amber-500/20 rounded-xl text-xs font-bold text-stone-300 hover:text-white transition-all cursor-pointer"
                >
                  📋 Copiar Versículo
                </button>
              )}
              <button
                onClick={() => setActiveVerseRef(null)}
                className="px-4 py-2 bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 rounded-xl text-xs font-bold text-stone-950 transition-all cursor-pointer shadow-md shadow-amber-500/15"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}