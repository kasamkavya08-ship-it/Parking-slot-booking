import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ParkingLot, ParkingSlot } from '../types/index.ts';
import { createBooking, mockRazorpayPayment } from '../lib/api.ts';
import {
  X,
  Clock,
  Car,
  Bike,
  Zap,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Download,
  Ticket,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface BookingModalProps {
  lot: ParkingLot;
  slot: ParkingSlot;
  onClose: () => void;
  onSuccess: (bookingId: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ lot, slot, onClose, onSuccess }) => {
  const {
    currentUser,
    sessionId,
    activeLock,
    lockSecondsRemaining,
    releaseActiveLock,
    setActiveLock,
    addToast,
    triggerRefresh,
    setCurrentView,
  } = useApp();

  // Form states
  const [vehicleNumber, setVehicleNumber] = useState('TS 09 EA 4521');
  const [durationHours, setDurationHours] = useState<number>(2);

  // Times
  const nowIso = useMemo(() => new Date().toISOString().slice(0, 16), []);
  const [entryTime, setEntryTime] = useState<string>(nowIso);
  const [exitTime, setExitTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    return d.toISOString().slice(0, 16);
  });

  // Razorpay simulation state
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync exit time when duration pill clicked
  const handleDurationPreset = (hours: number) => {
    setDurationHours(hours);
    const entryDate = new Date(entryTime);
    const exitDate = new Date(entryDate.getTime() + hours * 3600 * 1000);
    setExitTime(exitDate.toISOString().slice(0, 16));
  };

  // Re-calculate bill when times change
  const { calculatedHours, totalPrice } = useMemo(() => {
    try {
      const entryDate = new Date(entryTime);
      const exitDate = new Date(exitTime);
      const diffMs = exitDate.getTime() - entryDate.getTime();
      const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
      return {
        calculatedHours: hours,
        totalPrice: hours * lot.price_per_hour,
      };
    } catch {
      return { calculatedHours: 1, totalPrice: lot.price_per_hour };
    }
  }, [entryTime, exitTime, lot.price_per_hour]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePayViaRazorpay = () => {
    if (!vehicleNumber.trim()) {
      addToast({ type: 'error', title: 'Vehicle Number Required', message: 'Please enter your vehicle registration plate.' });
      return;
    }
    setShowRazorpayModal(true);
  };

  const executeConfirmedBooking = async (rzpData?: any) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      const res = await createBooking({
        user_id: currentUser.id,
        lot_id: lot.id,
        slot_id: slot.id,
        vehicle_number: vehicleNumber,
        entry_time: new Date(entryTime).toISOString(),
        exit_time: new Date(exitTime).toISOString(),
        sessionId,
        payment_method: rzpData ? 'razorpay_mock' : 'pay_at_gate',
      });

      if (res.success && res.booking) {
        setConfirmedBooking(res.booking);
        // Clear active lock because it is now confirmed
        setActiveLock(null);
        triggerRefresh();
        addToast({
          type: 'success',
          title: 'Booking Confirmed!',
          message: `Slot ${slot.slot_number} reserved successfully. Your digital QR pass is ready.`,
        });
        onSuccess(res.booking.id);
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Booking Failed',
        message: err.message || 'Could not complete booking',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateRazorpaySuccess = async () => {
    setPaymentProcessing(true);
    try {
      const rzpRes = await mockRazorpayPayment({
        amount: totalPrice,
        vehicle_number: vehicleNumber,
        method: 'upi',
      });
      setPaymentSuccessData(rzpRes);
      setTimeout(async () => {
        setShowRazorpayModal(false);
        setPaymentProcessing(false);
        await executeConfirmedBooking(rzpRes);
      }, 900);
    } catch (e: any) {
      setPaymentProcessing(false);
      addToast({ type: 'error', title: 'Payment Simulation Error', message: e.message });
    }
  };

  // If already confirmed, render the final QR Ticket pass
  if (confirmedBooking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Confirmed Ribbon */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Booking Confirmed!</h2>
            <p className="text-xs text-slate-300">
              Present this digital pass at the entry gate barrier for instant scanning.
            </p>
          </div>

          {/* Ticket Pass Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5 relative">
            {/* Cutout notches */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 rounded-full border border-slate-800" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 rounded-full border border-slate-800" />

            <div className="flex items-start justify-between border-b border-dashed border-slate-800 pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400">
                  PASS ID: {confirmedBooking.id}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{lot.name}</h3>
                <p className="text-[11px] text-slate-400">{lot.address}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-400">Reserved Slot</span>
                <div className="text-2xl font-extrabold font-mono text-emerald-400">
                  {slot.slot_number}
                </div>
                <span className="text-[10px] text-slate-400">Floor {slot.floor}</span>
              </div>
            </div>

            {/* Middle QR Code */}
            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              <div className="p-3 bg-white rounded-2xl shadow-md">
                {confirmedBooking.qr_code.startsWith('data:') ? (
                  <img
                    src={confirmedBooking.qr_code}
                    alt="Booking QR Code"
                    className="w-48 h-48 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-slate-900 text-slate-100 font-mono text-xs p-2 text-center">
                    {confirmedBooking.qr_code}
                  </div>
                )}
              </div>
              <div className="font-mono text-xs text-slate-400 tracking-wider">
                VEHICLE: <span className="text-white font-bold">{confirmedBooking.vehicle_number}</span>
              </div>
            </div>

            {/* Ticket Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-dashed border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Entry Time</span>
                <span className="text-slate-200 font-medium">
                  {new Date(confirmedBooking.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Exit Time</span>
                <span className="text-slate-200 font-medium">
                  {new Date(confirmedBooking.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Duration</span>
                <span className="text-slate-200 font-medium">{calculatedHours} Hours</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Paid Total</span>
                <span className="text-emerald-400 font-bold font-mono">₹{confirmedBooking.total_price} (Paid)</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                onClose();
                setCurrentView('bookings');
              }}
              className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
            >
              <Ticket className="w-4 h-4" />
              <span>Go to My Bookings</span>
            </button>
            <button
              onClick={onClose}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-semibold rounded-xl transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-5 sm:p-7 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={async () => {
            await releaseActiveLock();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          title="Cancel and release slot"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Lock Warning */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
              SLOT {slot.slot_number}
            </span>
            <span className="text-xs text-slate-400">Floor {slot.floor} • {slot.type} Bay</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Confirm Slot Reservation
          </h2>
          <p className="text-xs text-slate-400">{lot.name} • {lot.address}</p>

          {/* 5-minute countdown status pill */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200">
            <div className="flex items-center space-x-2 text-xs">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin-slow" />
              <span>Temporary Lock Active (Held for you):</span>
            </div>
            <div className="font-mono text-sm font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/40 text-amber-300">
              {formatTimer(lockSecondsRemaining)}
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          {/* Vehicle Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Vehicle Number Plate</span>
              <span className="text-[11px] text-slate-500 font-normal">State code + Registration</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="TS 09 EA 4521"
                className="w-full px-4 py-3 bg-slate-950 text-slate-100 placeholder-slate-500 font-mono text-base font-bold tracking-widest rounded-xl border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 uppercase transition"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-500 mr-1 self-center">Quick fill:</span>
              {[
                { label: 'My Car', val: 'TS 09 EA 4521' },
                { label: 'My Bike', val: 'TS 08 AB 1234' },
                { label: 'EV Cab', val: 'TS 07 UA 9876' },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setVehicleNumber(p.val)}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition"
                >
                  {p.label}: <span className="font-mono text-slate-400">{p.val}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Times Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Entry Time</span>
              </label>
              <input
                type="datetime-local"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 text-slate-200 text-xs rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Exit Time</span>
              </label>
              <input
                type="datetime-local"
                value={exitTime}
                onChange={(e) => setExitTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 text-slate-200 text-xs rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Duration Pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Quick Duration</label>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 4, 8, 24].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleDurationPreset(h)}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition border ${
                    durationHours === h
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  +{h}h
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing Breakdown Card */}
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Hourly Tariff ({lot.name})</span>
            <span className="font-mono text-slate-300">₹{lot.price_per_hour}/hr</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Billed Duration (Ceil hours)</span>
            <span className="font-mono text-slate-300">{calculatedHours} Hour(s)</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Formula</span>
            <span className="font-mono text-[11px] text-slate-500">
              ceil({calculatedHours}h) × ₹{lot.price_per_hour}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm font-bold text-white border-t border-slate-800 pt-2">
            <span>Total Payable Amount</span>
            <span className="font-mono text-xl text-emerald-400">₹{totalPrice}</span>
          </div>
        </div>

        {/* Action Buttons: Pay via Razorpay or Pay at Gate */}
        <div className="space-y-2.5">
          <button
            onClick={handlePayViaRazorpay}
            disabled={isSubmitting || lockSecondsRemaining <= 0}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-sm rounded-xl transition shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay ₹{totalPrice} via Razorpay (Mock)</span>
          </button>

          <button
            onClick={() => executeConfirmedBooking()}
            disabled={isSubmitting || lockSecondsRemaining <= 0}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Confirm & Pay Later at Gate Barrier</span>
          </button>
        </div>

        {/* Razorpay Simulation Modal */}
        {showRazorpayModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
              <button
                onClick={() => setShowRazorpayModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-white text-lg">
                  R
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Razorpay Standard Checkout</h3>
                  <p className="text-[11px] text-slate-400">Merchant: ParkEase Hyderabad</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-500">Order Amount</span>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                  ₹{totalPrice}.00
                </div>
                <div className="text-xs text-slate-400">
                  Vehicle: <span className="font-mono text-white">{vehicleNumber}</span> • Slot:{' '}
                  <span className="font-mono text-white">{slot.slot_number}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-slate-400 font-medium">Select Payment Method (Simulated):</p>
                <div className="space-y-1.5">
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-emerald-500/40 flex items-center justify-between cursor-pointer">
                    <span className="text-slate-200 font-medium">UPI / GPay / PhonePe</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">Instant</span>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 flex items-center justify-between opacity-80">
                    <span className="text-slate-300">Credit / Debit Card (Visa/Mastercard)</span>
                    <span className="text-[10px] text-slate-500">Mock</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSimulateRazorpaySuccess}
                disabled={paymentProcessing}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {paymentProcessing ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Processing Mock Razorpay Gateway...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorize Mock Payment of ₹{totalPrice}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
