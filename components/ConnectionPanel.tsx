
import React, { useState } from 'react';
import { Terminal, Copy, ShieldCheck, Activity, FileCode, Zap, ArrowRight, AlertCircle, AlertTriangle, Info, Monitor, Radio, Sparkles, Download, MousePointer2, Command } from 'lucide-react';
import { ConnectionStatus, HardwareStatus } from '../types';

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
  const [copied, setCopied] = useState(false);
  const [cmdCopied, setCmdCopied] = useState(false);
  const [method, setMethod] = useState<'demo' | 'python'>('demo');

  const pythonBridgeCode = `
import asyncio
import websockets
import json
import can
import sys

async def handle_dashboard(ws):
    print(">>> Hardware Link Established.")
    bus = None
    try:
        # Initializing PCAN Hardware via python-can
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
        print(">>> Keep this window open while using the dashboard.")
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\\n>>> Bridge Terminated.")
        sys.exit(0)
`.trim();

  const downloadShortcut = () => {
    const batContent = `@echo off
title OSM PCAN Bridge Launcher
echo ========================================
echo   OSM TACTICAL PCAN BRIDGE STARTUP
echo ========================================
echo.
echo [1/3] Checking Dependencies...
pip install python-can websockets --quiet
echo [OK] Environment Ready
echo.
echo [2/3] Generating Bridge Script...
(
${pythonBridgeCode.split('\n').map(line => `echo ${line.replace(/[<>|&^]/g, '^$&')}`).join('\n')}
) > osm_bridge.py
echo [OK] script generated: osm_bridge.py
echo.
echo [3/3] Launching WebSocket Server...
echo >>> DO NOT CLOSE THIS WINDOW
python osm_bridge.py
pause`;

    const blob = new Blob([batContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Launch_OSM_Bridge.bat';
    link.click();
  };

  const copyManualCommand = () => {
    const oneLiner = `pip install python-can websockets && python -c "import asyncio, websockets, json, can; async def h(w): b=can.Bus(bustype='pcan', channel='PCAN_USBBUS1', bitrate=${baudRate}); print('Linked');\n  while 1:\n    m=b.recv(0.1)\n    if m: await w.send(json.dumps({'type':'frame','payload':{'id':hex(m.arbitration_id),'dlc':m.dlc,'data':[f'{x:02X}' for x in m.data]}}))\nasync def m():\n  async with websockets.serve(h, 'localhost', 9000): await asyncio.Future()\nasyncio.run(m())"`;
    navigator.clipboard.writeText(oneLiner);
    setCmdCopied(true);
    setTimeout(() => setCmdCopied(false), 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonBridgeCode);
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
          <FileCode size={14} /> PCAN_Bridge
        </button>
      </div>

      {method === 'demo' && (
        <div className="glass-panel border border-emerald-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-xl font-orbitron font-black text-white uppercase mb-2">Internal_Simulator</h3>
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-8">Direct Browser Execution • No Setup</p>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl mb-8 flex items-start gap-4">
              <Info size={20} className="text-emerald-400 shrink-0" />
              <p className="text-[10px] text-slate-300 leading-relaxed uppercase font-medium">
                Generates high-fidelity simulated telemetry. Use this for testing UI/Logic without hardware present.
              </p>
            </div>
            <button 
              onClick={onStartDemo}
              className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[12px] font-orbitron font-black uppercase tracking-[0.4em] transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95 border border-emerald-400/30"
            >
              RUN_VIRTUAL_BUS <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {method === 'python' && (
        <div className="flex flex-col gap-6">
          <div className="glass-panel border border-amber-500/30 bg-amber-500/5 rounded-3xl p-6">
            <h3 className="text-[11px] font-orbitron font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <MousePointer2 size={16} /> Persistent_Automation
            </h3>
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-4">The bridge script allows the browser to communicate with your PCAN hardware.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
              <button 
                onClick={downloadShortcut}
                className="py-4 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-2xl text-[9px] font-orbitron font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all flex items-center justify-center gap-3"
              >
                <Download size={14} /> Download Launcher
              </button>
              <button 
                onClick={copyManualCommand}
                className={`py-4 rounded-2xl text-[9px] font-orbitron font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border ${
                  cmdCopied ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Command size={14} /> {cmdCopied ? 'Copied Command!' : 'Manual CMD Command'}
              </button>
            </div>
            
            <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-[8px] text-slate-400 uppercase leading-relaxed">
                If Windows says "Cannot find file", it is usually due to folder permissions or antivirus. Use the <span className="text-white font-bold">Manual CMD Command</span> button to copy a direct command you can paste into a terminal.
              </p>
            </div>
          </div>

          <div className="glass-panel border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[11px] font-orbitron font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Radio size={16} className="text-indigo-500" /> Relay_Configuration
              </h3>
              <div className="flex gap-2">
                {BAUD_RATES.slice(0, 2).map(r => (
                  <button key={r} onClick={() => setBaudRate(r)} className={`px-2 py-1 rounded text-[8px] font-black ${baudRate === r ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                    {r/1000}K
                  </button>
                ))}
              </div>
            </div>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status === 'connected'}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-4 text-[12px] font-mono text-white focus:outline-none mb-4"
              placeholder="ws://localhost:9000"
            />
            <button 
              onClick={() => status === 'connected' ? onDisconnect() : onConnect(url)}
              className={`w-full py-5 rounded-2xl text-[11px] font-orbitron font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 ${
                status === 'connected' ? 'bg-red-500/10 border border-red-500/30 text-red-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl'
              }`}
            >
              {status === 'connected' ? 'KILL_BRIDGE' : 'START_LINK'}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionPanel;
