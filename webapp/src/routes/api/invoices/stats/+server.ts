import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/rbac/roles';
import {
  getInvoiceStats,
  checkAndUpdateOverdueInvoices
} from '$lib/server/invoicing/invoice-service';

/**
 * GET /api/invoices/stats - Get invoice statistics
 */
export async function GET({ locals }: any) {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const stats = await getInvoiceStats();

    return json({
      data: {
        total: stats.total,
        draft: stats.draft,
        issued: stats.issued,
        paid: stats.paid,
        overdue: stats.overdue,
        totalRevenue: Number(stats.totalRevenue),
        totalVAT: Number(stats.totalVAT),
        totalOutstanding: Number(stats.totalOutstanding)
      }
    });
  } catch (cause) {
    console.error('GET /api/invoices/stats error:', cause);
    return json(
      { error: { message: String(cause) } },
      { status: 400 }
    );
  }
}

/**
 * POST /api/invoices/check-overdue - Check and update overdue invoices
 * Typically called by a cron job daily
 */
export async function POST({ locals }: any) {
  try {
    requireRole(locals.user?.role, ['admin']);

    const count = await checkAndUpdateOverdueInvoices();

    return json({
      data: {
        message: `Updated ${count} invoices to overdue status`,
        count
      }
    });
  } catch (cause) {
    console.error('POST /api/invoices/check-overdue error:', cause);
    return json(
      { error: { message: String(cause) } },
      { status: 400 }
    );
  }
}
