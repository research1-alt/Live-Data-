
import React, { useState, useEffect, useRef } from 'react';
import { CANFrame, ConversionLibrary } from '../types.ts';
import { Terminal, Lock, Unlock, RefreshCw, Clock, Timer } from 'lucide-react';

interface CANMonitorProps {
  frames: CANFrame[];
  isPaused: boolean;
  library: ConversionLibrary;
  onClearTrace?: () => void;
}

const CANMonitor: React.FC<CANMonitorProps> = ({ frames, isPaused, onClearTrace }) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [timeMode, setTimeMode] = useState<'relative' | 'absolute'>('relative');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && !isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [frames, isPaused, autoScroll]);

  const handleReload = () => {
    setIsResetting(true);
    onClearTrace?.();
    setTimeout(() => setIsResetting(false), 800);
  };

  const headerLine = ";---+--  ---+----  ---+--  ---------+--  -+- +- +- -- -- -- -- -- -- -- --";

  const renderClassicHeaders = () => (
    <div className="sticky top-0 bg-black z-30 pt-4 pb-2 select-none font-mono text-[13px] text-[#888] whitespace-pre border-b border-white/10">
      <div className="mb-0.5">;   Message   Time      Type ID              Rx/Tx</div>
      <div className="mb-0.5">{";   Number    " + (timeMode === 'relative' ? 'Offset    ' : 'System    ') + "|    [hex]           |  Data Length"}</div>
      <div className="mb-0.5">;   |         [ms]      |    |               |  |  Data [hex] ...</div>
      <div className="mb-0.5">;   |         |         |    |               |  |  | </div>
      <div>{headerLine}</div>
    </div>
  );

  const formatClassicRow = (frame: CANFrame, index: number) => {
    const msgNum = (index + 1).toString().padStart(7, ' ');
    const timeStr = (timeMode === 'relative' ? frame.timestamp.toFixed(3) : new Date(frame.absoluteTimestamp).toLocaleTimeString('en-GB', { hour12: false }) + "." + new Date(frame.absoluteTimestamp).getMilliseconds()).padStart(8, ' ');
    const type = "DT".padStart(6, ' ');
    const id = frame.id.toUpperCase().padStart(12, ' ');
    const rxtx = frame.direction.padStart(3, ' ');
    const dlc = frame.dlc.toString().padStart(2, ' ');
    const dataBytes = " " + frame.data.map(d => d.padStart(2, '0')).join(' ');

    return (
      <div key={frame.absoluteTimestamp + "-" + index} className="flex hover:bg-white/5 transition-colors leading-tight h-5 items-center font-mono text-[13px] text-[#f0f0f0] whitespace-pre">
        {" " + msgNum + "  " + timeStr + "  " + type + "  " + id + "  " + rxtx + " " + dlc + " " + dataBytes}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] rounded-xl overflow-hidden border border-white/10 shadow-2xl relative">
      <div className="bg-[#1a1a1a] px-6 py-2 flex justify-between items-center border-b border-white/5 shrink-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded border border-white/5 text-[9px] font-orbitron font-black text-indigo-400">
            <Terminal size={10} /> PCAN_TRACE_CLASSIC_V2.0
          </div>
          <button onClick={() => setTimeMode(timeMode === 'relative' ? 'absolute' : 'relative')} className="flex items-center gap-2 px-3 py-1 rounded text-[8px] font-orbitron font-black uppercase transition-all border bg-slate-800 border-white/5 text-slate-300 hover:border-indigo-500/50">
            {timeMode === 'relative' ? <Timer size={10} /> : <Clock size={10} />}
            {timeMode === 'relative' ? 'RELATIVE_MODE' : 'SYSTEM_TIME_MODE'}
          </button>
          <button onClick={() => setAutoScroll(!autoScroll)} className={`flex items-center gap-2 px-3 py-1 rounded text-[8px] font-orbitron font-black uppercase transition-all border ${autoScroll ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
            {autoScroll ? <Unlock size={10} /> : <Lock size={10} />}
            {autoScroll ? 'AUTO_SCROLL' : 'SCROLL_LOCK'}
          </button>
          <button onClick={handleReload} className={`flex items-center gap-2 px-3 py-1 rounded text-[8px] font-orbitron font-black uppercase transition-all border active:scale-95 ${isResetting ? 'bg-red-500 text-white border-red-400' : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400'}`} disabled={isResetting}>
            <RefreshCw size={10} className={isResetting ? "animate-spin" : ""} />
            {isResetting ? 'RESTARTING...' : 'RELOAD'}
          </button>
        </div>
        <div className="text-[8px] font-orbitron font-black text-slate-500 uppercase tracking-[0.3em] hidden md:flex items-center gap-2"><Clock size={10} className="text-indigo-500" /> SYNCED_TO_PCAN_V5</div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-black font-mono">
        <div className="p-4 min-w-[1000px] text-[#cccccc] relative h-full">
          {renderClassicHeaders()}
          <div className="pt-2 space-y-0.5 pb-8 overflow-y-visible">
            {!isResetting && frames.map((frame, idx) => formatClassicRow(frame, idx))}
          </div>
        </div>
        {(frames.length === 0 || isResetting) && !isPaused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 pointer-events-none">
             <div className="relative mb-6"><div className="w-16 h-16 border-2 border-dashed border-indigo-500/40 rounded-full animate-spin"></div><Terminal size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500/40" /></div>
            <p className="text-[10px] font-orbitron font-black text-indigo-400 uppercase tracking-[0.4em]">{isResetting ? 'RELOADING_HARDWARE_CHANNEL' : 'WAITING_FOR_DATA_PACKETS'}</p>
          </div>
        )}
      </div>
      <div className="bg-[#111] px-6 py-1.5 border-t border-white/5 flex justify-between items-center text-[8px] font-orbitron font-black text-slate-600 uppercase tracking-widest shrink-0">
        <div className="flex gap-4"><span>Display: PCAN_VIEW_2.0_COMPLIANT</span><span>Col_Width: FIXED_GRID</span></div>
      </div>
    </div>
  );
};

export default CANMonitor;
