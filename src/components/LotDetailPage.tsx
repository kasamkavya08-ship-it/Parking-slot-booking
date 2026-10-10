import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ParkingLot, ParkingSlot, SlotType, SlotFloor } from '../types/index.ts';
import { fetchLotById, lockSlot } from '../lib/api.ts';
import { BookingModal } from './BookingModal.tsx';
import {
  ArrowLeft,
  Car,
  Bike,
  Zap,
  Layers,
  MapPin,
  RefreshCw,
  Info,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export const LotDetailPage: React.FC = () => {
  const {
    selectedLotId,
    setSelectedLotId,
    setCurrentView,
    sessionId,
    activeLock,
    setActiveLock,
    bookingSlotId,
    setBookingSlotId,
    refreshTrigger,
    addToast,
  } = useApp();

  const [lotData, setLotData] = useState<(ParkingLot & { slots: ParkingSlot[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState<SlotFloor>(1);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [lockingSlotId, setLockingSlotId] = useState<string | null>(null);

  const loadLotDetails = useCallback(async () => {
    if (!selectedLotId) return;
    try {
      const data = await fetchLotById(selectedLotId);
      setLotData(data);
    } catch (e: any) {
      console.error('Failed to load lot details:', e);
      addToast({ type: 'error', title: 'Error', message: 'Failed to load parking lot slots' });
    } finally {
      setLoading(false);
    }
  }, [selectedLotId, addToast]);

  useEffect(() => {
    loadLotDetails();
  }, [loadLotDetails, refreshTrigger]);

  // Filter slots by floor and vehicle type
  const filteredSlots = useMemo(() => {
    if (!lotData) return [];
    return lotData.slots.filter((slot) => {
      const matchFloor = slot.floor === selectedFloor;
      const matchType = selectedType === 'ALL' || slot.type === selectedType;
      return matchFloor && matchType;
    });
  }, [lotData, selectedFloor, selectedType]);

  // Calculate live statistics
  const stats = useMemo(() => {
    if (!lotData) return { total: 0, available: 0, booked: 0, locked: 0 };
    const now = Date.now();
    let available = 0;
    let booked = 0;
    let locked = 0;

    lotData.slots.forEach((s) => {
      const isLocked = s.is_locked_until && new Date(s.is_locked_until).getTime() > now;
      if (!s.is_available) {
        booked++;
      } else if (isLocked) {
        locked++;
      } else {
        available++;
      }
    });

    return {
      total: lotData.slots.length,
      available,
      booked,
      locked,
    };
  }, [lotData]);

  // Handle slot selection & lock
  const handleSlotClick = async (slot: ParkingSlot) => {
    const now = Date.now();
    const isLocked = slot.is_locked_until && new Date(slot.is_locked_until).getTime() > now;

    // Check if slot is occupied
    if (!slot.is_available) {
      addToast({
        type: 'warning',
        title: 'Slot Occupied',
        message: `Slot ${slot.slot_number} is currently occupied by a parked vehicle.`,
      });
      return;
    }

    // Check if locked by someone else
    if (isLocked && slot.locked_by !== sessionId) {
      addToast({
        type: 'warning',
        title: 'Slot Reserved',
        message: `Slot ${slot.slot_number} is being booked by another customer. Locked for 5 mins.`,
      });
      return;
    }

    // Lock the slot
    setLockingSlotId(slot.id);
    try {
      const res = await lockSlot(slot.id, sessionId);
      if (res.success && lotData) {
        setActiveLock({
          slotId: slot.id,
          lotId: lotData.id,
          slotNumber: slot.slot_number,
          lotName: lotData.name,
          expiresAt: res.expires_at,
          pricePerHour: lotData.price_per_hour,
        });
        setBookingSlotId(slot.id);
        addToast({
          type: 'success',
          title: 'Slot Held for 5 Minutes',
          message: `Slot ${slot.slot_number} is reserved for you. Complete your vehicle details to confirm.`,
        });
        await loadLotDetails();
      }
    } catch (e: any) {
      addToast({
        type: 'error',
        title: 'Could Not Lock Slot',
        message: e.message || 'Slot was just taken by another user',
      });
      await loadLotDetails();
    } finally {
      setLockingSlotId(null);
    }
  };

  const getSlotTypeIcon = (type: SlotType) => {
    switch (type) {
      case '2W':
        return <Bike className="w-3.5 h-3.5" />;
      case 'EV':
        return <Zap className="w-3.5 h-3.5 text-cyan-300" />;
      case '4W':
      default:
        return <Car className="w-3.5 h-3.5 text-blue-300" />;
    }
  };

  if (loading || !lotData) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading cinema-style parking layout...</p>
      </div>
    );
  }

  // Active slot for modal
  const activeModalSlot = bookingSlotId ? lotData.slots.find((s) => s.id === bookingSlotId) : null;

  return (
    <div className="space-y-8 pb-20">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setSelectedLotId(null);
              setCurrentView('landing');
            }}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">{lotData.name}</h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ₹{lotData.price_per_hour}/hr
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{lotData.address}</span>
            </p>
          </div>
        </div>

        {/* Live Counters Pill */}
        <div className="flex items-center space-x-2 text-xs bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-xl">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300">
              <strong className="text-emerald-400 font-mono">{stats.available}</strong> Available
            </span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="text-slate-400">
            <strong className="text-rose-400 font-mono">{stats.booked}</strong> Booked
          </div>
          <span className="text-slate-600">•</span>
          <div className="text-slate-400">
            <strong className="text-amber-400 font-mono">{stats.locked}</strong> Held
          </div>
        </div>
      </div>

      {/* Floor & Filter Controls */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Floor Switcher */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Select Level:</span>
          </span>
          <div className="grid grid-cols-2 gap-2 flex-1 md:flex-none">
            <button
              onClick={() => setSelectedFloor(1)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                selectedFloor === 1
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
              }`}
            >
              <span>Floor 1 (Ground Deck)</span>
            </button>
            <button
              onClick={() => setSelectedFloor(2)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                selectedFloor === 2
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
              }`}
            >
              <span>Floor 2 (Upper Deck)</span>
            </button>
          </div>
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center space-x-1.5 w-full md:w-auto justify-start overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'All Bays' },
            { id: '4W', label: '🚗 4-Wheeler' },
            { id: '2W', label: '🏍️ 2-Wheeler' },
            { id: 'EV', label: '⚡ EV Charging' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${
                selectedType === t.id
                  ? 'bg-slate-800 border-emerald-500 text-emerald-400 font-semibold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cinema-Style Screen & Layout Deck */}
      <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-10 space-y-8 shadow-2xl relative overflow-hidden">
        {/* Cinema "Screen / Driveway" Header */}
        <div className="relative max-w-xl mx-auto text-center space-y-2">
          {/* Illuminated Entry Gate Strip */}
          <div className="h-3 w-full bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent rounded-full blur-[2px] shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
          <div className="w-full py-2 bg-gradient-to-b from-slate-800/90 to-slate-900/50 rounded-xl border border-slate-700/80 text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-extrabold flex items-center justify-center space-x-2">
            <span>▲ ENTRY GATE & MAIN DRIVEWAY • FLOOR {selectedFloor} ▲</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Drive in from North Gate • One-way circulatory driving lane
          </p>
        </div>

        {/* Cinema-Style Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 pb-4 border-b border-slate-800/80 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-lg bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-mono text-[9px] font-bold">
              ✓
            </div>
            <span className="text-slate-300">Available (Click to lock)</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-lg bg-rose-950/80 border-2 border-rose-600/80 flex items-center justify-center text-rose-400 font-mono text-[9px]">
              ✕
            </div>
            <span className="text-slate-400">Booked / Occupied</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-lg bg-amber-950/80 border-2 border-amber-500 flex items-center justify-center text-amber-400 font-mono text-[9px]">
              ⏱
            </div>
            <span className="text-slate-400">Locked (5-min checkout)</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-lg bg-purple-600 border-2 border-purple-400 flex items-center justify-center text-white font-mono text-[9px] shadow-md shadow-purple-500/40">
              ★
            </div>
            <span className="text-purple-300 font-medium">Selected by You</span>
          </div>
        </div>

        {/* Slots Visual Grid */}
        <div className="space-y-6">
          {filteredSlots.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No parking slots found matching selected filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {filteredSlots.map((slot) => {
                const now = Date.now();
                const isLocked = slot.is_locked_until && new Date(slot.is_locked_until).getTime() > now;
                const isSelectedByMe = activeLock?.slotId === slot.id || slot.locked_by === sessionId;
                const isAvailable = slot.is_available && (!isLocked || isSelectedByMe);
                const isOccupied = !slot.is_available;
                const isLockedByOther = isLocked && !isSelectedByMe;

                return (
                  <div
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    className={`relative group rounded-2xl p-3 sm:p-4 border-2 transition-all duration-200 select-none flex flex-col justify-between h-28 cursor-pointer ${
                      isSelectedByMe
                        ? 'bg-purple-950/70 border-purple-400 ring-4 ring-purple-500/30 scale-102 shadow-xl shadow-purple-900/30'
                        : isLockedByOther
                        ? 'bg-amber-950/30 border-amber-600/60 opacity-85 hover:border-amber-500'
                        : isOccupied
                        ? 'bg-rose-950/20 border-rose-900/60 opacity-60 cursor-not-allowed hover:border-rose-700'
                        : 'bg-slate-950/80 border-emerald-500/50 hover:border-emerald-400 hover:bg-slate-900/90 hover:scale-103 shadow-md hover:shadow-emerald-950/40'
                    }`}
                  >
                    {/* Top Row: Slot Number & Vehicle Type Icon */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono font-extrabold text-sm sm:text-base ${
                          isSelectedByMe
                            ? 'text-purple-300'
                            : isLockedByOther
                            ? 'text-amber-400'
                            : isOccupied
                            ? 'text-rose-400'
                            : 'text-white group-hover:text-emerald-400'
                        }`}
                      >
                        {slot.slot_number}
                      </span>

                      <div
                        className={`p-1.5 rounded-lg text-xs ${
                          isSelectedByMe
                            ? 'bg-purple-800/60 text-purple-200'
                            : isLockedByOther
                            ? 'bg-amber-900/50 text-amber-300'
                            : isOccupied
                            ? 'bg-rose-950 text-rose-400'
                            : 'bg-slate-800 text-slate-300 group-hover:text-white group-hover:bg-slate-700'
                        }`}
                      >
                        {getSlotTypeIcon(slot.type)}
                      </div>
                    </div>

                    {/* Middle: Parking Bay Markings (White dashed parking line effect) */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-b border-dashed border-slate-800/80 py-1 my-1">
                      <span>BAY {slot.type}</span>
                      <span>F{slot.floor}</span>
                    </div>

                    {/* Bottom Status Pill */}
                    <div className="flex items-center justify-between">
                      {isSelectedByMe ? (
                        <span className="text-[10px] font-bold text-purple-300 flex items-center space-x-1 animate-pulse">
                          <CheckCircle2 className="w-3 h-3 text-purple-400" />
                          <span>Selected</span>
                        </span>
                      ) : isLockedByOther ? (
                        <span className="text-[10px] font-semibold text-amber-400 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Hold (5m)</span>
                        </span>
                      ) : isOccupied ? (
                        <span className="text-[10px] font-semibold text-rose-400 flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>Occupied</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Available</span>
                        </span>
                      )}

                      {/* Loading spinner during lock request */}
                      {lockingSlotId === slot.id && (
                        <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Booking Drawer/Modal */}
      {activeModalSlot && (
        <BookingModal
          lot={lotData}
          slot={activeModalSlot}
          onClose={() => setBookingSlotId(null)}
          onSuccess={() => {
            loadLotDetails();
          }}
        />
      )}
    </div>
  );
};
