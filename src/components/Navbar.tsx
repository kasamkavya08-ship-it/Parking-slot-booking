import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Car,
  Ticket,
  ShieldCheck,
  FileCode2,
  Database,
  Clock,
  UserCheck,
  ChevronDown,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    currentUser,
    setCurrentUser,
    users,
    activeLock,
    lockSecondsRemaining,
    setSelectedLotId,
    setBookingSlotId,
    triggerRefresh,
  } = useApp();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setCurrentView('landing');
              setSelectedLotId(null);
            }}
            className="flex items-center space-x-2.5 text-left focus:outline-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Car className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent font-sans">
                  ParkEase
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  HYD
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Smart Slot Booking System</p>
            </div>
          </button>

          {/* Live Sync Beacon */}
          <div
            title="Real-time 5-second automatic availability sync is active"
            onClick={triggerRefresh}
            className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 cursor-pointer hover:bg-slate-800 hover:text-white transition"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-emerald-400 font-medium">Live 5s</span>
            <RefreshCw className="w-2.5 h-2.5 ml-0.5 text-slate-400" />
          </div>
        </div>

        {/* Center Navigation */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => {
              setCurrentView('landing');
              setSelectedLotId(null);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              currentView === 'landing' || currentView === 'lot-detail'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Find Parking</span>
          </button>

          <button
            onClick={() => setCurrentView('bookings')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              currentView === 'bookings'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>My Bookings</span>
          </button>

          <button
            onClick={() => setCurrentView('admin')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              currentView === 'admin'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Admin Console</span>
            <span className="sm:hidden">Admin</span>
          </button>

          <button
            onClick={() => setCurrentView('api-docs')}
            className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              currentView === 'api-docs'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCode2 className="w-4 h-4 text-cyan-400" />
            <span>Swagger API</span>
          </button>

          <button
            onClick={() => setCurrentView('schema')}
            className={`hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
              currentView === 'schema'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Supabase DDL</span>
          </button>
        </nav>

        {/* Right Action: Active Lock Warning & User Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Active 5-minute Lock Badge */}
          {activeLock && lockSecondsRemaining > 0 && (
            <button
              onClick={() => {
                setSelectedLotId(activeLock.lotId);
                setBookingSlotId(activeLock.slotId);
                setCurrentView('lot-detail');
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition animate-pulse"
              title="Click to resume checkout"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono font-bold">{formatTimer(lockSecondsRemaining)}</span>
              <span className="hidden sm:inline text-[11px] text-amber-400/80">({activeLock.slotNumber})</span>
            </button>
          )}

          {/* User Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700/80 text-xs text-slate-200 transition focus:outline-none"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[10px] border border-emerald-500/40">
                {currentUser?.name.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden md:block">
                <div className="font-semibold text-slate-100 max-w-[100px] truncate leading-tight">
                  {currentUser?.name || 'Kasampally'}
                </div>
                <div className="text-[10px] text-emerald-400 uppercase font-mono tracking-wider">
                  {currentUser?.role || 'user'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {userDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-[11px] font-medium text-slate-400">Switch Demo Account</p>
                    <p className="text-xs text-slate-200 font-semibold truncate">
                      {currentUser?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setCurrentUser(u);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                          currentUser?.id === u.id ? 'bg-slate-800/60 font-semibold text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span>{u.name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-mono ${
                                u.role === 'admin'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : u.role === 'owner'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {u.role}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{u.phone}</span>
                        </div>
                        {currentUser?.id === u.id && <UserCheck className="w-4 h-4 text-emerald-400" />}
                      </button>
                    ))}
                  </div>

                  <div className="px-3 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setCurrentView('api-docs');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left py-1 text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1.5"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Open Swagger API Explorer</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
