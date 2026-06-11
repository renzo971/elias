import React, { useState, useEffect, useRef } from 'react';
import {
  generateLessonBookPlan,
  generateIndividualLesson,
  getLessonBooksFromLocalStorage,
  saveLessonBookSession,
  deleteLessonBookSession,
  type LessonPlanItem,
  type LessonBookSession,
} from '../services/lessonBookService';

declare global {
  interface Window {
    html2pdf?: (options?: any) => {
      from: (element: HTMLElement) => {
        set: (opts: any) => {
          save: () => Promise<void>;
        };
      };
    };
  }
}

// -------------------------------------------------------------
// Constants duplicated from SundaySchoolGenerator for layout parity
// -------------------------------------------------------------

const COLOR_THEMES = {
  vibrant: {
    name: 'Alegre / Infantil',
    primary: '#e11d48',
    primaryDark: '#be123c',
    primaryText: '#9f1239',
    bgLight: '#fff5f5',
    accent: '#9333ea',
    accentBg: '#faf5ff',
    accentBorder: '#e9d5ff',
    accentText: '#6b21a8',
    border: '4px solid #e11d48',
    cardBorder: '1px solid #e9d5ff',
    text: '#1c1917',
    mutedText: '#78716c',
    divider: 'rgba(225, 29, 72, 0.2)',
    badgeBg: '#e0e7ff',
    badgeBorder: '#a5b4fc',
    gridBgEven: '#fafaf9',
    gridBgOdd: '#f5f5f4',
    gridBorder: '#d4d4d4',
  },
  solemn: {
    name: 'Solemne / Sagrado',
    primary: '#dfb15b',
    primaryDark: '#b88a3e',
    primaryText: '#78561d',
    bgLight: '#faf9f6',
    accent: '#292524',
    accentBg: '#f5f5f4',
    accentBorder: '#e7e5e4',
    accentText: '#44403c',
    border: '4px solid #b88a3e',
    cardBorder: '1px solid #d6d3d1',
    text: '#0d0b0a',
    mutedText: '#57534e',
    divider: 'rgba(184, 138, 62, 0.3)',
    badgeBg: '#f5f5f4',
    badgeBorder: '#d6d3d1',
    gridBgEven: '#ffffff',
    gridBgOdd: '#faf9f6',
    gridBorder: '#e7e5e4',
  },
  nature: {
    name: 'Naturaleza / Calmado',
    primary: '#059669',
    primaryDark: '#047857',
    primaryText: '#065f46',
    bgLight: '#f0fdf4',
    accent: '#d97706',
    accentBg: '#fffbeb',
    accentBorder: '#fde68a',
    accentText: '#92400e',
    border: '4px solid #047857',
    cardBorder: '1px solid #bbf7d0',
    text: '#1c1917',
    mutedText: '#52525b',
    divider: 'rgba(4, 120, 87, 0.2)',
    badgeBg: '#fef3c7',
    badgeBorder: '#fde68a',
    gridBgEven: '#f8fafc',
    gridBgOdd: '#f1f5f9',
    gridBorder: '#cbd5e1',
  },
  minimal: {
    name: 'Ahorro de Tinta / Minimalista',
    primary: '#000000',
    primaryDark: '#000000',
    primaryText: '#000000',
    bgLight: '#ffffff',
    accent: '#000000',
    accentBg: '#ffffff',
    accentBorder: '#000000',
    accentText: '#000000',
    border: '2px solid #000000',
    cardBorder: '1px solid #000000',
    text: '#000000',
    mutedText: '#555555',
    divider: '#000000',
    badgeBg: '#ffffff',
    badgeBorder: '#000000',
    gridBgEven: '#ffffff',
    gridBgOdd: '#ffffff',
    gridBorder: '#000000',
  }
};

const FONT_SIZES = {
  compact: {
    base: '10px',
    h3: '11.5px',
    h2: '13px',
    title: '20px',
    lineHeight: '1.4',
    badge: '8px',
    inputDesc: '9px',
    gridCell: '22px',
    gridText: '11px',
    subHeader: '11px',
  },
  standard: {
    base: '11.5px',
    h3: '13px',
    h2: '15px',
    title: '24px',
    lineHeight: '1.5',
    badge: '9px',
    inputDesc: '10px',
    gridCell: '28px',
    gridText: '13px',
    subHeader: '13px',
  },
  large: {
    base: '13px',
    h3: '15px',
    h2: '17px',
    title: '28px',
    lineHeight: '1.6',
    badge: '10.5px',
    inputDesc: '11px',
    gridCell: '32px',
    gridText: '15px',
    subHeader: '15px',
  }
};

interface LessonData {
  numeroEscena: string;
  titulo: string;
  pasaje: string;
  versiculoRef: string;
  versiculoTexto: string;
  leccion: string;
  materiales: string;
  instrucciones: string;
  juegoTitulo: string;
  juegoTexto: string;
  desafioTitulo: string;
  desafioTexto: string;
  asistencia: string;
  alumnoTipoJuego: string;
  alumnoContenido: string;
  alumnoInstrucciones: string;
  alumnoImagenBase64: string;
}

const parseResource = (text: string, fallbackTitle: string): LessonData => {
  const data: LessonData = {
    numeroEscena: '1',
    titulo: fallbackTitle,
    pasaje: 'Lectura Bíblica',
    versiculoRef: 'Apocalipsis 22:13',
    versiculoTexto: '"Yo soy el Alfa y la Omega..."',
    leccion: '',
    materiales: '',
    instrucciones: '',
    juegoTitulo: 'Juego Didáctico',
    juegoTexto: '',
    desafioTitulo: '¡Atrévete!',
    desafioTexto: '',
    asistencia: 'Trae tu Biblia, memoriza el versículo y colecciona los stickers.',
    alumnoTipoJuego: 'DIBUJO_DIRIGIDO',
    alumnoContenido: '',
    alumnoInstrucciones: '',
    alumnoImagenBase64: '',
  };

  if (!text) return data;

  const sections: { tag: string; field: keyof LessonData }[] = [
    { tag: '[NUMERO_ESCENA]', field: 'numeroEscena' },
    { tag: '[TITULO]', field: 'titulo' },
    { tag: '[PASAGE]', field: 'pasaje' },
    { tag: '[VERSICULO_REF]', field: 'versiculoRef' },
    { tag: '[VERSICULO_TEXTO]', field: 'versiculoTexto' },
    { tag: '[LECCION]', field: 'leccion' },
    { tag: '[MATERIALES]', field: 'materiales' },
    { tag: '[INSTRUCCIONES]', field: 'instrucciones' },
    { tag: '[JUEGO_TITULO]', field: 'juegoTitulo' },
    { tag: '[JUEGO_TEXTO]', field: 'juegoTexto' },
    { tag: '[DESAFIO_TITULO]', field: 'desafioTitulo' },
    { tag: '[DESAFIO_TEXTO]', field: 'desafioTexto' },
    { tag: '[ASISTENCIA]', field: 'asistencia' },
    { tag: '[ALUMNO_TIPO_JUEGO]', field: 'alumnoTipoJuego' },
    { tag: '[ALUMNO_CONTENIDO]', field: 'alumnoContenido' },
    { tag: '[ALUMNO_INSTRUCCIONES]', field: 'alumnoInstrucciones' }
  ];

  let currentField: keyof LessonData | null = null;
  const lines = text.split('\n');

  for (const line of lines) {
    let matched = false;
    for (const section of sections) {
      if (line.trim().startsWith(section.tag)) {
        currentField = section.field;
        matched = true;
        const rest = line.substring(line.indexOf(section.tag) + section.tag.length).trim();
        data[currentField] = rest ? rest + '\n' : '';
        break;
      }
    }
    if (!matched && currentField) {
      data[currentField] += line + '\n';
    }
  }

  const footnoteRegex = /\s?\*\*?\d+\*\*?|\s?\[\d+\]/g;
  for (const key of Object.keys(data) as (keyof LessonData)[]) {
    if (typeof data[key] === 'string') {
      data[key] = (data[key] as string).replace(footnoteRegex, '').trim() as any;
    }
  }

  return data;
};

