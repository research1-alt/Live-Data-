
import React, { useState, useMemo, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Label, ReferenceArea, Brush
} from 'recharts';
import { Search, Filter, Activity, Maximize2, RefreshCw, Compass, Unlock, Lock, GripVertical, ZoomIn, ZoomOut } from 'lucide-react';
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
  navigatorWidth?: number;
  onResizeNav?: () => void;
  onEnterFullScreen?: () => void;
  onExit?: () => void;
}

const SignalVisualizer: React.FC<SignalVisualizerProps> = ({ 
  logData, 
  availableSignals, 
  fullMode = false, 
  navigatorWidth = 320,
  onResizeNav,
  onEnterFullScreen, 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [liveSync, setLiveSync] = useState(true);
  
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [left, setLeft] = useState<number | string>('dataMin');
  const [right, setRight] = useState<number | string>('dataMax');

  // Handle live following vs static view
  useEffect(() => {
    if (liveSync && logData.length > 0) {
      const latestTime = logData[logData.length - 1].time;
      const windowSize = 10;
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

  const handleZoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === null || refAreaLeft === null) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }
    setLiveSync(false);
    let l = refAreaLeft;
    let r = refAreaRight;
    if (l > r) [l, r] = [r, l];
    setLeft(l);
    setRight(r);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  const resetZoom = () => {
    setLeft('dataMin');
    setRight('dataMax');
    setLiveSync(false);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  // Professional color palette for trace tools
  const colors = [
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#ef4444', // Red
    '#f97316', // Orange
    '#a855f7', // Purple
    '#14b8a6', // Teal
  ];

  const signalMatrix = (
    <div className={`flex flex-col h-full bg-[#0a0f1e]/90 border-r border-white/5 relative`} style={{ width: `${navigatorWidth}px` }}>
      <div className="p-6 pb-4 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-orbitron font-black text-white tracking-[0.3em] uppercase whitespace-nowrap">SIGNAL_NAVIGATOR</span>
        </div>
        
        <button
          onClick={() => {
            setLiveSync(!liveSync);
            if (!liveSync) resetZoom();
          }}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[8px] font-orbitron font-black uppercase transition-all border ${
            liveSync ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-800 border-white/5 text-slate-500'
          }`}
        >
          {liveSync ? <Unlock size={12} /> : <Lock size={12} />}
          {liveSync ? 'Live_Following_Active' : 'Data_Stream_Locked'}
        </button>

        <div className="relative">
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
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-2 pb-12">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[8px] font-orbitron font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Compass size={12} className="text-indigo-500" /> SIGNAL_MATRIX
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
                  ? 'bg-indigo-500/10 border-indigo-500/30 shadow-inner' 
                  : 'bg-transparent border-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div 
                  className="w-3.5 h-3.5 rounded-full border-2 border-slate-700 shrink-0 flex items-center justify-center transition-all"
                  style={{ 
                    borderColor: isSelected ? color : undefined,
                    backgroundColor: isSelected ? color : 'transparent' 
                  }}
                >
                  {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm"></div>}
                </div>
                <span className={`text-[10px] font-black tracking-tight uppercase truncate transition-colors ${
                  isSelected ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'
                }`}>
                  {sig.replace(/_/g, ' ')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      
      {fullMode && onResizeNav && (
        <div 
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-50 flex items-center justify-center group"
          onMouseDown={(e) => { e.stopPropagation(); onResizeNav(); }}
        >
          <GripVertical size={12} className="text-slate-800 opacity-0 group-hover:opacity-100" />
        </div>
      )}
    </div>
  );

  const mainArea = (
    <div className={`flex flex-col h-full bg-transparent overflow-hidden ${fullMode ? 'p-8 pb-12' : ''}`}>
      <div className="mb-4 flex items-center gap-4 relative z-10 shrink-0">
         <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
         <div className="text-[10px] font-orbitron font-black text-indigo-500/40 tracking-[0.8em] uppercase">TACTICAL_SIGNAL_PROJECTOR</div>
         <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
      </div>

      <div className="flex items-center justify-between mb-4 shrink-0 relative z-10">
        <h3 className={`${fullMode ? 'text-2xl' : 'text-xl'} font-orbitron font-black text-white tracking-[0.1em] uppercase truncate pr-4`}>
          MISSION_CRITICAL_TELEMETRY
        </h3>

        <div className="flex items-center gap-3 shrink-0">
          {(left !== 'dataMin' || right !== 'dataMax' || !liveSync) && (
            <button 
              onClick={() => { resetZoom(); setLiveSync(true); }} 
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-[9px] font-orbitron font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
            >
              <RefreshCw size={12} /> Resume_Live_Stream
            </button>
          )}

          {!fullMode && onEnterFullScreen && (
            <button 
              onClick={onEnterFullScreen} 
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl text-[9px] font-orbitron font-black uppercase tracking-widest transition-all group active:scale-95 shadow-lg"
            >
              <Maximize2 size={12} className="group-hover:scale-110 transition-transform" /> Full_HUD_Mode
            </button>
          )}
        </div>
      </div>

      <div className={`flex-1 min-h-0 bg-black/60 rounded-[32px] border border-white/5 shadow-2xl relative z-10 overflow-hidden`}>
        <div className="absolute top-4 right-6 z-20 flex gap-2">
            <div className="px-3 py-1.5 bg-black/80 border border-white/10 rounded-lg text-[8px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ZoomIn size={10} /> Drag region to Zoom
            </div>
        </div>

        <div className="h-full w-full p-4 md:p-8 cursor-crosshair">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={logData} 
              margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
              onMouseDown={(e) => e && setRefAreaLeft(e.activeLabel ? Number(e.activeLabel) : null)}
              onMouseMove={(e) => e && refAreaLeft !== null && setRefAreaRight(e.activeLabel ? Number(e.activeLabel) : null)}
              onMouseUp={handleZoom}
            >
              <CartesianGrid strokeDasharray="2 4" stroke="#ffffff" vertical={false} opacity={0.05} />
              <XAxis 
                dataKey="time" 
                stroke="#475569" 
                fontSize={9} 
                type="number" 
                domain={[left, right]} 
                allowDataOverflow 
                tickFormatter={(val) => `${val.toFixed(2)}s`}
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={9} 
                domain={['auto', 'auto']} 
                width={55} 
                allowDataOverflow 
                tick={{ fill: '#64748b' }}
              />
              <Tooltip 
                contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: '1px solid rgba(99, 102, 241, 0.3)', 
                    borderRadius: '16px', 
                    fontSize: '11px', 
                    color: '#fff',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
                itemStyle={{ padding: '2px 0' }}
                labelFormatter={(val) => `Time: ${Number(val).toFixed(4)}s`}
              />
              <Legend 
                verticalAlign="top" 
                height={40} 
                iconType="circle"
                wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em', paddingBottom: '20px' }} 
              />
              
              {selectedSignals.map((sig, idx) => (
                <Line 
                  key={sig} 
                  type="monotone" 
                  dataKey={sig} 
                  stroke={colors[idx % colors.length]} 
                  strokeWidth={2} 
                  dot={{ r: 2, strokeWidth: 1, fill: colors[idx % colors.length] }} 
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                  connectNulls={true} 
                  animationDuration={300} 
                  isAnimationActive={!liveSync}
                />
              ))}

              {refAreaLeft !== null && refAreaRight !== null ? (
                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.4} fill="#6366f1" fillOpacity={0.15} />
              ) : null}

              {/* Navigator Brush for easy scrolling and coarse zooming */}
              {selectedSignals.length > 0 && (
                <Brush 
                  dataKey="time" 
                  height={30} 
                  stroke="#6366f1" 
                  fill="#020617" 
                  gap={10} 
                  startIndex={0}
                  travellerWidth={10}
                  tickFormatter={() => ''}
                  className="custom-brush"
                >
                  <LineChart>
                    {selectedSignals.slice(0, 1).map((sig, idx) => (
                      <Line key={`brush-${sig}`} type="monotone" dataKey={sig} stroke="#6366f1" dot={false} strokeWidth={1} />
                    ))}
                  </LineChart>
                </Brush>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  if (fullMode) {
    return (
      <div className="h-full w-full flex overflow-hidden bg-[#020617] animate-in fade-in duration-700">
        {signalMatrix}
        <div className="flex-1 h-full overflow-hidden relative">
          {mainArea}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 h-full bg-transparent overflow-hidden">
      <div className="col-span-12 lg:col-span-3 h-full overflow-hidden flex flex-col">
        {signalMatrix}
      </div>
      <div className="col-span-12 lg:col-span-9 h-full flex flex-col overflow-hidden relative">
        {selectedSignals.length > 0 ? mainArea : (
          <div className="h-full w-full flex flex-col items-center justify-center text-center p-12 opacity-40">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                <Activity size={48} className="text-indigo-400 relative z-10" />
            </div>
            <p className="text-[12px] font-orbitron font-black text-white uppercase tracking-[0.5em]">SELECT_SIGNAL_TO_PROJECT_HUD</p>
            <p className="text-[9px] font-mono text-slate-600 mt-4 uppercase tracking-widest">Awaiting signal allocation from matrix navigator...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalVisualizer;
