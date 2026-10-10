export type UserRole = 'user' | 'admin' | 'owner';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  created_at?: string;
}

export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  total_slots: number;
  price_per_hour: number;
  image_url: string;
  available_slots?: number;
  created_at?: string;
}

export type SlotType = '2W' | '4W' | 'EV';
export type SlotFloor = 1 | 2;

export interface ParkingSlot {
  id: string;
  lot_id: string;
  slot_number: string; // e.g. A1, A2, B15
  type: SlotType;
  floor: SlotFloor;
  is_available: boolean;
  is_locked_until: string | null; // ISO timestamp
  locked_by?: string | null; // Session or user ID that locked it
  created_at?: string;
}

export type BookingStatus = 'booked' | 'checked_in' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  user_id: string;
  lot_id: string;
  slot_id: string;
  vehicle_number: string;
  entry_time: string; // ISO timestamp
  exit_time: string; // ISO timestamp
  status: BookingStatus;
  total_price: number;
  qr_code: string; // token or data URL
  created_at: string;
  
  // Joined/populated fields for UI convenience
  user_name?: string;
  user_phone?: string;
  lot_name?: string;
  lot_address?: string;
  slot_number?: string;
  slot_type?: SlotType;
  slot_floor?: SlotFloor;
}

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  status: PaymentStatus;
  transaction_ref?: string;
  payment_method?: string;
  created_at: string;
}
