import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { ParkingLot, ParkingSlot, Booking, Payment, User, SlotType, SlotFloor } from '../src/types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseState {
  users: User[];
  parking_lots: ParkingLot[];
  parking_slots: ParkingSlot[];
  bookings: Booking[];
  payments: Payment[];
}

// Full PostgreSQL / Supabase Schema Definition for the Swagger Docs & Supabase Export
export const SUPABASE_SQL_SCHEMA = `-- ====================================================================
-- PARKEASE: SUPABASE / POSTGRESQL PRODUCTION DDL SCHEMA
-- ====================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(30) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'owner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PARKING LOTS TABLE
CREATE TABLE IF NOT EXISTS public.parking_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    lat NUMERIC(10, 7) NOT NULL,
    lng NUMERIC(10, 7) NOT NULL,
    total_slots INTEGER NOT NULL DEFAULT 0,
    price_per_hour NUMERIC(10, 2) NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PARKING SLOTS TABLE
CREATE TABLE IF NOT EXISTS public.parking_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES public.parking_lots(id) ON DELETE CASCADE,
    slot_number VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('2W', '4W', 'EV')),
    floor SMALLINT NOT NULL CHECK (floor IN (1, 2)),
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_locked_until TIMESTAMP WITH TIME ZONE,
    locked_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_lot_slot UNIQUE (lot_id, slot_number)
);

-- Index for speedy availability queries and lock filtering
CREATE INDEX IF NOT EXISTS idx_slots_lot_availability ON public.parking_slots(lot_id, is_available, is_locked_until);

-- 4. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    lot_id UUID NOT NULL REFERENCES public.parking_lots(id) ON DELETE RESTRICT,
    slot_id UUID NOT NULL REFERENCES public.parking_slots(id) ON DELETE RESTRICT,
    vehicle_number VARCHAR(30) NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'checked_in', 'completed', 'cancelled')),
    total_price NUMERIC(10, 2) NOT NULL,
    qr_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    transaction_ref VARCHAR(100),
    payment_method VARCHAR(50) DEFAULT 'razorpay',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ENABLE ROW LEVEL SECURITY (RLS) FOR SUPABASE
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Public read parking lots" ON public.parking_lots FOR SELECT USING (true);
CREATE POLICY "Public read parking slots" ON public.parking_slots FOR SELECT USING (true);
CREATE POLICY "Users read own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');
`;

