import { Router, Request, Response } from 'express';
import { db, SUPABASE_SQL_SCHEMA } from './db.ts';
import { SWAGGER_SPEC } from './swagger-spec.ts';

export const apiRouter = Router();

// --- PARKING LOTS ---

// GET /api/lots
apiRouter.get('/lots', (req: Request, res: Response) => {
  try {
    const lots = db.getLots();
    res.json(lots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lots/:id
apiRouter.get('/lots/:id', (req: Request, res: Response) => {
  try {
    const lot = db.getLotById(req.params.id);
    if (!lot) {
      return res.status(404).json({ error: 'Parking lot not found' });
    }
    res.json(lot);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/lots (Admin)
apiRouter.post('/lots', (req: Request, res: Response) => {
  try {
    const { name, address, lat, lng, price_per_hour, image_url, total_slots } = req.body;
    if (!name || !address || lat === undefined || lng === undefined || !price_per_hour) {
      return res.status(400).json({ error: 'Missing required lot fields' });
    }

    const created = db.createLot({
      name,
      address,
      lat: Number(lat),
      lng: Number(lng),
      price_per_hour: Number(price_per_hour),
      image_url: image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a',
      total_slots: Number(total_slots) || 0,
    });
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/lots/:id (Admin)
apiRouter.delete('/lots/:id', (req: Request, res: Response) => {
  try {
    const ok = db.deleteLot(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'Lot not found or could not be deleted' });
    }
    res.json({ success: true, message: 'Parking lot deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- SLOTS & LOCKS ---

// GET /api/slots
apiRouter.get('/slots', (req: Request, res: Response) => {
  try {
    const lotId = req.query.lot_id as string;
    if (!lotId) {
      return res.status(400).json({ error: 'lot_id query parameter is required' });
    }
    const floor = req.query.floor ? Number(req.query.floor) : undefined;
    const type = req.query.type as any;
    const slots = db.getSlots(lotId, floor, type);
    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/slots/lock (5-minute lock)
apiRouter.post('/slots/lock', (req: Request, res: Response) => {
  try {
    const { slot_id, session_id } = req.body;
    if (!slot_id || !session_id) {
      return res.status(400).json({ error: 'slot_id and session_id are required' });
    }

    const result = db.lockSlot(slot_id, session_id);
    if (!result.success) {
      return res.status(409).json({ error: result.message });
    }

    res.json({
      success: true,
      message: 'Slot locked for 5 minutes',
      slot: result.slot,
      expires_at: result.slot?.is_locked_until,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/slots/unlock
apiRouter.post('/slots/unlock', (req: Request, res: Response) => {
  try {
    const { slot_id, session_id } = req.body;
    if (!slot_id) {
      return res.status(400).json({ error: 'slot_id is required' });
    }

    const unlocked = db.unlockSlot(slot_id, session_id);
    res.json({ success: unlocked });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/slots/bulk (Admin bulk slot generator)
apiRouter.post('/slots/bulk', (req: Request, res: Response) => {
  try {
    const { lot_id, prefix, start, count, type, floor } = req.body;
    if (!lot_id || !prefix || !start || !count || !type || !floor) {
      return res.status(400).json({ error: 'Missing required bulk slot parameters' });
    }

    const created = db.bulkCreateSlots(
      lot_id,
      String(prefix),
      Number(start),
      Number(count),
      type,
      Number(floor) as 1 | 2
    );

    res.status(201).json({
      success: true,
      count: created.length,
      slots: created,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- BOOKINGS ---

// GET /api/bookings
apiRouter.get('/bookings', (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id as string;
    const lotId = req.query.lot_id as string;
    const status = req.query.status as string;

    const bookings = db.getBookings({ user_id: userId, lot_id: lotId, status });
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bookings/:id
apiRouter.get('/bookings/:id', (req: Request, res: Response) => {
  try {
    const booking = db.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings
apiRouter.post('/bookings', async (req: Request, res: Response) => {
  try {
    const { user_id, lot_id, slot_id, vehicle_number, entry_time, exit_time, sessionId, payment_method } = req.body;

    if (!user_id || !lot_id || !slot_id || !vehicle_number || !entry_time || !exit_time) {
      return res.status(400).json({ error: 'All booking fields are required' });
    }

    const result = await db.createBooking({
      user_id,
      lot_id,
      slot_id,
      vehicle_number,
      entry_time,
      exit_time,
      sessionId,
      payment_method,
    });

    if (!result.success) {
      return res.status(409).json({ error: result.error });
    }

    res.status(201).json({
      success: true,
      booking: result.booking,
      message: 'Booking successfully confirmed!',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings/:id/cancel
apiRouter.post('/bookings/:id/cancel', (req: Request, res: Response) => {
  try {
    const userId = req.body?.user_id;
    const result = db.cancelBooking(req.params.id, userId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ success: true, message: 'Booking cancelled and slot made available' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings/:id/check-in
apiRouter.post('/bookings/:id/check-in', (req: Request, res: Response) => {
  try {
    const result = db.checkInBooking(req.params.id);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    res.json({ success: true, booking: result.booking });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings/:id/check-out
apiRouter.post('/bookings/:id/check-out', (req: Request, res: Response) => {
  try {
    const result = db.checkOutBooking(req.params.id);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    res.json({ success: true, booking: result.booking, message: 'Vehicle checked out and slot released' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings/verify-qr
apiRouter.post('/bookings/verify-qr', (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'QR token is required' });
    }

    const booking = db.verifyQrCode(token);
    if (!booking) {
      return res.status(404).json({ error: 'Invalid QR token or booking not found' });
    }

    res.json({
      valid: true,
      booking,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- PAYMENTS ---

// GET /api/payments
apiRouter.get('/payments', (req: Request, res: Response) => {
  try {
    const payments = db.getPayments();
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments/mock-razorpay
apiRouter.post('/payments/mock-razorpay', (req: Request, res: Response) => {
  try {
    const { amount, vehicle_number, method } = req.body;
    const rzpOrderId = `order_${Math.random().toString(36).substring(2, 10)}`;
    const rzpPaymentId = `pay_${Math.random().toString(36).substring(2, 12)}`;
    const rzpSignature = `sig_${Math.random().toString(36).substring(2, 14)}`;

    res.json({
      success: true,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: rzpSignature,
      amount,
      currency: 'INR',
      vehicle_number,
      payment_method: method || 'upi',
      status: 'authorized',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- USERS ---

// GET /api/users
apiRouter.get('/users', (req: Request, res: Response) => {
  try {
    const users = db.getUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users
apiRouter.post('/users', (req: Request, res: Response) => {
  try {
    const { name, email, phone, role } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }
    const user = db.createUser({ name, email, phone, role: role || 'user' });
    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- SYSTEM & SWAGGER ---

// GET /api/schema (Raw SQL for Supabase)
apiRouter.get('/schema', (req: Request, res: Response) => {
  res.json({
    engine: 'PostgreSQL / Supabase',
    sql: SUPABASE_SQL_SCHEMA,
  });
});

// GET /api/docs/spec (OpenAPI / Swagger JSON)
apiRouter.get('/docs/spec', (req: Request, res: Response) => {
  res.json(SWAGGER_SPEC);
});

// POST /api/reset-seed
apiRouter.post('/reset-seed', (req: Request, res: Response) => {
  try {
    const state = db.resetSeed();
    res.json({
      success: true,
      message: 'Database reset to initial seed state',
      lotsCount: state.parking_lots.length,
      slotsCount: state.parking_slots.length,
      bookingsCount: state.bookings.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
