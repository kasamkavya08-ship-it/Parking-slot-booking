import { ParkingLot, ParkingSlot, Booking, Payment, User, SlotType, SlotFloor } from '../types/index.ts';

const BASE_URL = '/api';

export async function fetchLots(): Promise<ParkingLot[]> {
  const res = await fetch(`${BASE_URL}/lots`);
  if (!res.ok) throw new Error('Failed to fetch parking lots');
  return res.json();
}

export async function fetchLotById(id: string): Promise<ParkingLot & { slots: ParkingSlot[] }> {
  const res = await fetch(`${BASE_URL}/lots/${id}`);
  if (!res.ok) throw new Error('Failed to fetch parking lot');
  return res.json();
}

export async function createLot(data: {
  name: string;
  address: string;
  lat: number;
  lng: number;
  price_per_hour: number;
  image_url: string;
  total_slots?: number;
}): Promise<ParkingLot> {
  const res = await fetch(`${BASE_URL}/lots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create parking lot');
  }
  return res.json();
}

export async function deleteLot(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/lots/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete parking lot');
  return res.json();
}

export async function fetchSlots(lotId: string, floor?: number, type?: SlotType): Promise<ParkingSlot[]> {
  const params = new URLSearchParams({ lot_id: lotId });
  if (floor) params.append('floor', floor.toString());
  if (type) params.append('type', type);

  const res = await fetch(`${BASE_URL}/slots?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch slots');
  return res.json();
}

export async function lockSlot(slotId: string, sessionId: string): Promise<{
  success: boolean;
  message: string;
  slot: ParkingSlot;
  expires_at: string;
}> {
  const res = await fetch(`${BASE_URL}/slots/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_id: slotId, session_id: sessionId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to lock slot');
  }
  return data;
}

export async function unlockSlot(slotId: string, sessionId?: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/slots/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot_id: slotId, session_id: sessionId }),
  });
  return res.json();
}

export async function bulkCreateSlots(data: {
  lot_id: string;
  prefix: string;
  start: number;
  count: number;
  type: SlotType;
  floor: SlotFloor;
}): Promise<{ success: boolean; count: number; slots: ParkingSlot[] }> {
  const res = await fetch(`${BASE_URL}/slots/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create bulk slots');
  return json;
}

export async function fetchBookings(filters?: { user_id?: string; lot_id?: string; status?: string }): Promise<Booking[]> {
  const params = new URLSearchParams();
  if (filters?.user_id) params.append('user_id', filters.user_id);
  if (filters?.lot_id) params.append('lot_id', filters.lot_id);
  if (filters?.status) params.append('status', filters.status);

  const res = await fetch(`${BASE_URL}/bookings?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch bookings');
  return res.json();
}

export async function createBooking(data: {
  user_id: string;
  lot_id: string;
  slot_id: string;
  vehicle_number: string;
  entry_time: string;
  exit_time: string;
  sessionId?: string;
  payment_method?: string;
}): Promise<{ success: boolean; booking: Booking; message: string }> {
  const res = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to confirm booking');
  return json;
}

export async function cancelBooking(id: string, userId?: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/bookings/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to cancel booking');
  return json;
}

export async function checkInBooking(id: string): Promise<{ success: boolean; booking: Booking }> {
  const res = await fetch(`${BASE_URL}/bookings/${id}/check-in`, { method: 'POST' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to check-in booking');
  return json;
}

export async function checkOutBooking(id: string): Promise<{ success: boolean; booking: Booking }> {
  const res = await fetch(`${BASE_URL}/bookings/${id}/check-out`, { method: 'POST' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to check-out booking');
  return json;
}

export async function verifyQr(token: string): Promise<{ valid: boolean; booking: Booking }> {
  const res = await fetch(`${BASE_URL}/bookings/verify-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Invalid QR code or booking not found');
  return json;
}

export async function fetchPayments(): Promise<Payment[]> {
  const res = await fetch(`${BASE_URL}/payments`);
  if (!res.ok) throw new Error('Failed to fetch payments');
  return res.json();
}

export async function mockRazorpayPayment(data: {
  amount: number;
  vehicle_number: string;
  method?: string;
}) {
  const res = await fetch(`${BASE_URL}/payments/mock-razorpay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function createUser(data: { name: string; email: string; phone: string; role?: string }): Promise<User> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create user');
  return json;
}

export async function fetchSchema(): Promise<{ engine: string; sql: string }> {
  const res = await fetch(`${BASE_URL}/schema`);
  return res.json();
}

export async function fetchDocsSpec(): Promise<any> {
  const res = await fetch(`${BASE_URL}/docs/spec`);
  return res.json();
}

export async function resetDatabase(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/reset-seed`, { method: 'POST' });
  return res.json();
}
