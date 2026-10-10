import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Clock, CheckCircle2, X, AlertTriangle } from 'lucide-react';

export const LockTimerBanner: React.FC = () => {
  const {
    activeLock,
    lockSecondsRemaining,
    releaseActiveLock,
    setSelectedLotId,
    setBookingSlotId,
    setCurrentView,
  } = useApp();

  if (!activeLock || lockSecondsRemaining <= 0) {
    return null;
  }

  const mins = Math.floor(lockSecondsRemaining / 60);
  const secs = lockSecondsRemaining % 60;
  const timerStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const isUrgent = lockSecondsRemaining < 60;

  return (
    <div
      className={`sticky top-16 z-40 px-4 py-2.5 transition-all shadow-md backdrop-blur border-b ${
        isUrgent
          ? 'bg-rose-950/80 border-rose-800/80 text-rose-200'
          : 'bg-amber-950/80 border-amber-800/80 text-amber-200'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 text-xs sm:text-sm">
          {isUrgent ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
          ) : (
            <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin-slow" />
          )}
          <div>
            <span>Slot reserved for checkout: </span>
            <span className="font-extrabold text-white bg-slate-900/60 px-2 py-0.5 rounded border border-amber-500/40 font-mono">
              {activeLock.slotNumber}
            </span>
            <span className="hidden md:inline ml-1 text-slate-300">at {activeLock.lotName}</span>
          </div>
          <div className="flex items-center space-x-1 font-mono font-bold text-sm bg-black/40 px-2.5 py-0.5 rounded-full border border-amber-500/30">
            <span className={isUrgent ? 'text-rose-400 animate-pulse' : 'text-amber-400'}>
              {timerStr}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedLotId(activeLock.lotId);
              setBookingSlotId(activeLock.slotId);
              setCurrentView('lot-detail');
            }}
            className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Complete Booking</span>
          </button>
          <button
            onClick={releaseActiveLock}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 transition"
            title="Release slot for other users"
          >
            <X className="w-3 h-3" />
            <span>Release</span>
          </button>
        </div>
      </div>
    </div>
  );
};