function getSeedData(): DatabaseState {
  const users: User[] = [
    {
      id: 'usr_kavya_01',
      name: 'Kavya Kasam',
      email: 'kasamkavya14@gmail.com',
      phone: '+91 98765 43210',
      role: 'user',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'usr_vikram_admin',
      name: 'Vikram Reddy',
      email: 'vikram.reddy@parkease.io',
      phone: '+91 91234 56789',
      role: 'admin',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: 'usr_rahul_owner',
      name: 'Rahul Verma',
      email: 'rahul.verma@parkease.io',
      phone: '+91 99887 76655',
      role: 'owner',
      created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    },
  ];

  const lots: ParkingLot[] = [
    {
      id: 'lot_hitech_01',
      name: 'Cyber Towers Tech & Transit Hub',
      address: 'Plot 4, Cyber Towers Circle, Hitech City, Hyderabad, Telangana 500081',
      lat: 17.4504,
      lng: 78.3808,
      total_slots: 30,
      price_per_hour: 40,
      image_url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80',
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
    {
      id: 'lot_gachibowli_02',
      name: 'Financial District Smart Park Deck',
      address: 'ISB Road, Near WaveRock, Gachibowli, Hyderabad, Telangana 500032',
      lat: 17.4401,
      lng: 78.3489,
      total_slots: 30,
      price_per_hour: 50,
      image_url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=80',
      created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    },
  ];

  const slots: ParkingSlot[] = [];

  // Seed 30 slots for Lot 1 (Hitech City): Floor 1 (A1-A15), Floor 2 (B1-B15)
  for (let i = 1; i <= 15; i++) {
    const slotNum = `A-${i.toString().padStart(2, '0')}`;
    let type: SlotType = '4W';
    if (i >= 11 && i <= 13) type = '2W';
    if (i >= 14) type = 'EV';

    // A few initial booked slots for realism
    const isBooked = i === 2 || i === 7;
    slots.push({
      id: `slot_hitech_f1_${i}`,
      lot_id: 'lot_hitech_01',
      slot_number: slotNum,
      type,
      floor: 1,
      is_available: !isBooked,
      is_locked_until: null,
      locked_by: null,
    });
  }

  for (let i = 1; i <= 15; i++) {
    const slotNum = `B-${i.toString().padStart(2, '0')}`;
    let type: SlotType = '4W';
    if (i >= 11 && i <= 13) type = '2W';
    if (i >= 14) type = 'EV';

    const isBooked = i === 4;
    slots.push({
      id: `slot_hitech_f2_${i}`,
      lot_id: 'lot_hitech_01',
      slot_number: slotNum,
      type,
      floor: 2,
      is_available: !isBooked,
      is_locked_until: null,
      locked_by: null,
    });
  }

  // Seed 30 slots for Lot 2 (Gachibowli): Floor 1 (C1-C15), Floor 2 (D1-D15)
  for (let i = 1; i <= 15; i++) {
    const slotNum = `C-${i.toString().padStart(2, '0')}`;
    let type: SlotType = '4W';
    if (i >= 10 && i <= 12) type = '2W';
    if (i >= 13) type = 'EV';

    const isBooked = i === 1 || i === 8;
    slots.push({
      id: `slot_gachi_f1_${i}`,
      lot_id: 'lot_gachibowli_02',
      slot_number: slotNum,
      type,
      floor: 1,
      is_available: !isBooked,
      is_locked_until: null,
      locked_by: null,
    });
  }

  for (let i = 1; i <= 15; i++) {
    const slotNum = `D-${i.toString().padStart(2, '0')}`;
    let type: SlotType = '4W';
    if (i >= 10 && i <= 12) type = '2W';
    if (i >= 13) type = 'EV';

    const isBooked = i === 5;
    slots.push({
      id: `slot_gachi_f2_${i}`,
      lot_id: 'lot_gachibowli_02',
      slot_number: slotNum,
      type,
      floor: 2,
      is_available: !isBooked,
      is_locked_until: null,
      locked_by: null,
    });
  }

  const now = new Date();
  const bookings: Booking[] = [
    {
      id: 'bk_sample_01',
      user_id: 'usr_kavya_01',
      lot_id: 'lot_hitech_01',
      slot_id: 'slot_hitech_f1_2',
      vehicle_number: 'TS 09 EA 4521',
      entry_time: new Date(now.getTime() - 3600000 * 2).toISOString(),
      exit_time: new Date(now.getTime() + 3600000 * 2).toISOString(),
      status: 'checked_in',
      total_price: 160,
      qr_code: 'PARKEASE-BK-SAMPLE01-TS09EA4521',
      created_at: new Date(now.getTime() - 3600000 * 2.5).toISOString(),
    },
    {
      id: 'bk_sample_02',
      user_id: 'usr_kavya_01',
      lot_id: 'lot_hitech_01',
      slot_id: 'slot_hitech_f1_7',
      vehicle_number: 'TS 08 AB 9898',
      entry_time: new Date(now.getTime() + 3600000).toISOString(),
      exit_time: new Date(now.getTime() + 3600000 * 4).toISOString(),
      status: 'booked',
      total_price: 120,
      qr_code: 'PARKEASE-BK-SAMPLE02-TS08AB9898',
      created_at: new Date(now.getTime() - 1800000).toISOString(),
    },
    {
      id: 'bk_sample_03',
      user_id: 'usr_kavya_01',
      lot_id: 'lot_gachibowli_02',
      slot_id: 'slot_gachi_f1_1',
      vehicle_number: 'AP 28 BC 1234',
      entry_time: new Date(now.getTime() - 86400000).toISOString(),
      exit_time: new Date(now.getTime() - 86400000 + 7200000).toISOString(),
      status: 'completed',
      total_price: 100,
      qr_code: 'PARKEASE-BK-SAMPLE03-AP28BC1234',
      created_at: new Date(now.getTime() - 86400000 - 3600000).toISOString(),
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay_01',
      booking_id: 'bk_sample_01',
      amount: 160,
      status: 'success',
      transaction_ref: 'pay_rzp_mock_94821',
      payment_method: 'razorpay_upi',
      created_at: new Date(now.getTime() - 3600000 * 2.5).toISOString(),
    },
    {
      id: 'pay_02',
      booking_id: 'bk_sample_02',
      amount: 120,
      status: 'success',
      transaction_ref: 'pay_rzp_mock_94822',
      payment_method: 'razorpay_card',
      created_at: new Date(now.getTime() - 1800000).toISOString(),
    },
    {
      id: 'pay_03',
      booking_id: 'bk_sample_03',
      amount: 100,
      status: 'success',
      transaction_ref: 'pay_rzp_mock_94800',
      payment_method: 'razorpay_upi',
      created_at: new Date(now.getTime() - 86400000 - 3600000).toISOString(),
    },
  ];

  return {
    users,
    parking_lots: lots,
    parking_slots: slots,
    bookings,
    payments,
  };
}

class Database {
  private state: DatabaseState;

  constructor() {
    this.state = this.load();
    // Periodic lock cleanup every 10 seconds
    setInterval(() => {
      this.releaseExpiredLocks();
    }, 10000);
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.parking_lots && parsed.parking_slots && parsed.bookings) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read existing db.json, generating fresh seed data:', e);
    }
    const seed = getSeedData();
    this.save(seed);
    return seed;
  }

  private save(state?: DatabaseState) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(state || this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist database state:', e);
    }
  }

  public resetSeed() {
    this.state = getSeedData();
    this.save();
    return this.state;
  }

  public releaseExpiredLocks(): number {
    const now = Date.now();
    let releasedCount = 0;
    for (const slot of this.state.parking_slots) {
      if (slot.is_locked_until) {
        const lockTime = new Date(slot.is_locked_until).getTime();
        if (lockTime <= now) {
          slot.is_locked_until = null;
          slot.locked_by = null;
          releasedCount++;
        }
      }
    }
    if (releasedCount > 0) {
      this.save();
    }
    return releasedCount;
  }

  // Users
  public getUsers(): User[] {
    return this.state.users;
  }

  public getUserById(id: string): User | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  public createUser(user: Omit<User, 'id' | 'created_at'>): User {
    const newUser: User = {
      ...user,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    this.state.users.push(newUser);
    this.save();
    return newUser;
  }

  // Parking Lots
  public getLots(): ParkingLot[] {
    this.releaseExpiredLocks();
    return this.state.parking_lots.map((lot) => {
      const lotSlots = this.state.parking_slots.filter((s) => s.lot_id === lot.id);
      const availableCount = lotSlots.filter((s) => {
        const isLocked = s.is_locked_until && new Date(s.is_locked_until).getTime() > Date.now();
        return s.is_available && !isLocked;
      }).length;

      return {
        ...lot,
        total_slots: lotSlots.length,
        available_slots: availableCount,
      };
    });
  }

  public getLotById(id: string): (ParkingLot & { slots: ParkingSlot[] }) | null {
    this.releaseExpiredLocks();
    const lot = this.state.parking_lots.find((l) => l.id === id);
    if (!lot) return null;

    const slots = this.state.parking_slots.filter((s) => s.lot_id === id);
    const availableCount = slots.filter((s) => {
      const isLocked = s.is_locked_until && new Date(s.is_locked_until).getTime() > Date.now();
      return s.is_available && !isLocked;
    }).length;

    return {
      ...lot,
      total_slots: slots.length,
      available_slots: availableCount,
      slots,
    };
  }

  public createLot(lot: Omit<ParkingLot, 'id' | 'created_at'>): ParkingLot {
    const newLot: ParkingLot = {
      ...lot,
      id: `lot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      total_slots: lot.total_slots || 0,
      created_at: new Date().toISOString(),
    };
    this.state.parking_lots.push(newLot);
    this.save();
    return newLot;
  }

  public deleteLot(id: string): boolean {
    const initialLotCount = this.state.parking_lots.length;
    this.state.parking_lots = this.state.parking_lots.filter((l) => l.id !== id);
    this.state.parking_slots = this.state.parking_slots.filter((s) => s.lot_id !== id);
    this.save();
    return this.state.parking_lots.length < initialLotCount;
  }

  // Parking Slots
  public getSlots(lotId: string, floor?: number, type?: SlotType): ParkingSlot[] {
    this.releaseExpiredLocks();
    let slots = this.state.parking_slots.filter((s) => s.lot_id === lotId);
    if (floor) {
      slots = slots.filter((s) => s.floor === floor);
    }
    if (type) {
      slots = slots.filter((s) => s.type === type);
    }
    return slots;
  }

  public getSlotById(id: string): ParkingSlot | undefined {
    this.releaseExpiredLocks();
    return this.state.parking_slots.find((s) => s.id === id);
  }

  // Lock a slot for 5 minutes during booking flow
  public lockSlot(slotId: string, sessionId: string): { success: boolean; slot?: ParkingSlot; message?: string } {
    this.releaseExpiredLocks();
    const slot = this.state.parking_slots.find((s) => s.id === slotId);
    if (!slot) {
      return { success: false, message: 'Slot not found' };
    }

    if (!slot.is_available) {
      return { success: false, message: 'Slot is already booked and unavailable' };
    }

    const now = Date.now();
    if (slot.is_locked_until) {
      const lockExpiry = new Date(slot.is_locked_until).getTime();
      if (lockExpiry > now && slot.locked_by !== sessionId) {
        return {
          success: false,
          message: 'Slot is currently being reserved by another customer. Please select another slot.',
        };
      }
    }

    // Lock for 5 minutes (300 seconds)
    const lockedUntil = new Date(now + 5 * 60 * 1000).toISOString();
    slot.is_locked_until = lockedUntil;
    slot.locked_by = sessionId;
    this.save();

    return {
      success: true,
      slot,
    };
  }

  public unlockSlot(slotId: string, sessionId?: string): boolean {
    const slot = this.state.parking_slots.find((s) => s.id === slotId);
    if (!slot) return false;

    if (!sessionId || slot.locked_by === sessionId) {
      slot.is_locked_until = null;
      slot.locked_by = null;
      this.save();
      return true;
    }
    return false;
  }

  public bulkCreateSlots(
    lotId: string,
    prefix: string,
    startNumber: number,
    count: number,
    type: SlotType,
    floor: SlotFloor
  ): ParkingSlot[] {
    const lot = this.state.parking_lots.find((l) => l.id === lotId);
    if (!lot) throw new Error('Parking lot not found');

    const created: ParkingSlot[] = [];
    for (let i = 0; i < count; i++) {
      const num = startNumber + i;
      const slotNumber = `${prefix.toUpperCase()}-${num.toString().padStart(2, '0')}`;

      // Check if slot with same number already exists in this lot
      const exists = this.state.parking_slots.some((s) => s.lot_id === lotId && s.slot_number === slotNumber);
      if (exists) continue;

      const newSlot: ParkingSlot = {
        id: `slot_${lotId}_${Date.now()}_${i}`,
        lot_id: lotId,
        slot_number: slotNumber,
        type,
        floor,
        is_available: true,
        is_locked_until: null,
        locked_by: null,
      };

      this.state.parking_slots.push(newSlot);
      created.push(newSlot);
    }

    lot.total_slots = this.state.parking_slots.filter((s) => s.lot_id === lotId).length;
    this.save();
    return created;
  }

  // Bookings
  public async createBooking(data: {
    user_id: string;
    lot_id: string;
    slot_id: string;
    vehicle_number: string;
    entry_time: string;
    exit_time: string;
    sessionId?: string;
    payment_method?: string;
  }): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    this.releaseExpiredLocks();

    const lot = this.state.parking_lots.find((l) => l.id === data.lot_id);
    if (!lot) return { success: false, error: 'Parking lot not found' };

    const slot = this.state.parking_slots.find((s) => s.id === data.slot_id);
    if (!slot) return { success: false, error: 'Parking slot not found' };

    const now = Date.now();
    // Double booking prevention: Check is_available AND is_locked_until
    if (!slot.is_available) {
      return { success: false, error: 'Slot is already booked' };
    }

    if (slot.is_locked_until) {
      const lockExpiry = new Date(slot.is_locked_until).getTime();
      if (lockExpiry > now && data.sessionId && slot.locked_by !== data.sessionId) {
        return { success: false, error: 'Slot is reserved by another user. Lock expires in a few minutes.' };
      }
    }

    // Calculate price = ceil((exit - entry hours)) * price_per_hour
    const entryDate = new Date(data.entry_time);
    const exitDate = new Date(data.exit_time);
    const durationMs = exitDate.getTime() - entryDate.getTime();
    if (durationMs <= 0) {
      return { success: false, error: 'Exit time must be later than entry time' };
    }

    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
    const totalPrice = Math.max(1, durationHours) * lot.price_per_hour;

    const bookingId = `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const qrToken = `PARKEASE-${bookingId.toUpperCase()}-${data.vehicle_number.replace(/\s+/g, '')}`;

    // Generate real QR code data URL
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(qrToken, {
        width: 256,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#f8fafc',
        },
      });
    } catch {
      qrDataUrl = qrToken;
    }

    const booking: Booking = {
      id: bookingId,
      user_id: data.user_id,
      lot_id: data.lot_id,
      slot_id: data.slot_id,
      vehicle_number: data.vehicle_number.toUpperCase().trim(),
      entry_time: data.entry_time,
      exit_time: data.exit_time,
      status: 'booked',
      total_price: totalPrice,
      qr_code: qrDataUrl || qrToken,
      created_at: new Date().toISOString(),
    };

    // Mark slot as occupied & clear lock
    slot.is_available = false;
    slot.is_locked_until = null;
    slot.locked_by = null;

    // Create payment record
    const payment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      booking_id: bookingId,
      amount: totalPrice,
      status: 'success',
      transaction_ref: `pay_rzp_${Date.now()}`,
      payment_method: data.payment_method || 'razorpay_mock',
      created_at: new Date().toISOString(),
    };

    this.state.bookings.unshift(booking);
    this.state.payments.unshift(payment);
    this.save();

    return {
      success: true,
      booking: this.populateBooking(booking),
    };
  }

  public getBookings(filters?: { user_id?: string; lot_id?: string; status?: string }): Booking[] {
    let result = [...this.state.bookings];
    if (filters?.user_id) {
      result = result.filter((b) => b.user_id === filters.user_id);
    }
    if (filters?.lot_id) {
      result = result.filter((b) => b.lot_id === filters.lot_id);
    }
    if (filters?.status) {
      result = result.filter((b) => b.status === filters.status);
    }
    return result.map((b) => this.populateBooking(b));
  }

  public getBookingById(id: string): Booking | null {
    const booking = this.state.bookings.find((b) => b.id === id);
    if (!booking) return null;
    return this.populateBooking(booking);
  }

  public cancelBooking(id: string, userId?: string): { success: boolean; message?: string } {
    const booking = this.state.bookings.find((b) => b.id === id);
    if (!booking) return { success: false, message: 'Booking not found' };

    if (userId && booking.user_id !== userId) {
      return { success: false, message: 'Unauthorized to cancel this booking' };
    }

    if (booking.status === 'cancelled') {
      return { success: false, message: 'Booking is already cancelled' };
    }

    if (booking.status === 'completed') {
      return { success: false, message: 'Completed bookings cannot be cancelled' };
    }

    booking.status = 'cancelled';

    // Release slot back to available
    const slot = this.state.parking_slots.find((s) => s.id === booking.slot_id);
    if (slot) {
      slot.is_available = true;
      slot.is_locked_until = null;
      slot.locked_by = null;
    }

    this.save();
    return { success: true };
  }

  public checkInBooking(id: string): { success: boolean; booking?: Booking; message?: string } {
    const booking = this.state.bookings.find((b) => b.id === id);
    if (!booking) return { success: false, message: 'Booking not found' };

    if (booking.status === 'cancelled') {
      return { success: false, message: 'Cannot check-in a cancelled booking' };
    }

    if (booking.status === 'completed') {
      return { success: false, message: 'Booking already completed' };
    }

    booking.status = 'checked_in';
    // Slot remains booked
    this.save();
    return { success: true, booking: this.populateBooking(booking) };
  }

  public checkOutBooking(id: string): { success: boolean; booking?: Booking; message?: string } {
    const booking = this.state.bookings.find((b) => b.id === id);
    if (!booking) return { success: false, message: 'Booking not found' };

    booking.status = 'completed';

    // Free the slot
    const slot = this.state.parking_slots.find((s) => s.id === booking.slot_id);
    if (slot) {
      slot.is_available = true;
      slot.is_locked_until = null;
      slot.locked_by = null;
    }

    this.save();
    return { success: true, booking: this.populateBooking(booking) };
  }

  public verifyQrCode(token: string): Booking | null {
    // Matches by booking ID or qr_code token
    const cleaned = token.trim();
    const booking = this.state.bookings.find(
      (b) =>
        b.id.toLowerCase() === cleaned.toLowerCase() ||
        (b.qr_code && b.qr_code.includes(cleaned)) ||
        b.vehicle_number.replace(/\s+/g, '').toLowerCase() === cleaned.replace(/\s+/g, '').toLowerCase()
    );
    if (!booking) return null;
    return this.populateBooking(booking);
  }

  public getPayments(): Payment[] {
    return this.state.payments;
  }

  private populateBooking(b: Booking): Booking {
    const user = this.state.users.find((u) => u.id === b.user_id);
    const lot = this.state.parking_lots.find((l) => l.id === b.lot_id);
    const slot = this.state.parking_slots.find((s) => s.id === b.slot_id);

    return {
      ...b,
      user_name: user?.name,
      user_phone: user?.phone,
      lot_name: lot?.name,
      lot_address: lot?.address,
      slot_number: slot?.slot_number,
      slot_type: slot?.type,
      slot_floor: slot?.floor,
    };
  }
}

export const db = new Database();
