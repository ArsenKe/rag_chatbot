import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/client';
import { requireRole } from '$lib/server/rbac/roles';

// GET - Fetch driver's withdrawal requests
export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    requireRole(locals.user?.role, ['driver', 'admin', 'manager']);

    const driverId = BigInt(url.searchParams.get('driverId') ?? locals.user?.driverId ?? '0');

    // Drivers can only access their own withdrawals
    if (locals.user?.role === 'driver') {
      if (!locals.user.driverId || BigInt(locals.user.driverId) !== driverId) {
        throw error(403, 'Unauthorized: Cannot access other driver withdrawals');
      }
    }

    const status = url.searchParams.get('status');
    const skip = parseInt(url.searchParams.get('skip') ?? '0');
    const take = 20;

    const whereClause = {
      driverId,
      ...(status && status !== 'all' ? { status } : {})
    };

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where: whereClause,
        orderBy: { requestedAt: 'desc' },
        skip,
        take
      }),
      prisma.withdrawal.count({ where: whereClause })
    ]);

    return json({
      withdrawals: withdrawals.map(w => ({
        id: w.id.toString(),
        amount: w.amount.toString(),
        status: w.status,
        requestedAt: w.requestedAt.toISOString(),
        approvedAt: w.approvedAt?.toISOString() ?? null,
        processedAt: w.processedAt?.toISOString() ?? null,
        completedAt: w.completedAt?.toISOString() ?? null,
        rejectionReason: w.rejectionReason,
        notes: w.notes
      })),
      pagination: {
        skip,
        take,
        total,
        hasMore: skip + take < total
      }
    });
  } catch (err) {
    console.error('Error fetching withdrawals:', err);
    throw error(500, err instanceof Error ? err.message : 'Failed to fetch withdrawals');
  }
};

// POST - Create withdrawal request
export const POST: RequestHandler = async ({ locals, request }) => {
  try {
    requireRole(locals.user?.role, ['driver']);

    const driverId = BigInt(locals.user?.driverId ?? '0');
    const body = await request.json();
    const { amount, bankName, bankAccount, notes } = body;

    if (!amount || parseFloat(amount) <= 0) {
      throw error(400, 'Invalid withdrawal amount');
    }

    // Check if driver has sufficient earnings
    const driverEarnings = await prisma.trip.aggregate({
      where: {
        driverId,
        status: 'completed'
      },
      _sum: { driverPayout: true }
    });

    const totalEarnings = driverEarnings._sum.driverPayout?.toNumber() ?? 0;

    // Check for pending/approved withdrawals
    const pendingWithdrawals = await prisma.withdrawal.aggregate({
      where: {
        driverId,
        status: { in: ['pending', 'approved', 'processing'] }
      },
      _sum: { amount: true }
    });

    const pendingAmount = pendingWithdrawals._sum.amount?.toNumber() ?? 0;
    const availableBalance = totalEarnings - pendingAmount;

    if (parseFloat(amount) > availableBalance) {
      throw error(400, `Insufficient balance. Available: €${availableBalance.toFixed(2)}`);
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        driverId,
        amount: parseFloat(amount),
        bankName: bankName ?? null,
        bankAccount: bankAccount ?? null,
        notes: notes ?? null
      }
    });

    return json({
      success: true,
      withdrawal: {
        id: withdrawal.id.toString(),
        amount: withdrawal.amount.toString(),
        status: withdrawal.status,
        requestedAt: withdrawal.requestedAt.toISOString()
      }
    }, { status: 201 });
  } catch (err) {
    console.error('Error creating withdrawal:', err);
    if (err instanceof Error && 'status' in err) throw err;
    throw error(500, err instanceof Error ? err.message : 'Failed to create withdrawal');
  }
};
