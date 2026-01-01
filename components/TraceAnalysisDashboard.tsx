
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CANFrame, ConversionLibrary, DBCMessage, DBCSignal } from '../types.ts';
import { normalizeId, decodeSignal } from '../utils/decoder.ts';
import SignalVisualizer from './SignalVisualizer.tsx';
import { ChevronRight, ChevronDown, Activity, BarChart3, TrendingUp, Crosshair, GripVertical } from 'lucide-react';

interface TraceAnalysisDashboardProps {
  frames: CANFrame[];
  library: ConversionLibrary;
}

const TraceAnalysisDashboard: React.FC<TraceAnalysisDashboardProps> = ({ frames, library }) => {
  const [selectedSignalNames, setSelectedSignalNames] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  
  // Resizing States
  const [leftWidth, setLeftWidth] = useState(280);
  const [navWidth, setNavWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(320);
  
  const isResizingRef = useRef<'left' | 'nav' | 'right' | null>(null);

  // Dragging logic for column resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      
      if (isResizingRef.current === 'left') {
        setLeftWidth(Math.max(200, Math.min(500, e.clientX)));
      } else if (isResizingRef.current === 'nav') {
        const newWidth = e.clientX - leftWidth;
        setNavWidth(Math.max(200, Math.min(500, newWidth)));
      } else if (isResizingRef.current === 'right') {
        const newWidth = window.innerWidth - e.clientX;
        setRightWidth(Math.max(200, Math.min(500, newWidth)));
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = null;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [leftWidth]);

  const startResizing = (side: 'left' | 'nav' | 'right') => {
    isResizingRef.current = side;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const plotData = useMemo(() => {
    const signalMap = new Map<string, { msg: DBCMessage; signals: DBCSignal[] }>();
    Object.values(library.database).forEach(msg => {
      const id = normalizeId(Object.keys(library.database).find(key => library.database[key] === msg));
      signalMap.set(id, { msg, signals: Object.values(msg.signals) });
    });

    return frames.map(f => {
      const data: any = { time: f.timestamp / 1000 };
      const normId = normalizeId(f.id);
      const mapping = signalMap.get(normId);
      
      if (mapping) {
        mapping.signals.forEach(sig => {
          const valStr = decodeSignal(f.data, sig);
          const valNum = parseFloat(valStr);
          if (!isNaN(valNum)) {
            data[sig.name] = valNum;
          }
        });
      }
      return data;
    });
  }, [frames, library]);

  const signalGroups = useMemo(() => {
    const groups: Array<{ id: string; name: string; signals: string[] }> = [];
    Object.entries(library.database).forEach(([id, msg]) => {
      groups.push({ id, name: msg.name, signals: Object.keys(msg.signals) });
    });
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }, [library]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const toggleSignal = (name: string) => {
    setSelectedSignalNames(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  };

  const stats = useMemo(() => {
    if (selectedSignalNames.length === 0 || plotData.length === 0) return null;
    const activeSignal = selectedSignalNames[0];
    const values = plotData.map(d => d[activeSignal]).filter(v => v !== undefined);
    if (values.length === 0) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const delta = max - min;
    const rms = Math.sqrt(values.reduce((a, b) => a + b * b, 0) / values.length);
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length);

    return {
      name: activeSignal,
      firstTimestamp: plotData[0].time,
      lastTimestamp: plotData[plotData.length - 1].time,
      min, max, avg, delta, rms, std,
      count: values.length
    };
  }, [selectedSignalNames, plotData]);

  return (
    <div className="flex h-full w-full bg-[#020617] overflow-hidden">
      {/* Column 1: Internal File Structure */}
      <div 
        className="flex flex-col bg-slate-950/50 shrink-0 border-r border-white/5 relative"
        style={{ width: `${leftWidth}px` }}
      >
        <div className="p-4 border-b border-white/5 bg-slate-900/20 shrink-0">
          <h3 className="text-[10px] font-orbitron font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <Activity size={14} /> INTERNAL_FILE_STRUCTURE
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <div className="mb-4">
             <span className="text-[9px] font-bold text-slate-500 uppercase px-2 mb-2 block">Channels</span>
             {signalGroups.map(group => (
               <div key={group.id} className="mb-1">
                 <button 
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded text-left transition-colors group"
                 >
                   {expandedGroups.includes(group.id) ? <ChevronDown size={14} className="text-slate-600" /> : <ChevronRight size={14} className="text-slate-600" />}
                   <span className="text-[10px] font-bold text-slate-300 group-hover:text-white uppercase truncate">
                     {group.name} (CAN_{group.id.slice(-1)})
                   </span>
                 </button>
                 {expandedGroups.includes(group.id) && (
                   <div className="ml-6 space-y-1 mt-1 border-l border-white/5 pl-2">
                     {group.signals.map(sig => (
                       <button 
                        key={sig}
                        onClick={() => toggleSignal(sig)}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left text-[9px] transition-all ${selectedSignalNames.includes(sig) ? 'text-indigo-400 bg-indigo-500/10 font-black' : 'text-slate-500 hover:text-slate-300 font-medium'}`}
                       >
                         <div className={`w-2 h-2 rounded-sm border ${selectedSignalNames.includes(sig) ? 'bg-indigo-500 border-indigo-400' : 'border-slate-700'}`} />
                         {sig}
                       </button>
                     ))}
                   </div>
                 )}
               </div>
             ))}
          </div>
        </div>
        
        {/* Resize Handle Left */}
        <div 
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-50 flex items-center justify-center group"
          onMouseDown={() => startResizing('left')}
        >
          <GripVertical size={12} className="text-slate-800 opacity-0 group-hover:opacity-100" />
        </div>
      </div>

      {/* Column 2 & 3: Signal Navigator + Graph (Wrapped in Visualizer) */}
      <div className="flex-1 flex min-w-0 bg-[#0c0c0c] relative overflow-hidden">
         <SignalVisualizer 
            logData={plotData}
            availableSignals={selectedSignalNames}
            library={library}
            fullMode={true}
            navigatorWidth={navWidth}
            onResizeNav={() => startResizing('nav')}
          />
      </div>

      {/* Column 4: Telemetry Analytics */}
      <div 
        className="flex flex-col bg-slate-950/50 shrink-0 border-l border-white/5 relative"
        style={{ width: `${rightWidth}px` }}
      >
        {/* Resize Handle Right */}
        <div 
          className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-emerald-500/50 transition-colors z-50 flex items-center justify-center group"
          onMouseDown={() => startResizing('right')}
        >
          <GripVertical size={12} className="text-slate-800 opacity-0 group-hover:opacity-100" />
        </div>

        <div className="p-4 border-b border-white/5 bg-slate-900/20 shrink-0">
          <h3 className="text-[10px] font-orbitron font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={14} /> TELEMETRY_ANALYTICS
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {stats ? (
            <>
              <section>
                <div className="flex items-center gap-2 mb-4 text-white">
                  <TrendingUp size={16} className="text-emerald-500" />
                  <h4 className="text-[12px] font-orbitron font-black uppercase truncate">{stats.name}</h4>
                </div>
                
                <div className="space-y-4">
                  <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Selected Range</span>
                  <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-2 font-mono text-[10px]">
                    <div className="flex justify-between"><span className="text-slate-500">First Timestamp</span><span className="text-white">{stats.firstTimestamp.toFixed(6)} s</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Last Timestamp</span><span className="text-white">{stats.lastTimestamp.toFixed(6)} s</span></div>
                    <div className="flex justify-between border-t border-white/5 pt-2"><span className="text-slate-500">Min</span><span className="text-emerald-400 font-bold">{stats.min.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Max</span><span className="text-emerald-400 font-bold">{stats.max.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Average</span><span className="text-white">{stats.avg.toFixed(6)}</span></div>
                    <div className="flex justify-between border-t border-white/5 pt-2"><span className="text-slate-500 font-bold">Δ Delta</span><span className="text-amber-400 font-bold">{stats.delta.toFixed(2)}</span></div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-24">
              <Crosshair className="w-12 h-12 text-slate-700 mb-4" />
              <p className="text-[9px] font-orbitron font-black text-slate-500 uppercase tracking-widest">Select Signal to Project Stats</p>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 w-full h-10 border-t border-white/5 flex items-center px-6 justify-between text-[8px] font-orbitron font-black text-slate-600 uppercase tracking-widest bg-black/40 pointer-events-none">
         <div className="flex gap-6">
            <span>t1 = {plotData[0]?.time.toFixed(6)}s</span>
            <span>t2 = {plotData[plotData.length-1]?.time.toFixed(6)}s</span>
         </div>
         <div>Δt = {(plotData[plotData.length-1]?.time - plotData[0]?.time || 0).toFixed(6)}s</div>
      </div>
    </div>
  );
};

export default TraceAnalysisDashboard;
