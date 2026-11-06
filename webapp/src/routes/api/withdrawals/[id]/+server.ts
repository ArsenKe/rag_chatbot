import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

// PATCH - Approve/Reject withdrawal
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const withdrawalId = BigInt(params.id as string);
    const body = await request.json();
    const { action, rejectionReason } = body;

    if (!['approve', 'reject', 'process', 'complete'].includes(action)) {
      throw error(400, 'Invalid action');
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId }
    });

    if (!withdrawal) {
      throw error(404, 'Withdrawal not found');
    }

    let updateData: any = {};

    switch (action) {
      case 'approve':
        if (withdrawal.status !== 'pending') {
          throw error(400, `Cannot approve withdrawal with status: ${withdrawal.status}`);
        }
        updateData = { status: 'approved', approvedAt: new Date(), approvedBy: locals.user?.id };
        break;
      case 'reject':
        if (withdrawal.status !== 'pending') {
          throw error(400, `Cannot reject withdrawal with status: ${withdrawal.status}`);
        }
        updateData = { status: 'rejected', rejectionReason: rejectionReason ?? null };
        break;
      case 'process':
        if (withdrawal.status !== 'approved') {
          throw error(400, 'Withdrawal must be approved before processing');
        }
        updateData = { status: 'processing', processedAt: new Date() };
        break;
      case 'complete':
        if (withdrawal.status !== 'processing') {
          throw error(400, 'Withdrawal must be processing before completion');
        }
        updateData = { status: 'completed', completedAt: new Date() };
        break;
    }

    const updated = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: updateData
    });

    return json({
      success: true,
      withdrawal: {
        id: updated.id.toString(),
        amount: updated.amount.toString(),
        status: updated.status,
        approvedAt: updated.approvedAt?.toISOString() ?? null,
        processedAt: updated.processedAt?.toISOString() ?? null,
        completedAt: updated.completedAt?.toISOString() ?? null
      }
    });
  } catch (err) {
    console.error('Error updating withdrawal:', err);
    if (err instanceof Error && 'status' in err) throw err;
    throw error(500, err instanceof Error ? err.message : 'Failed to update withdrawal');
  }
};

// DELETE - Cancel withdrawal (only pending or rejected)
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'driver']);

    const withdrawalId = BigInt(params.id as string);

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId }
    });

    if (!withdrawal) {
      throw error(404, 'Withdrawal not found');
    }

    // Driver can only cancel own pending withdrawals
    if (locals.user?.role === 'driver') {
      if (withdrawal.driverId !== BigInt(locals.user.driverId ?? '0')) {
        throw error(403, 'Unauthorized');
      }
      if (withdrawal.status !== 'pending') {
        throw error(400, 'Can only cancel pending withdrawals');
      }
    }

    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: 'cancelled' }
    });

    return json({ success: true });
  } catch (err) {
    console.error('Error cancelling withdrawal:', err);
    if (err instanceof Error && 'status' in err) throw err;
    throw error(500, err instanceof Error ? err.message : 'Failed to cancel withdrawal');
  }
};