// WordSearch and Maze Cache and Generators
const gridCache = new Map<string, string[][]>();
const generateWordSearchGrid = (words: string[]): string[][] => {
  const size = 10;
  const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
  const directions = [[0, 1], [1, 0], [1, 1]];
  const cleanWord = (w: string) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/gi, "").toUpperCase();
  const processedWords = words.map(w => cleanWord(w)).filter(w => w.length > 1 && w.length <= size);

  for (const word of processedWords) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const newRow = row + dir[0] * i;
        const newCol = col + dir[1] * i;
        if (newRow >= size || newCol >= size || (grid[newRow][newCol] !== '' && grid[newRow][newCol] !== word[i])) {
          fits = false;
          break;
        }
      }
      if (fits) {
        for (let i = 0; i < word.length; i++) grid[row + dir[0] * i][col + dir[1] * i] = word[i];
        placed = true;
      }
    }
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return grid;
};

const getOrGenerateGrid = (content: string, words: string[]): string[][] => {
  if (gridCache.has(content)) return gridCache.get(content)!;
  const grid = generateWordSearchGrid(words);
  gridCache.set(content, grid);
  return grid;
};

interface MazeCell {
  r: number;
  c: number;
  visited: boolean;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
}
const mazeCache = new Map<string, MazeCell[][]>();
const generateMaze = (rows: number, cols: number): MazeCell[][] => {
  const grid: MazeCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowCells: MazeCell[] = [];
    for (let c = 0; c < cols; c++) {
      rowCells.push({ r, c, visited: false, walls: { top: true, right: true, bottom: true, left: true } });
    }
    grid.push(rowCells);
  }
  const stack: MazeCell[] = [];
  const start = grid[0][0];
  start.visited = true;
  stack.push(start);
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: MazeCell[] = [];
    const directions = [
      { r: -1, c: 0, opposite: 'bottom', wall: 'top' },
      { r: 0, c: 1, opposite: 'left', wall: 'right' },
      { r: 1, c: 0, opposite: 'top', wall: 'bottom' },
      { r: 0, c: -1, opposite: 'right', wall: 'left' }
    ];
    for (const d of directions) {
      const nr = current.r + d.r;
      const nc = current.c + d.c;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
        neighbors.push(grid[nr][nc]);
      }
    }
    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      next.visited = true;
      const rDiff = next.r - current.r;
      const cDiff = next.c - current.c;
      if (rDiff === -1) { current.walls.top = false; next.walls.bottom = false; }
      else if (rDiff === 1) { current.walls.bottom = false; next.walls.top = false; }
      else if (cDiff === 1) { current.walls.right = false; next.walls.left = false; }
      else if (cDiff === -1) { current.walls.left = false; next.walls.right = false; }
      stack.push(next);
    } else {
      stack.pop();
    }
  }
  return grid;
};

const getOrGenerateMaze = (key: string): MazeCell[][] => {
  if (mazeCache.has(key)) return mazeCache.get(key)!;
  const maze = generateMaze(10, 10);
  mazeCache.set(key, maze);
  return maze;
};

