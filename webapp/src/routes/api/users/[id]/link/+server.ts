import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

export const POST: RequestHandler = async ({ params, locals, request }) => {
  try {
    requireRole(locals.user?.role, ['admin']);

    const userId = params.id as string;
    const body = await request.json();
    const { profileType, profileId } = body;

    if (!profileType || !profileId || !['driver', 'customer'].includes(profileType)) {
      throw error(400, 'Invalid profile type or ID');
    }

    const profile_id = BigInt(profileId);

    if (profileType === 'driver') {
      // Verify driver exists
      const driver = await prisma.driver.findUnique({
        where: { id: profile_id }
      });

      if (!driver) {
        throw error(404, 'Driver not found');
      }

      // Check if driver is already linked
      const existingLink = await prisma.user.findFirst({
        where: { driverId: profile_id }
      });

      if (existingLink && existingLink.id !== userId) {
        throw error(400, 'Driver is already linked to another user');
      }

      // Link driver to user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { driverId: profile_id, customerId: null }
      });

      return json({
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          driverId: updatedUser.driverId?.toString() ?? null,
          customerId: updatedUser.customerId?.toString() ?? null
        }
      });
    } else if (profileType === 'customer') {
      // Verify customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: profile_id }
      });

      if (!customer) {
        throw error(404, 'Customer not found');
      }

      // Check if customer is already linked
      const existingLink = await prisma.user.findFirst({
        where: { customerId: profile_id }
      });

      if (existingLink && existingLink.id !== userId) {
        throw error(400, 'Customer is already linked to another user');
      }

      // Link customer to user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { customerId: profile_id, driverId: null }
      });

      return json({
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          driverId: updatedUser.driverId?.toString() ?? null,
          customerId: updatedUser.customerId?.toString() ?? null
        }
      });
    }

    throw error(400, 'Invalid profile type');
  } catch (err) {
    console.error('Error linking profile:', err);
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    throw error(500, err instanceof Error ? err.message : 'Failed to link profile');
  }
};
