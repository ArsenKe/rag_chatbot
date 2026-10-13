import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/rbac/roles';
import {
  createInvoice,
  getInvoice,
  updateInvoice,
  issueInvoice,
  markInvoiceAsPaid,
  getAllInvoices,
  getCustomerInvoices,
  getInvoiceStats,
  checkAndUpdateOverdueInvoices
} from '$lib/server/invoicing/invoice-service';

/**
 * GET /api/invoices - List all invoices or get customer invoices
 * Query params:
 * - customerId: Filter by customer
 * - status: Filter by status (draft, issued, paid, overdue)
 * - skip: Pagination offset
 * - take: Pagination limit
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const customerId = url.searchParams.get('customerId');
    const status = url.searchParams.get('status');
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '50');

    if (customerId) {
      const invoices = await getCustomerInvoices(BigInt(customerId), status || undefined);
      return json({ data: invoices });
    }

    const result = await getAllInvoices(status || undefined, skip, take);
    return json(result);
  } catch (cause) {
    console.error('GET /api/invoices error:', cause);
    return json(
      { error: { message: String(cause) } },
      { status: 400 }
    );
  }
};

/**
 * POST /api/invoices - Create a new invoice
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const body = await request.json();
    const { tripId, customerId, amount, vat, notes } = body;

    if (!tripId || !customerId) {
      return json(
        { error: { message: 'Missing required fields: tripId, customerId' } },
        { status: 400 }
      );
    }

    const invoice = await createInvoice({
      tripId: BigInt(tripId),
      customerId: BigInt(customerId),
      amount: amount ? parseFloat(amount) : undefined,
      vat: vat ? parseFloat(vat) : undefined,
      notes
    });

    return json({ data: invoice }, { status: 201 });
  } catch (cause) {
    console.error('POST /api/invoices error:', cause);
    return json(
      { error: { message: String(cause) } },
      { status: 400 }
    );
  }
};
