
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Database, Plus, Trash2, RefreshCw, Box, Settings2, ArrowUpToLine, ArrowDownToLine, Zap, Activity, Info, Lock, Unlock } from 'lucide-react';
import { ConversionLibrary, DBCMessage, DBCSignal, CANFrame } from '../types.ts';
import { MY_CUSTOM_DBC } from '../data/dbcProfiles.ts';
import { decToHex, normalizeId, decodeSignal } from '../utils/decoder.ts';

interface LibraryPanelProps {
  library: ConversionLibrary;
  onUpdateLibrary: (lib: ConversionLibrary) => void;
  frames: CANFrame[];
}

const LibraryPanel: React.FC<LibraryPanelProps> = ({ library, onUpdateLibrary, frames }) => {
  const [syncing, setSyncing] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // Map of normalized frame IDs to their latest data
  const latestFramesMap = useMemo(() => {
    const map = new Map<string, CANFrame>();
    frames.forEach(f => {
      map.set(normalizeId(f.id), f);
    });
    return map;
  }, [frames]);

  // Filter DBC database based on signal names and live availability
  const activeDBCMessages = useMemo(() => {
    const active: Array<{ id: string, message: DBCMessage }> = [];
    
    (Object.entries(library.database) as [string, DBCMessage][]).forEach(([decId, message]) => {
      const normDbcId = normalizeId(decId);
      const hexId = decToHex(decId);
      
      // Check if any signal name matches the search term
      const hasMatchingSignal = Object.values(message.signals).some(sig => 
        sig.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      // Check if the Hex ID matches the search term
      const matchesHex = hexId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isVisible = searchTerm === '' || hasMatchingSignal || matchesHex;
      
      if (latestFramesMap.has(normDbcId) && isVisible) {
        active.push({ id: decId, message });
      }
    });
    return active.sort((a, b) => normalizeId(a.id).localeCompare(normalizeId(b.id)));
  }, [library.database, latestFramesMap, searchTerm]);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [activeDBCMessages, autoScroll]);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      onUpdateLibrary({ 
        ...library, 
        database: { ...library.database, ...MY_CUSTOM_DBC }, 
        lastUpdated: Date.now() 
      });
      setSyncing(false);
    }, 600);
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] rounded-xl overflow-hidden border border-white/10 shadow-2xl relative">
      <div className="bg-[#1a1a1a] px-6 py-3 flex justify-between items-center border-b border-white/5 shrink-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded border border-white/5 text-[9px] font-orbitron font-black text-indigo-400">
            <Database size={10} /> DECRYPTION_DATABASE
          </div>
          
          <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
          
          <input 
            type="text" 
            placeholder="FILTER_SIGNALS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-md px-3 py-1 text-[9px] font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 w-48 uppercase tracking-widest"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[8px] font-orbitron font-black uppercase transition-all border ${
              autoScroll ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' : 'bg-slate-800 border-white/5 text-slate-500'
            }`}
          >
            {autoScroll ? <Unlock size={10} /> : <Lock size={10} />}
            {autoScroll ? 'FOLLOWING' : 'LOCKED'}
          </button>
          
          <button 
            onClick={handleSync}
            className={`p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded border border-indigo-500/30 text-indigo-400 transition-all ${syncing ? 'animate-spin' : ''}`}
            title="Reload DBC definitions"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0 bg-black"
      >
        {activeDBCMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-24">
            <Box className="w-16 h-16 text-slate-700 mb-6" />
            <h4 className="text-[12px] font-orbitron font-black text-slate-500 uppercase tracking-[0.3em]">No_Mapped_Telemetery_Detected</h4>
            <p className="text-[9px] text-slate-600 font-bold uppercase mt-2 max-w-sm">Waiting for packets matching current DBC database definitions...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeDBCMessages.map(({ id, message }) => {
              const normDbcId = normalizeId(id);
              const hexDisplay = decToHex(id);
              const latestFrame = latestFramesMap.get(normDbcId);
              
              // Filter signals within the message card based on the search term
              const filteredSignals = Object.values(message.signals).filter(sig => 
                searchTerm === '' || 
                sig.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                hexDisplay.toLowerCase().includes(searchTerm.toLowerCase())
              );

              return (
                <div key={id} className="group p-5 bg-[#111] border border-white/5 rounded-2xl transition-all shadow-xl hover:border-indigo-500/40 flex flex-col animate-frame">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                        <Activity className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-indigo-400 block leading-none">{hexDisplay}</span>
                        <span className="text-[11px] font-orbitron font-black text-white uppercase tracking-wider block mt-1.5">{message.name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[7px] bg-slate-800 border border-white/10 px-2 py-0.5 rounded text-slate-300 font-black">DLC_{message.dlc}</span>
                      {latestFrame && (
                        <span className="text-[8px] text-emerald-500 font-mono font-bold uppercase tracking-tighter">{(latestFrame.timestamp / 1000).toFixed(3)}s</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    {filteredSignals.map((sig: DBCSignal) => {
                      const liveValue = latestFrame ? decodeSignal(latestFrame.data, sig) : "---";
                      return (
                        <div key={sig.name} className="flex items-center justify-between group/sig bg-black/40 p-3 rounded-xl border border-white/5 hover:bg-slate-900 transition-colors">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-tight">{sig.name}</span>
                            <span className="text-[7px] text-slate-600 font-mono italic">
                              {sig.unit ? sig.unit : 'RAW'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[14px] font-orbitron font-black text-emerald-400 glow-text-emerald">
                              {liveValue}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-[#111] px-6 py-2 border-t border-white/5 flex justify-between items-center text-[8px] font-orbitron font-black text-slate-600 uppercase tracking-widest shrink-0">
        <div className="flex gap-4">
          <span>Databank: {library.name}</span>
          <span>Active_Links: {activeDBCMessages.length}</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
           TELEMETRY_SYNC_OK
        </div>
      </div>
    </div>
  );
};

export default LibraryPanel;
