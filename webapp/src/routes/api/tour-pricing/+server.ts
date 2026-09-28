import { json } from '@sveltejs/kit';
import {
  getAllPricingConfigs,
  createPricingConfig,
  updatePricingConfig,
  deletePricingConfig
} from '$lib/server/tours/pricing-config';

// Helper to convert BigInt to string for JSON serialization
function serializeConfig(config: any) {
  return {
    id: String(config.id),
    tier: config.tier,
    minGuests: config.minGuests,
    maxGuests: config.maxGuests,
    basePricePerTour: Number(config.basePricePerTour),
    pricePerAdditionalGuestBeyond: Number(config.pricePerAdditionalGuestBeyond),
    durationMinutes: config.durationMinutes,
    driverCommissionPercentage: Number(config.driverCommissionPercentage),
    createdAt: config.createdAt,
    updatedAt: config.updatedAt
  };
}

export async function GET({ locals }) {
  if (!locals.user) {
    return json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  if (locals.user.role === 'driver') {
    return json({ error: { message: 'Drivers cannot view pricing configurations' } }, { status: 403 });
  }

  try {
    const configs = await getAllPricingConfigs();
    return json({ data: configs.map(serializeConfig) });
  } catch (err) {
    console.error('Error fetching pricing configs:', err);
    return json({ error: { message: 'Failed to fetch pricing configurations' } }, { status: 500 });
  }
}

export async function POST({ request, locals }) {
  if (!locals.user) {
    return json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  if (locals.user.role === 'driver') {
    return json({ error: { message: 'Drivers cannot create pricing configurations' } }, { status: 403 });
  }

  if (locals.user.role !== 'admin' && locals.user.role !== 'manager') {
    return json({ error: { message: 'Only admin/manager can create pricing configurations' } }, { status: 403 });
  }

  try {
    const data = await request.json();

    if (!data.tier || !['silver', 'gold', 'platinum'].includes(data.tier)) {
      return json({ error: { message: 'Invalid tier' } }, { status: 400 });
    }

    if (!Number.isInteger(data.minGuests) || data.minGuests < 1) {
      return json({ error: { message: 'minGuests must be a positive integer' } }, { status: 400 });
    }

    if (!Number.isInteger(data.maxGuests) || data.maxGuests < data.minGuests) {
      return json({ error: { message: 'maxGuests must be >= minGuests' } }, { status: 400 });
    }

    if (data.basePricePerTour <= 0 || data.durationMinutes <= 0) {
      return json({ error: { message: 'Prices and duration must be positive' } }, { status: 400 });
    }

    const config = await createPricingConfig({
      tier: data.tier,
      minGuests: data.minGuests,
      maxGuests: data.maxGuests,
      basePricePerTour: data.basePricePerTour,
      pricePerAdditionalGuestBeyond: data.pricePerAdditionalGuestBeyond || 0,
      durationMinutes: data.durationMinutes,
      driverCommissionPercentage: data.driverCommissionPercentage || 30
    });

    return json({ data: serializeConfig(config) }, { status: 201 });
  } catch (err) {
    console.error('Error creating pricing config:', err);
    return json({ error: { message: 'Failed to create pricing configuration' } }, { status: 500 });
  }
}

export async function PUT({ request, locals, url }) {
  if (!locals.user) {
    return json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  if (locals.user.role !== 'admin' && locals.user.role !== 'manager') {
    return json({ error: { message: 'Only admin/manager can update pricing configurations' } }, { status: 403 });
  }

  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return json({ error: { message: 'Missing id parameter' } }, { status: 400 });
    }

    const data = await request.json();
    const config = await updatePricingConfig(BigInt(id), data);

    return json({ data: serializeConfig(config) });
  } catch (err) {
    console.error('Error updating pricing config:', err);
    return json({ error: { message: 'Failed to update pricing configuration' } }, { status: 500 });
  }
}

export async function DELETE({ locals, url }) {
  if (!locals.user) {
    return json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  if (locals.user.role !== 'admin' && locals.user.role !== 'manager') {
    return json({ error: { message: 'Only admin/manager can delete pricing configurations' } }, { status: 403 });
  }

  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return json({ error: { message: 'Missing id parameter' } }, { status: 400 });
    }

    await deletePricingConfig(BigInt(id));
    return json({ data: { success: true } });
  } catch (err) {
    console.error('Error deleting pricing config:', err);
    return json({ error: { message: 'Failed to delete pricing configuration' } }, { status: 500 });
  }
}
