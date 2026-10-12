import React, { useState } from 'react';
import {
  Bike,
  Activity,
  Plus,
  Wallet,
  Volume2,
  VolumeX,
  ChevronDown,
  UserCheck,
  LogOut,
  ShieldAlert,
  Flame
} from 'lucide-react';
import { useAuth, PRESET_ACCOUNTS } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { soundManager } from '../services/audio';

interface NavbarProps {
  currentView: 'lobby' | 'arena' | 'admin';
  onNavigate: (view: 'lobby' | 'admin') => void;
  onOpenCreate: () => void;
  onOpenDeposit: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenCreate,
  onOpenDeposit
}) => {
  const { user, quickSwitch, logout } = useAuth();
  const { isConnected } = useSocket();
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(soundManager.getMuted());
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

  const toggleAudio = () => {
    const muted = soundManager.toggleMute();
    setIsAudioMuted(muted);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Live Socket Badge */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => onNavigate('lobby')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6 fill-black" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-black text-lg tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  MotoBid
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold border border-amber-500/30">
                  LIVE
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono -mt-0.5">
                Real-Time Motorcycle Auctions
              </div>
            </div>
          </div>

          {/* WebSocket Status Indicator */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-live-dot' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className={isConnected ? 'text-slate-300' : 'text-amber-400'}>
              {isConnected ? 'WS Gateway Connected' : 'Reconnecting WS...'}
            </span>
          </div>
        </div>

        {/* Center / Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          <button
            onClick={() => onNavigate('lobby')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
              currentView === 'lobby' || currentView === 'arena'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Live Auctions
          </button>

          <button
            onClick={() => onNavigate('admin')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
              currentView === 'admin'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Admin Ops & SRE
          </button>
        </nav>

        {/* Right Tools & User Switcher */}
        <div className="flex items-center gap-3">
          {/* Audio toggle */}
          <button
            onClick={toggleAudio}
            title={isAudioMuted ? 'Unmute Audio SFX' : 'Mute Audio SFX'}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Escrow Deposit Wallet Pill */}
          {user && (
            <button
              onClick={onOpenDeposit}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-left font-mono">
                <span className="text-[10px] text-slate-400 block leading-tight">Escrow Deposit</span>
                <span className="text-xs font-bold text-white leading-tight">
                  ${user.deposit_balance.toLocaleString()}
                </span>
              </div>
            </button>
          )}

          {/* Create Auction button */}
          <button
            onClick={onOpenCreate}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            List Bike
          </button>

          {/* Evaluator Quick Account Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-white transition-all"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                {user?.username.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left hidden md:block">
                <div className="font-semibold text-xs leading-none">{user?.username}</div>
                <div className="text-[10px] text-amber-400 font-mono leading-none mt-0.5">
                  [{user?.role}]
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Quick Switch Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 text-xs z-50 animate-fade-in">
                <div className="px-3 py-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Switch Active Role (Instant Demo)
                </div>

                <div className="py-1 space-y-1">
                  <button
                    onClick={() => {
                      quickSwitch('ADMIN');
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      user?.role === 'ADMIN'
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold">System Administrator</div>
                      <div className="text-[10px] text-slate-400 font-mono">Full SRE & Ops Access</div>
                    </div>
                    {user?.role === 'ADMIN' && <UserCheck className="w-4 h-4 text-amber-400" />}
                  </button>

                  <button
                    onClick={() => {
                      quickSwitch('BUYER_1');
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      user?.username === 'alex_rider'
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold">Alex Rider (Pro Buyer 1)</div>
                      <div className="text-[10px] text-slate-400 font-mono">$150,000 Escrow Balance</div>
                    </div>
                    {user?.username === 'alex_rider' && <UserCheck className="w-4 h-4 text-amber-400" />}
                  </button>

                  <button
                    onClick={() => {
                      quickSwitch('BUYER_2');
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      user?.username === 'sarah_speed'
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold">Sarah Speed (Pro Buyer 2)</div>
                      <div className="text-[10px] text-slate-400 font-mono">$200,000 Escrow Balance</div>
                    </div>
                    {user?.username === 'sarah_speed' && <UserCheck className="w-4 h-4 text-amber-400" />}
                  </button>

                  <button
                    onClick={() => {
                      quickSwitch('SELLER');
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      user?.role === 'SELLER'
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold">Marcus Motowerks (Seller)</div>
                      <div className="text-[10px] text-slate-400 font-mono">Verified Bike Dealer</div>
                    </div>
                    {user?.role === 'SELLER' && <UserCheck className="w-4 h-4 text-amber-400" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
