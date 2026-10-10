import React, { useState, useEffect } from 'react';
import { fetchSchema } from '../lib/api.ts';
import { Database, Copy, Check, Terminal, Shield, Layers, Key } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export const SupabaseSchemaPage: React.FC = () => {
  const [schemaSql, setSchemaSql] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { addToast } = useApp();

  useEffect(() => {
    fetchSchema().then((data) => setSchemaSql(data.sql)).catch(console.error);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopied(true);
    addToast({
      type: 'success',
      title: 'SQL Copied!',
      message: 'PostgreSQL / Supabase DDL copied to clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Database className="w-3.5 h-3.5" />
              <span>POSTGRESQL & SUPABASE PRODUCTION DDL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Database Schema Architecture
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Production PostgreSQL table definitions for Supabase SQL Editor with UUID primary keys, foreign key constraints, indexes, and Row-Level Security (RLS).
            </p>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy SQL Schema'}</span>
          </button>
        </div>

        {/* 5 Tables Quick Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="font-mono text-emerald-400 font-bold block">1. users</span>
            <span className="text-slate-400 text-[11px]">id, name, email, phone, role (user/admin/owner)</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="font-mono text-cyan-400 font-bold block">2. parking_lots</span>
            <span className="text-slate-400 text-[11px]">id, name, address, lat, lng, total_slots, price_per_hour</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="font-mono text-purple-400 font-bold block">3. parking_slots</span>
            <span className="text-slate-400 text-[11px]">id, lot_id, slot_number, type (2W/4W/EV), floor, is_available, is_locked_until</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="font-mono text-amber-400 font-bold block">4. bookings</span>
            <span className="text-slate-400 text-[11px]">id, user_id, lot_id, slot_id, vehicle_number, entry_time, exit_time, status, qr_code</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="font-mono text-rose-400 font-bold block">5. payments</span>
            <span className="text-slate-400 text-[11px]">id, booking_id, amount, status (pending/success/failed)</span>
          </div>
        </div>
      </div>

      {/* SQL Script View */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-300 font-mono">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>supabase_schema.sql</span>
          </div>
          <button
            onClick={handleCopy}
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </button>
        </div>

        <pre className="p-6 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre selection:bg-emerald-500 selection:text-slate-950">
          {schemaSql || 'Loading schema...'}
        </pre>
      </div>
    </div>
  );
};
