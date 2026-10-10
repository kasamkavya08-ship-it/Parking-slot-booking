import React, { useState, useEffect } from 'react';
import { fetchDocsSpec } from '../lib/api.ts';
import {
  FileCode2,
  Send,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Code2,
} from 'lucide-react';

interface EndpointDef {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT';
  path: string;
  tag: string;
  summary: string;
  description?: string;
  defaultParams?: Record<string, any>;
  defaultBody?: any;
}

const ENDPOINTS: EndpointDef[] = [
  {
    method: 'GET',
    path: '/lots',
    tag: 'Parking Lots',
    summary: 'List all lots with real-time available slot counts',
  },
  {
    method: 'GET',
    path: '/lots/lot_hitech_01',
    tag: 'Parking Lots',
    summary: 'Get lot details and all slots for visual layout',
  },
  {
    method: 'POST',
    path: '/slots/lock',
    tag: 'Slots & Locks',
    summary: 'Lock slot for 5 minutes (prevents collision)',
    defaultBody: {
      slot_id: 'slot_hitech_f1_3',
      session_id: 'sess_swagger_test',
    },
  },
  {
    method: 'POST',
    path: '/slots/unlock',
    tag: 'Slots & Locks',
    summary: 'Release slot lock early',
    defaultBody: {
      slot_id: 'slot_hitech_f1_3',
      session_id: 'sess_swagger_test',
    },
  },
  {
    method: 'GET',
    path: '/bookings',
    tag: 'Bookings',
    summary: 'List bookings with optional query filters',
  },
  {
    method: 'POST',
    path: '/bookings',
    tag: 'Bookings',
    summary: 'Confirm slot booking with auto-pricing and QR code',
    defaultBody: {
      user_id: 'usr_kavya_01',
      lot_id: 'lot_hitech_01',
      slot_id: 'slot_hitech_f1_5',
      vehicle_number: 'TS 09 EA 4521',
      entry_time: new Date().toISOString(),
      exit_time: new Date(Date.now() + 7200000).toISOString(),
      sessionId: 'sess_swagger_test',
      payment_method: 'razorpay_mock',
    },
  },
  {
    method: 'POST',
    path: '/bookings/verify-qr',
    tag: 'Admin Gate Operations',
    summary: 'Verify QR code token at parking barrier gate',
    defaultBody: {
      token: 'bk_sample_01',
    },
  },
  {
    method: 'POST',
    path: '/bookings/bk_sample_01/check-in',
    tag: 'Admin Gate Operations',
    summary: 'Check-in vehicle at parking barrier',
  },
  {
    method: 'POST',
    path: '/bookings/bk_sample_01/check-out',
    tag: 'Admin Gate Operations',
    summary: 'Check-out vehicle and free slot back to pool',
  },
  {
    method: 'GET',
    path: '/payments',
    tag: 'Payments',
    summary: 'List all payment transactions',
  },
  {
    method: 'POST',
    path: '/payments/mock-razorpay',
    tag: 'Payments',
    summary: 'Simulate Razorpay payment signature & authorization',
    defaultBody: {
      amount: 80,
      vehicle_number: 'TS 09 EA 4521',
      method: 'upi',
    },
  },
  {
    method: 'GET',
    path: '/users',
    tag: 'Users',
    summary: 'Get all demo users',
  },
  {
    method: 'GET',
    path: '/schema',
    tag: 'System',
    summary: 'Get full Supabase / PostgreSQL SQL DDL schema',
  },
];

