import React, { useState, useRef } from 'react';

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

interface SundaySchoolGeneratorProps {
  formatContent?: (content: string) => React.ReactNode;
}

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
  alumnoImagenPrompt: string;
}

const gridCache = new Map<string, string[][]>();

const generateWordSearchGrid = (words: string[]): string[][] => {
  const size = 10; // 10x10 is perfect for Letter size layout
  const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
  
  const directions = [
    [0, 1],   // Horizontal right
    [1, 0],   // Vertical down
    [1, 1],   // Diagonal down-right
  ];

  const cleanWord = (w: string) => {
    return w
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^A-Z]/gi, "")         // Remove non-alphabetic
      .toUpperCase();
  };

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
        for (let i = 0; i < word.length; i++) {
          grid[row + dir[0] * i][col + dir[1] * i] = word[i];
        }
        placed = true;
      }
    }
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }

  return grid;
};

const getOrGenerateGrid = (content: string, words: string[]): string[][] => {
  if (gridCache.has(content)) {
    return gridCache.get(content)!;
  }
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
      rowCells.push({
        r,
        c,
        visited: false,
        walls: { top: true, right: true, bottom: true, left: true }
      });
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
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const neighbor = grid[nr][nc];
        if (!neighbor.visited) {
          neighbors.push(neighbor);
        }
      }
    }

    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      if (next.r < current.r) {
        current.walls.top = false;
        next.walls.bottom = false;
      } else if (next.r > current.r) {
        current.walls.bottom = false;
        next.walls.top = false;
      } else if (next.c < current.c) {
        current.walls.left = false;
        next.walls.right = false;
      } else if (next.c > current.c) {
        current.walls.right = false;
        next.walls.left = false;
      }
      next.visited = true;
      stack.push(next);
    } else {
      stack.pop();
    }
  }

  grid[0][0].walls.left = false;
  grid[rows - 1][cols - 1].walls.right = false;
  return grid;
};

const getOrGenerateMaze = (content: string): MazeCell[][] => {
  if (mazeCache.has(content)) {
    return mazeCache.get(content)!;
  }
  const maze = generateMaze(8, 8);
  mazeCache.set(content, maze);
  return maze;
};

