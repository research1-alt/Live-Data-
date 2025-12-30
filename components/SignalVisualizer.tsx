
import React, { useState, useMemo, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Label, ReferenceArea
} from 'recharts';
import { Search, Filter, Activity, Cpu, CheckCircle2, Zap, Maximize2, Minimize2, X, Square, CheckSquare, ArrowLeft, LayoutPanelLeft, Compass, RefreshCw, ZoomIn, Monitor, Lock, Unlock } from 'lucide-react';
import { ConversionLibrary } from '../types.ts';

interface DataPoint {
  time: number;
  [key: string]: number;
}

interface SignalVisualizerProps {
  logData: DataPoint[];
  availableSignals: string[];
  library: ConversionLibrary;
  fullMode?: boolean;
  onEnterFullScreen?: () => void;
  onExit?: () => void;
}

const SignalVisualizer: React.FC<SignalVisualizerProps> = ({ logData, availableSignals, library, fullMode = false, onEnterFullScreen, onExit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [liveSync, setLiveSync] = useState(true);
  
  // Zoom State
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [left, setLeft] = useState<number | string>('dataMin');
  const [right, setRight] = useState<number | string>('dataMax');

  // Handle Live Sync (Following Latest Data)
  useEffect(() => {
    if (liveSync && logData.length > 0) {
      const latestTime = logData[logData.length - 1].time;
      const windowSize = 10; // 10 second window
      setLeft(Math.max(0, latestTime - windowSize));
      setRight(latestTime);
    }
  }, [logData, liveSync]);

  const filteredSignalsList = useMemo(() => {
    return availableSignals.filter(s => 
      s.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort();
  }, [availableSignals, searchTerm]);

  const toggleSignal = (signal: string) => {
    setSelectedSignals(prev => 
      prev.includes(signal) 
        ? prev.filter(s => s !== signal) 
        : [...prev, signal]
    );
  };

  const zoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === null || refAreaLeft === null) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    setLiveSync(false); // Disable live sync when zooming manually

    let l = refAreaLeft;
    let r = refAreaRight;
    if (l > r) [l, r] = [r, l];

    setLeft(l);
    setRight(r);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  const zoomOut = () => {
    setLeft('dataMin');
    setRight('dataMax');
    setLiveSync(false);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#f97316'];

  const sidebarHeader = (
    <div className="flex flex-col gap-4 mb-8 shrink-0">
      <div className="flex items-center justify-between">
        <span className={`${fullMode ? 'text-sm' : 'text-[10px]'} font-orbitron font-black text-white tracking-[0.3em] uppercase whitespace-nowrap`}>Signal_Navigator</span>
        {fullMode && onExit && (
          <button 
            onClick={onExit}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 rounded-lg transition-all active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
          >
            <ArrowLeft size={12} />
          </button>
        )}
      </div>
      
      {/* Scroll Sync Toggle for Visualizer */}
      <button
        onClick={() => setLiveSync(!liveSync)}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[8px] font-orbitron font-black uppercase transition-all border ${
          liveSync ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-slate-800 border-white/5 text-slate-500'
        }`}
      >
        {liveSync ? <Unlock size={12} /> : <Lock size={12} />}
        {liveSync ? 'Live_Following_Enabled' : 'Live_Stream_Locked'}
      </button>
    </div>
  );

  const mainArea = (
    <div className={`flex flex-col h-full bg-transparent overflow-y-auto custom-scrollbar ${fullMode ? 'p-12' : ''}`}>
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,_var(--neon-indigo)_0%,_transparent_70%)]"></div>
      
      <div className="mb-6 flex items-center gap-4 relative z-10 shrink-0">
         <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
         <div className="text-[10px] font-orbitron font-black text-indigo-500/40 tracking-[0.8em] uppercase">Tactical_Telemetry_Overlay_Interface</div>
         <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
      </div>

      <div className="flex items-center justify-between mb-8 shrink-0 relative z-10">
        <div className="flex flex-col">
          <h3 className={`${fullMode ? 'text-3xl' : 'text-xl'} font-orbitron font-black text-white tracking-[0.1em] uppercase`}>
            MISSION_CRITICAL_TELEMETRY
          </h3>
          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">
            Active_HUD_Render_v2.4 {liveSync && <span className="text-indigo-400 ml-2 animate-pulse">[SYNC_ACTIVE]</span>}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {(left !== 'dataMin' || right !== 'dataMax' || !liveSync) && (
            <button 
              onClick={() => { zoomOut(); setLiveSync(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl transition-all shadow-lg active:scale-95"
            >
              <RefreshCw size={14} />
              <span className="text-[10px] font-orbitron font-black uppercase tracking-widest">Resume_Live</span>
            </button>
          )}

          {!fullMode && onEnterFullScreen && (
            <button 
              onClick={onEnterFullScreen}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl transition-all group active:scale-95 shadow-lg"
            >
              <Maximize2 size={14} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-orbitron font-black uppercase tracking-widest">Tactical_View</span>
            </button>
          )}
        </div>
      </div>

      <div className={`flex-1 min-h-[400px] bg-black/40 rounded-[32px] border border-white/5 shadow-2xl relative z-10 overflow-hidden`}>
        <div className="h-full w-full p-4 md:p-10 cursor-crosshair">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={logData} 
              margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
              onMouseDown={(e) => e && setRefAreaLeft(e.activeLabel ? Number(e.activeLabel) : null)}
              onMouseMove={(e) => e && refAreaLeft !== null && setRefAreaRight(e.activeLabel ? Number(e.activeLabel) : null)}
              onMouseUp={zoom}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.3} />
              <XAxis 
                dataKey="time" 
                stroke="#475569" 
                fontSize={fullMode ? 12 : 9} 
                type="number"
                domain={[left, right]}
                allowDataOverflow
                tickFormatter={(val) => `${val.toFixed(2)}s`}
              >
                <Label value="Time Index (seconds)" offset={-15} position="insideBottom" fill="#475569" fontSize={fullMode ? 12 : 9} />
              </XAxis>
              <YAxis 
                stroke="#475569" 
                fontSize={fullMode ? 12 : 9} 
                domain={['auto', 'auto']}
                width={70}
                allowDataOverflow
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '13px', color: '#fff', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }}
                itemStyle={{ fontWeight: 'bold' }}
                labelFormatter={(val) => `Sync: ${Number(val).toFixed(4)}s`}
              />
              <Legend verticalAlign="top" height={60} wrapperStyle={{ fontSize: fullMode ? '16px' : '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em', paddingBottom: '20px' }} />
              
              {selectedSignals.map((sig, idx) => (
                <Line
                  key={sig}
                  type="linear" 
                  dataKey={sig}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={fullMode ? 4 : 2}
                  dot={{ r: fullMode ? 4 : 2, fill: colors[idx % colors.length], strokeWidth: 0 }}
                  activeDot={{ r: 8, strokeWidth: 0, fill: colors[idx % colors.length] }}
                  connectNulls={true}
                  animationDuration={0}
                />
              ))}

              {refAreaLeft !== null && refAreaRight !== null ? (
                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.4} fill="#6366f1" fillOpacity={0.15} />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // Define signalMatrix to fix "Cannot find name 'signalMatrix'" errors
  const signalMatrix = (
    <div className={`flex flex-col h-full ${fullMode ? 'bg-[#0a0f1e] border-r border-white/5 p-8' : ''}`}>
      {sidebarHeader}
      
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={14} className="text-slate-500" />
        </div>
        <input 
          type="text" 
          placeholder="SEARCH_LOGIC..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-[10px] font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all uppercase tracking-widest"
        />
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
        <div className="flex items-center justify-between px-2 mb-4">
          <span className="text-[8px] font-orbitron font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Compass size={12} className="text-indigo-500" /> Signal_Matrix
          </span>
          <span className="text-[8px] font-orbitron font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {selectedSignals.length}/{availableSignals.length}
          </span>
        </div>

        {filteredSignalsList.map((sig) => {
          const isSelected = selectedSignals.includes(sig);
          const idx = availableSignals.indexOf(sig);
          const color = colors[idx % colors.length];

          return (
            <button
              key={sig}
              onClick={() => toggleSignal(sig)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group border ${
                isSelected 
                  ? 'bg-indigo-500/10 border-indigo-500/30' 
                  : 'bg-transparent border-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full border-2 border-slate-700 shrink-0 flex items-center justify-center transition-all"
                  style={{ 
                    borderColor: isSelected ? color : undefined,
                    backgroundColor: isSelected ? color : undefined 
                  }}
                >
                  {isSelected && <div className="w-1 h-1 bg-white rounded-full"></div>}
                </div>
                <span className={`text-[10px] font-black tracking-tight uppercase transition-colors ${
                  isSelected ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'
                }`}>
                  {sig.replace(/_/g, ' ')}
                </span>
              </div>
              
              {isSelected && (
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }}></div>
              )}
            </button>
          );
        })}
        
        {filteredSignalsList.length === 0 && (
          <div className="text-center py-12 opacity-30">
             <Filter size={24} className="mx-auto mb-2 text-slate-600" />
             <p className="text-[8px] font-orbitron font-black uppercase tracking-widest text-slate-500">NO_MATCHES_FOUND</p>
          </div>
        )}
      </div>
    </div>
  );

  if (fullMode) {
    return (
      <div className="h-full w-full flex overflow-hidden bg-[#020617] animate-in fade-in duration-500">
        <div className="w-80 h-full shrink-0">
          {signalMatrix}
        </div>
        <div className="flex-1 h-full overflow-hidden relative">
          {mainArea}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 h-full bg-transparent overflow-hidden">
      <div className="col-span-12 lg:col-span-3 p-4 border-r border-white/5 overflow-hidden flex flex-col min-h-[400px]">
        {signalMatrix}
      </div>
      <div className="col-span-12 lg:col-span-9 p-4 flex flex-col overflow-hidden relative">
        {availableSignals.length === 0 ? (
           <div className="h-full w-full flex flex-col items-center justify-center text-center p-12">
              <div className="w-16 h-16 rounded-full bg-red-500/5 flex items-center justify-center mb-6 border border-red-500/10">
                 <Zap size={32} className="text-red-500/40" />
              </div>
              <h4 className="text-xl font-orbitron font-black text-white uppercase mb-2">No_Mapped_Signals</h4>
              <p className="text-slate-500 text-[10px] max-w-sm leading-relaxed uppercase tracking-widest">
                 Verify DBC profiles. No valid signals identified in this telemetry stream.
              </p>
           </div>
        ) : selectedSignals.length > 0 ? (
          mainArea
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/5 rounded-3xl overflow-y-auto custom-scrollbar">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
              <Activity size={24} className="text-indigo-400 animate-pulse" />
            </div>
            <h4 className="text-sm font-orbitron font-black text-white uppercase mb-2 tracking-widest">Overlay_Inactive</h4>
            <p className="text-slate-600 text-[10px] uppercase font-bold tracking-widest">Select target signals from the navigator to project telemetry data.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalVisualizer;
