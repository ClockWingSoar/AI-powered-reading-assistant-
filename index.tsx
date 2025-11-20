import React, { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type } from "@google/genai";
import { 
  BookOpen, 
  Upload, 
  FileText, 
  Loader2, 
  Download, 
  Printer, 
  BarChart2, 
  List, 
  BrainCircuit,
  AlertCircle
} from "lucide-react";

// --- Types ---

interface AnalysisData {
  metadata: {
    title: string;
    author: string;
    genre: string;
    readingTime: string;
  };
  executiveSummary: string;
  keyConcepts: {
    term: string;
    definition: string;
    importance: number; // 1-100
  }[];
  chapterBreakdown: {
    title: string;
    summary: string;
    insight: string;
  }[];
  topicStats: {
    topic: string;
    relevance: number; // 1-100
  }[];
  fullMarkdownReport: string;
}

type ViewState = "upload" | "processing" | "dashboard";
type DashboardTab = "overview" | "concepts" | "visuals" | "full-report";

// --- Components ---

// 1. File Upload
const FileUpload = ({ onFileSelect }: { onFileSelect: (file: File) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const validateAndProcess = (file: File) => {
    const validTypes = ['text/markdown', 'text/plain', 'application/pdf'];
    // Basic validation - extension check fallback
    const isMd = file.name.endsWith('.md') || file.name.endsWith('.markdown');
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    
    if (isMd || isPdf || validTypes.includes(file.type)) {
      onFileSelect(file);
    } else {
      alert("Please upload a PDF or Markdown file.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="text-center mb-8 space-y-2">
        <h1 className="text-4xl font-serif font-bold text-slate-800 tracking-tight">DeepRead AI</h1>
        <p className="text-slate-500 text-lg">Transform documents into beautiful, structured reading notes.</p>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          w-full max-w-xl p-12 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer
          flex flex-col items-center justify-center gap-6 group
          ${isDragging 
            ? "border-indigo-500 bg-indigo-50 scale-102 shadow-xl" 
            : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 shadow-sm hover:shadow-md"
          }
        `}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleChange} 
          accept=".md,.markdown,.pdf,.txt" 
          className="hidden" 
        />
        
        <div className={`
          p-6 rounded-full bg-indigo-100 text-indigo-600 transition-transform duration-500
          ${isDragging ? "scale-110 rotate-3" : "group-hover:scale-110"}
        `}>
          <BookOpen size={48} strokeWidth={1.5} />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-slate-700">
            {isDragging ? "Drop to Analyze" : "Drop your book or paper here"}
          </h3>
          <p className="text-slate-400 text-sm">
            Supports PDF & Markdown. 
            <br />
            We'll analyze structure, key concepts, and sentiment.
          </p>
        </div>

        <div className="flex gap-3 mt-2">
          <span className="px-3 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-500 border border-slate-200">.PDF</span>
          <span className="px-3 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-500 border border-slate-200">.MD</span>
        </div>
      </div>
    </div>
  );
};

// 2. Processing State
const ProcessingView = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 animate-in fade-in duration-700">
    <div className="relative">
      <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
      <Loader2 size={64} className="text-indigo-600 animate-spin relative z-10" />
    </div>
    <h2 className="mt-8 text-2xl font-serif font-bold text-slate-800">Reading & Analyzing...</h2>
    <p className="text-slate-500 mt-2 max-w-md text-center">
      Gemini is digesting the content, identifying key themes, and structuring your notes. This may take a moment for large files.
    </p>
  </div>
);

// 3. Charts
const BarChart = ({ data }: { data: { label: string; value: number }[] }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-4">
      {data.map((item, i) => (
        <div key={i} className="group">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="text-slate-400">{item.value}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out group-hover:bg-indigo-600"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// 4. Dashboard Components
const ConceptCard: React.FC<{ concept: AnalysisData['keyConcepts'][0], index: number }> = ({ concept, index }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
    <div className="flex justify-between items-start mb-3">
      <h3 className="font-bold text-lg text-slate-800">{concept.term}</h3>
      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
        concept.importance > 80 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
      }`}>
        {concept.importance} Impact
      </span>
    </div>
    <p className="text-slate-600 text-sm leading-relaxed">{concept.definition}</p>
  </div>
);

const ChapterRow: React.FC<{ chapter: AnalysisData['chapterBreakdown'][0], index: number }> = ({ chapter, index }) => (
  <div className="relative pl-8 pb-8 border-l-2 border-slate-200 last:border-l-0 last:pb-0">
    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm"></div>
    <div className="mb-1 text-xs font-bold tracking-wider text-indigo-500 uppercase">Section {index + 1}</div>
    <h3 className="text-xl font-serif font-bold text-slate-800 mb-2">{chapter.title}</h3>
    <p className="text-slate-600 mb-3 leading-relaxed">{chapter.summary}</p>
    <div className="bg-indigo-50 p-3 rounded-lg text-sm text-indigo-900 border border-indigo-100 flex gap-2 items-start">
      <BrainCircuit size={16} className="mt-0.5 flex-shrink-0" />
      <span><span className="font-bold">Key Insight:</span> {chapter.insight}</span>
    </div>
  </div>
);

const FullReport = ({ markdown }: { markdown: string }) => (
  <article className="prose prose-slate prose-lg max-w-none font-serif">
    <div className="whitespace-pre-wrap">{markdown}</div>
  </article>
);

// --- Main Application ---

const App = () => {
  const [view, setView] = useState<ViewState>("upload");
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setView("processing");
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Helper to read file as base64
      const readFileBase64 = (f: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:application/pdf;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
      };

      const base64Data = await readFileBase64(file);
      const mimeType = file.type || (file.name.endsWith('.md') ? 'text/plain' : 'application/pdf');

      // Define Schema
      const analysisSchema = {
        type: Type.OBJECT,
        properties: {
          metadata: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              genre: { type: Type.STRING },
              readingTime: { type: Type.STRING, description: "Estimated reading time for the document" }
            },
            required: ["title", "author", "genre", "readingTime"]
          },
          executiveSummary: { type: Type.STRING },
          keyConcepts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                definition: { type: Type.STRING },
                importance: { type: Type.INTEGER, description: "Relevance score 1-100" }
              },
              required: ["term", "definition", "importance"]
            }
          },
          chapterBreakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                insight: { type: Type.STRING, description: "One sentence critical takeaway" }
              },
              required: ["title", "summary", "insight"]
            }
          },
          topicStats: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                relevance: { type: Type.INTEGER, description: "1-100" }
              },
              required: ["topic", "relevance"]
            }
          },
          fullMarkdownReport: { 
            type: Type.STRING, 
            description: "A complete, well-formatted Markdown study note of the document." 
          }
        },
        required: ["metadata", "executiveSummary", "keyConcepts", "chapterBreakdown", "topicStats", "fullMarkdownReport"]
      };

      const parts = [
        {
          inlineData: {
            mimeType: mimeType === 'text/markdown' ? 'text/plain' : mimeType,
            data: base64Data
          }
        },
        {
          text: "Analyze this document thoroughly. Create a comprehensive reading note. Be analytical, identifying deep structures and arguments. Ensure the fullMarkdownReport is formatted beautifully with headers, lists, and bold text."
        }
      ];

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { role: "user", parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
        }
      });

      const responseText = result.text;
      if (!responseText) throw new Error("No content generated");
      
      const jsonResponse = JSON.parse(responseText) as AnalysisData;
      
      setData(jsonResponse);
      setView("dashboard");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process file.");
      setView("upload");
    }
  };

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([data.fullMarkdownReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.metadata.title.replace(/\s+/g, '_')}_Notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (view === "upload") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 font-sans">
         {error && (
           <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 border border-red-100">
             <AlertCircle size={20} />
             {error}
           </div>
         )}
         <FileUpload onFileSelect={handleFileSelect} />
      </div>
    );
  }

  if (view === "processing") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <ProcessingView />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 print:bg-white print:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 cursor-pointer" onClick={() => setView('upload')}>
            <BookOpen size={24} />
            <span className="font-serif font-bold text-xl text-slate-800">DeepRead</span>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => window.print()} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
               <Printer size={20} />
             </button>
             <button onClick={handleDownload} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors">
               <Download size={16} />
               <span>Export MD</span>
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        
        {/* Document Header Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 mb-8 print:shadow-none print:border-0">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full">
                  {data.metadata.genre}
                </span>
                <span className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                  <FileText size={12} />
                  {data.metadata.readingTime} read
                </span>
              </div>
              <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">{data.metadata.title}</h1>
              <p className="text-lg text-slate-500">by {data.metadata.author}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-xl max-w-md">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">Executive Summary</h4>
              <p className="text-slate-700 leading-relaxed text-sm">{data.executiveSummary}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 mb-8 bg-white p-1 rounded-xl border border-slate-200 w-max print:hidden shadow-sm">
          {[
            { id: 'overview', label: 'Overview', icon: List },
            { id: 'concepts', label: 'Key Concepts', icon: BrainCircuit },
            { id: 'visuals', label: 'Analytics', icon: BarChart2 },
            { id: 'full-report', label: 'Full Report', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DashboardTab)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Views */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {activeTab === 'overview' && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
               <h2 className="text-2xl font-serif font-bold text-slate-800 mb-8 flex items-center gap-2">
                 <List className="text-indigo-500" />
                 Structural Breakdown
               </h2>
               <div className="space-y-0">
                 {data.chapterBreakdown.map((chapter, idx) => (
                   <ChapterRow key={idx} chapter={chapter} index={idx} />
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'concepts' && (
            <div>
              <h2 className="text-2xl font-serif font-bold text-slate-800 mb-6">Core Concepts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.keyConcepts.map((concept, idx) => (
                  <ConceptCard key={idx} concept={concept} index={idx} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'visuals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                  <BarChart2 size={18} className="text-indigo-500"/>
                  Top Themes
                </h3>
                <BarChart data={data.topicStats.map(t => ({ label: t.topic, value: t.relevance }))} />
              </div>
              
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                  <BrainCircuit size={18} className="text-amber-500"/>
                  Concept Impact Distribution
                </h3>
                <div className="space-y-4">
                   {data.keyConcepts.slice(0,5).map((c, i) => (
                     <div key={i} className="flex items-center gap-4">
                        <div className="w-24 text-sm font-medium text-slate-600 truncate">{c.term}</div>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-400 rounded-full" 
                            style={{ width: `${c.importance}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-400 w-8">{c.importance}</div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'full-report' && (
             <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm print:border-0 print:shadow-none print:p-0">
               <FullReport markdown={data.fullMarkdownReport} />
             </div>
          )}

        </div>
      </main>
    </div>
  );
};

const rootElement = document.getElementById("app");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
