
import React, { useState, useCallback, useRef } from 'react';
import { Play, Pause, RefreshCw, Cpu, ArrowLeft, Download, FileUp, Loader2, Database, Activity, Zap, BarChart3, Settings2, ShieldAlert } from 'lucide-react';
import CANMonitor from './components/CANMonitor.tsx';
import ConnectionPanel from './components/ConnectionPanel.tsx';
import LibraryPanel from './components/LibraryPanel.tsx';
import TraceAnalysisDashboard from './components/TraceAnalysisDashboard.tsx';
import { CANFrame, ConnectionStatus, HardwareStatus, ConversionLibrary } from './types.ts';
import { MY_CUSTOM_DBC, DEFAULT_LIBRARY_NAME } from './data/dbcProfiles.ts';
import { normalizeId } from './utils/decoder.ts';

type AppView = 'home' | 'live';
type ProfileType = 'live' | 'trace';
type DashboardTab = 'link' | 'trace' | 'library' | 'analysis';

const BRIDGE_URL = 'ws://localhost:9000';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [profile, setProfile] = useState<ProfileType>('live');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('link');
  const [frames, setFrames] = useState<CANFrame[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<ConnectionStatus>('disconnected');
  const [hwStatus, setHwStatus] = useState<HardwareStatus>('offline');
  const [baudRate, setBaudRate] = useState(500000);
  
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

  const disconnectBridge = useCallback(() => {
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'config', payload: { action: 'stop' } }));
      }
      socketRef.current.close();
      socketRef.current = null;
    }
    setBridgeStatus('disconnected');
    setHwStatus('offline');
  }, []);

  const handleNewFrame = useCallback((id: string, dlc: number, data: string[]) => {
    if (isPaused || restartingRef.current) return;
    if (!id || id === '0x0' || id === '0') return;

    const perfNow = performance.now();
    if (sessionStartTimeRef.current === null) sessionStartTimeRef.current = perfNow;
    
    ppsCounterRef.current += 1;
    const lastTime = lastFrameTimeRef.current[id] || perfNow;
    const period = Math.round(perfNow - lastTime);
    lastFrameTimeRef.current[id] = perfNow;
    messageCountsRef.current[id] = (messageCountsRef.current[id] || 0) + 1;

    const displayId = id.toUpperCase().startsWith('0X') ? id.toUpperCase() : `0X${id.toUpperCase()}`;
    const newFrame: CANFrame = {
      id: displayId,
      dlc,
      data,
      timestamp: perfNow - sessionStartTimeRef.current,
      absoluteTimestamp: Date.now(),
      direction: 'Rx',
      count: messageCountsRef.current[id],
      periodMs: period
    };

    setFrames(prev => {
      if (prev.length > 5000) return [...prev.slice(1), newFrame];
      return [...prev, newFrame];
    });
  }, [isPaused]);

  const connectBridge = useCallback(() => {
    disconnectBridge();
    setBridgeStatus('connecting');
    setHwStatus('searching');
    setFrames([]);
    sessionStartTimeRef.current = null;

    try {
      const socket = new WebSocket(BRIDGE_URL);
      socketRef.current = socket;
      socket.onopen = () => {
        setBridgeStatus('connected');
        socket.send(JSON.stringify({ type: 'config', payload: { action: 'start', bitrate: baudRate, hardware: 'pcan' } }));
        setDashboardTab('trace'); // Profile 1 auto-switch to Live Trace
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
      socket.onerror = () => { setBridgeStatus('error'); setHwStatus('fault'); };
      socket.onclose = () => { setBridgeStatus('disconnected'); setHwStatus('offline'); socketRef.current = null; };
    } catch (err) { setBridgeStatus('error'); }
  }, [handleNewFrame, baudRate, disconnectBridge]);

  const restartSession = useCallback(() => {
    restartingRef.current = true;
    setFrames([]);
    sessionStartTimeRef.current = null;
    lastFrameTimeRef.current = {};
    messageCountsRef.current = {};
    ppsCounterRef.current = 0;
    if (profile === 'live' && (bridgeStatus === 'connected' || bridgeStatus === 'error')) {
      connectBridge();
    }
    setTimeout(() => { restartingRef.current = false; }, 400);
  }, [profile, bridgeStatus, connectBridge]);

  const saveTraceFile = useCallback(async () => {
    if (frames.length === 0) return;
    setIsSaving(true);
    try {
      const firstFrame = frames[0];
      const startDate = new Date(firstFrame.absoluteTimestamp);
      const fileName = "OSM_Trace_" + startDate.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-') + ".trc";
      
      const trcContent = [
        ";$FILEVERSION=2.0\n",
        ";$STARTTIME=" + (firstFrame.absoluteTimestamp / 1000).toFixed(12) + "\n",
        ";$COLUMNS=N,O,T,I,d,l,D\n",
        ";\n"
      ];
      
      frames.forEach((f, i) => {
        const msgNum = (i + 1).toString().padStart(7, ' ');
        const timeOffset = f.timestamp.toFixed(3).padStart(8, ' ');
        const type = "DT".padStart(6, ' ');
        const id = f.id.toUpperCase().padStart(12, ' ');
        const rxtx = f.direction.padStart(3, ' ');
        const dlc = f.dlc.toString().padStart(2, ' ');
        const dataBytes = " " + f.data.map(d => d.padStart(2, '0')).join(' ');
        trcContent.push(" " + msgNum + "  " + timeOffset + "  " + type + "  " + id + "  " + rxtx + " " + dlc + " " + dataBytes + "\n");
      });

      const blob = new Blob(trcContent, { type: 'application/octet-stream' });
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = fileName;
      link.click();
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  }, [frames]);

  const handleUseLiveData = () => { 
    setProfile('live');
    setView('live'); 
    setDashboardTab('link'); 
  };

  const handleLoadTrace = () => {
    fileInputRef.current?.click();
  };

  const loadTraceFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/);
      const newFrames: CANFrame[] = [];
      
      lines.forEach(line => {
        if (line.trim().startsWith(';') || line.trim() === '') return;
        const match = line.match(/^\s*(\d+)\)?\s+([\d.]+)\s+(\w+)\s+([0-9A-F]+)\s+(Rx|Tx)\s+(\d+)\s+(.*)$/i);
        if (match) {
          const [_, num, time, type, id, direction, dlc, dataStr] = match;
          const dataParts = dataStr.trim().split(/\s+/).slice(0, parseInt(dlc));
          newFrames.push({
            id: `0X${normalizeId(id)}`,
            dlc: parseInt(dlc),
            data: dataParts,
            timestamp: parseFloat(time) * 1000, 
            absoluteTimestamp: Date.now(), 
            direction: (direction.toUpperCase() === 'RX' ? 'Rx' : 'Tx') as 'Rx' | 'Tx',
            count: 1,
            periodMs: 0
          });
        }
      });

      if (newFrames.length > 0) { 
        setFrames(newFrames); 
        setProfile('trace');
        setView('live'); 
        setDashboardTab('analysis'); // Profile 2 auto-switch to Analysis
      } else {
        alert("No valid PCAN trace data detected.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
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
            OSM_TACTICAL_DASHBOARD_V4.2
          </div>
          <h1 className="text-4xl md:text-7xl font-orbitron font-black text-white tracking-tighter uppercase mb-4">
            OSM <span className="text-indigo-400 glow-text-indigo">Live</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed uppercase tracking-widest text-[10px]">
            High-Performance Hardware Trace • PCAN Integration
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl px-8 z-10">
          <button onClick={handleUseLiveData} className="group relative glass-panel p-10 rounded-3xl border-2 border-indigo-500/20 hover:border-indigo-500 transition-all text-center">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-8 border border-indigo-500/30 group-hover:scale-110 transition-transform mx-auto">
              <Zap className="w-8 h-8 text-indigo-400" fill="currentColor" />
            </div>
            <h3 className="text-2xl font-orbitron font-black text-white uppercase mb-2">Use Live Data</h3>
            <p className="text-slate-500 font-bold uppercase text-[9px]">Establish Hardware Link</p>
          </button>
          <button onClick={handleLoadTrace} className="group relative glass-panel p-10 rounded-3xl border-2 border-emerald-500/20 hover:border-emerald-500 transition-all text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 border border-emerald-500/30 group-hover:scale-110 transition-transform mx-auto">
              <FileUp className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-orbitron font-black text-white uppercase mb-2">Load Trace</h3>
            <p className="text-slate-500 font-bold uppercase text-[9px]">Analyze Offline Logs</p>
          </button>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept=".trc" onChange={loadTraceFile} />
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden relative select-none bg-[#020617]">
      <header className="h-16 border-b border-indigo-500/20 flex items-center justify-between px-6 md:px-10 glass-panel z-50 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => { disconnectBridge(); setView('home'); }} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"><ArrowLeft size={16} /></button>
          <div className="h-5 w-[1px] bg-white/10"></div>
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 gap-1">
            {profile === 'live' ? (
              <>
                <button onClick={() => setDashboardTab('link')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-orbitron font-black uppercase tracking-widest transition-all ${dashboardTab === 'link' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Settings2 size={14} /> LINK_CONFIG
                </button>
                <button onClick={() => setDashboardTab('trace')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-orbitron font-black uppercase tracking-widest transition-all ${dashboardTab === 'trace' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Activity size={14} /> LIVE_TRACE
                </button>
                <button onClick={() => setDashboardTab('library')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-orbitron font-black uppercase tracking-widest transition-all ${dashboardTab === 'library' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Database size={14} /> DECRYPTION_BANK
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setDashboardTab('analysis')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-orbitron font-black uppercase tracking-widest transition-all ${dashboardTab === 'analysis' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'text-slate-500 hover:text-slate-300'}`}>
                  <BarChart3 size={14} /> LOG_ANALYSIS
                </button>
                <button onClick={() => setDashboardTab('trace')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-orbitron font-black uppercase tracking-widest transition-all ${dashboardTab === 'trace' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Activity size={14} /> FILE_TRACE
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-white/5 gap-2">
              {profile === 'live' && bridgeStatus === 'connected' && (
                <button onClick={() => setIsPaused(!isPaused)} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isPaused ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {isPaused ? <Play size={14} fill="currentColor"/> : <Pause size={14} fill="currentColor"/>} {isPaused ? 'RESUME' : 'PAUSE'}
                </button>
              )}
              {profile === 'live' && (
                <button onClick={saveTraceFile} disabled={frames.length === 0 || isSaving} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${isSaving ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'bg-indigo-600 text-white border-indigo-400/20 shadow-lg hover:bg-indigo-500 active:scale-95'} disabled:opacity-30 disabled:pointer-events-none`}>
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
                  {isSaving ? 'EXPORTING...' : 'SAVE TRACE'}
                </button>
              )}
              <button onClick={restartSession} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><RefreshCw size={14} /></button>
           </div>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-4 min-w-0 transition-all overflow-hidden relative">
           {dashboardTab === 'link' ? (
             <div className="flex-1 flex items-center justify-center relative glass-panel rounded-2xl border border-white/5 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 bg-slate-900/30">
               <ConnectionPanel 
                status={bridgeStatus} 
                hwStatus={hwStatus} 
                onConnect={connectBridge} 
                onDisconnect={disconnectBridge} 
                baudRate={baudRate}
                setBaudRate={setBaudRate}
                onStartDemo={() => {}}
               />
             </div>
           ) : dashboardTab === 'analysis' ? (
             <div className="flex-1 min-h-0 relative glass-panel rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                <TraceAnalysisDashboard frames={frames} library={library} />
             </div>
           ) : dashboardTab === 'trace' ? (
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
                <Cpu size={12} className={(hwStatus === 'active' || profile === 'trace') ? 'text-indigo-500' : 'text-red-500'} />
                <span>Profile: <span className="text-white ml-1">{profile.toUpperCase()}</span></span>
                <span className="mx-2 text-slate-700">|</span>
                <span>Hardware: <span className={(hwStatus === 'active' || profile === 'trace') ? 'text-white' : 'text-red-400'}>{profile === 'trace' ? 'OFFLINE_FILE' : hwStatus.toUpperCase()}</span></span>
            </div>
          </div>
          <div className="text-[8px] font-orbitron font-black text-slate-600 uppercase tracking-[0.4em]">OSM_TACTICAL_TELEMETRY_ENGINE_V4.2</div>
      </footer>
    </div>
  );
};

export default App;
