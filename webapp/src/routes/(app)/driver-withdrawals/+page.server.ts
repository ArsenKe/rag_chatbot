import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

export const load: PageServerLoad = async ({ locals }) => {
  try {
    requireRole(locals.user?.role, ['driver']);

    const driverId = BigInt(locals.user?.driverId ?? '0');

    // Get driver earnings summary
    const driverEarnings = await prisma.trip.aggregate({
      where: {
        driverId,
        status: 'completed'
      },
      _sum: { driverPayout: true }
    });

    const totalEarnings = driverEarnings._sum.driverPayout?.toNumber() ?? 0;

    // Get pending/approved withdrawals
    const pendingWithdrawals = await prisma.withdrawal.aggregate({
      where: {
        driverId,
        status: { in: ['pending', 'approved', 'processing'] }
      },
      _sum: { amount: true }
    });

    const pendingAmount = pendingWithdrawals._sum.amount?.toNumber() ?? 0;
    const availableBalance = totalEarnings - pendingAmount;

    // Get withdrawal history (last 20)
    const withdrawalHistory = await prisma.withdrawal.findMany({
      where: { driverId },
      orderBy: { requestedAt: 'desc' },
      take: 20
    });

    return {
      totalEarnings: totalEarnings.toFixed(2),
      pendingAmount: pendingAmount.toFixed(2),
      availableBalance: availableBalance.toFixed(2),
      withdrawals: withdrawalHistory.map(w => ({
        id: w.id.toString(),
        amount: w.amount.toString(),
        status: w.status,
        requestedAt: w.requestedAt.toISOString(),
        approvedAt: w.approvedAt?.toISOString() ?? null,
        completedAt: w.completedAt?.toISOString() ?? null,
        rejectionReason: w.rejectionReason,
        notes: w.notes
      }))
    };
  } catch (err) {
    console.error('Error loading withdrawals:', err);
    throw error(500, err instanceof Error ? err.message : 'Failed to load withdrawals');
  }
};