export const SwaggerDocsPage: React.FC = () => {
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({
    'GET-/lots': true,
    'POST-/slots/lock': true,
  });

  const [requestBodies, setRequestBodies] = useState<Record<string, string>>({});
  const [executionResponses, setExecutionResponses] = useState<Record<string, any>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const toggleEndpoint = (key: string) => {
    setExpandedEndpoints((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'POST':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'PUT':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'DELETE':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const handleExecute = async (ep: EndpointDef) => {
    const key = `${ep.method}-${ep.path}`;
    setLoadingMap((prev) => ({ ...prev, [key]: true }));

    const url = `/api${ep.path}`;
    const startTime = performance.now();

    try {
      let options: RequestInit = {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
      };

      if (ep.method === 'POST' || ep.method === 'PUT') {
        const bodyStr = requestBodies[key] || JSON.stringify(ep.defaultBody || {}, null, 2);
        options.body = bodyStr;
      }

      const res = await fetch(url, options);
      const data = await res.json();
      const duration = Math.round(performance.now() - startTime);

      setExecutionResponses((prev) => ({
        ...prev,
        [key]: {
          status: res.status,
          statusText: res.statusText,
          duration,
          data,
        },
      }));
    } catch (e: any) {
      setExecutionResponses((prev) => ({
        ...prev,
        [key]: {
          status: 500,
          statusText: 'Client Error',
          duration: 0,
          data: { error: e.message },
        },
      }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [key]: false }));
    }
  };

  const tags = ['ALL', 'Parking Lots', 'Slots & Locks', 'Bookings', 'Admin Gate Operations', 'Payments', 'Users', 'System'];

  const filteredEndpoints = ENDPOINTS.filter((ep) => {
    if (selectedTag === 'ALL') return true;
    return ep.tag === selectedTag;
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Swagger UI Banner Header */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                OAS 3.0.3
              </span>
              <span className="text-xs text-slate-400 font-mono">v1.0.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-sans flex items-center space-x-2.5">
              <FileCode2 className="w-8 h-8 text-cyan-400" />
              <span>ParkEase REST API Explorer</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Interactive Swagger-style live documentation for ParkEase's fullstack backend API. Try requests live against the Node.js Express server.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs font-mono space-y-1">
            <div className="text-slate-500 text-[10px] uppercase">Base URL</div>
            <div className="text-emerald-400 font-bold">/api</div>
          </div>
        </div>

        {/* Tag Filters */}
        <div className="flex items-center space-x-1.5 pt-4 border-t border-slate-800/80 overflow-x-auto text-xs">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${
                selectedTag === t
                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoints Accordion List */}
      <div className="space-y-3">
        {filteredEndpoints.map((ep) => {
          const key = `${ep.method}-${ep.path}`;
          const isExpanded = !!expandedEndpoints[key];
          const response = executionResponses[key];
          const isLoading = !!loadingMap[key];

          return (
            <div
              key={key}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isExpanded ? 'bg-slate-900 border-slate-700 shadow-xl' : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Endpoint Header Bar */}
              <div
                onClick={() => toggleEndpoint(key)}
                className="p-4 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${getMethodBadge(ep.method)}`}>
                    {ep.method}
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">{ep.path}</span>
                  <span className="text-xs text-slate-400 hidden md:inline">• {ep.summary}</span>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-500 hidden sm:inline">{ep.tag}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Expanded Interactive Body */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-800/80 bg-slate-950/70 space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">{ep.summary}</p>

                  {/* Request Body if POST/PUT */}
                  {(ep.method === 'POST' || ep.method === 'PUT') && ep.defaultBody && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                        <span>Request Body (application/json)</span>
                        <span className="text-[10px] text-slate-500">Editable for testing</span>
                      </div>
                      <textarea
                        rows={6}
                        defaultValue={JSON.stringify(ep.defaultBody, null, 2)}
                        onChange={(e) => {
                          setRequestBodies((prev) => ({ ...prev, [key]: e.target.value }));
                        }}
                        className="w-full p-3 bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl border border-slate-800 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Execute Button */}
                  <div>
                    <button
                      onClick={() => handleExecute(ep)}
                      disabled={isLoading}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center space-x-2 shadow-md shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Executing live API call...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Try it out (Execute API Call)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Live Response Output */}
                  {response && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400 font-semibold">Server Response:</span>
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                              response.status >= 200 && response.status < 300
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {response.status} {response.statusText}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">{response.duration} ms</span>
                      </div>

                      <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-xs rounded-xl border border-slate-800 max-h-72 overflow-y-auto overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(response.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
