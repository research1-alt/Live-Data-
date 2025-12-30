
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Home, Play, Pause, RefreshCw, MonitorPlay, Cpu, ShieldCheck, Terminal, ArrowLeft, Link as LinkIcon, Download, FileUp, CircleSlash, Loader2, Database, LayoutPanelLeft, Activity, Zap } from 'lucide-react';
import CANMonitor from './components/CANMonitor.tsx';
import ConnectionPanel from './components/ConnectionPanel.tsx';
import LibraryPanel from './components/LibraryPanel.tsx';
import { CANFrame, ConnectionStatus, HardwareStatus, ConversionLibrary } from './types.ts';
import { MY_CUSTOM_DBC, DEFAULT_LIBRARY_NAME } from './data/dbcProfiles.ts';

type AppView = 'home' | 'hardware' | 'live';
type DashboardTab = 'trace' | 'library';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('trace');
  const [frames, setFrames] = useState<CANFrame[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<ConnectionStatus>('disconnected');
  const [hwStatus, setHwStatus] = useState<HardwareStatus>('offline');
  const [bridgeUrl, setBridgeUrl] = useState(() => localStorage.getItem('pcan_bridge_url') || 'ws://localhost:9000');
  const [baudRate, setBaudRate] = useState(500000);
  const [pps, setPps] = useState(0);
  const [isLogMode, setIsLogMode] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const [library, setLibrary] = useState<ConversionLibrary>({
    id: 'default-pcan-lib',
    name: DEFAULT_LIBRARY_NAME,
    database: MY_CUSTOM_DBC,
    lastUpdated: Date.now(),
  });
  
  const restartingRef = useRef(false);
  const sessionStartTimeRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const ppsCounterRef = useRef(0);
  const lastFrameTimeRef = useRef<Record<string, number>>({});
  const messageCountsRef = useRef<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const simIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPps(ppsCounterRef.current);
      ppsCounterRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNewFrame = useCallback((id: string, dlc: number, data: string[], simulated = false) => {
    if (isPaused || restartingRef.current) return;

    if (!id || id === '0x0' || id === '0') return;

    const perfNow = performance.now();
    const wallClockNow = Date.now();
    
    if (sessionStartTimeRef.current === null) {
      sessionStartTimeRef.current = perfNow;
    }
    
    ppsCounterRef.current += 1;
    const lastTime = lastFrameTimeRef.current[id] || perfNow;
    const period = Math.round(perfNow - lastTime);
    lastFrameTimeRef.current[id] = perfNow;
    messageCountsRef.current[id] = (messageCountsRef.current[id] || 0) + 1;

    const displayId = id.toUpperCase().startsWith('0X') ? id.toUpperCase() : `0x${id.toUpperCase()}`;

    const newFrame: CANFrame = {
      id: displayId,
      dlc,
      data,
      timestamp: perfNow - sessionStartTimeRef.current,
      absoluteTimestamp: wallClockNow,
      direction: 'Rx',
      count: messageCountsRef.current[id],
      periodMs: period,
      isSimulated: simulated
    };

    setFrames(prev => {
      if (prev.length > 5000) return [...prev.slice(1), newFrame];
      return [...prev, newFrame];
    });
  }, [isPaused]);

  // INTERNAL SIMULATOR - NO DLL, NO EXTERNAL TOOLS
  const startInternalSimulation = () => {
    disconnectBridge();
    setBridgeStatus('connected');
    setHwStatus('active');
    setIsSimulating(true);
    setView('live');
    setFrames([]);
    sessionStartTimeRef.current = null;

    const dbcIds = Object.keys(MY_CUSTOM_DBC);
    
    simIntervalRef.current = window.setInterval(() => {
      const decId = dbcIds[Math.floor(Math.random() * dbcIds.length)];
      const id = parseInt(decId).toString(16).toUpperCase();
      const dlc = 8;
      const data = Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase());
      handleNewFrame(id, dlc, data, true);
    }, 100);
  };

  const connectBridge = useCallback((url: string) => {
    disconnectBridge();
    setBridgeStatus('connecting');
    setHwStatus('searching');
    setFrames([]);
    sessionStartTimeRef.current = null;
    setIsLogMode(false);
    localStorage.setItem('pcan_bridge_url', url);

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;
      socket.onopen = () => {
        setBridgeStatus('connected');
        setView('live');
      };
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'frame' && data.payload) {
          handleNewFrame(data.payload.id, data.payload.dlc, data.payload.data);
          setHwStatus('active');
        } else if (data.type === 'status') {
          setHwStatus(data.payload.hardware as HardwareStatus);
        }
      };
      socket.onerror = () => {
        setBridgeStatus('error');
        setHwStatus('fault');
      };
      socket.onclose = () => {
        setBridgeStatus('disconnected');
        setHwStatus('offline');
        socketRef.current = null;
      };
    } catch (err) {
      setBridgeStatus('error');
    }
  }, [handleNewFrame]);

  const disconnectBridge = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulating(false);
    setBridgeStatus('disconnected');
    setHwStatus('offline');
  }, []);

  const restartSession = useCallback(() => {
    restartingRef.current = true;
    setFrames([]);
    sessionStartTimeRef.current = null;
    lastFrameTimeRef.current = {};
    messageCountsRef.current = {};
    ppsCounterRef.current = 0;

    if (isSimulating) {
        setTimeout(() => { restartingRef.current = false; }, 300);
        return;
    }

    if (!isLogMode && bridgeStatus === 'connected') {
      const currentUrl = bridgeUrl;
      disconnectBridge();
      setTimeout(() => {
        connectBridge(currentUrl);
        restartingRef.current = false;
      }, 400);
    } else {
      setTimeout(() => {
        restartingRef.current = false;
      }, 300);
    }
  }, [isLogMode, bridgeStatus, bridgeUrl, disconnectBridge, connectBridge, isSimulating]);

  const saveTraceFile = useCallback(async () => {
    if (frames.length === 0) return;
    setIsSaving(true);
    try {
      const firstFrame = frames[0];
      const startDate = new Date(firstFrame.absoluteTimestamp);
      const fileName = `OSM_Trace_${startDate.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-')}.trc`;
      const trcContent = [";$FILEVERSION=1.1\n", ";Generated by OSM Tactical\n"];
      frames.forEach((f, i) => {
        trcContent.push(`${(i+1).toString().padStart(5, ' ')}) ${(f.timestamp/1000).toFixed(4).padStart(13, ' ')} ${f.direction.padStart(13, ' ')} ${f.id.replace('0x', '').padStart(13, ' ')} ${f.dlc.toString().padStart(7, ' ')}   ${f.data.join(' ')}\n`);
      });
      const blob = new Blob(trcContent, { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      setIsSaving(false);
    } catch (err) { setIsSaving(false); }
  }, [frames]);

  const loadTraceFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const newFrames: CANFrame[] = [];
      lines.forEach(line => {
        const match = line.match(/\s*\d+\)\s+([\d.]+)\s+(Rx|Tx)\s+([0-9A-Fa-f]+)\s+(\d+)\s+(.*)/);
        if (match) {
          const [_, time, type, id, dlc, dataStr] = match;
          newFrames.push({
            id: `0x${id.toUpperCase()}`,
            dlc: parseInt(dlc),
            data: dataStr.trim().split(/\s+/),
            timestamp: parseFloat(time) * 1000,
            absoluteTimestamp: Date.now() + (parseFloat(time) * 1000),
            direction: type as 'Rx' | 'Tx',
            count: 1,
            periodMs: 0
          });
        }
      });
      if (newFrames.length > 0) {
        setFrames(newFrames);
        setIsLogMode(true);
        setView('live');
      }
    };
    reader.readAsText(file);
  };

  if (view === 'home') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#020617] overflow-hidden relative">
        <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-full"></div>
        <div className="z-10 text-center mb-16 px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-orbitron font-black uppercase tracking-[0.4em] mb-8">
            <Cpu size={14} className="text-indigo-500 animate-pulse" />
            PCAN_TACTICAL_DASHBOARD_V3.6
          </div>
          <h1 className="text-4xl md:text-7xl font-orbitron font-black text-white tracking-tighter uppercase mb-4">
            OSM <span className="text-indigo-400 glow-text-indigo">Live</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed uppercase tracking-widest text-[10px]">
            Professional Hardware Trace. High-Integrity Communication.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl px-8 z-10">
          <button onClick={() => setView('hardware')} className="group relative glass-panel p-10 rounded-3xl border-2 border-indigo-500/20 hover:border-indigo-500 transition-all text-center">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-8 border border-indigo-500/30 group-hover:scale-110 transition-transform mx-auto">
              <LinkIcon className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-orbitron font-black text-white uppercase mb-2">Initialize Link</h3>
            <p className="text-slate-500 font-bold uppercase text-[9px]">Demo or Python Relay</p>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="group relative glass-panel p-10 rounded-3xl border-2 border-emerald-500/20 hover:border-emerald-500 transition-all text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 border border-emerald-500/30 group-hover:scale-110 transition-transform mx-auto">
              <FileUp className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-orbitron font-black text-white uppercase mb-2">Load Trace</h3>
            <p className="text-slate-500 font-bold uppercase text-[9px]">Review Offline .TRC Logs</p>
            <input type="file" ref={fileInputRef} className="hidden" accept=".trc,.txt" onChange={loadTraceFile} />
          </button>
        </div>
      </div>
    );
  }

  if (view === 'hardware') {
    return (
      <div className="h-screen w-full flex flex-col bg-[#020617] relative overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center px-10 glass-panel z-20 shrink-0">
          <button onClick={() => setView('home')} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 mr-6 transition-colors"><ArrowLeft size={20} /></button>
          <h1 className="text-sm font-orbitron font-black text-white tracking-widest uppercase">Link_Configuration <span className="text-indigo-500">/ SELECT_METHOD</span></h1>
        </header>
        <main className="flex-1 flex items-center justify-center p-8 z-10 overflow-y-auto">
          <div className="w-full max-w-2xl flex flex-col gap-6">
            <ConnectionPanel 
              status={bridgeStatus} 
              hwStatus={hwStatus} 
              url={bridgeUrl} 
              setUrl={setBridgeUrl} 
              onConnect={connectBridge} 
              onStartDemo={startInternalSimulation}
              onDisconnect={disconnectBridge} 
              baudRate={baudRate} 
              setBaudRate={setBaudRate} 
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden relative select-none bg-[#020617]">
      <header className="h-16 border-b border-indigo-500/20 flex items-center justify-between px-6 md:px-10 glass-panel z-50 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => { disconnectBridge(); setView('home'); }} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors" title="Back to menu"><ArrowLeft size={16} /></button>
          <div className="h-5 w-[1px] bg-white/10"></div>
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 gap-1">
            <button onClick={() => setDashboardTab('trace')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-orbitron font-black uppercase tracking-widest transition-all ${dashboardTab === 'trace' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              <Activity size={14} /> LIVE_TRACE
            </button>
            <button onClick={() => setDashboardTab('library')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-orbitron font-black uppercase tracking-widest transition-all ${dashboardTab === 'library' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              <Database size={14} /> DECRYPTION_BANK
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-white/5 gap-2">
              {isSimulating && (
                <div className="px-3 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-[8px] font-orbitron font-black text-indigo-400 uppercase tracking-widest animate-pulse">
                  SIMULATION_MODE_ACTIVE
                </div>
              )}
              {!isLogMode && (
                <button onClick={() => setIsPaused(!isPaused)} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isPaused ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {isPaused ? <Play size={14} fill="currentColor"/> : <Pause size={14} fill="currentColor"/>} {isPaused ? 'RESUME' : 'PAUSE'}
                </button>
              )}
              <button onClick={saveTraceFile} disabled={frames.length === 0 || isSaving} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${isSaving ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'bg-indigo-600 text-white border-indigo-400/20 shadow-lg'} disabled:opacity-30`}>
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {isSaving ? 'EXPORT_LOG' : 'SAVE TRACE'}
              </button>
              <button onClick={restartSession} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><RefreshCw size={14} /></button>
           </div>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden relative">
        <div className="scanner-beam"></div>
        <div className="flex-1 flex flex-col p-4 min-w-0 transition-all overflow-hidden relative">
           {dashboardTab === 'trace' ? (
             <div className="flex-1 min-h-0 relative glass-panel rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
               <CANMonitor frames={frames} isPaused={isPaused} library={library} onClearTrace={restartSession} />
             </div>
           ) : (
             <div className="flex-1 relative glass-panel rounded-2xl border border-white/5 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
               <LibraryPanel library={library} onUpdateLibrary={setLibrary} frames={frames} />
             </div>
           )}
        </div>
      </main>
      <footer className="h-10 border-t border-white/5 bg-slate-950/80 px-6 flex items-center justify-between shrink-0 z-50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[8px] font-orbitron font-black text-slate-500 uppercase tracking-widest">
                <Cpu size={12} className={hwStatus === 'active' ? 'text-indigo-500' : 'text-red-500'} />
                <span>Hardware: <span className={hwStatus === 'active' ? 'text-white' : 'text-red-400'}>{isLogMode ? 'OFFLINE_LOG' : (isSimulating ? 'SIMULATOR' : hwStatus)}</span></span>
            </div>
            <div className="flex items-center gap-2 text-[8px] font-orbitron font-black text-slate-500 uppercase tracking-widest border-l border-white/10 pl-6">
                <Activity size={12} className="text-amber-500" />
                <span>PPS: <span className="text-white">{pps}</span></span>
            </div>
          </div>
          <div className="text-[8px] font-orbitron font-black text-slate-600 uppercase tracking-[0.4em]">
            OSM_TACTICAL_TELEMETRY_ENGINE_v3.6
          </div>
      </footer>
    </div>
  );
};

export default App;
