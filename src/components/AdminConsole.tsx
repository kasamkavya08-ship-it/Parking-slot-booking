import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ParkingLot, Booking, SlotType, SlotFloor } from '../types/index.ts';
import {
  fetchBookings,
  createLot,
  bulkCreateSlots,
  checkInBooking,
  checkOutBooking,
  verifyQr,
  cancelBooking,
  resetDatabase,
} from '../lib/api.ts';
import {
  ShieldCheck,
  QrCode,
  Layers,
  PlusCircle,
  RotateCcw,
  Search,
  CheckCircle2,
  XCircle,
  Car,
  Clock,
  Building2,
  Check,
  AlertCircle,
  Camera,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const AdminConsole: React.FC = () => {
  const { lots, refreshLots, triggerRefresh, addToast, refreshTrigger } = useApp();

  const [activeTab, setActiveTab] = useState<'scanner' | 'bookings' | 'add-lot' | 'bulk-slots'>('scanner');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Scanner states
  const [qrInputToken, setQrInputToken] = useState('');
  const [scannedBooking, setScannedBooking] = useState<Booking | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Add Lot form states
  const [newLotName, setNewLotName] = useState('');
  const [newLotAddress, setNewLotAddress] = useState('');
  const [newLotLat, setNewLotLat] = useState('17.4399');
  const [newLotLng, setNewLotLng] = useState('78.3792');
  const [newLotPrice, setNewLotPrice] = useState('45');
  const [newLotImage, setNewLotImage] = useState('https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80');
  const [isCreatingLot, setIsCreatingLot] = useState(false);

  // Bulk Slot form states
  const [bulkLotId, setBulkLotId] = useState<string>('');
  const [bulkPrefix, setBulkPrefix] = useState('E');
  const [bulkStart, setBulkStart] = useState('1');
  const [bulkCount, setBulkCount] = useState('20');
  const [bulkType, setBulkType] = useState<SlotType>('4W');
  const [bulkFloor, setBulkFloor] = useState<SlotFloor>(1);
  const [isCreatingBulk, setIsCreatingBulk] = useState(false);

  // Bookings search & filter
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');

  const loadAllBookings = useCallback(async () => {
    try {
      const data = await fetchBookings();
      setBookings(data);
    } catch (e: any) {
      console.error('Failed to load bookings:', e);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    loadAllBookings();
  }, [loadAllBookings, refreshTrigger]);

  useEffect(() => {
    if (lots.length > 0 && !bulkLotId) {
      setBulkLotId(lots[0].id);
    }
  }, [lots, bulkLotId]);

  // Overall analytics
  const metrics = useMemo(() => {
    const totalLots = lots.length;
    const totalCapacity = lots.reduce((acc, l) => acc + (l.total_slots || 0), 0);
    const totalAvailable = lots.reduce((acc, l) => acc + (l.available_slots || 0), 0);
    const totalBookings = bookings.length;
    const activeBookings = bookings.filter((b) => b.status === 'booked' || b.status === 'checked_in').length;
    const totalRevenue = bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((acc, b) => acc + b.total_price, 0);

    return {
      totalLots,
      totalCapacity,
      totalAvailable,
      totalBookings,
      activeBookings,
      totalRevenue,
    };
  }, [lots, bookings]);

  // Handle QR scan / token lookup
  const handleVerifyQr = async (tokenToVerify?: string) => {
    const token = tokenToVerify || qrInputToken;
    if (!token.trim()) return;

    setScannerLoading(true);
    setScannerError(null);
    setScannedBooking(null);

    try {
      const res = await verifyQr(token);
      if (res.valid && res.booking) {
        setScannedBooking(res.booking);
        addToast({
          type: 'success',
          title: 'QR Code Verified',
          message: `Booking located for vehicle ${res.booking.vehicle_number}`,
        });
      }
    } catch (e: any) {
      setScannerError(e.message || 'Invalid QR code or booking token not found');
    } finally {
      setScannerLoading(false);
    }
  };

  // Check-In handler
  const handleCheckIn = async (bookingId: string) => {
    try {
      const res = await checkInBooking(bookingId);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Vehicle Checked In',
          message: `Vehicle ${res.booking.vehicle_number} entered parking lot. Slot remains booked.`,
        });
        setScannedBooking(res.booking);
        await loadAllBookings();
        triggerRefresh();
      }
    } catch (e: any) {
      addToast({ type: 'error', title: 'Check-in Error', message: e.message });
    }
  };

  // Check-Out handler (releases slot to available)
  const handleCheckOut = async (bookingId: string) => {
    try {
      const res = await checkOutBooking(bookingId);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Vehicle Checked Out',
          message: `Vehicle completed parking. Slot ${res.booking.slot_number} is now released and available.`,
        });
        setScannedBooking(res.booking);
        await loadAllBookings();
        triggerRefresh();
      }
    } catch (e: any) {
      addToast({ type: 'error', title: 'Check-out Error', message: e.message });
    }
  };

  // Cancel booking handler
  const handleCancel = async (bookingId: string) => {
    try {
      const res = await cancelBooking(bookingId);
      if (res.success) {
        addToast({
          type: 'info',
          title: 'Booking Cancelled',
          message: 'Booking cancelled and slot made available again.',
        });
        if (scannedBooking?.id === bookingId) {
          setScannedBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
        }
        await loadAllBookings();
        triggerRefresh();
      }
    } catch (e: any) {
      addToast({ type: 'error', title: 'Cancel Error', message: e.message });
    }
  };

  // Add Lot Submit
  const handleCreateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLotName || !newLotAddress) return;

    setIsCreatingLot(true);
    try {
      await createLot({
        name: newLotName,
        address: newLotAddress,
        lat: parseFloat(newLotLat) || 17.44,
        lng: parseFloat(newLotLng) || 78.37,
        price_per_hour: parseFloat(newLotPrice) || 40,
        image_url: newLotImage,
      });

      addToast({
        type: 'success',
        title: 'Parking Lot Created',
        message: `${newLotName} was successfully registered!`,
      });

      setNewLotName('');
      setNewLotAddress('');
      await refreshLots();
      setActiveTab('bulk-slots');
    } catch (e: any) {
      addToast({ type: 'error', title: 'Creation Error', message: e.message });
    } finally {
      setIsCreatingLot(false);
    }
  };

  // Bulk Slot Creation Submit
  const handleCreateBulkSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkLotId || !bulkPrefix) return;

    setIsCreatingBulk(true);
    try {
      const res = await bulkCreateSlots({
        lot_id: bulkLotId,
        prefix: bulkPrefix,
        start: parseInt(bulkStart, 10) || 1,
        count: parseInt(bulkCount, 10) || 10,
        type: bulkType,
        floor: bulkFloor,
      });

      addToast({
        type: 'success',
        title: 'Bulk Slots Created',
        message: `Successfully generated ${res.count} new parking slots (${bulkPrefix}${bulkStart}..${bulkPrefix}${parseInt(bulkStart, 10) + res.count - 1})!`,
      });

      await refreshLots();
      triggerRefresh();
    } catch (e: any) {
      addToast({ type: 'error', title: 'Bulk Creation Error', message: e.message });
    } finally {
      setIsCreatingBulk(false);
    }
  };

  // Reset database handler
  const handleResetDatabase = async () => {
    if (!window.confirm('Reset database to default seed data (Hitech City & Gachibowli lots with 30 slots each)?')) {
      return;
    }
    try {
      await resetDatabase();
      addToast({
        type: 'success',
        title: 'Database Reset',
        message: 'System state reset to clean seed data.',
      });
      await refreshLots();
      await loadAllBookings();
      triggerRefresh();
    } catch (e: any) {
      addToast({ type: 'error', title: 'Reset Error', message: e.message });
    }
  };

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const q = bookingSearch.toLowerCase().trim();
      const matchVehicle = b.vehicle_number.toLowerCase().includes(q);
      const matchId = b.id.toLowerCase().includes(q);
      const matchLot = (b.lot_name || '').toLowerCase().includes(q);
      const matchText = matchVehicle || matchId || matchLot;

      const matchStatus = bookingStatusFilter === 'ALL' || b.status === bookingStatusFilter;
      return matchText && matchStatus;
    });
  }, [bookings, bookingSearch, bookingStatusFilter]);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            <span>Admin Control Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gate QR scanner barrier, lot fleet management, bulk bay provisioner & live occupancy
          </p>
        </div>

        <button
          onClick={handleResetDatabase}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
          title="Reset database to seed lots and slots"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Seed</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Lots</span>
          <div className="text-2xl font-extrabold text-white font-mono">{metrics.totalLots}</div>
          <span className="text-[10px] text-emerald-400">Hyderabad Hubs</span>
        </div>

        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Available Slots</span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {metrics.totalAvailable} <span className="text-xs text-slate-500 font-normal">/ {metrics.totalCapacity}</span>
          </div>
          <span className="text-[10px] text-slate-400">Real-time capacity</span>
        </div>

        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Active Vehicles</span>
          <div className="text-2xl font-extrabold text-cyan-400 font-mono">{metrics.activeBookings}</div>
          <span className="text-[10px] text-cyan-300">Booked & Parked</span>
        </div>

        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Revenue</span>
          <div className="text-2xl font-extrabold text-purple-400 font-mono">₹{metrics.totalRevenue}</div>
          <span className="text-[10px] text-purple-300">Processed payments</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs sm:text-sm">
        {[
          { id: 'scanner', label: 'Gate QR Scanner', icon: QrCode },
          { id: 'bookings', label: 'All Bookings Audit', icon: Layers },
          { id: 'add-lot', label: 'Add Parking Lot', icon: Building2 },
          { id: 'bulk-slots', label: 'Bulk Generate Slots (A1-A50)', icon: PlusCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Gate QR Scanner */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Input Panel */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span>Gate Barrier QR Reader</span>
              </h3>
              <p className="text-xs text-slate-400">
                Scan customer barcode or enter ticket ID / vehicle number for instant check-in/out.
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={qrInputToken}
                  onChange={(e) => setQrInputToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyQr()}
                  placeholder="Paste QR Token, Ticket ID (e.g. bk_sample_01), or Vehicle Plate..."
                  className="w-full pl-4 pr-10 py-3 bg-slate-950 text-slate-100 placeholder-slate-500 text-xs rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none font-mono"
                />
                <button
                  onClick={() => handleVerifyQr()}
                  disabled={scannerLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  {scannerLoading ? 'Checking...' : 'Verify'}
                </button>
              </div>

              {/* Quick Preset Buttons from Real Bookings */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] text-slate-400 font-semibold block">
                  Click to simulate live barrier scan:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {bookings.slice(0, 4).map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setQrInputToken(b.id);
                        handleVerifyQr(b.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700 flex items-center space-x-1"
                    >
                      <QrCode className="w-3 h-3 text-emerald-400" />
                      <span>{b.vehicle_number} ({b.slot_number})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {scannerError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{scannerError}</span>
              </div>
            )}
          </div>

          {/* Scanner Result Card */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-5 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              <span>Gate Decision & Action</span>
            </h3>

            {scannedBooking ? (
              <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-5">
                <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Pass #{scannedBooking.id}
                    </span>
                    <h4 className="text-lg font-bold text-white mt-0.5">{scannedBooking.vehicle_number}</h4>
                    <p className="text-xs text-slate-400">{scannedBooking.user_name || 'Registered Driver'}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase block">Status</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                        scannedBooking.status === 'checked_in'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : scannedBooking.status === 'booked'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : scannedBooking.status === 'completed'
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {scannedBooking.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Slot Allocated</span>
                    <span className="text-emerald-400 font-mono font-bold text-base">
                      {scannedBooking.slot_number} (Floor {scannedBooking.slot_floor})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Parking Lot</span>
                    <span className="text-slate-200 font-semibold">{scannedBooking.lot_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Scheduled Entry</span>
                    <span className="text-slate-300">
                      {new Date(scannedBooking.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Scheduled Exit</span>
                    <span className="text-slate-300">
                      {new Date(scannedBooking.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Gate Barrier Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {scannedBooking.status === 'booked' && (
                    <button
                      onClick={() => handleCheckIn(scannedBooking.id)}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>OPEN BARRIER: Check In Vehicle (Enter Lot)</span>
                    </button>
                  )}

                  {scannedBooking.status === 'checked_in' && (
                    <button
                      onClick={() => handleCheckOut(scannedBooking.id)}
                      className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20"
                    >
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                      <span>OPEN BARRIER: Check Out Vehicle & Release Slot {scannedBooking.slot_number}</span>
                    </button>
                  )}

                  {scannedBooking.status === 'completed' && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs text-center font-medium">
                      ✓ Parking cycle complete. Slot is already marked available.
                    </div>
                  )}

                  {scannedBooking.status === 'cancelled' && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs text-center font-medium">
                      ✕ This booking was cancelled. Barrier will not open.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <QrCode className="w-10 h-10 mx-auto text-slate-700" />
                <p>Scan a QR code or click a test vehicle plate on the left to load gate verification.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: All Bookings Audit */}
      {activeTab === 'bookings' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white">All System Bookings</h3>

            {/* Filter controls */}
            <div className="flex items-center space-x-2 w-full sm:w-auto text-xs">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  placeholder="Search vehicle, ID, lot..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 text-slate-200 text-xs rounded-lg border border-slate-700 focus:outline-none"
                />
              </div>

              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                className="bg-slate-950 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="booked">Booked</option>
                <option value="checked_in">Checked In</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Lot & Slot</th>
                  <th className="py-3 px-4">Times</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{b.id}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white">{b.vehicle_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{b.lot_name}</div>
                      <div className="text-[10px] text-emerald-400 font-mono">Slot {b.slot_number} (F{b.slot_floor})</div>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      <div>In: {new Date(b.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div>Out: {new Date(b.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">₹{b.total_price}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          b.status === 'checked_in'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : b.status === 'booked'
                            ? 'bg-blue-500/20 text-blue-400'
                            : b.status === 'completed'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {b.status === 'booked' && (
                        <button
                          onClick={() => handleCheckIn(b.id)}
                          className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 rounded text-[10px] font-bold transition"
                        >
                          Check In
                        </button>
                      )}
                      {b.status === 'checked_in' && (
                        <button
                          onClick={() => handleCheckOut(b.id)}
                          className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 rounded text-[10px] font-bold transition"
                        >
                          Check Out
                        </button>
                      )}
                      {b.status === 'booked' && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded text-[10px] font-bold transition"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Add Parking Lot */}
      {activeTab === 'add-lot' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 max-w-2xl mx-auto space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span>Register New Parking Facility</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Add a new commercial parking lot or deck to the ParkEase network.
            </p>
          </div>

          <form onSubmit={handleCreateLot} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Lot Name</label>
              <input
                type="text"
                required
                value={newLotName}
                onChange={(e) => setNewLotName(e.target.value)}
                placeholder="e.g. Mindspace West Tech Park Parking Hub"
                className="w-full px-3 py-2 bg-slate-950 text-slate-100 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Full Address</label>
              <input
                type="text"
                required
                value={newLotAddress}
                onChange={(e) => setNewLotAddress(e.target.value)}
                placeholder="e.g. Mindspace Cyberabad, Madhapur, Hyderabad"
                className="w-full px-3 py-2 bg-slate-950 text-slate-100 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Latitude</label>
                <input
                  type="text"
                  required
                  value={newLotLat}
                  onChange={(e) => setNewLotLat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-100 font-mono rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Longitude</label>
                <input
                  type="text"
                  required
                  value={newLotLng}
                  onChange={(e) => setNewLotLng(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-100 font-mono rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Price Per Hour (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newLotPrice}
                  onChange={(e) => setNewLotPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-100 font-mono rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Image URL</label>
                <input
                  type="url"
                  required
                  value={newLotImage}
                  onChange={(e) => setNewLotImage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-100 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreatingLot}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isCreatingLot ? 'Creating...' : 'Create Parking Lot & Proceed to Add Slots'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Bulk Slot Generator */}
      {activeTab === 'bulk-slots' && (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 max-w-2xl mx-auto space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              <span>Bulk Slot Provisioner (A1 - A50)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Quickly provision ranges of parking bays for cinema-style layout.
            </p>
          </div>

          <form onSubmit={handleCreateBulkSlots} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Target Parking Lot</label>
              <select
                value={bulkLotId}
                onChange={(e) => setBulkLotId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 text-slate-100 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.total_slots || 0} existing slots)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Bay Prefix</label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())}
                  placeholder="e.g. A or B"
                  className="w-full px-3 py-2 bg-slate-950 text-slate-100 font-mono font-bold rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Start Number</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={bulkStart}
                  onChange={(e) => setBulkStart(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-100 font-mono rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Count (Qty)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-100 font-mono rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Vehicle Slot Type</label>
                <select
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value as SlotType)}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-100 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="4W">4-Wheeler Car</option>
                  <option value="2W">2-Wheeler Bike</option>
                  <option value="EV">EV Charging Station</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Floor Level</label>
                <select
                  value={bulkFloor}
                  onChange={(e) => setBulkFloor(parseInt(e.target.value, 10) as SlotFloor)}
                  className="w-full px-3 py-2 bg-slate-950 text-slate-100 rounded-xl border border-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value={1}>Floor 1 (Ground)</option>
                  <option value={2}>Floor 2 (Upper Deck)</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 font-mono text-[11px]">
              Preview Range: <span className="text-emerald-400 font-bold">{bulkPrefix}-{bulkStart.padStart(2, '0')}</span> to{' '}
              <span className="text-emerald-400 font-bold">
                {bulkPrefix}-{(parseInt(bulkStart, 10) + parseInt(bulkCount, 10) - 1).toString().padStart(2, '0')}
              </span>
            </div>

            <button
              type="submit"
              disabled={isCreatingBulk}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isCreatingBulk ? 'Generating Slots...' : `Generate ${bulkCount} Slots`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
