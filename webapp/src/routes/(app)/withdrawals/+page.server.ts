import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

export const load: PageServerLoad = async ({ locals, url }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const statusFilter = url.searchParams.get('status') ?? 'all';
    const skip = parseInt(url.searchParams.get('skip') ?? '0');
    const take = 20;

    const whereClause = {
      ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {})
    };

    // Fetch withdrawals with driver info
    const [withdrawals, total, stats] = await Promise.all([
      prisma.withdrawal.findMany({
        where: whereClause,
        include: {
          driver: {
            select: { id: true, name: true, phone: true }
          }
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take
      }),
      prisma.withdrawal.count({ where: whereClause }),
      prisma.withdrawal.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true }
      })
    ]);

    // Calculate summary statistics
    const summary = {
      total: total,
      pending: withdrawals.filter(w => w.status === 'pending').length,
      approved: withdrawals.filter(w => w.status === 'approved').length,
      processing: withdrawals.filter(w => w.status === 'processing').length,
      completed: withdrawals.filter(w => w.status === 'completed').length,
      rejected: withdrawals.filter(w => w.status === 'rejected').length
    };

    const totalAmount = withdrawals.reduce((sum, w) => sum + w.amount.toNumber(), 0);

    return {
      withdrawals: withdrawals.map(w => ({
        id: w.id.toString(),
        driverId: w.driverId.toString(),
        driverName: w.driver.name,
        driverPhone: w.driver.phone,
        amount: w.amount.toString(),
        status: w.status,
        requestedAt: w.requestedAt.toISOString(),
        approvedAt: w.approvedAt?.toISOString() ?? null,
        processedAt: w.processedAt?.toISOString() ?? null,
        completedAt: w.completedAt?.toISOString() ?? null,
        rejectionReason: w.rejectionReason,
        bankName: w.bankName,
        notes: w.notes
      })),
      pagination: { skip, take, total, hasMore: skip + take < total },
      summary,
      totalAmount: totalAmount.toFixed(2),
      filters: { status: statusFilter }
    };
  } catch (err) {
    console.error('Error loading withdrawals:', err);
    throw error(500, err instanceof Error ? err.message : 'Failed to load withdrawals');
  }
};