export default function LessonBookGenerator() {
  // Navigation & Sessions
  const [sessions, setSessions] = useState<LessonBookSession[]>([]);
  const [activeSession, setActiveSession] = useState<LessonBookSession | null>(null);
  
  // Asistente Step: 1 = Setup, 2 = Plan Edit, 3 = Generation, 4 = Dashboard
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 Form Inputs
  const [topic, setTopic] = useState('');
  const [lessonCount, setLessonCount] = useState(4);
  const [ageGroup, setAgeGroup] = useState('Primarios (7-9)');
  const [customFocus, setCustomFocus] = useState('');
  
  // Generation & API States
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningError, setPlanningError] = useState('');
  const [editedPlan, setEditedPlan] = useState<LessonPlanItem[]>([]);
  
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [currentGeneratingIndex, setCurrentGeneratingIndex] = useState(-1);
  const [streamingText, setStreamingText] = useState('');
  const [batchError, setBatchError] = useState('');
  
  // Step 4 Layout Settings
  const [activeLessonTab, setActiveLessonTab] = useState<number>(1);
  const [colorTheme, setColorTheme] = useState<'vibrant' | 'solemn' | 'nature' | 'minimal'>('solemn');
  const [fontSize, setFontSize] = useState<'compact' | 'standard' | 'large'>('standard');
  const [printMargin, setPrintMargin] = useState<'standard' | 'compact' | 'wide'>('standard');
  const [customHeader, setCustomHeader] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const pdfBookRef = useRef<HTMLDivElement>(null);

  // Load saved sessions on mount
  useEffect(() => {
    setSessions(getLessonBooksFromLocalStorage());
  }, []);

  const themeStyles = COLOR_THEMES[colorTheme];
  const fontStyles = FONT_SIZES[fontSize];

  // Dynamic margin padding selection
  const activeMargin = (() => {
    switch (printMargin) {
      case 'compact': return '12mm';
      case 'wide': return '24mm';
      default: return '18mm';
    }
  })();

  const pageStyle: React.CSSProperties = {
    width: '100%',
    height: '296mm',
    maxHeight: '296mm',
    padding: activeMargin,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    color: '#0d0b0a',
    position: 'relative',
    fontSize: fontStyles.base,
    lineHeight: fontStyles.lineHeight
  };

  // Helper formatting for paragraph block outputs
  const formatPdfContent = (content: string) => {
    if (!content) return null;
    return content.split('\n').map((para, i) => {
      const trimmed = para.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        return (
          <li key={i} style={{ marginBottom: '4px', listStyleType: 'square', marginLeft: '12px' }}>
            {trimmed.substring(1).trim()}
          </li>
        );
      }
      return <p key={i} style={{ margin: '0 0 10px 0', textIndent: '12px' }}>{trimmed}</p>;
    });
  };

  // Handle Step 1: Request outline plan
  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsPlanning(true);
    setPlanningError('');
    try {
      const plan = await generateLessonBookPlan(topic, lessonCount, ageGroup, customFocus);
      setEditedPlan(plan);
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setPlanningError(err.message || 'Error al conectar con la API de planificación.');
    } finally {
      setIsPlanning(false);
    }
  };

  // Handle Plan edits
  const handlePlanCellEdit = (index: number, field: keyof LessonPlanItem, value: any) => {
    const updated = [...editedPlan];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditedPlan(updated);
  };

  // Start sequential batch generation
  const handleStartBatchGeneration = async () => {
    setIsGeneratingBatch(true);
    setBatchError('');
    setGenerationLogs([]);
    setStep(3);

    // Initial session setup
    const newSession: LessonBookSession = {
      id: Date.now().toString(),
      title: `Libro: ${topic.substring(0, 30)}${topic.length > 30 ? '...' : ''}`,
      lessonCount,
      ageGroup,
      customFocus,
      plan: editedPlan,
      lessons: {},
      lastInteraction: new Date().toISOString()
    };

    let sessionToUpdate = { ...newSession };

    try {
      for (let i = 0; i < editedPlan.length; i++) {
        const item = editedPlan[i];
        setCurrentGeneratingIndex(i);
        setStreamingText('');
        setGenerationLogs(prev => [...prev, `[Lección ${item.lessonNumber}/${editedPlan.length}] Generando lección: "${item.title}"...`]);

        const lessonResult = await generateIndividualLesson(
          item.lessonNumber,
          item,
          ageGroup,
          (text) => {
            if (text) setStreamingText(prev => prev + text);
          }
        );

        sessionToUpdate.lessons[item.lessonNumber] = lessonResult;
        const updatedList = saveLessonBookSession(sessionToUpdate);
        setSessions(updatedList);
        setGenerationLogs(prev => [...prev, `[Lección ${item.lessonNumber}/${editedPlan.length}] ✓ Completada con éxito.`]);
      }

      setActiveSession(sessionToUpdate);
      setIsGeneratingBatch(false);
      setStep(4);
      setActiveLessonTab(1);
    } catch (err: any) {
      console.error(err);
      setBatchError(err.message || 'Error en la generación en lote.');
      setIsGeneratingBatch(false);
    }
  };

  // Resume or retry from a failure point
  const handleRetryBatch = async () => {
    if (!editedPlan.length) return;
    setIsGeneratingBatch(true);
    setBatchError('');

    // Locate last completed index
    const existingLessons = activeSession?.lessons || {};
    let startIndex = 0;
    for (let i = 0; i < editedPlan.length; i++) {
      if (!existingLessons[editedPlan[i].lessonNumber]?.isComplete) {
        startIndex = i;
        break;
      }
    }

    const sessionToUpdate = activeSession ? { ...activeSession } : {
      id: Date.now().toString(),
      title: `Libro: ${topic.substring(0, 30)}`,
      lessonCount,
      ageGroup,
      plan: editedPlan,
      lessons: {},
      lastInteraction: new Date().toISOString()
    };

    try {
      for (let i = startIndex; i < editedPlan.length; i++) {
        const item = editedPlan[i];
        setCurrentGeneratingIndex(i);
        setStreamingText('');
        setGenerationLogs(prev => [...prev, `[Reintento ${item.lessonNumber}/${editedPlan.length}] Generando lección: "${item.title}"...`]);

        const lessonResult = await generateIndividualLesson(
          item.lessonNumber,
          item,
          ageGroup,
          (text) => {
            if (text) setStreamingText(prev => prev + text);
          }
        );

        sessionToUpdate.lessons[item.lessonNumber] = lessonResult;
        const updatedList = saveLessonBookSession(sessionToUpdate);
        setSessions(updatedList);
        setGenerationLogs(prev => [...prev, `[Lección ${item.lessonNumber}/${editedPlan.length}] ✓ Completada con éxito.`]);
      }

      setActiveSession(sessionToUpdate);
      setIsGeneratingBatch(false);
      setStep(4);
      setActiveLessonTab(1);
    } catch (err: any) {
      console.error(err);
      setBatchError(err.message || 'Error en el reintento de generación.');
      setIsGeneratingBatch(false);
    }
  };

  // Load saved session
  const handleLoadSession = (session: LessonBookSession) => {
    setActiveSession(session);
    setEditedPlan(session.plan);
    // Check if fully generated
    const completeCount = Object.values(session.lessons).filter(l => l.isComplete).length;
    if (completeCount === session.plan.length) {
      setStep(4);
      setActiveLessonTab(1);
    } else {
      setStep(3);
    }
  };

  // Delete saved session
  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este libro de clases?')) {
      const updated = deleteLessonBookSession(id);
      setSessions(updated);
      if (activeSession?.id === id) {
        setActiveSession(null);
        setStep(1);
      }
    }
  };

  // Consolidated PDF print handler
  const handleDownloadPdf = () => {
    if (!activeSession || isDownloading) return;
    setIsDownloading(true);

    if (window.html2pdf) {
      executeHtml2Pdf(window.html2pdf);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.html2pdf) {
        executeHtml2Pdf(window.html2pdf);
      }
    };
    script.onerror = (err) => {
      console.error("Error cargando html2pdf.js:", err);
      setIsDownloading(false);
      alert("No se pudo cargar la librería de PDF. Por favor verifica tu conexión a internet.");
    };
    document.head.appendChild(script);
  };

  const executeHtml2Pdf = async (html2pdfFn: any) => {
    const element = pdfBookRef.current;
    if (!element || !activeSession) {
      setIsDownloading(false);
      return;
    }

    // Workaround: html2canvas collapses when parsing Tailwind v4's global OKLCH/OKLAB stylesheets.
    // To completely prevent this, we temporarily remove all stylesheet element tags (<style> and <link rel="stylesheet">)
    // from the DOM during PDF generation, and restore them immediately in the finally block.
    const stylesBackup: { element: Element; parent: Node; nextSibling: Node | null }[] = [];
    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));

    for (const el of styleElements) {
      if (el.parentNode) {
        stylesBackup.push({
          element: el,
          parent: el.parentNode,
          nextSibling: el.nextSibling
        });
        try {
          el.parentNode.removeChild(el);
        } catch (e) {
          console.warn("Could not remove stylesheet element:", e);
        }
      }
    }

    try {
      // Temporarily set styling for clean PDF compile
      const gapRestore = element.style.gap;
      element.style.gap = '0px';

      const pages = element.getElementsByClassName('folleto-page');
      const originalPageStyles: any[] = [];

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        originalPageStyles.push({
          borderRadius: page.style.borderRadius,
          boxShadow: page.style.boxShadow,
          border: page.style.border
        });
        page.style.borderRadius = '0';
        page.style.boxShadow = 'none';
        if (colorTheme === 'minimal') {
          page.style.border = '1px solid #000000';
        } else {
          page.style.border = 'none';
        }
      }

      const opt = {
        margin: 0,
        filename: `${activeSession.title.replace(/\s+/g, '_')}_Consolidado.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: 'css' }
      };

      await html2pdfFn().from(element).set(opt).save();

      // Restore elements
      element.style.gap = gapRestore;
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        page.style.borderRadius = originalPageStyles[i].borderRadius;
        page.style.boxShadow = originalPageStyles[i].boxShadow;
        page.style.border = originalPageStyles[i].border;
      }
    } catch (e: any) {
      console.error('Error compiling PDF:', e);
      alert('Error al compilar el PDF: ' + e.message);
    } finally {
      // Restore styles
      stylesBackup.forEach(({ element: el, parent, nextSibling }) => {
        try {
          parent.insertBefore(el, nextSibling);
        } catch (e) {
          console.warn("Could not restore stylesheet element:", e);
        }
      });
      setIsDownloading(false);
    }
  };

  // Render Alumno WordSearch grid or Maze Worksheet
  const renderAlumnoSectionInsideBook = (lesson: LessonData, lessonNum: number) => {
    const isWordSearch = lesson.alumnoTipoJuego === 'SOPA_DE_LETRAS' || lesson.alumnoTipoJuego === 'SOPA DE LETRAS';
    const isMaze = lesson.alumnoTipoJuego === 'LABERINTO';

    // Parse words or maze coordinates
    const content = lesson.alumnoContenido || '';
    const words = content.split(',').map(w => w.trim()).filter(Boolean);
    const grid = isWordSearch ? getOrGenerateGrid(content, words) : [];
    const maze = isMaze ? getOrGenerateMaze(`${activeSession?.id}-${lessonNum}`) : [];

    return (
      <div 
        className="folleto-page"
        style={{
          ...pageStyle,
          pageBreakBefore: 'always',
          breakBefore: 'page'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: themeStyles.bgLight,
            border: themeStyles.border,
            padding: '16px',
            borderRadius: '24px',
            boxShadow: colorTheme === 'minimal' ? 'none' : '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              backgroundColor: themeStyles.primary,
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '10px 24px',
              borderRadius: '16px',
              border: colorTheme === 'minimal' ? '2px solid #000000' : '2px solid #ffffff',
              transform: 'rotate(-1deg)',
              boxShadow: colorTheme === 'minimal' ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              📝 MATERIAL DE TRABAJO
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontWeight: 900, color: themeStyles.primaryText, fontSize: fontStyles.h2 }}>Alumno</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: fontStyles.base, color: themeStyles.mutedText, fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic' }}>
                Lección {lessonNum}: {lesson.titulo}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
            {/* Left Column: Activity Game */}
            <div style={{
              border: themeStyles.cardBorder,
              backgroundColor: themeStyles.bgLight,
              padding: '24px',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              pageBreakInside: 'avoid',
              breakInside: 'avoid'
            }}>
              <span style={{ fontSize: '10px', fontWeight: 900, color: themeStyles.accentText, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                🎲 Juego: {isWordSearch ? 'Sopa de Letras' : isMaze ? 'Laberinto' : 'Actividad Especial'}
              </span>
              <p style={{ fontSize: fontStyles.base, fontFamily: '"Lora", Georgia, serif', color: themeStyles.mutedText, fontStyle: 'italic', margin: '0 0 8px 0' }}>
                {lesson.alumnoInstrucciones}
              </p>

              {isWordSearch && grid.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(10, ${fontStyles.gridCell})`, gap: '4px', backgroundColor: themeStyles.gridBorder, padding: '4px', borderRadius: '8px' }}>
                    {grid.map((row, rIdx) => 
                      row.map((cell, cIdx) => (
                        <div 
                          key={`${rIdx}-${cIdx}`}
                          style={{
                            width: fontStyles.gridCell,
                            height: fontStyles.gridCell,
                            backgroundColor: (rIdx + cIdx) % 2 === 0 ? themeStyles.gridBgEven : themeStyles.gridBgOdd,
                            color: themeStyles.text,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: fontStyles.gridText,
                            borderRadius: '4px'
                          }}
                        >
                          {cell}
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                    {words.map((w, idx) => (
                      <span key={idx} style={{ backgroundColor: themeStyles.badgeBg, border: '1px solid ' + themeStyles.badgeBorder, color: themeStyles.primaryText, fontSize: fontStyles.badge, fontWeight: 'bold', padding: '2px 8px', borderRadius: '9999px' }}>
                        {w.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isMaze && maze.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 24px)', border: '2px solid ' + themeStyles.text, backgroundColor: themeStyles.bgLight }}>
                    {maze.map((row, rIdx) => 
                      row.map((cell, cIdx) => (
                        <div 
                          key={`${rIdx}-${cIdx}`}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderTop: cell.walls.top ? '1px solid ' + themeStyles.text : 'none',
                            borderRight: cell.walls.right ? '1px solid ' + themeStyles.text : 'none',
                            borderBottom: cell.walls.bottom ? '1px solid ' + themeStyles.text : 'none',
                            borderLeft: cell.walls.left ? '1px solid ' + themeStyles.text : 'none',
                            position: 'relative'
                          }}
                        >
                          {rIdx === 0 && cIdx === 0 && <span style={{ fontSize: '9px', position: 'absolute', top: '-2px', left: '2px' }}>🏁</span>}
                          {rIdx === 9 && cIdx === 9 && <span style={{ fontSize: '9px', position: 'absolute', bottom: '-2px', right: '2px' }}>🎁</span>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Base64 FLUX illustration */}
            <div style={{
              border: themeStyles.cardBorder,
              backgroundColor: themeStyles.bgLight,
              padding: '24px',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              pageBreakInside: 'avoid',
              breakInside: 'avoid'
            }}>
              <span style={{ fontSize: '10px', fontWeight: 900, color: themeStyles.accentText, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                🎨 Ilustración Bíblica
              </span>
              <div style={{ 
                flex: 1, 
                border: '1px solid ' + themeStyles.divider, 
                borderRadius: '16px', 
                overflow: 'hidden', 
                backgroundColor: '#f5f5f4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '220px'
              }}>
                {lesson.alumnoImagenBase64 ? (
                  <img src={lesson.alumnoImagenBase64} alt="Dibujo bíblico" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px', opacity: 0.3 }}>
                    <span>🖍️ Espacio para colorear</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid ' + themeStyles.mutedText,
          paddingTop: '16px',
          marginTop: 'auto',
          fontSize: fontStyles.badge,
          color: themeStyles.mutedText,
          fontFamily: 'monospace'
        }}>
          <span>ELÍAS — Módulo de Escuela Dominical</span>
          <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: themeStyles.text }}>SOLI DEO GLORIA</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 w-full overflow-y-auto chat-scroll h-full">
      <div className="w-full max-w-7xl mx-auto p-4 md:p-8 text-[#f5f5f4] flex flex-col space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-stone-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-[#dfb15b]">Libro de Clases Dominical</h1>
          <p className="text-sm font-serif text-[#78716c] mt-2 max-w-2xl">
            Genera trimestres o series curriculares bíblicas completas mediante planificación inicial. 
            Previene timeouts dividiendo la generación por lección y compila un PDF consolidado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={() => { setStep(1); setActiveSession(null); }}
              className="bg-stone-900 border border-stone-700 hover:border-[#dfb15b] hover:text-[#dfb15b] transition-all px-4 py-2 rounded-xl text-sm font-body cursor-pointer"
            >
              Nuevo Libro
            </button>
          )}
        </div>
      </div>

      {/* VIEW LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* SIDEBAR: Saved sessions / Params */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Previous sessions list */}
          <div className="bg-stone-950/50 border border-stone-800/80 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-heading text-[#dfb15b] font-bold tracking-wider uppercase">Libros Guardados</h3>
            {sessions.length === 0 ? (
              <p className="text-xs font-serif text-[#78716c] italic">No hay libros generados aún.</p>
            ) : (
              <div className="flex flex-col space-y-2 max-h-60 overflow-y-auto chat-scroll pr-1">
                {sessions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => handleLoadSession(s)}
                    className={`flex justify-between items-center p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      activeSession?.id === s.id
                        ? 'bg-[#dfb15b]/10 border-[#dfb15b] text-[#dfb15b]'
                        : 'bg-stone-900/40 border-stone-800 hover:bg-stone-900/80 text-stone-300'
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="font-bold truncate">{s.title}</span>
                      <span className="text-[10px] text-[#78716c] mt-1">{s.ageGroup} • {s.lessonCount} clases</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="text-[#78716c] hover:text-red-500 transition-colors p-1"
                      title="Eliminar sesión"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Layout customizations (Only active in Step 4) */}
          {step === 4 && activeSession && (
            <div className="bg-stone-950/50 border border-stone-800/80 rounded-3xl p-6 space-y-5">
              <h3 className="text-sm font-heading text-[#dfb15b] font-bold tracking-wider uppercase">Diseño de Impresión</h3>
              
              <div className="space-y-2">
                <label className="text-xs text-[#78716c] block font-bold">Encabezado Personalizado</label>
                <input
                  type="text"
                  placeholder="Ej: Iglesia Bautista Fundamental"
                  value={customHeader}
                  onChange={(e) => setCustomHeader(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 outline-none focus:border-[#dfb15b]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-[#78716c] block font-bold">Tema de Color</label>
                <select
                  value={colorTheme}
                  onChange={(e) => setColorTheme(e.target.value as any)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 outline-none focus:border-[#dfb15b] cursor-pointer"
                >
                  <option value="solemn">Solemne / Sagrado (Oro)</option>
                  <option value="vibrant">Alegre / Infantil (Rojo)</option>
                  <option value="nature">Naturaleza / Calmado (Verde)</option>
                  <option value="minimal">Ahorro de Tinta (Minimalista)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-[#78716c] block font-bold">Tamaño de Letra</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as any)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 outline-none focus:border-[#dfb15b] cursor-pointer"
                >
                  <option value="compact">Compacto (Ahorra espacio)</option>
                  <option value="standard">Estándar (Recomendado)</option>
                  <option value="large">Grande (Fácil lectura)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-[#78716c] block font-bold">Márgenes Físicos A4</label>
                <select
                  value={printMargin}
                  onChange={(e) => setPrintMargin(e.target.value as any)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 outline-none focus:border-[#dfb15b] cursor-pointer"
                >
                  <option value="compact">Estrecho (12mm)</option>
                  <option value="standard">Normal (18mm)</option>
                  <option value="wide">Ancho (24mm)</option>
                </select>
              </div>

              <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="w-full bg-[#dfb15b] hover:bg-[#b88a3e] text-[#0d0b0a] font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDownloading ? (
                  <>⏳ Generando PDF...</>
                ) : (
                  <>📥 Descargar PDF Libro</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* MAIN AREA: Multi-step forms & preview */}
        <div className="lg:col-span-9">
          
          {/* STEP 1: PARAMETER SETUP */}
          {step === 1 && (
            <div className="bg-stone-950/40 border border-stone-800/80 rounded-3xl p-6 md:p-8 space-y-6">
              <h2 className="text-xl font-heading text-[#dfb15b] font-bold">Parámetros del Libro</h2>
              <form onSubmit={handleGeneratePlan} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-[#78716c] block font-bold">Tema o Libro Bíblico General</label>
                    <input
                      type="text"
                      placeholder="Ej: Daniel y la Soberanía de Dios, Vida de Jesús"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      required
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 outline-none focus:border-[#dfb15b]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-[#78716c] block font-bold">Nº de Lecciones</label>
                      <select
                        value={lessonCount}
                        onChange={(e) => setLessonCount(parseInt(e.target.value))}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-3 text-sm text-stone-200 outline-none focus:border-[#dfb15b] cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(c => (
                          <option key={c} value={c}>{c} {c === 1 ? 'lección' : 'lecciones'}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-[#78716c] block font-bold">Grupo de Edad</label>
                      <select
                        value={ageGroup}
                        onChange={(e) => setAgeGroup(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-3 text-sm text-stone-200 outline-none focus:border-[#dfb15b] cursor-pointer"
                      >
                        <option>Cunas (0-3)</option>
                        <option>Principiantes (4-6)</option>
                        <option>Primarios (7-9)</option>
                        <option>Jóvenes (10-14)</option>
                        <option>Adultos (15+)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#78716c] block font-bold">Enfoque Personalizado o Doctrina Específica</label>
                  <textarea
                    rows={4}
                    placeholder="Instrucciones adicionales para la IA sobre qué puntos enfatizar..."
                    value={customFocus}
                    onChange={(e) => setCustomFocus(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 outline-none focus:border-[#dfb15b]"
                  />
                </div>

                {planningError && (
                  <div className="bg-red-950/20 border border-red-800/80 text-red-400 p-4 rounded-xl text-xs">
                    ⚠️ {planningError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPlanning}
                  className="bg-[#dfb15b] hover:bg-[#b88a3e] text-[#0d0b0a] transition-all px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPlanning ? (
                    <>⏳ Planificando Currículum...</>
                  ) : (
                    <>📖 Crear Esquema de Lecciones</>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: EDIT PLAN OUTLINE */}
          {step === 2 && (
            <div className="bg-stone-950/40 border border-stone-800/80 rounded-3xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-heading text-[#dfb15b] font-bold">Esquema de Temas Sugerido</h2>
                <p className="text-xs font-serif text-[#78716c] mt-1">Revisa, edita o cambia cualquier título y pasaje bíblico antes de iniciar la generación en bloque de todas las lecciones.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800 text-[#dfb15b]">
                      <th className="py-3 px-2 w-16 text-center">Lección</th>
                      <th className="py-3 px-3">Título Sugerido</th>
                      <th className="py-3 px-3 w-48">Pasaje Bíblico (RVR1960)</th>
                      <th className="py-3 px-3">Énfasis Práctico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedPlan.map((item, index) => (
                      <tr key={index} className="border-b border-stone-900 hover:bg-stone-900/20 transition-all">
                        <td className="py-3 px-2 text-center font-bold text-[#dfb15b]">{item.lessonNumber}</td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handlePlanCellEdit(index, 'title', e.target.value)}
                            className="w-full bg-stone-900/60 border border-stone-800 rounded px-2 py-1 text-xs text-stone-200"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.passage}
                            onChange={(e) => handlePlanCellEdit(index, 'passage', e.target.value)}
                            className="w-full bg-stone-900/60 border border-stone-800 rounded px-2 py-1 text-xs text-stone-200"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.emphasis}
                            onChange={(e) => handlePlanCellEdit(index, 'emphasis', e.target.value)}
                            className="w-full bg-stone-900/60 border border-stone-800 rounded px-2 py-1 text-xs text-stone-200"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleStartBatchGeneration}
                  className="bg-[#dfb15b] hover:bg-[#b88a3e] text-[#0d0b0a] font-bold px-6 py-3 rounded-xl text-xs transition-all cursor-pointer"
                >
                  🚀 Iniciar Generación en Bloque
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-400 font-bold px-6 py-3 rounded-xl text-xs transition-all cursor-pointer"
                >
                  ⬅ Volver a Parámetros
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SEQUENTIAL BATCH GENERATION PROGRESS */}
          {step === 3 && (
            <div className="bg-stone-950/40 border border-stone-800/80 rounded-3xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-heading text-[#dfb15b] font-bold">Proceso de Generación del Libro</h2>
                <p className="text-xs font-serif text-[#78716c] mt-1">
                  Generando secuencialmente cada clase curricular. La barra de progreso y el log de operaciones se actualizarán a medida que se completen las solicitudes.
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#dfb15b]">
                  <span>Generando lecciones...</span>
                  <span>
                    {Object.keys(activeSession?.lessons || {}).length} de {editedPlan.length} completadas ({Math.round(
                      (Object.keys(activeSession?.lessons || {}).length / editedPlan.length) * 100
                    )}%)
                  </span>
                </div>
                <div className="w-full bg-stone-900 rounded-full h-4 overflow-hidden border border-stone-800">
                  <div
                    style={{
                      width: `${(Object.keys(activeSession?.lessons || {}).length / editedPlan.length) * 100}%`
                    }}
                    className="bg-[#dfb15b] h-full transition-all duration-500 rounded-full"
                  />
                </div>
              </div>

              {/* Streaming Content Display */}
              {isGeneratingBatch && currentGeneratingIndex >= 0 && (
                <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 flex flex-col space-y-2">
                  <span className="text-[10px] text-[#dfb15b] font-bold uppercase tracking-wider">
                    Transmisión en Vivo: Lección {editedPlan[currentGeneratingIndex].lessonNumber} - "{editedPlan[currentGeneratingIndex].title}"
                  </span>
                  <div className="max-h-48 overflow-y-auto font-mono text-xs text-stone-400 chat-scroll bg-stone-950/60 p-3 rounded-lg leading-relaxed">
                    {streamingText ? (
                      <>
                        {streamingText}
                        <span className="typing-cursor ml-1">|</span>
                      </>
                    ) : (
                      <span className="italic text-stone-600">Iniciando streaming del modelo...</span>
                    )}
                  </div>
                </div>
              )}

              {/* Operation Logs */}
              <div className="space-y-2">
                <span className="text-xs text-[#78716c] font-bold">Bitácora de Generación:</span>
                <div className="bg-stone-950/80 border border-stone-900 rounded-2xl p-4 max-h-40 overflow-y-auto chat-scroll space-y-2 font-mono text-[10px] text-stone-500">
                  {generationLogs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                  {isGeneratingBatch && <div className="animate-pulse">⏳ Generando...</div>}
                </div>
              </div>

              {batchError && (
                <div className="bg-red-950/20 border border-red-800/80 text-red-400 p-4 rounded-xl text-xs space-y-2">
                  <p>⚠️ Error: {batchError}</p>
                  <button
                    onClick={handleRetryBatch}
                    className="bg-red-900 hover:bg-red-800 text-white font-bold px-4 py-2 rounded-lg text-[10px]"
                  >
                    Reintentar desde el punto de fallo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: PREVIEW COMPILATION VIEW */}
          {step === 4 && activeSession && (
            <div className="space-y-6">
              
              {/* Tabs list for individual lessons */}
              <div className="flex flex-wrap gap-2 border-b border-stone-800 pb-3">
                {activeSession.plan.map((item) => {
                  const lesson = activeSession.lessons[item.lessonNumber];
                  return (
                    <button
                      key={item.lessonNumber}
                      onClick={() => setActiveLessonTab(item.lessonNumber)}
                      className={`px-4 py-2 rounded-xl text-xs transition-all font-body cursor-pointer flex items-center gap-2 ${
                        activeLessonTab === item.lessonNumber
                          ? 'bg-[#dfb15b] text-[#0d0b0a] font-bold'
                          : 'bg-stone-900/60 border border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <span>Clase {item.lessonNumber}</span>
                      {lesson?.isComplete && <span className="text-[10px]">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Preview Canvas showing selected lesson sheets */}
              <div className="bg-stone-950/40 border border-stone-800/80 rounded-3xl p-6 md:p-8 flex flex-col items-center">
                <span className="text-xs text-[#78716c] mb-4 font-bold font-mono">VISTA PREVIA DEL DOCUMENTO A4 FISICO</span>
                
                {/* Print element wrapper */}
                <div 
                  ref={canvasRef}
                  id="printable-folleto-canvas"
                  className="w-full flex flex-col gap-8 select-none"
                  style={{ maxWidth: '210mm' }}
                >
                  {(() => {
                    const planItem = activeSession.plan.find(p => p.lessonNumber === activeLessonTab);
                    const rawLesson = activeSession.lessons[activeLessonTab];
                    if (!planItem || !rawLesson?.isComplete) {
                      return (
                        <div className="p-8 text-center text-stone-500 italic">
                          Cargando contenido de la lección...
                        </div>
                      );
                    }

                    const lesson = parseResource(rawLesson.content, planItem.title);
                    lesson.alumnoImagenBase64 = rawLesson.alumno_imagen_base64 || '';

                    return (
                      <div className="flex flex-col w-full">
                        
                        {/* PAGINA 1: GUIA DEL MAESTRO */}
                        <div className="folleto-page border border-stone-200 rounded-3xl shadow-2xl overflow-hidden mb-8" style={pageStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* Sacred header design */}
                            <div 
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'row', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                borderBottom: themeStyles.border, 
                                paddingBottom: '16px',
                                position: 'relative'
                              }}
                            >
                              <div style={{ position: 'absolute', top: '0', right: '0', padding: '8px', opacity: colorTheme === 'minimal' ? 0 : 0.05, color: themeStyles.primaryDark, fontSize: '60px', userSelect: 'none' }}>★</div>
                              <div>
                                <span style={{ fontSize: '9px', fontWeight: 900, color: themeStyles.accentText, textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block' }}>
                                  {customHeader || 'ESCUELA DOMINICAL BAUTISTA'}
                                </span>
                                <h1 style={{ fontSize: fontStyles.title, fontFamily: '"Cinzel", Georgia, serif', fontWeight: 900, color: themeStyles.primaryText, textTransform: 'uppercase', margin: '4px 0 0 0' }}>
                                  {lesson.titulo}
                                </h1>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ backgroundColor: themeStyles.primary, color: '#ffffff', fontWeight: 900, fontSize: fontStyles.badge, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '12px', boxShadow: colorTheme === 'minimal' ? 'none' : '0 2px 4px rgba(0,0,0,0.1)' }}>
                                  CLASE {activeLessonTab}
                                </span>
                                <span style={{ fontSize: fontStyles.badge, fontFamily: '"Lora", Georgia, serif', fontWeight: 'bold', color: themeStyles.mutedText, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px' }}>
                                  {activeSession.ageGroup.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '24px' }}>
                              
                              {/* Left column: Passage and Verse */}
                              <div style={{ gridColumn: 'span 4' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  <div style={{ border: themeStyles.cardBorder, backgroundColor: themeStyles.bgLight, padding: '16px', borderRadius: '24px', position: 'relative' }}>
                                    <span style={{ fontSize: '9px', fontWeight: 900, color: themeStyles.primaryText, textTransform: 'uppercase', display: 'block' }}>Lectura</span>
                                    <span style={{ fontSize: fontStyles.subHeader, fontFamily: '"Cinzel", Georgia, serif', fontWeight: 900, color: themeStyles.text, display: 'block', marginTop: '4px' }}>{lesson.pasaje}</span>
                                    <span style={{ fontSize: '9px', color: themeStyles.mutedText, fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic', display: 'block', marginTop: '2px' }}>RVR1960</span>
                                  </div>

                                  <div style={{ border: themeStyles.cardBorder, backgroundColor: themeStyles.bgLight, padding: '20px', borderRadius: '24px', position: 'relative' }}>
                                    <span style={{ position: 'absolute', top: '-10px', left: '16px', backgroundColor: themeStyles.primary, color: '#ffffff', fontWeight: 900, fontSize: fontStyles.badge, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '2px 10px', borderRadius: '9999px', border: colorTheme === 'minimal' ? '1px solid #000000' : '1px solid #ffffff' }}>A Memorizar</span>
                                    <blockquote style={{ fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic', fontSize: fontStyles.h3, color: themeStyles.text, fontWeight: 500, lineHeight: 1.5, margin: '8px 0 12px 0', textAlign: 'justify' }}>
                                      {lesson.versiculoTexto}
                                    </blockquote>
                                    <cite style={{ fontSize: '10px', fontWeight: 'bold', color: themeStyles.primaryText, borderBottom: '1px solid ' + themeStyles.primary, paddingBottom: '2px', fontStyle: 'normal' }}>
                                      {lesson.versiculoRef}
                                    </cite>
                                  </div>
                                </div>
                              </div>

                              {/* Right column: Lesson Guide */}
                              <div style={{ gridColumn: 'span 8', borderLeft: '1px solid ' + themeStyles.divider, paddingLeft: '24px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 900, color: themeStyles.accentText, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Guía Didáctica para el Maestro</span>
                                <div style={{ fontFamily: '"Lora", Georgia, serif', fontSize: fontStyles.base, lineHeight: fontStyles.lineHeight, color: themeStyles.text, textAlign: 'justify' }}>
                                  {formatPdfContent(lesson.leccion)}
                                </div>
                              </div>

                            </div>
                          </div>

                          {/* Footer */}
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid ' + themeStyles.mutedText, paddingTop: '16px', marginTop: 'auto', fontSize: fontStyles.badge, color: themeStyles.mutedText, fontFamily: 'monospace' }}>
                            <span>ELÍAS — Módulo de Recursos de Escuela Dominical</span>
                            <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: themeStyles.text, fontSize: fontStyles.badge, letterSpacing: '0.1em' }}>Soli Deo Gloria</span>
                          </div>
                        </div>

                        {/* PAGINA 2: ACTIVIDAD DE CLASE / TENGO TALENTO */}
                        <div className="folleto-page border border-stone-200 rounded-3xl shadow-2xl overflow-hidden mb-8" style={{ ...pageStyle, pageBreakBefore: 'always', breakBefore: 'page' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', backgroundColor: themeStyles.bgLight, border: themeStyles.border, padding: '16px', borderRadius: '24px', boxShadow: colorTheme === 'minimal' ? 'none' : '0 2px 4px rgba(0,0,0,0.05)' }}>
                              <div style={{ backgroundColor: themeStyles.primary, color: '#ffffff', fontWeight: 900, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 24px', borderRadius: '16px', border: colorTheme === 'minimal' ? '2px solid #000000' : '2px solid #ffffff', transform: 'rotate(-1deg)', boxShadow: colorTheme === 'minimal' ? 'none' : '0 2px 4px rgba(0,0,0,0.1)' }}>
                                🎨 TENGO TALENTO
                              </div>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ margin: 0, fontWeight: 900, color: themeStyles.primaryText, fontSize: fontStyles.h2 }}>Manualidades y Actividades Didácticas</h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: fontStyles.base, color: themeStyles.mutedText, fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic' }}>Diseñado para la aplicación táctil de las verdades bíblicas bautistas.</p>
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
                              <div style={{ border: themeStyles.cardBorder, backgroundColor: themeStyles.bgLight, padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                <div>
                                  <span style={{ fontSize: '10px', fontWeight: 900, color: themeStyles.accentText, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Materiales Necesarios</span>
                                  <div style={{ fontSize: fontStyles.base, fontFamily: '"Lora", Georgia, serif', color: themeStyles.text, lineHeight: 1.5, paddingLeft: '16px', borderLeft: '1px solid ' + themeStyles.divider }}>
                                    {formatPdfContent(lesson.materiales)}
                                  </div>
                                </div>
                                <div style={{ height: '1px', backgroundColor: themeStyles.divider, margin: '4px 0' }} />
                                <div>
                                  <span style={{ fontSize: '10px', fontWeight: 900, color: themeStyles.accentText, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Instrucciones Paso a Paso</span>
                                  <div style={{ fontSize: fontStyles.base, fontFamily: '"Lora", Georgia, serif', color: themeStyles.text, lineHeight: 1.5, paddingLeft: '16px', borderLeft: '1px solid ' + themeStyles.divider }}>
                                    {formatPdfContent(lesson.instrucciones)}
                                  </div>
                                </div>
                              </div>

                              <div style={{ border: themeStyles.cardBorder, backgroundColor: themeStyles.bgLight, padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                <div>
                                  <span style={{ fontSize: '10px', fontWeight: 900, color: themeStyles.accentText, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Dibujo Ilustrativo de la Clase</span>
                                  <p style={{ fontSize: fontStyles.base, fontFamily: '"Lora", Georgia, serif', color: themeStyles.mutedText, fontStyle: 'italic', margin: '0 0 16px 0' }}>Dibuja algo relacionado al tema: "{lesson.titulo}"</p>
                                </div>
                                <div style={{ flex: 1, border: '2px dashed ' + themeStyles.mutedText, borderRadius: '16px', backgroundColor: themeStyles.bgLight, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px' }}>
                                  <div style={{ opacity: 0.2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ fontSize: '32px' }}>🖍️</span>
                                    <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '8px', color: themeStyles.text }}>Dibuja o colorea aquí</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div style={{ backgroundColor: themeStyles.bgLight, border: themeStyles.border, padding: '24px', borderRadius: '24px', position: 'relative', marginTop: '16px', boxShadow: colorTheme === 'minimal' ? 'none' : '0 2px 4px rgba(0,0,0,0.05)', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                              <span style={{ position: 'absolute', top: '-12px', left: '24px', backgroundColor: themeStyles.primary, color: '#ffffff', fontWeight: 900, fontSize: fontStyles.badge, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 16px', borderRadius: '9999px', border: colorTheme === 'minimal' ? '1px solid #000000' : '1px solid #ffffff' }}>
                                🏆 DESAFÍO: {lesson.desafioTitulo.toUpperCase()}
                              </span>
                              <div style={{ fontFamily: '"Lora", Georgia, serif', fontSize: fontStyles.base, lineHeight: 1.6, color: themeStyles.text, marginTop: '8px', textAlign: 'justify' }}>
                                {formatPdfContent(lesson.desafioTexto)}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid ' + themeStyles.mutedText, paddingTop: '16px', marginTop: 'auto', fontSize: fontStyles.badge, color: themeStyles.mutedText, fontFamily: 'monospace' }}>
                            <span>ELÍAS — Módulo de Recursos de Escuela Dominical</span>
                            <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: themeStyles.text, fontSize: fontStyles.badge, letterSpacing: '0.1em' }}>Soli Deo Gloria</span>
                          </div>
                        </div>

                        {/* PAGINA 3: MATERIAL DEL ALUMNO */}
                        {lesson.alumnoTipoJuego && lesson.alumnoContenido && (
                          renderAlumnoSectionInsideBook(lesson, activeLessonTab)
                        )}

                      </div>
                    );
                  })()}
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* Hidden print canvas for generating the complete book PDF */}
      {activeSession && (
        <div style={{ position: 'absolute', left: '-9999px', top: '0', pointerEvents: 'none', zIndex: -100 }}>
          <div 
            ref={pdfBookRef} 
            id="printable-full-book-canvas"
            style={{ 
              width: '794px', // Standard A4 width at 96 DPI
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              color: '#0d0b0a',
              display: 'flex',
              flexDirection: 'column',
              gap: '0px'
            }}
          >
            {/* PORTADA DEL LIBRO */}
            <div className="folleto-page" style={{
              ...pageStyle,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: activeMargin,
              boxSizing: 'border-box',
              border: colorTheme === 'minimal' ? '1px solid #000000' : 'none',
              backgroundColor: themeStyles.bgLight,
              color: themeStyles.text,
              width: '100%',
              height: '297mm',
              pageBreakAfter: 'always',
              breakAfter: 'page'
            }}>
              <div style={{
                border: `4px double ${themeStyles.primary}`,
                padding: '40px 30px',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxSizing: 'border-box',
                position: 'relative'
              }}>
                <div style={{ position: 'absolute', top: '15px', left: '15px', color: themeStyles.primary, fontSize: '14px' }}>✥</div>
                <div style={{ position: 'absolute', top: '15px', right: '15px', color: themeStyles.primary, fontSize: '14px' }}>✥</div>
                <div style={{ position: 'absolute', bottom: '15px', left: '15px', color: themeStyles.primary, fontSize: '14px' }}>✥</div>
                <div style={{ position: 'absolute', bottom: '15px', right: '15px', color: themeStyles.primary, fontSize: '14px' }}>✥</div>

                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 900,
                    color: themeStyles.accentText,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    display: 'block'
                  }}>
                    {customHeader || 'ESCUELA DOMINICAL BAUTISTA'}
                  </span>
                  <div style={{ width: '40px', height: '1px', backgroundColor: themeStyles.primary, margin: '8px auto 0 auto' }} />
                </div>

                <div style={{ textAlign: 'center', margin: '40px 0' }}>
                  <div style={{ fontSize: '48px', color: themeStyles.primary, marginBottom: '24px' }}>
                    {colorTheme === 'vibrant' ? '🎨' : colorTheme === 'nature' ? '🌿' : '📜'}
                  </div>
                  
                  <h1 style={{
                    fontSize: '28pt',
                    fontFamily: '"Cinzel", Georgia, serif',
                    fontWeight: 900,
                    color: themeStyles.primaryText,
                    textTransform: 'uppercase',
                    margin: '0 0 16px 0',
                    lineHeight: 1.2,
                    letterSpacing: '0.05em'
                  }}>
                    {activeSession.title.replace(/^Libro:\s*/i, '')}
                  </h1>
                  
                  <p style={{
                    fontSize: '12pt',
                    fontFamily: '"Lora", Georgia, serif',
                    fontStyle: 'italic',
                    color: themeStyles.mutedText,
                    margin: '0 auto',
                    maxWidth: '480px',
                    lineHeight: 1.6
                  }}>
                    Guía Curricular Completa y Actividades Didácticas para la Formación Bíblica
                  </p>
                </div>

                <div style={{
                  width: '80%',
                  borderTop: `1px solid ${themeStyles.divider}`,
                  borderBottom: `1px solid ${themeStyles.divider}`,
                  padding: '24px 0',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ borderRight: `1px solid ${themeStyles.divider}` }}>
                    <span style={{ fontSize: '9px', fontWeight: 900, color: themeStyles.mutedText, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>Rango de Edad</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: '"Lora", Georgia, serif', color: themeStyles.text, display: 'block', marginTop: '6px' }}>
                      {activeSession.ageGroup}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '9px', fontWeight: 900, color: themeStyles.mutedText, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>Contenido</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: '"Lora", Georgia, serif', color: themeStyles.text, display: 'block', marginTop: '6px' }}>
                      {activeSession.lessonCount} {activeSession.lessonCount === 1 ? 'Lección' : 'Lecciones'}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '16px', color: themeStyles.primary, marginBottom: '8px' }}>✦</div>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 900,
                    color: themeStyles.mutedText,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    display: 'block'
                  }}>
                    ELÍAS — Mentor Bíblico de Inteligencia Teológica
                  </span>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: themeStyles.primaryText,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    display: 'block',
                    marginTop: '6px'
                  }}>
                    Soli Deo Gloria
                  </span>
                </div>
              </div>
            </div>

            {/* LECCIONES INDIVIDUALES SECUENCIALES */}
            {activeSession.plan.map((planItem) => {
              const num = planItem.lessonNumber;
              const rawLesson = activeSession.lessons[num];
              if (!rawLesson?.isComplete) return null;

              const lesson = parseResource(rawLesson.content, planItem.title);
              lesson.alumnoImagenBase64 = rawLesson.alumno_imagen_base64 || '';

              return (
                <div key={num} className="flex flex-col w-full">
                  {/* PAGINA 1: GUIA DEL MAESTRO */}
                  <div className="folleto-page" style={{ ...pageStyle, pageBreakBefore: 'always', breakBefore: 'page' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      <div 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'row', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          borderBottom: themeStyles.border, 
                          paddingBottom: '16px',
                          position: 'relative'
                        }}
                      >
                        <div style={{ position: 'absolute', top: '0', right: '0', padding: '8px', opacity: colorTheme === 'minimal' ? 0 : 0.05, color: themeStyles.primaryDark, fontSize: '60px', userSelect: 'none' }}>★</div>
                        <div>
                          <span style={{ fontSize: '9px', fontWeight: 900, color: themeStyles.accentText, textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block' }}>
                            {customHeader || 'ESCUELA DOMINICAL BAUTISTA'}
                          </span>
                          <h1 style={{ fontSize: fontStyles.title, fontFamily: '"Cinzel", Georgia, serif', fontWeight: 900, color: themeStyles.primaryText, textTransform: 'uppercase', margin: '4px 0 0 0' }}>
                            {lesson.titulo}
                          </h1>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ backgroundColor: themeStyles.primary, color: '#ffffff', fontWeight: 900, fontSize: fontStyles.badge, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '12px', boxShadow: colorTheme === 'minimal' ? 'none' : '0 2px 4px rgba(0,0,0,0.1)' }}>
                            CLASE {num}
                          </span>
                          <span style={{ fontSize: fontStyles.badge, fontFamily: '"Lora", Georgia, serif', fontWeight: 'bold', color: themeStyles.mutedText, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px' }}>
                            {activeSession.ageGroup.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '24px' }}>
                        
                        <div style={{ gridColumn: 'span 4' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ border: themeStyles.cardBorder, backgroundColor: themeStyles.bgLight, padding: '16px', borderRadius: '24px', position: 'relative' }}>
                              <span style={{ fontSize: '9px', fontWeight: 900, color: themeStyles.primaryText, textTransform: 'uppercase', display: 'block' }}>Lectura</span>
                              <span style={{ fontSize: fontStyles.subHeader, fontFamily: '"Cinzel", Georgia, serif', fontWeight: 900, color: themeStyles.text, display: 'block', marginTop: '4px' }}>{lesson.pasaje}</span>
                              <span style={{ fontSize: '9px', color: themeStyles.mutedText, fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic', display: 'block', marginTop: '2px' }}>RVR1960</span>
                            </div>

                            <div style={{ border: themeStyles.cardBorder, backgroundColor: themeStyles.bgLight, padding: '20px', borderRadius: '24px', position: 'relative' }}>
                              <span style={{ position: 'absolute', top: '-10px', left: '16px', backgroundColor: themeStyles.primary, color: '#ffffff', fontWeight: 900, fontSize: fontStyles.badge, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '2px 10px', borderRadius: '9999px', border: colorTheme === 'minimal' ? '1px solid #000000' : '1px solid #ffffff' }}>A Memorizar</span>
                              <blockquote style={{ fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic', fontSize: fontStyles.h3, color: themeStyles.text, fontWeight: 500, lineHeight: 1.5, margin: '8px 0 12px 0', textAlign: 'justify' }}>
                                {lesson.versiculoTexto}
                              </blockquote>
                              <cite style={{ fontSize: '10px', fontWeight: 'bold', color: themeStyles.primaryText, borderBottom: '1px solid ' + themeStyles.primary, paddingBottom: '2px', fontStyle: 'normal' }}>
                                {lesson.versiculoRef}
                              </cite>
                            </div>
                          </div>
                        </div>

                        <div style={{ gridColumn: 'span 8', borderLeft: '1px solid ' + themeStyles.divider, paddingLeft: '24px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 900, color: themeStyles.accentText, textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>Guía Didáctica para el Maestro</span>
                          <div style={{ fontFamily: '"Lora", Georgia, serif', fontSize: fontStyles.base, lineHeight: fontStyles.lineHeight, color: themeStyles.text, textAlign: 'justify' }}>
                            {formatPdfContent(lesson.leccion)}
                          </div>
                        </div>

                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid ' + themeStyles.mutedText, paddingTop: '16px', marginTop: 'auto', fontSize: fontStyles.badge, color: themeStyles.mutedText, fontFamily: 'monospace' }}>
                      <span>ELÍAS — Módulo de Recursos de Escuela Dominical</span>
                      <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: themeStyles.text, fontSize: fontStyles.badge, letterSpacing: '0.1em' }}>Soli Deo Gloria</span>
                    </div>
                  </div>

                  {/* PAGINA 2: ACTIVIDAD DE CLASE / TENGO TALENTO */}
                  <div className="folleto-page" style={{ ...pageStyle, pageBreakBefore: 'always', breakBefore: 'page' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', backgroundColor: themeStyles.bgLight, border: themeStyles.border, padding: '16px', borderRadius: '24px', boxShadow: colorTheme === 'minimal' ? 'none' : '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ backgroundColor: themeStyles.primary, color: '#ffffff', fontWeight: 900, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 24px', borderRadius: '16px', border: colorTheme === 'minimal' ? '2px solid #000000' : '2px solid #ffffff', transform: 'rotate(-1deg)', boxShadow: colorTheme === 'minimal' ? 'none' : '0 2px 4px rgba(0,0,0,0.1)' }}>
                          🎨 TENGO TALENTO
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontWeight: 900, color: themeStyles.primaryText, fontSize: fontStyles.h2 }}>Manualidades y Actividades Didácticas</h4>
                          <p style={{ margin: '4px 0 0 0', fontSize: fontStyles.base, color: themeStyles.mutedText, fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic' }}>Diseñado para la aplicación táctil de las verdades bíblicas bautistas.</p>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
                        <div style={{ border: themeStyles.cardBorder, backgroundColor: themeStyles.bgLight, padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <div>
                            <span style={{ fontSize: '10px', fontWeight: 900, color: themeStyles.accentText, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Materiales Necesarios</span>
                            <div style={{ fontSize: fontStyles.base, fontFamily: '"Lora", Georgia, serif', color: themeStyles.text, lineHeight: 1.5, paddingLeft: '16px', borderLeft: '1px solid ' + themeStyles.divider }}>
                              {formatPdfContent(lesson.materiales)}
                            </div>
                          </div>
                          <div style={{ height: '1px', backgroundColor: themeStyles.divider, margin: '4px 0' }} />
                          <div>
                            <span style={{ fontSize: '10px', fontWeight: 900, color: themeStyles.accentText, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Instrucciones Paso a Paso</span>
                            <div style={{ fontSize: fontStyles.base, fontFamily: '"Lora", Georgia, serif', color: themeStyles.text, lineHeight: 1.5, paddingLeft: '16px', borderLeft: '1px solid ' + themeStyles.divider }}>
                              {formatPdfContent(lesson.instrucciones)}
                            </div>
                          </div>
                        </div>

                        <div style={{ border: themeStyles.cardBorder, backgroundColor: themeStyles.bgLight, padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <div>
                            <span style={{ fontSize: '10px', fontWeight: 900, color: themeStyles.accentText, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Dibujo Ilustrativo de la Clase</span>
                            <p style={{ fontSize: fontStyles.base, fontFamily: '"Lora", Georgia, serif', color: themeStyles.mutedText, fontStyle: 'italic', margin: '0 0 16px 0' }}>Dibuja algo relacionado al tema: "{lesson.titulo}"</p>
                          </div>
                          <div style={{ flex: 1, border: '2px dashed ' + themeStyles.mutedText, borderRadius: '16px', backgroundColor: themeStyles.bgLight, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px' }}>
                            <div style={{ opacity: 0.2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ fontSize: '32px' }}>🖍️</span>
                              <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '8px', color: themeStyles.text }}>Dibuja o colorea aquí</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ backgroundColor: themeStyles.bgLight, border: themeStyles.border, padding: '24px', borderRadius: '24px', position: 'relative', marginTop: '16px', boxShadow: colorTheme === 'minimal' ? 'none' : '0 2px 4px rgba(0,0,0,0.05)', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <span style={{ position: 'absolute', top: '-12px', left: '24px', backgroundColor: themeStyles.primary, color: '#ffffff', fontWeight: 900, fontSize: fontStyles.badge, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 16px', borderRadius: '9999px', border: colorTheme === 'minimal' ? '1px solid #000000' : '1px solid #ffffff' }}>
                          🏆 DESAFÍO: {lesson.desafioTitulo.toUpperCase()}
                        </span>
                        <div style={{ fontFamily: '"Lora", Georgia, serif', fontSize: fontStyles.base, lineHeight: 1.6, color: themeStyles.text, marginTop: '8px', textAlign: 'justify' }}>
                          {formatPdfContent(lesson.desafioTexto)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid ' + themeStyles.mutedText, paddingTop: '16px', marginTop: 'auto', fontSize: fontStyles.badge, color: themeStyles.mutedText, fontFamily: 'monospace' }}>
                      <span>ELÍAS — Módulo de Recursos de Escuela Dominical</span>
                      <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: themeStyles.text, fontSize: fontStyles.badge, letterSpacing: '0.1em' }}>Soli Deo Gloria</span>
                    </div>
                  </div>

                  {/* PAGINA 3: MATERIAL DEL ALUMNO */}
                  {lesson.alumnoTipoJuego && lesson.alumnoContenido && (
                    renderAlumnoSectionInsideBook(lesson, num)
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  </div>
  );
}
