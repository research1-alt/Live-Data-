
import React, { useState } from 'react';
import { Terminal, Copy, ShieldCheck, Activity, FileCode, Zap, ArrowRight, AlertCircle, AlertTriangle, Info, Monitor, Radio, Sparkles, Download, CheckCircle2, ExternalLink, Cpu, MousePointer2, Settings2, Link as LinkIcon } from 'lucide-react';
import { ConnectionStatus, HardwareStatus } from '../types.ts';

interface ConnectionPanelProps {
  status: ConnectionStatus;
  hwStatus?: HardwareStatus;
  baudRate: number;
  setBaudRate: (rate: number) => void;
  onConnect: () => void;
  onStartDemo: () => void;
  onDisconnect: () => void;
}

const BAUD_RATES = [1000000, 500000, 250000, 125000];

const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ status, hwStatus = 'offline', onConnect, onStartDemo, onDisconnect, baudRate, setBaudRate }) => {
  const [method, setMethod] = useState<'demo' | 'python'>('demo');

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
          <div className="glass-panel border border-indigo-500/30 bg-indigo-500/5 rounded-3xl p-8">
            <h3 className="text-xl font-orbitron font-black text-white uppercase mb-2 flex items-center gap-3">
              <LinkIcon className="text-indigo-400" size={24} /> Hardware_interface
            </h3>
            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-8">WebSocket Relay • Real-time Hardware Access</p>
            
            <div className="flex flex-col gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[9px] font-orbitron font-black text-slate-500 uppercase tracking-widest">Baud Rate</label>
                  <select 
                    value={baudRate} 
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    className="bg-slate-800 border border-white/10 rounded px-3 py-1 text-[10px] font-black text-indigo-400 focus:outline-none cursor-pointer hover:border-indigo-500/50 transition-colors"
                  >
                    {BAUD_RATES.map(r => <option key={r} value={r}>{r/1000}K Bits/s</option>)}
                  </select>
                </div>
              </div>

              <button 
                onClick={() => status === 'connected' ? onDisconnect() : onConnect()}
                className={`w-full py-6 rounded-2xl text-[12px] font-orbitron font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 ${
                  status === 'connected' 
                    ? 'bg-red-500/10 text-red-400 border border-red-500/40 hover:bg-red-500/20' 
                    : 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 active:scale-95'
                }`}
              >
                {status === 'connected' ? 'TERMINATE_CONNECTION' : 'CONNECT'}
                <Zap size={18} fill={status === 'connected' ? 'none' : 'currentColor'} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-[8px] font-orbitron font-black text-slate-600 uppercase tracking-[0.3em]">
            <Activity size={10} /> LINK_INTEGRITY_VERIFIED
            <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
            <Monitor size={10} /> STATUS: {hwStatus.toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionPanel;
