import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'manager', 'driver']);

export const loginSchema = z.object({
  accessToken: z.string().trim().min(10)
});

export const driverSchema = z.object({
  name: z.string().trim().min(2),
  licenseNumber: z.string().trim().min(3),
  phone: z.string().trim().optional().or(z.literal('')),
  hireDate: z.string().datetime().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active')
});

export const carSchema = z.object({
  licensePlate: z.string().trim().min(3),
  model: z.string().trim().min(1),
  make: z.string().trim().min(1),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  seats: z.coerce.number().int().min(1).max(20).optional(),
  transmission: z.string().trim().optional().or(z.literal('')),
  fuelType: z.string().trim().optional().or(z.literal('')),
  carClass: z.string().trim().optional().or(z.literal('')),
  status: z.enum(['available', 'rented', 'maintenance']).default('available')
});

export const customerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  driverLicense: z.string().trim().optional().or(z.literal('')),
  registrationDate: z.string().datetime().optional().or(z.literal(''))
});

export const bookingSchema = z
  .object({
    customerId: z.coerce.bigint(),
    pickupLocationId: z.coerce.bigint(),
    dropoffLocationId: z.coerce.bigint(),
    requestedStart: z.string().datetime(),
    requestedEnd: z.string().datetime(),
    carClass: z.string().trim().optional().or(z.literal('')),
    status: z.enum(['reserved', 'confirmed', 'completed', 'cancelled']).default('reserved'),
    notes: z.string().trim().optional().or(z.literal(''))
  })
  .refine((value) => new Date(value.requestedEnd) > new Date(value.requestedStart), {
    message: 'requestedEnd must be after requestedStart',
    path: ['requestedEnd']
  });

export const assignmentSchema = z.object({
  bookingId: z.coerce.bigint(),
  driverId: z.coerce.bigint().optional(),
  carId: z.coerce.bigint().optional(),
  override: z.boolean().optional().default(false)
});

export const publicBookingSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().min(6),
  pickupLocationId: z.coerce.bigint(),
  dropoffLocationId: z.coerce.bigint(),
  requestedStart: z.string().datetime(),
  carClass: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal(''))
});