export const SWAGGER_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'ParkEase Parking Slot Booking & Management API',
    version: '1.0.0',
    description: `Full-stack REST API for real-time parking lot reservations, slot locks (5-minute lock auto-expiry), cinema-grid slot management, QR code ticket validation, and mock payments.

Designed to interface with PostgreSQL / Supabase databases.`,
    contact: {
      name: 'ParkEase Engineering',
      email: 'api-support@parkease.io',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'AI Studio dev & staging server',
    },
  ],
  tags: [
    { name: 'Parking Lots', description: 'Search, retrieve, and manage parking facilities' },
    { name: 'Slots & Locks', description: 'Cinema-style slot retrieval, 5-minute locks, and bulk generation' },
    { name: 'Bookings', description: 'Create bookings, cancel, generate QR codes, and retrieve tickets' },
    { name: 'Admin Gate Operations', description: 'Vehicle check-in/out and QR code verification' },
    { name: 'Payments', description: 'Payment records and mock Razorpay processing' },
    { name: 'Users & System', description: 'User management and database reset utilities' },
  ],
  paths: {
    '/lots': {
      get: {
        tags: ['Parking Lots'],
        summary: 'List all parking lots with live available slot counts',
        description: 'Returns all parking lots with real-time calculated available slot counts after accounting for active 5-minute locks and confirmed bookings.',
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ParkingLot' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Parking Lots'],
        summary: 'Create a new parking lot (Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'address', 'lat', 'lng', 'price_per_hour', 'image_url'],
                properties: {
                  name: { type: 'string', example: 'Mindspace West Parking Tower' },
                  address: { type: 'string', example: 'Mindspace IT Park, Madhapur, Hyderabad' },
                  lat: { type: 'number', example: 17.4399 },
                  lng: { type: 'number', example: 78.3792 },
                  price_per_hour: { type: 'number', example: 45 },
                  image_url: { type: 'string', example: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Lot created successfully' },
          '400': { description: 'Missing required fields' },
        },
      },
    },
    '/lots/{id}': {
      get: {
        tags: ['Parking Lots'],
        summary: 'Get parking lot details including full slot visual grid',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'lot_hitech_01' },
        ],
        responses: {
          '200': { description: 'Parking lot and all slots with live availability' },
          '404': { description: 'Lot not found' },
        },
      },
      delete: {
        tags: ['Parking Lots'],
        summary: 'Delete a parking lot and its slots (Admin)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Lot deleted' },
          '404': { description: 'Lot not found' },
        },
      },
    },
    '/slots/lock': {
      post: {
        tags: ['Slots & Locks'],
        summary: 'Lock a parking slot for 5 minutes during booking flow',
        description: 'Ensures no double booking. Verifies that the slot is available and not currently locked by another customer. Extends or sets lock for 300 seconds.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['slot_id', 'session_id'],
                properties: {
                  slot_id: { type: 'string', example: 'slot_hitech_f1_3' },
                  session_id: { type: 'string', example: 'sess_client_9824' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Slot successfully locked for 5 minutes' },
          '409': { description: 'Slot is already booked or locked by another user' },
        },
      },
    },
    '/slots/unlock': {
      post: {
        tags: ['Slots & Locks'],
        summary: 'Release a temporary slot lock',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['slot_id'],
                properties: {
                  slot_id: { type: 'string', example: 'slot_hitech_f1_3' },
                  session_id: { type: 'string', example: 'sess_client_9824' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Lock released' },
        },
      },
    },
    '/slots/bulk': {
      tags: ['Slots & Locks'],
      post: {
        tags: ['Slots & Locks'],
        summary: 'Bulk generate parking slots (Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lot_id', 'prefix', 'start', 'count', 'type', 'floor'],
                properties: {
                  lot_id: { type: 'string', example: 'lot_hitech_01' },
                  prefix: { type: 'string', example: 'E' },
                  start: { type: 'integer', example: 1 },
                  count: { type: 'integer', example: 10 },
                  type: { type: 'string', enum: ['2W', '4W', 'EV'], example: '4W' },
                  floor: { type: 'integer', enum: [1, 2], example: 1 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Bulk slots created' },
          '400': { description: 'Invalid input' },
        },
      },
    },
    '/bookings': {
      get: {
        tags: ['Bookings'],
        summary: 'List bookings with optional filters',
        parameters: [
          { name: 'user_id', in: 'query', schema: { type: 'string' } },
          { name: 'lot_id', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['booked', 'checked_in', 'completed', 'cancelled'] } },
        ],
        responses: {
          '200': { description: 'List of matching bookings' },
        },
      },
      post: {
        tags: ['Bookings'],
        summary: 'Book a slot, calculate price, and issue QR pass',
        description: 'Double booking protection: Checks that is_available is true and lock belongs to session. Auto-calculates total price using ceil((exit - entry)/1hr) * price_per_hour. Marks slot unavailable and records mock payment.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user_id', 'lot_id', 'slot_id', 'vehicle_number', 'entry_time', 'exit_time'],
                properties: {
                  user_id: { type: 'string', example: 'usr_kavya_01' },
                  lot_id: { type: 'string', example: 'lot_hitech_01' },
                  slot_id: { type: 'string', example: 'slot_hitech_f1_5' },
                  vehicle_number: { type: 'string', example: 'TS 09 EA 4521' },
                  entry_time: { type: 'string', format: 'date-time', example: '2026-10-10T10:00:00.000Z' },
                  exit_time: { type: 'string', format: 'date-time', example: '2026-10-10T12:30:00.000Z' },
                  sessionId: { type: 'string', example: 'sess_client_9824' },
                  payment_method: { type: 'string', example: 'razorpay_upi' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Booking confirmed with QR code' },
          '409': { description: 'Slot is no longer available or lock expired' },
        },
      },
    },
    '/bookings/{id}/cancel': {
      post: {
        tags: ['Bookings'],
        summary: 'Cancel a booking and release the parking slot',
        description: 'Changes booking status to cancelled and immediately resets the associated parking slot to is_available=true.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Booking cancelled and slot released' },
          '400': { description: 'Cannot cancel completed booking' },
        },
      },
    },
    '/bookings/{id}/check-in': {
      post: {
        tags: ['Admin Gate Operations'],
        summary: 'Check-in vehicle at parking gate',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Vehicle checked in successfully' },
        },
      },
    },
    '/bookings/{id}/check-out': {
      post: {
        tags: ['Admin Gate Operations'],
        summary: 'Check-out vehicle at parking gate and free slot',
        description: 'Sets status to completed and makes the parking slot available again for other drivers.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Vehicle checked out and slot freed' },
        },
      },
    },
    '/bookings/verify-qr': {
      post: {
        tags: ['Admin Gate Operations'],
        summary: 'Scan / Verify QR Code ticket token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: { type: 'string', example: 'PARKEASE-BK-SAMPLE01-TS09EA4521' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'QR verification details with booking & vehicle info' },
          '404': { description: 'Invalid QR token or booking not found' },
        },
      },
    },
    '/payments': {
      get: {
        tags: ['Payments'],
        summary: 'List all payment transactions',
        responses: {
          '200': { description: 'List of payment records' },
        },
      },
    },
    '/payments/mock-razorpay': {
      post: {
        tags: ['Payments'],
        summary: 'Simulate Razorpay payment order & instant checkout',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'vehicle_number'],
                properties: {
                  amount: { type: 'number', example: 80 },
                  vehicle_number: { type: 'string', example: 'TS 09 EA 4521' },
                  method: { type: 'string', example: 'upi' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Mock Razorpay signature and transaction confirmation' },
        },
      },
    },
    '/schema': {
      get: {
        tags: ['Users & System'],
        summary: 'Get raw PostgreSQL / Supabase SQL DDL Schema',
        responses: {
          '200': {
            description: 'Supabase SQL script ready to copy-paste',
            content: { 'application/json': { schema: { type: 'object', properties: { sql: { type: 'string' } } } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ParkingLot: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          address: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          total_slots: { type: 'integer' },
          available_slots: { type: 'integer' },
          price_per_hour: { type: 'number' },
          image_url: { type: 'string' },
        },
      },
      ParkingSlot: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          lot_id: { type: 'string' },
          slot_number: { type: 'string' },
          type: { type: 'string', enum: ['2W', '4W', 'EV'] },
          floor: { type: 'integer', enum: [1, 2] },
          is_available: { type: 'boolean' },
          is_locked_until: { type: 'string', nullable: true },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          user_id: { type: 'string' },
          lot_id: { type: 'string' },
          slot_id: { type: 'string' },
          vehicle_number: { type: 'string' },
          entry_time: { type: 'string' },
          exit_time: { type: 'string' },
          status: { type: 'string', enum: ['booked', 'checked_in', 'completed', 'cancelled'] },
          total_price: { type: 'number' },
          qr_code: { type: 'string' },
        },
      },
    },
  },
};