export default function SundaySchoolGenerator({ formatContent: _formatContent }: SundaySchoolGeneratorProps) {
  const [ageGroup, setAgeGroup] = useState('Primarios (7-9 años)');
  const [resourceType, setResourceType] = useState('Lección Completa / Guía del Maestro');
  const [topic, setTopic] = useState('');
  const [customDetails, setCustomDetails] = useState('');
  const [generatedResource, setGeneratedResource] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'finalized'>('idle');
  const [streamProgress, setStreamProgress] = useState(0);
  const [alumnoImagenBase64, setAlumnoImagenBase64] = useState('');
  const [imageStage, setImageStage] = useState(0);

  const folletoRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    setGeneratedResource('');
    setGenerationStatus('generating');
    setStreamProgress(0);
    setAlumnoImagenBase64('');
    setImageStage(0);

    try {
      const response = await fetch('/api/sunday-school', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ageGroup,
          topic,
          resourceType,
          customDetails,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al conectar con el servidor');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No se pudo leer la respuesta');

      // Para simular un progreso visual, vamos a mantener un contador del total de chunks recibidos.
      let totalChunks = 0;
      const estimatedTotalChunks = 120; // Estimación para una respuesta completa
      let isFinalReceived = false;
      let firstChunkLogged = false;

      console.log("[SundaySchool Frontend] Starting stream read...");

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("[SundaySchool Frontend] Stream reader done (no more data)");
          break;
        }

        totalChunks++;
        // Actualizar progreso basado en chunks recibidos (simulado hasta un 95%)
        const progress = Math.min((totalChunks / estimatedTotalChunks) * 100, 95);
        setStreamProgress(Math.round(progress));

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) throw new Error(data.error);
              if (data.is_final) {
                console.log("[SundaySchool Frontend] is_final event received");
                isFinalReceived = true;
                setGenerationStatus('finalized');
                setStreamProgress(100);
                break;
              }
              if (data.content) {
                if (!firstChunkLogged) {
                  console.log("[SundaySchool Frontend] First chunk received!");
                  firstChunkLogged = true;
                }
                if (totalChunks <= 3 || totalChunks % 50 === 0) {
                  console.log(`[SundaySchool Frontend] Chunk #${totalChunks}, content length: ${data.content.length}, preview: "${data.content.substring(0, 100)}"`);
                }
                setGeneratedResource((prev) => prev + data.content);
              }
              if (data.alumno_imagen_base64) {
                console.log("[SundaySchool Frontend] Image received (alumno_imagen_base64), length:", data.alumno_imagen_base64.length);
                setAlumnoImagenBase64(data.alumno_imagen_base64);
              }
            } catch (e) {
              console.error('[SundaySchool Frontend] Error parsing stream chunk:', e);
            }
          }
        }

        if (isFinalReceived) break;
      }

      console.log("[SundaySchool Frontend] Stream loop terminated. Total chunks:", totalChunks, "isFinalReceived:", isFinalReceived);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error generating Sunday School resource:', message);
      setGeneratedResource('Error al generar recurso: ' + message);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('finalized');
    }
  };

  const downloadPDF = () => {
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

  const executeHtml2Pdf = async (html2pdfFn: NonNullable<Window['html2pdf']>) => {
    if (!folletoRef.current) {
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
      const element = folletoRef.current;
      
      // Force exact A4 page width (794px at 96 DPI matches 8.27in width of A4 page)
      // This guarantees html2canvas renders it at full A4 scale even if stylesheets are removed
      const originalWidth = element.style.width;
      element.style.width = '794px';

      const opt = {
        margin: 0, // Using 0 margin so our internal page padding handles margins
        filename: `Clase_Dominical_${topic.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
          scale: 2.0, // High quality render scale
          useCORS: true, 
          allowTaint: true,
          logging: false
        },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'css' }
      };

      await html2pdfFn().from(element).set(opt).save();
      
      // Restore width
      element.style.width = originalWidth;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      console.error("Error al exportar PDF:", message);
      alert("Hubo un problema al generar el archivo PDF: " + message);
    } finally {
      // Restore all stylesheets to restore page styling
      stylesBackup.forEach((backup) => {
        try {
          backup.parent.insertBefore(backup.element, backup.nextSibling);
        } catch (e) {
          console.warn("Could not restore stylesheet element:", e);
        }
      });
      setIsDownloading(false);
    }
  };

  // Parse delimiters and structure the data
  const parseResource = (text: string): LessonData => {
    const data: LessonData = {
      numeroEscena: '1',
      titulo: topic || 'Sin Título',
      pasaje: 'Lectura Bíblica',
      versiculoRef: 'Apocalipsis 22:13',
      versiculoTexto: '"Yo soy el Alfa y la Omega, el Primero y el Último, el Principio y el Fin."',
      leccion: '',
      materiales: '',
      instrucciones: '',
      juegoTitulo: 'Juego Didáctico',
      juegoTexto: '',
      desafioTitulo: '¡Atrévete!',
      desafioTexto: '',
      asistencia: 'Trae tu Biblia, memoriza el versículo y colecciona los stickers semanales.',
      alumnoTipoJuego: 'DIBUJO_DIRIGIDO',
      alumnoContenido: '',
      alumnoInstrucciones: '',
      alumnoImagenBase64: '',
      alumnoImagenPrompt: ''
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
      { tag: '[ALUMNO_INSTRUCCIONES]', field: 'alumnoInstrucciones' },
      { tag: '[ALUMNO_IMAGEN_PROMPT]', field: 'alumnoImagenPrompt' }
    ];

    let currentField: keyof LessonData | null = null;
    const lines = text.split('\n');

    for (const line of lines) {
      let matched = false;
      for (const section of sections) {
        if (line.trim().startsWith(section.tag)) {
          currentField = section.field;
          matched = true;
          // Extract any inline content after the tag
          const rest = line.substring(line.indexOf(section.tag) + section.tag.length).trim();
          if (rest) {
            data[currentField] = rest + '\n';
          } else {
            data[currentField] = '';
          }
          break;
        }
      }

      if (!matched && currentField) {
        data[currentField] += line + '\n';
      }
    }

    // Strip footnote-style number citations (like **3** or [3]) and trim all fields
    const footnoteRegex = /\s?\*\*?\d+\*\*?|\s?\[\d+\]/g;
    for (const key of Object.keys(data) as (keyof LessonData)[]) {
      data[key] = (data[key] as string).replace(footnoteRegex, '').trim() as any;
    }

    return data;
  };

  const formatPdfInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ fontWeight: 'bold', color: '#1c1917' }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} style={{ fontStyle: 'italic', color: '#44403c' }}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            style={{
              backgroundColor: '#f5f5f4',
              border: '1px solid #e7e5e4',
              padding: '2px 4px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#dc2626'
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const formatPdfContent = (content: string) => {
    if (!content) return null;

    const lines = content.split('\n');
    return lines.map((line, lineIndex) => {
      if (line.startsWith('### ')) {
        return (
          <h3 
            key={lineIndex} 
            style={{ 
              fontSize: '13px', 
              fontWeight: 900, 
              color: '#1e3a8a', 
              marginTop: '16px', 
              marginBottom: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}
          >
            <span style={{ width: '4px', height: '14px', backgroundColor: '#3b82f6', borderRadius: '2px' }} />
            {line.slice(4)}
          </h3>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 
            key={lineIndex} 
            style={{ 
              fontSize: '15px', 
              fontWeight: 900, 
              color: '#1e3a8a', 
              marginTop: '20px', 
              marginBottom: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}
          >
            <span style={{ width: '6px', height: '16px', backgroundColor: '#1d4ed8', borderRadius: '3px' }} />
            {line.slice(3)}
          </h2>
        );
      }
      if (line.match(/^(\d+\.|\*|-)\s/)) {
        return (
          <div 
            key={lineIndex} 
            style={{ 
              marginLeft: '8px', 
              paddingLeft: '12px', 
              borderLeft: '2px solid rgba(59, 130, 246, 0.2)', 
              marginTop: '8px', 
              marginBottom: '8px', 
              fontSize: '11px', 
              fontFamily: '"Lora", Georgia, serif', 
              color: '#1c1917', 
              lineHeight: 1.5 
            }}
          >
            {formatPdfInline(line)}
          </div>
        );
      }
      if (!line.trim()) return <div key={lineIndex} style={{ height: '8px' }} />;
      return (
        <p 
          key={lineIndex} 
          style={{ 
            marginBottom: '8px', 
            lineHeight: 1.5, 
            color: '#1c1917', 
            fontFamily: '"Lora", Georgia, serif', 
            fontSize: '11.5px' 
          }}
        >
          {formatPdfInline(line)}
        </p>
      );
    });
  };

  // ============================================================
  // Helper: Render Sopa de Letras (Word Search Grid)
  // ============================================================
  const renderSopaLetras = (content: string): React.ReactNode => {
    const lines = content.trim().split('\n').filter(l => l.trim());
    if (lines.length < 1) {
      return <p style={{ fontSize: '11px', fontFamily: '"Lora", Georgia, serif', color: '#78716c', fontStyle: 'italic' }}>Contenido de sopa de letras no disponible.</p>;
    }

    // First line: word list
    const wordsLine = lines[0];
    const words = wordsLine.replace(/^PALABRAS:\s*/i, '').split(',').map(w => w.trim().toUpperCase()).filter(w => w);

    if (words.length === 0) {
      return <p style={{ fontSize: '11px', fontFamily: '"Lora", Georgia, serif', color: '#78716c', fontStyle: 'italic' }}>Lista de palabras vacía.</p>;
    }

    // Dynamically generate or fetch the cached word search grid
    const grid = getOrGenerateGrid(content, words);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Word list */}
        {words.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', fontWeight: 900, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Palabras a encontrar:
            </span>
            {words.map((word, i) => (
              <span
                key={i}
                style={{
                  fontSize: '9px',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  fontWeight: 700,
                  color: '#1c1917',
                  backgroundColor: '#e0e7ff',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  border: '1px solid #a5b4fc'
                }}
              >
                {word}
              </span>
            ))}
          </div>
        )}

        {/* Grid */}
        <div style={{ display: 'inline-block', alignSelf: 'center' }}>
          <table style={{ borderCollapse: 'collapse', margin: '0 auto' }}>
            <tbody>
              {grid.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        width: '28px',
                        height: '28px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        border: '1px solid #d4d4d4',
                        fontFamily: '"Courier New", Courier, monospace',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#1c1917',
                        backgroundColor: (ri + ci) % 2 === 0 ? '#fafaf9' : '#f5f5f4',
                        padding: 0
                      }}
                    >
                      {cell.toUpperCase()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderLaberinto = (content: string): React.ReactNode => {
    const maze = getOrGenerateMaze(content);
    const cellSize = 26; // 26px per cell fits column width
    const width = 8 * cellSize;
    const height = 8 * cellSize;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        {content && (
          <div style={{
            fontSize: '11px',
            fontFamily: '"Lora", Georgia, serif',
            color: '#1c1917',
            lineHeight: 1.6,
            padding: '16px',
            backgroundColor: '#fafaf9',
            borderRadius: '12px',
            border: '1px solid #e7e5e4',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {formatPdfContent(content)}
          </div>
        )}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f3ff',
          borderRadius: '16px',
          border: '2px dashed #a78bfa',
          padding: '16px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <span style={{ fontSize: '9px', fontWeight: 900, color: '#7c3aed', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ENTRADA ➔
          </span>
          <svg width={width + 4} height={height + 4} style={{ backgroundColor: '#ffffff', border: '2px solid #7c3aed', borderRadius: '8px' }}>
            <g transform="translate(2, 2)">
              {maze.map((row, r) =>
                row.map((cell, c) => {
                  const x1 = c * cellSize;
                  const y1 = r * cellSize;
                  const x2 = (c + 1) * cellSize;
                  const y2 = (r + 1) * cellSize;
                  return (
                    <g key={`${r}-${c}`}>
                      {cell.walls.top && <line x1={x1} y1={y1} x2={x2} y2={y1} stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />}
                      {cell.walls.right && <line x1={x2} y1={y1} x2={x2} y2={y2} stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />}
                      {cell.walls.bottom && <line x1={x1} y1={y2} x2={x2} y2={y2} stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />}
                      {cell.walls.left && <line x1={x1} y1={y1} x2={x1} y2={y2} stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />}
                    </g>
                  );
                })
              )}
            </g>
          </svg>
          <span style={{ fontSize: '9px', fontWeight: 900, color: '#7c3aed', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ➔ SALIDA
          </span>
        </div>
      </div>
    );
  };

  // ============================================================
  // Helper: Render dynamic game section based on tipo de juego
  // ============================================================
  const renderGameSection = (tipoJuego: string, contenido: string): React.ReactNode => {
    const tipo = tipoJuego.toUpperCase().trim();

    if (tipo.includes('SOPA') || tipo.includes('LETRA')) {
      return renderSopaLetras(contenido);
    }
    if (tipo.includes('LABERINTO')) {
      return renderLaberinto(contenido);
    }

    switch (tipo) {

      case 'LABERINTO':
        return renderLaberinto(contenido);

      case 'CAMINO':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '16px',
              border: '1px solid #bbf7d0'
            }}>
              {contenido.split('\n').filter(l => l.trim()).map((step, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '8px 12px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #dcfce7'
                }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: '#22c55e',
                    color: '#ffffff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '11px',
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    flexShrink: 0
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: '"Lora", Georgia, serif', color: '#1c1917', lineHeight: 1.5 }}>
                    {formatPdfInline(step)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'CODIGO_SECRETO':
      case 'CODIGO SECRETO':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              border: '2px dashed #f59e0b',
              borderRadius: '16px',
              backgroundColor: '#fffbeb',
              padding: '20px',
              minHeight: '150px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '11px', fontFamily: '"Lora", Georgia, serif', color: '#1c1917', lineHeight: 1.6 }}>
                {formatPdfContent(contenido)}
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'center',
                marginTop: '8px',
                padding: '12px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #fde68a'
              }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} style={{
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                    border: '1px solid #fde68a',
                    fontFamily: '"Courier New", monospace',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#92400e'
                  }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'CRUCIGRAMA':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 900, color: '#1e3a8a', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Horizontales
                </span>
                <div style={{ fontSize: '10px', fontFamily: '"Lora", Georgia, serif', color: '#1c1917', lineHeight: 1.8 }}>
                  {formatPdfContent(contenido)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 900, color: '#1e3a8a', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Verticales
                </span>
                <div style={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: '12px',
                  minHeight: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  fontSize: '9px',
                  color: '#94a3b8',
                  fontFamily: '"Lora", Georgia, serif',
                  fontStyle: 'italic'
                }}>
                  Próximamente
                </div>
              </div>
            </div>
          </div>
        );

      case 'DIBUJO_DIRIGIDO':
      case 'DIBUJO DIRIGIDO':
      default:
        return (
          <div style={{
            border: '2px dashed #d6d3d1',
            borderRadius: '16px',
            backgroundColor: '#fafaf9',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '36px', opacity: 0.2 }}>🖍️</span>
              {contenido ? (
                <div style={{ fontSize: '10px', fontFamily: '"Lora", Georgia, serif', color: '#78716c', fontStyle: 'italic', maxWidth: '300px', lineHeight: 1.5 }}>
                  {formatPdfContent(contenido)}
                </div>
              ) : (
                <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a8a29e' }}>
                  Dibuja o colorea aquí
                </span>
              )}
            </div>
          </div>
        );
    }
  };

  // ============================================================
  // Helper: Render Alumno Material Section
  // ============================================================
  const renderAlumnoSection = (): React.ReactNode => {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        borderTop: '4px solid #1c1917',
        paddingTop: '24px',
        marginTop: '24px',
        pageBreakBefore: 'always',
        breakBefore: 'page'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: '#faf5ff',
          border: '4px solid #9333ea',
          padding: '16px',
          borderRadius: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            backgroundColor: '#9333ea',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '10px 24px',
            borderRadius: '16px',
            border: '2px solid #ffffff',
            transform: 'rotate(-1deg)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            📝 MATERIAL DE TRABAJO
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontWeight: 900, color: '#6b21a8', fontSize: '16px' }}>Alumno</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#78716c', fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic' }}>
              Actividad grupal para reforzar la lección de hoy.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
          {/* Left column: Game Activity */}
          <div style={{
            border: '1px solid #e9d5ff',
            backgroundColor: 'rgba(250, 245, 255, 0.2)',
            padding: '24px',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            pageBreakInside: 'avoid',
            breakInside: 'avoid'
          }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#6b21a8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
              🎲 Juego: {(() => {
                const tipos: Record<string, string> = {
                  'SOPA_DE_LETRAS': 'Sopa de Letras',
                  'SOPA DE LETRAS': 'Sopa de Letras',
                  'LABERINTO': 'Laberinto',
                  'CAMINO': 'Camino de la Fe',
                  'CODIGO_SECRETO': 'Código Secreto',
                  'CODIGO SECRETO': 'Código Secreto',
                  'CRUCIGRAMA': 'Crucigrama Bíblico',
                  'DIBUJO_DIRIGIDO': 'Dibujo Dirigido',
                  'DIBUJO DIRIGIDO': 'Dibujo Dirigido'
                };
                return tipos[lesson.alumnoTipoJuego.toUpperCase().trim()] || 'Actividad Didáctica';
              })()}
            </span>
            {renderGameSection(lesson.alumnoTipoJuego, lesson.alumnoContenido)}
          </div>

          {/* Right column: Instructions + Image */}
          <div style={{
            border: '1px solid #e7e5e4',
            padding: '24px',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            pageBreakInside: 'avoid',
            breakInside: 'avoid'
          }}>
            {/* Instructions */}
            <div>
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#44403c', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                📋 Instrucciones
              </span>
              {lesson.alumnoInstrucciones ? (
                <div style={{
                  fontSize: '11px',
                  fontFamily: '"Lora", Georgia, serif',
                  color: '#1c1917',
                  lineHeight: 1.6,
                  padding: '12px',
                  backgroundColor: '#fafaf9',
                  borderRadius: '12px',
                  border: '1px solid #e7e5e4'
                }}>
                  {formatPdfContent(lesson.alumnoInstrucciones)}
                </div>
              ) : (
                <p style={{ fontSize: '10px', fontFamily: '"Lora", Georgia, serif', color: '#78716c', fontStyle: 'italic' }}>
                  Sigue las indicaciones de tu maestro para completar la actividad.
                </p>
              )}
            </div>

            {/* Generated Image */}
            <div>
              <span style={{ fontSize: '10px', fontWeight: 900, color: '#44403c', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                🖼️ Ilustración de la clase
              </span>
              <div style={{
                border: '2px dashed #d6d3d1',
                borderRadius: '16px',
                backgroundColor: '#fafaf9',
                minHeight: '160px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {alumnoImagenBase64 || lesson.alumnoImagenPrompt || lesson.titulo || topic ? (
                  imageStage === 0 ? (
                    <img
                      src={alumnoImagenBase64 || `https://image.pollinations.ai/prompt/${encodeURIComponent(
                        lesson.alumnoImagenPrompt && lesson.alumnoImagenPrompt.trim().length > 5 
                          ? lesson.alumnoImagenPrompt 
                          : `cartoon illustration of ${lesson.titulo || topic}, friendly bible story style for kids, vibrant colors, clean lines`
                      )}?width=512&height=512&model=flux&nologo=true`}
                      alt="Ilustración generada para la clase"
                      onError={() => setImageStage(1)}
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '260px',
                        objectFit: 'contain',
                        borderRadius: '8px'
                      }}
                    />
                  ) : imageStage === 1 ? (
                    <img
                      src={`https://loremflickr.com/512/512/bible,${encodeURIComponent(lesson.titulo || topic || 'cartoon')}`}
                      alt="Ilustración de la lección"
                      onError={() => setImageStage(2)}
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '260px',
                        objectFit: 'contain',
                        borderRadius: '8px'
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px', textAlign: 'center' }}>
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        <path d="M6 6h10" />
                        <path d="M6 10h10" />
                        <path d="M6 14h10" />
                      </svg>
                      <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b21a8' }}>
                        Estudio Bíblico
                      </span>
                      <span style={{ fontSize: '8px', fontFamily: '"Lora", Georgia, serif', color: '#78716c', fontStyle: 'italic' }}>
                        Dibujo para colorear y recortar
                      </span>
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', textAlign: 'center' }}>
                    <span style={{ fontSize: '28px', opacity: 0.2 }}>🖼️</span>
                    <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a8a29e' }}>
                      Imagen de la Lección
                    </span>
                    <span style={{ fontSize: '8px', fontFamily: '"Lora", Georgia, serif', color: '#d6d3d1', fontStyle: 'italic' }}>
                      Ilustración generada por IA
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom info bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #e7e5e4',
          paddingTop: '12px',
          fontSize: '8px',
          color: '#78716c',
          fontFamily: 'monospace'
        }}>
          <span>ELÍAS — Material del Alumno</span>
          <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#57534e', fontSize: '8px', letterSpacing: '0.1em' }}>
            Recorta y trabaja en grupo
          </span>
        </div>
      </div>
    );
  };

  const lesson = parseResource(generatedResource);

  return (
    <div className="flex-1 w-full flex flex-col lg:flex-row overflow-hidden relative">
      {/* Configuration Panel */}
      <div className="w-full lg:w-[360px] bg-[#12100e]/95 border-b lg:border-b-0 lg:border-r border-amber-500/10 p-6 flex flex-col overflow-y-auto chat-scroll no-print flex-shrink-0">
        <div className="flex items-center gap-2 mb-6 border-b border-amber-500/10 pb-3">
          <span className="text-amber-500 text-lg">🏫</span>
          <h3 className="text-sm font-heading font-black tracking-widest text-amber-400 uppercase">Folleto Dominical</h3>
        </div>

        <form onSubmit={handleGenerate} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold font-heading text-stone-400 uppercase tracking-wider">Grupo de Edad</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-900/60 border border-stone-850 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 font-serif text-sm transition-all cursor-pointer"
            >
              <option value="Cunas (0-3 años)">Cunas (0-3 años)</option>
              <option value="Principiantes (4-6 años)">Principiantes (4-6 años)</option>
              <option value="Primarios (7-9 años)">Primarios (7-9 años)</option>
              <option value="Intermedios (10-12 años)">Intermedios (10-12 años)</option>
              <option value="Jóvenes / Adultos">Jóvenes / Adultos</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold font-heading text-stone-400 uppercase tracking-wider">Tipo de Recurso</label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-full px-4 py-2.5 bg-stone-900/60 border border-stone-850 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 font-serif text-sm transition-all cursor-pointer"
            >
              <option value="Lección Completa / Guía del Maestro">Lección Completa</option>
              <option value="Actividades y Dinámicas">Actividades y Dinámicas</option>
              <option value="Tarjetas de Versículos y Memorización">Tarjetas de Versículos</option>
              <option value="Bosquejo Rápido de Clase">Bosquejo Rápido</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold font-heading text-stone-400 uppercase tracking-wider">Tema o Pasaje Bíblico</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej: Daniel en el foso de los leones"
              className="w-full px-4 py-2.5 bg-stone-900/60 border border-stone-850 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 font-serif text-sm transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold font-heading text-stone-400 uppercase tracking-wider">Enfoque Personalizado (Opcional)</label>
            <textarea
              value={customDetails}
              onChange={(e) => setCustomDetails(e.target.value)}
              placeholder="Ej: Enfatizar la soberanía divina y confianza..."
              rows={4}
              className="w-full px-4 py-2.5 bg-stone-900/60 border border-stone-850 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/40 font-serif text-sm transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isGenerating || !topic.trim()}
            className="w-full py-3 bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 rounded-xl text-stone-950 font-bold font-heading uppercase tracking-wider transition-all duration-300 disabled:opacity-40 shadow-lg shadow-amber-500/10 cursor-pointer text-center"
          >
            {isGenerating ? 'Generando Material...' : 'Generar Material'}
          </button>
        </form>
      </div>

      {/* Preview and Action toolbar */}
      <div className="flex-1 bg-[#0d0b0a]/40 flex flex-col overflow-hidden relative">
        
        {/* Barra de Progreso de Generación (streaming) */}
        {generationStatus === 'generating' && (
          <div className="w-full bg-stone-900/80 border-b border-amber-500/20 px-6 py-3 flex items-center gap-3 animate-pulse">
            <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between text-xs font-bold font-heading text-amber-400 uppercase tracking-wider">
                <span>Generando Material... ({streamProgress}%)</span>
              </div>
              <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-300 ease-out"
                  style={{ width: `${streamProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {generationStatus === 'finalized' && (
          <div className="w-full bg-green-900/30 border-b border-green-500/20 px-6 py-3 flex items-center gap-3">
            <span className="text-green-400 text-lg">✓</span>
            <span className="text-xs font-bold font-heading text-green-400 uppercase tracking-wider">
              Generación Completada — Folleto Listo para Descargar
            </span>
          </div>
        )}

        <div className="h-14 border-b border-amber-500/10 px-6 flex items-center justify-between bg-stone-950/20 no-print flex-shrink-0">
          <span className="text-xs text-stone-400 font-serif">Maquetación del Folleto Dominical</span>
          <div className="flex items-center gap-3">
            {generatedResource && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedResource);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3.5 py-1.5 bg-stone-900/60 border border-stone-850 rounded-xl text-[10px] font-bold text-stone-300 hover:text-white transition-all cursor-pointer font-heading uppercase tracking-wider"
                >
                  {copied ? '✓ Copiado' : '📋 Copiar Código'}
                </button>
                <button
                  onClick={downloadPDF}
                  disabled={isDownloading}
                  className="px-3.5 py-1.5 bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 rounded-xl text-[10px] font-bold text-stone-950 transition-all cursor-pointer shadow-md shadow-amber-500/15 font-heading uppercase tracking-wider disabled:opacity-50"
                >
                  {isDownloading ? 'Generando PDF...' : '🖨️ Descargar PDF'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Folleto Canvas Wrapper */}
        <div className="flex-1 overflow-y-auto chat-scroll p-6 md:p-10 flex justify-center bg-[#0d0b0a]/60 relative">
          <div className="w-full max-w-[8.5in]">
            {generatedResource ? (
              <div 
                ref={folletoRef}
                id="printable-folleto-canvas"
                style={{ 
                  width: '100%',
                  maxWidth: '794px', // Matches A4 width at 96 DPI
                  boxSizing: 'border-box',
                  minHeight: '11in', 
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                  backgroundColor: '#ffffff', 
                  color: '#1c1917', 
                  padding: '0.4in', 
                  borderRadius: '24px', 
                  border: '1px solid #d6d3d1', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '24px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
              >
                
                {/* ========================================================
                    PAGINA 1: CABECERA Y HISTORIA DE LA LECCION
                    ======================================================== */}
                <div 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '24px', 
                    borderBottom: '4px solid #1c1917', 
                    paddingBottom: '24px' 
                  }}
                >
                  
                  {/* Header de Marquesina estilo Neón / Comic del PDF */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      border: '4px solid #e11d48', 
                      backgroundColor: '#fff5f5', 
                      padding: '16px', 
                      borderRadius: '24px', 
                      gap: '16px', 
                      position: 'relative', 
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {/* Stars Pattern Overlay */}
                    <div style={{ position: 'absolute', top: '0', right: '0', padding: '8px', opacity: 0.05, color: '#9f1239', fontSize: '60px', userSelect: 'none' }}>★</div>

                    {/* Escena badge */}
                    <div 
                      style={{ 
                        backgroundColor: '#e11d48', 
                        color: '#ffffff', 
                        padding: '12px', 
                        borderRadius: '16px', 
                        border: '2px solid #ffffff', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        minWidth: '90px',
                        transform: 'rotate(-2deg)'
                      }}
                    >
                      <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 900 }}>Escena</span>
                      <span style={{ fontSize: '30px', fontWeight: 900, lineHeight: 1 }}>{lesson.numeroEscena}</span>
                    </div>

                    {/* Titulo marquesina central */}
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: '24px', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 900, color: '#9f1239', textTransform: 'uppercase', margin: 0 }}>
                        {lesson.titulo}
                      </h2>
                      <div style={{ height: '2px', backgroundColor: 'rgba(225, 29, 72, 0.2)', margin: '4px 0' }} />
                      <span style={{ fontSize: '11px', fontFamily: '"Lora", Georgia, serif', fontWeight: 'bold', color: '#44403c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Tema Central Doctrinario
                      </span>
                    </div>

                    {/* Pasaje y Referencias */}
                    <div 
                      style={{ 
                        backgroundColor: '#ffffff', 
                        border: '2px solid rgba(225, 29, 72, 0.4)', 
                        padding: '12px', 
                        borderRadius: '16px', 
                        textAlign: 'center', 
                        minWidth: '150px',
                        transform: 'rotate(1deg)'
                      }}
                    >
                      <span style={{ fontSize: '9px', fontWeight: 900, color: '#e11d48', textTransform: 'uppercase', display: 'block' }}>Lectura</span>
                      <span style={{ fontSize: '12px', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 900, color: '#1c1917', display: 'block', marginTop: '4px' }}>{lesson.pasaje}</span>
                      <span style={{ fontSize: '9px', color: '#78716c', fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic', display: 'block', marginTop: '2px' }}>RVR1960</span>
                    </div>
                  </div>

                  {/* Dos Columnas: Lección + Versículo en Marco Estilo PDF */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '24px', marginTop: '16px' }}>
                    
                    {/* Columna Izquierda: Lección */}
                    <div style={{ gridColumn: 'span 7 / span 7', display: 'flex', flexDirection: 'column', gap: '16px', borderRight: '1px solid #e7e5e4', paddingRight: '24px' }}>
                      
                      {/* LECCION BANNER */}
                      <div 
                        style={{ 
                          display: 'inline-block', 
                          background: 'linear-gradient(to right, #2563eb, #4f46e5)', 
                          color: '#ffffff', 
                          fontWeight: 900, 
                          fontSize: '11px', 
                          letterSpacing: '0.1em', 
                          textTransform: 'uppercase', 
                          padding: '8px 24px', 
                          borderRadius: '16px', 
                          alignSelf: 'start', 
                          transform: 'rotate(-1deg)',
                          border: '1px solid #3b82f6',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        🎬 LECCIÓN
                      </div>

                      <div style={{ fontFamily: '"Lora", Georgia, serif', fontSize: '12px', lineHeight: 1.6, color: '#1c1917', textAlign: 'justify' }}>
                        {formatPdfContent(lesson.leccion)}
                      </div>
                    </div>

                    {/* Columna Derecha: Versículo e Ilustraciones */}
                    <div style={{ gridColumn: 'span 5 / span 5', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      
                      {/* VERSICULO BOX - Estilo PDF con Doble Borde */}
                      <div 
                        style={{ 
                          border: '4px double #f59e0b', 
                          backgroundColor: '#fffbeb', 
                          padding: '20px', 
                          borderRadius: '24px', 
                          position: 'relative',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid'
                        }}
                      >
                        {/* Gold Star Overlay */}
                        <div 
                          style={{ 
                            position: 'absolute', 
                            top: '-16px', 
                            right: '-16px', 
                            width: '36px', 
                            height: '36px', 
                            backgroundColor: '#f59e0b', 
                            color: '#ffffff', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 'bold', 
                            fontSize: '18px', 
                            border: '2px solid #ffffff', 
                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                            transform: 'rotate(12deg)'
                          }}
                        >
                          ★
                        </div>
                        
                        <span style={{ fontSize: '9px', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                          Versículo Clave
                        </span>
                        
                        <blockquote style={{ fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic', fontSize: '13px', color: '#1c1917', fontWeight: 500, lineHeight: 1.5, margin: '0 0 12px 0' }}>
                          {lesson.versiculoTexto}
                        </blockquote>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e', borderBottom: '1px solid #f59e0b', paddingBottom: '2px' }}>
                            {lesson.versiculoRef}
                          </span>
                        </div>
                      </div>

                      {/* Batallas / Dinámicas Banner */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div 
                          style={{ 
                            display: 'inline-block', 
                            background: 'linear-gradient(to right, #dc2626, #ea580c)', 
                            color: '#ffffff', 
                            fontWeight: 900, 
                            fontSize: '11px', 
                            letterSpacing: '0.1em', 
                            textTransform: 'uppercase', 
                            padding: '8px 24px', 
                            borderRadius: '16px', 
                            alignSelf: 'start', 
                            transform: 'rotate(1deg)',
                            border: '1px solid #ef4444',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          🥊 {lesson.juegoTitulo.toUpperCase()}
                        </div>
                        <p style={{ fontFamily: '"Lora", Georgia, serif', fontSize: '11px', lineHeight: 1.5, color: '#44403c', textAlign: 'justify', margin: 0 }}>
                          {lesson.juegoTexto}
                        </p>
                      </div>

                      {/* Attendance box style bottom P1 */}
                      <div style={{ backgroundColor: '#fafaf9', border: '1px solid #e7e5e4', padding: '16px', borderRadius: '16px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <span style={{ fontSize: '9px', fontWeight: 900, color: '#78716c', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                          !ASISTENCIA!
                        </span>
                        <p style={{ fontSize: '10px', fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic', color: '#44403c', margin: 0, lineHeight: 1.4 }}>
                          {lesson.asistencia}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========================================================
                    PAGINA 2: ACTIVIDADES / MANUALIDAD
                    ======================================================== */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '16px', pageBreakBefore: 'always', breakBefore: 'page' }}>
                  
                  {/* TENGO TALENTO HEADER */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      gap: '16px', 
                      backgroundColor: '#faf5ff', 
                      border: '4px solid #9333ea', 
                      padding: '16px', 
                      borderRadius: '24px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div 
                      style={{ 
                        backgroundColor: '#9333ea', 
                        color: '#ffffff', 
                        fontWeight: 900, 
                        fontSize: '11px', 
                        letterSpacing: '0.1em', 
                        textTransform: 'uppercase', 
                        padding: '10px 24px', 
                        borderRadius: '16px', 
                        border: '2px solid #ffffff', 
                        transform: 'rotate(-1deg)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      🎨 TENGO TALENTO
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontWeight: 900, color: '#6b21a8', fontSize: '16px' }}>Manualidades y Actividades Didácticas</h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#78716c', fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic' }}>Diseñado para la aplicación táctil de las verdades bíblicas bautistas.</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
                    {/* Materiales y Pasos */}
                    <div style={{ border: '1px solid #e9d5ff', backgroundColor: 'rgba(250, 245, 255, 0.2)', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '16px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: '#6b21a8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Materiales Necesarios</span>
                        <div style={{ fontSize: '11px', fontFamily: '"Lora", Georgia, serif', color: '#1c1917', lineHeight: 1.5, paddingLeft: '16px', borderLeft: '1px solid #e9d5ff' }}>
                          {formatPdfContent(lesson.materiales)}
                        </div>
                      </div>

                      <div style={{ height: '1px', backgroundColor: '#e9d5ff', margin: '4px 0' }} />

                      <div>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: '#6b21a8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Instrucciones Paso a Paso</span>
                        <div style={{ fontSize: '11px', fontFamily: '"Lora", Georgia, serif', color: '#1c1917', lineHeight: 1.5, paddingLeft: '16px', borderLeft: '1px solid #e9d5ff' }}>
                          {formatPdfContent(lesson.instrucciones)}
                        </div>
                      </div>
                    </div>

                    {/* Dibujo e Ilustración */}
                    <div style={{ border: '1px solid #e7e5e4', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: '#44403c', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                          Dibujo Ilustrativo de la Clase
                        </span>
                        <p style={{ fontSize: '10px', fontFamily: '"Lora", Georgia, serif', color: '#78716c', fontStyle: 'italic', margin: '0 0 16px 0' }}>
                          Dibuja algo relacionado al tema: "{lesson.titulo}"
                        </p>
                      </div>

                      <div 
                        style={{ 
                          flex: 1, 
                          border: '2px dashed #d6d3d1', 
                          borderRadius: '16px', 
                          backgroundColor: '#fafaf9', 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          textAlign: 'center', 
                          padding: '16px' 
                        }}
                      >
                        <div style={{ opacity: 0.2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '32px' }}>🖍️</span>
                          <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '8px' }}>Dibuja o colorea aquí</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Devocional / Desafío Semanal */}
                  <div 
                    style={{ 
                      backgroundColor: '#ecfdf5', 
                      border: '4px solid #059669', 
                      padding: '24px', 
                      borderRadius: '24px', 
                      position: 'relative',
                      marginTop: '16px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid'
                    }}
                  >
                    <span 
                      style={{ 
                        position: 'absolute', 
                        top: '-12px', 
                        left: '24px', 
                        backgroundColor: '#059669', 
                        color: '#ffffff', 
                        fontWeight: 900, 
                        fontSize: '9px', 
                        letterSpacing: '0.1em', 
                        textTransform: 'uppercase', 
                        padding: '4px 16px', 
                        borderRadius: '9999px', 
                        border: '1px solid #ffffff' 
                      }}
                    >
                      🏆 DESAFÍO: {lesson.desafioTitulo.toUpperCase()}
                    </span>
                    
                    <div style={{ fontFamily: '"Lora", Georgia, serif', fontSize: '11px', lineHeight: 1.6, color: '#1c1917', marginTop: '8px', textAlign: 'justify' }}>
                      {formatPdfContent(lesson.desafioTexto)}
                    </div>
                  </div>

                  {/* Footer footer logo */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'row',
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      borderTop: '1px solid #e7e5e4', 
                      paddingTop: '16px', 
                      marginTop: '24px', 
                      fontSize: '9px', 
                      color: '#78716c', 
                      fontFamily: 'monospace' 
                    }}
                  >
                    <span>ELÍAS — Módulo de Recursos de Escuela Dominical</span>
                    <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#57534e', fontSize: '9px', letterSpacing: '0.1em' }}>Soli Deo Gloria</span>
                  </div>
                </div>

                {/* ========================================================
                    MATERIAL DEL ALUMNO
                    ======================================================== */}
                {lesson.alumnoTipoJuego && lesson.alumnoContenido && (
                  renderAlumnoSection()
                )}
                </div>

              ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4 opacity-40 bg-[#12100e]/30 rounded-3xl border border-stone-800/80">
                <span className="text-5xl">📚</span>
                <h3 className="text-lg font-heading text-[#dfb15b] font-bold">Plantilla de Folleto Dominical</h3>
                <p className="text-sm font-serif text-[#78716c] max-w-md">
                  Configura los detalles en el panel izquierdo y presiona "Generar Material" para crear un folleto dominical estructurado con dinámicas, versículos y lecciones listo para imprimir.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
