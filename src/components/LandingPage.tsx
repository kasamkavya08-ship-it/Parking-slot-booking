import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Search,
  MapPin,
  Navigation,
  Car,
  Bike,
  Zap,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  ParkingCircle,
  Building2,
  SlidersHorizontal,
} from 'lucide-react';
import { SlotType } from '../types/index.ts';

export const LandingPage: React.FC = () => {
  const { lots, loadingLots, setSelectedLotId, setCurrentView, triggerRefresh } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [nearMeActive, setNearMeActive] = useState(false);

  // User simulated coordinates (Madhapur/Hitech City epicenter)
  const userLat = 17.4485;
  const userLng = 17.3755;

  const calculateDistance = (lat: number, lng: number): number => {
    // Simple Euclidean distance converted to approx km
    const dLat = (lat - userLat) * 111;
    const dLng = (lng - userLng) * 105;
    return Math.sqrt(dLat * dLat + dLng * dLng);
  };

  const filteredLots = useMemo(() => {
    let result = lots.filter((lot) => {
      const q = searchQuery.toLowerCase().trim();
      const matchName = lot.name.toLowerCase().includes(q);
      const matchAddress = lot.address.toLowerCase().includes(q);
      return matchName || matchAddress;
    });

    if (nearMeActive) {
      result = [...result].sort((a, b) => {
        return calculateDistance(a.lat, a.lng) - calculateDistance(b.lat, b.lng);
      });
    }

    return result;
  }, [lots, searchQuery, nearMeActive]);

  const totalAvailable = useMemo(() => {
    return lots.reduce((acc, l) => acc + (l.available_slots || 0), 0);
  }, [lots]);

  const totalCapacity = useMemo(() => {
    return lots.reduce((acc, l) => acc + (l.total_slots || 0), 0);
  }, [lots]);

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-6 sm:p-10 lg:p-12 shadow-2xl">
        {/* Glow ambient background effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>REAL-TIME PARKING IN HYDERABAD TECH CORRIDOR</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-sans leading-tight">
            Reserve Your Parking Spot{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Before You Arrive
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Interactive cinema-style slot selection, 5-minute checkout reservation hold, digital QR pass generation, and zero wait time at gates.
          </p>

          {/* Search Bar & Near Me */}
          <div className="pt-4 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area (e.g. Hitech City, Gachibowli, Cyber Towers)..."
                className="w-full pl-10 pr-4 py-3 bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-800 text-slate-100 placeholder-slate-400 text-sm rounded-xl border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition focus:outline-none"
              />
            </div>

            <button
              onClick={() => setNearMeActive(!nearMeActive)}
              className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-semibold transition shrink-0 ${
                nearMeActive
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <Navigation className={`w-4 h-4 ${nearMeActive ? 'text-slate-950 animate-pulse' : 'text-emerald-400'}`} />
              <span>{nearMeActive ? 'Near Me: Active' : 'Near Me'}</span>
            </button>
          </div>

          {/* Quick Filter Tags */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
            <span className="text-slate-400 flex items-center space-x-1 mr-1">
              <SlidersHorizontal className="w-3 h-3" />
              <span>Quick Filter:</span>
            </span>
            {[
              { id: 'ALL', label: 'All Lots' },
              { id: 'Hitech', label: 'Cyber Towers' },
              { id: 'Gachibowli', label: 'Financial District' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setSearchQuery(chip.id === 'ALL' ? '' : chip.id)}
                className={`px-3 py-1 rounded-full border transition ${
                  (chip.id === 'ALL' && searchQuery === '') || searchQuery === chip.id
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live System Counter Pill Strip */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-center">
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="text-2xl font-bold font-mono text-emerald-400">{totalAvailable}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">Slots Available Now</div>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="text-2xl font-bold font-mono text-cyan-400">{totalCapacity}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">Total System Slots</div>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="text-2xl font-bold font-mono text-amber-400">5 Mins</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">Anti-Collision Lock</div>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="text-2xl font-bold font-mono text-purple-400">₹40 - ₹50</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">Hourly Rates</div>
          </div>
        </div>
      </section>

      {/* Parking Lots Listing */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
              <ParkingCircle className="w-6 h-6 text-emerald-400" />
              <span>Available Parking Locations</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Live spot availability refreshed automatically every 5 seconds.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span>Showing {filteredLots.length} locations</span>
          </div>
        </div>

        {loadingLots ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-80 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredLots.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-semibold text-slate-300">No parking lots found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find any parking facilities matching "{searchQuery}". Try searching for Cyber Towers or Gachibowli.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setNearMeActive(false);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredLots.map((lot) => {
              const available = lot.available_slots ?? 0;
              const total = lot.total_slots || 30;
              const percentAvailable = Math.round((available / total) * 100);
              const isLow = available < 5;
              const distanceKm = (calculateDistance(lot.lat, lot.lng) * 0.15 + 1.2).toFixed(1);

              return (
                <div
                  key={lot.id}
                  className="group relative bg-slate-900/90 rounded-2xl border border-slate-800/80 hover:border-emerald-500/50 transition-all duration-300 overflow-hidden flex flex-col shadow-xl hover:shadow-2xl hover:shadow-emerald-950/20"
                >
                  {/* Top Image Banner */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-950">
                    <img
                      src={lot.image_url}
                      alt={lot.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    {/* Price Badge */}
                    <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-lg">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Rate</div>
                      <div className="text-sm font-extrabold text-white font-mono">
                        ₹{lot.price_per_hour}
                        <span className="text-xs font-normal text-slate-300">/hr</span>
                      </div>
                    </div>

                    {/* Distance Pill */}
                    <div className="absolute top-3 left-3 flex items-center space-x-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs text-slate-200">
                      <Navigation className="w-3 h-3 text-emerald-400" />
                      <span>{distanceKm} km away</span>
                    </div>

                    {/* Available Slots overlay badge */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <div
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-bold ${
                          isLow
                            ? 'bg-rose-950/80 border-rose-600/60 text-rose-300'
                            : 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                        }`}
                      >
                        <span className="relative flex h-2 w-2">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              isLow ? 'bg-rose-400' : 'bg-emerald-400'
                            }`}
                          />
                          <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${
                              isLow ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                        </span>
                        <span>
                          {available} of {total} Slots Available
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 bg-slate-950/80 px-2 py-1 rounded-lg text-[11px] text-slate-300 border border-slate-800">
                        <span className="font-semibold text-white">{percentAvailable}%</span>
                        <span className="text-slate-400">free</span>
                      </div>
                    </div>
                  </div>

                  {/* Lot Details Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {lot.name}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-start space-x-1.5 leading-relaxed">
                        <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <span>{lot.address}</span>
                      </p>
                    </div>

                    {/* Supported Types & Amenities */}
                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-slate-800/70 text-slate-300 border border-slate-700/50">
                        <Car className="w-3.5 h-3.5 text-blue-400" />
                        <span>4-Wheeler</span>
                      </div>
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-slate-800/70 text-slate-300 border border-slate-700/50">
                        <Bike className="w-3.5 h-3.5 text-amber-400" />
                        <span>2-Wheeler</span>
                      </div>
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-md bg-slate-800/70 text-slate-300 border border-slate-700/50">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span>EV Fast Charge</span>
                      </div>
                    </div>

                    {/* Progress Bar of Capacity */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isLow ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          }`}
                          style={{ width: `${percentAvailable}%` }}
                        />
                      </div>
                    </div>

                    {/* Action CTA */}
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setSelectedLotId(lot.id);
                          setCurrentView('lot-detail');
                        }}
                        className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/35 cursor-pointer"
                      >
                        <span>Select Spot on Cinema Grid</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Feature Value Props Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white">5-Minute Collision Prevention</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            The instant you select a parking slot, it is locked server-side for 5 minutes. No other driver can book your chosen slot while you checkout.
          </p>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white">Automatic Price Metering</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Pricing is calculated via exact ceiling hour formula: <code className="text-cyan-300 font-mono">ceil(hours) × rate</code>. Zero hidden convenience fees.
          </p>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white">Instant QR Barrier Gate Pass</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Once booked, receive an instant high-resolution QR pass. Show to the gate sensor or attendant for 1-second touchless check-in and check-out.
          </p>
        </div>
      </section>
    </div>
  );
};
