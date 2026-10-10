/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { LockTimerBanner } from './components/LockTimerBanner.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { LotDetailPage } from './components/LotDetailPage.tsx';
import { MyBookingsPage } from './components/MyBookingsPage.tsx';
import { AdminConsole } from './components/AdminConsole.tsx';
import { SwaggerDocsPage } from './components/SwaggerDocsPage.tsx';
import { SupabaseSchemaPage } from './components/SupabaseSchemaPage.tsx';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  X,
  Car,
  Heart,
  Github,
  Database,
  FileCode2,
} from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-md text-xs flex items-start space-x-3 transition-all animate-in slide-in-from-bottom-3 duration-200 ${
            t.type === 'success'
              ? 'bg-slate-900/95 border-emerald-500/50 text-slate-100 shadow-emerald-950/30'
              : t.type === 'error'
              ? 'bg-slate-900/95 border-rose-500/50 text-slate-100 shadow-rose-950/30'
              : t.type === 'warning'
              ? 'bg-slate-900/95 border-amber-500/50 text-slate-100 shadow-amber-950/30'
              : 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-slate-950/30'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {t.type === 'error' && <XCircle className="w-4 h-4 text-rose-400" />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-cyan-400" />}
          </div>

          <div className="flex-1 space-y-0.5">
            <h5 className="font-bold text-white leading-tight">{t.title}</h5>
            {t.message && <p className="text-slate-300 leading-relaxed text-[11px]">{t.message}</p>}
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="text-slate-400 hover:text-white shrink-0 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

const MainContent: React.FC = () => {
  const { currentView } = useApp();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {currentView === 'landing' && <LandingPage />}
      {currentView === 'lot-detail' && <LotDetailPage />}
      {currentView === 'bookings' && <MyBookingsPage />}
      {currentView === 'admin' && <AdminConsole />}
      {currentView === 'api-docs' && <SwaggerDocsPage />}
      {currentView === 'schema' && <SupabaseSchemaPage />}
    </main>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
        <Navbar />
        <LockTimerBanner />
        
        <div className="flex-1">
          <MainContent />
        </div>

        {/* Global Floating Toast Alerts */}
        <ToastContainer />

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/80 py-8 mt-12 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Car className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-300">ParkEase Hyderabad</span>
              <span>• Full-Stack Parking Slot Booking System</span>
            </div>

            <div className="flex items-center space-x-4 text-slate-400">
              <span>Node Express API</span>
              <span>•</span>
              <span>Supabase / PostgreSQL DDL</span>
              <span>•</span>
              <span>5s Real-Time Polling</span>
            </div>
          </div>
        </footer>
      </div>
    </AppProvider>
  );
}
