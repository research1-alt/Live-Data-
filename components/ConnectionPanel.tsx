
import React, { useState } from 'react';
import { Terminal, Copy, ShieldCheck, Activity, FileCode, Zap, ArrowRight, AlertCircle, AlertTriangle, Info, Monitor, Radio, Sparkles, Download, CheckCircle2, ExternalLink, Cpu, MousePointer2, Settings2 } from 'lucide-react';
import { ConnectionStatus, HardwareStatus } from '../types.ts';

interface ConnectionPanelProps {
  status: ConnectionStatus;
  hwStatus?: HardwareStatus;
  url: string;
  setUrl: (url: string) => void;
  baudRate: number;
  setBaudRate: (rate: number) => void;
  onConnect: (url: string) => void;
  onStartDemo: () => void;
  onDisconnect: () => void;
}

const BAUD_RATES = [1000000, 500000, 250000, 125000];

const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ status, hwStatus = 'offline', onConnect, onStartDemo, onDisconnect, url, setUrl, baudRate, setBaudRate }) => {
  const [method, setMethod] = useState<'demo' | 'python'>('demo');
  const [copied, setCopied] = useState(false);

  const pythonBridgeCode = `
import asyncio, websockets, json, can, sys

async def handle_dashboard(ws):
    print(">>> Hardware Link Established.")
    bus = None
    try:
        bus = can.interface.Bus(bustype='pcan', channel='PCAN_USBBUS1', bitrate=${baudRate})
        print(f">>> Listening on PCAN_USBBUS1 at ${baudRate} bps")
        while True:
            msg = bus.recv(0.01)
            if msg:
                await ws.send(json.dumps({
                    "type": "frame",
                    "payload": {
                        "id": hex(msg.arbitration_id), 
                        "dlc": msg.dlc, 
                        "data": [f"{b:02X}" for b in msg.data]
                    }
                }))
            await asyncio.sleep(0.001)
    except Exception as e:
        print(f"Hardware Error: {e}")
    finally:
        if bus: bus.shutdown()

async def main():
    async with websockets.serve(handle_dashboard, "localhost", 9000):
        print(">>> Bridge Ready on ws://localhost:9000")
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
`.trim();

  const downloadShortcut = () => {
    const batContent = `@echo off
title OSM PCAN Bridge Launcher
echo ==================================================
echo   PCAN HARDWARE BRIDGE AUTO-REPAIR
echo ==================================================
echo.
echo [1/3] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [CRITICAL] Python is not found. 
    echo Please install Python from python.org and CHECK 'ADD TO PATH'.
    pause && exit
)

echo [2/3] Installing/Verifying 'python-can' and 'websockets'...
python -m pip install python-can websockets --upgrade
if %errorlevel% neq 0 (
    echo [WARNING] Pip failed. Trying with --user...
    python -m pip install python-can websockets --user
)

echo.
echo [3/3] Launching Bridge...
echo ${pythonBridgeCode.replace(/[<>|&^]/g, '^$&')} > pcan_bridge.py
python pcan_bridge.py
pause`;

    const blob = new Blob([batContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Fix_and_Launch_Bridge.bat';
    link.click();
  };

  const copyFixCommand = () => {
    navigator.clipboard.writeText("pip install python-can websockets");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-white/5 gap-2 backdrop-blur-md">
        <button 
          onClick={() => setMethod('demo')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-orbitron font-black uppercase transition-all ${method === 'demo' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Sparkles size={14} /> Instant_Demo
        </button>
        <button 
          onClick={() => setMethod('python')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-orbitron font-black uppercase transition-all ${method === 'python' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Cpu size={14} /> Hardware_Link
        </button>
      </div>

      {method === 'demo' ? (
        <div className="glass-panel border border-emerald-500/30 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xl font-orbitron font-black text-white uppercase mb-2">Internal_Simulator</h3>
          <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-6">Virtual Bus • Runs inside your browser</p>
          <button onClick={onStartDemo} className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[12px] font-orbitron font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3">
            START_DEMO_DATA <ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* CRITICAL FIX FOR ModuleNotFoundError */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-amber-400" />
              <h3 className="text-[11px] font-orbitron font-black text-white uppercase tracking-widest">Fix "ModuleNotFoundError"</h3>
            </div>
            <p className="text-[9px] text-slate-300 uppercase leading-relaxed font-bold mb-4">
              If you see <span className="text-red-400">"No module named 'can'"</span>, run this fix:
            </p>
            <div className="flex gap-2">
               <code className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-mono text-amber-400 truncate">
                 pip install python-can websockets
               </code>
               <button 
                onClick={copyFixCommand}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all border border-white/10"
               >
                 {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
               </button>
            </div>
          </div>

          <div className="glass-panel border border-indigo-500/30 bg-indigo-500/5 rounded-3xl p-6">
            <h3 className="text-[11px] font-orbitron font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-6">
              <ShieldCheck size={16} /> SETUP_AUTO_LAUNCHER
            </h3>
            <div className="space-y-4 mb-6">
              <p className="text-[9px] text-slate-500 uppercase font-black leading-relaxed">
                The launcher below will automatically install the missing 'can' library for you. 
                <br/><span className="text-white">Note: Do not run this in "C:\Program Files" (use Desktop).</span>
              </p>
              <button onClick={downloadShortcut} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-orbitron font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-500/20">
                <Download size={16} /> DOWNLOAD_AUTO_REPAIR_LAUNCHER (.BAT)
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="text-[8px] font-orbitron font-black text-slate-500 uppercase tracking-widest">Target_Endpoint</label>
                <select 
                  value={baudRate} 
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  className="bg-slate-800 border border-white/10 rounded px-2 py-0.5 text-[8px] font-black text-indigo-400 focus:outline-none"
                >
                  {BAUD_RATES.map(r => <option key={r} value={r}>{r/1000}K Bits/s</option>)}
                </select>
              </div>
              <input 
                type="text" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-mono text-white focus:outline-none focus:border-indigo-500/50"
              />
              <button 
                onClick={() => onConnect(url)}
                className={`w-full py-4 rounded-xl text-[10px] font-orbitron font-black uppercase tracking-widest transition-all ${status === 'connected' ? 'bg-red-500/10 text-red-400 border border-red-500/40' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20'}`}
              >
                {status === 'connected' ? 'DISCONNECT_HARDWARE' : 'CONNECT_TO_BRIDGE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionPanel;
