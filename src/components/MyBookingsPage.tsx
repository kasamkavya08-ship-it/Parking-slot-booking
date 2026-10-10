import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Booking } from '../types/index.ts';
import { fetchBookings, cancelBooking } from '../lib/api.ts';
import {
  Ticket,
  Calendar,
  Clock,
  Car,
  QrCode,
  XCircle,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  Download,
  X,
} from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const { currentUser, addToast, refreshTrigger, triggerRefresh, setCurrentView } = useApp();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      // Load bookings for current user or all if admin
      const data = await fetchBookings({
        user_id: currentUser?.role === 'admin' ? undefined : currentUser?.id,
      });
      setBookings(data);
    } catch (e: any) {
      console.error('Failed to load bookings:', e);
      addToast({ type: 'error', title: 'Error', message: 'Failed to load bookings' });
    } finally {
      setLoading(false);
    }
  }, [currentUser, addToast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings, refreshTrigger]);

  const handleCancelBooking = async (b: Booking) => {
    if (!window.confirm(`Are you sure you want to cancel booking for slot ${b.slot_number}? This will free the parking spot immediately.`)) {
      return;
    }

    setCancellingId(b.id);
    try {
      const res = await cancelBooking(b.id, currentUser?.id);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Booking Cancelled',
          message: `Slot ${b.slot_number} has been released and is available for booking again.`,
        });
        await loadBookings();
        triggerRefresh();
      }
    } catch (e: any) {
      addToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: e.message || 'Could not cancel booking',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'booked':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>Reserved & Active</span>
          </span>
        );
      case 'checked_in':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Vehicle Parked</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-700/80">
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            <span>Cancelled</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <Ticket className="w-7 h-7 text-emerald-400" />
            <span>My Parking Passes</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Logged in as <strong className="text-slate-200">{currentUser?.name}</strong> • View QR gate barcodes & manage slots
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'booked', label: 'Active' },
            { id: 'checked_in', label: 'Parked' },
            { id: 'completed', label: 'History' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFilter === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading your reservations...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No bookings found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You don't have any reservations under the "{statusFilter}" filter. Browse parking facilities and reserve a spot now.
          </p>
          <button
            onClick={() => setCurrentView('landing')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md shadow-emerald-500/20"
          >
            Find Parking Spots
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition p-5 space-y-4 shadow-xl flex flex-col justify-between"
            >
              {/* Top Row: Lot & Status */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    ID: {b.id}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">{b.lot_name || 'Parking Lot'}</h3>
                  <p className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{b.lot_address}</span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  {getStatusBadge(b.status)}
                </div>
              </div>

              {/* Middle Row: Vehicle & Slot Badge */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Vehicle</span>
                  <span className="font-mono font-bold text-white tracking-wider">
                    {b.vehicle_number}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Slot Number</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {b.slot_number} (F{b.slot_floor})
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Total Paid</span>
                  <span className="font-mono font-bold text-white">₹{b.total_price}</span>
                </div>
              </div>

              {/* Time Interval */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Entry: {new Date(b.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span>→</span>
                <div>
                  <span>
                    Exit: {new Date(b.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => setSelectedTicket(b)}
                  className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1.5 border border-slate-700"
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>Show QR Pass</span>
                </button>

                {b.status === 'booked' && (
                  <button
                    onClick={() => handleCancelBooking(b)}
                    disabled={cancellingId === b.id}
                    className="py-2.5 px-3 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold rounded-xl transition border border-rose-800/60 flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Screen QR Code Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400">
                GATE ENTRY BARCODE
              </span>
              <h3 className="text-lg font-bold text-white">{selectedTicket.lot_name}</h3>
              <p className="text-xs text-slate-400">{selectedTicket.vehicle_number}</p>
            </div>

            <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center shadow-lg">
              {selectedTicket.qr_code.startsWith('data:') ? (
                <img
                  src={selectedTicket.qr_code}
                  alt="QR Code"
                  className="w-52 h-52 object-contain"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center bg-slate-900 text-white font-mono text-xs p-2 text-center">
                  {selectedTicket.qr_code}
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1 text-center font-mono">
              <span className="text-slate-400 block text-[10px]">Verification Token</span>
              <span className="text-emerald-400 font-bold break-all">
                {selectedTicket.id.toUpperCase()}
              </span>
              <div className="text-slate-500 text-[11px] pt-1">
                Assigned Spot: <strong className="text-white">{selectedTicket.slot_number}</strong> (Floor {selectedTicket.slot_floor})
              </div>
            </div>

            <button
              onClick={() => setSelectedTicket(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
