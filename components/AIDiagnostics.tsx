
import React, { useState, useEffect, useRef } from 'react';
import { CANFrame, SignalAnalysis } from '../types.ts';
import { analyzeCANData } from '../services/geminiService.ts';
import { AlertCircle, BrainCircuit, ExternalLink, Loader2, CheckCircle2, Unlock, Lock, ArrowDownToLine } from 'lucide-react';

interface AIDiagnosticsProps {
  currentFrames: CANFrame[];
}

const AIDiagnostics: React.FC<AIDiagnosticsProps> = ({ currentFrames }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SignalAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && analysis && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [analysis, autoScroll]);

  const handleAnalyze = async () => {
    if (currentFrames.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeCANData(currentFrames);
      setAnalysis(result);
    } catch (err) {
      setError("Failed to generate AI analysis. Please check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <div className="glass-panel border border-indigo-500/20 rounded-2xl p-6 flex flex-col h-full overflow-hidden max-h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-orbitron font-black text-white uppercase tracking-widest">Gemini_Insight</h2>
          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Tactical_Signal_Logic</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded border transition-all ${autoScroll ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}
            title={autoScroll ? "Disable Auto-Scroll" : "Enable Auto-Scroll"}
          >
            {autoScroll ? <Unlock size={12} /> : <Lock size={12} />}
          </button>
          <button
            onClick={handleAnalyze}
            disabled={loading || currentFrames.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-[9px] font-orbitron font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-lg shadow-indigo-500/10"
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            {analysis ? 'Re_Sync' : 'Analyze'}
          </button>
        </div>
      </div>

      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto pr-3 custom-scrollbar min-h-0 space-y-6 relative"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-500 text-[9px] font-orbitron font-black uppercase tracking-[0.3em] animate-pulse">Scanning_Patterns...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-400 font-medium">{error}</p>
          </div>
        )}

        {!loading && !analysis && !error && (
          <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center">
            <p className="text-slate-600 text-[9px] font-orbitron font-black uppercase tracking-widest max-w-[180px]">
              Establish_Hardware_Link_To_Analyze_Frames
            </p>
          </div>
        )}

        {analysis && !loading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 pb-6">
            <div>
              <h4 className="text-[9px] font-orbitron font-black text-slate-500 uppercase tracking-widest mb-3 border-l-2 border-emerald-500 pl-3">Detected_Protocols</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.detectedProtocols.map(p => (
                  <span key={p} className="px-3 py-1 bg-emerald-500/5 text-emerald-400 border border-emerald-500/20 rounded-md text-[9px] font-orbitron font-bold">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[9px] font-orbitron font-black text-slate-500 uppercase tracking-widest mb-3 border-l-2 border-indigo-500 pl-3">Signal_Summary</h4>
              <div className="text-[11px] text-slate-400 leading-relaxed font-mono bg-black/40 p-5 rounded-xl border border-white/5 whitespace-pre-wrap">
                {analysis.summary}
              </div>
            </div>

            {analysis.anomalies.length > 0 && (
              <div>
                <h4 className="text-[9px] font-orbitron font-black text-slate-500 uppercase tracking-widest mb-3 border-l-2 border-red-500 pl-3">Anomalies_Alert</h4>
                <div className="space-y-2">
                  {analysis.anomalies.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 text-[10px] text-red-400 bg-red-400/5 p-3 rounded-lg border border-red-400/20 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {analysis && !autoScroll && (
        <button 
          onClick={scrollToBottom}
          className="mt-2 flex items-center justify-center gap-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-orbitron font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest"
        >
          <ArrowDownToLine size={10} /> Scroll_to_latest
        </button>
      )}
    </div>
  );
};

export default AIDiagnostics;
