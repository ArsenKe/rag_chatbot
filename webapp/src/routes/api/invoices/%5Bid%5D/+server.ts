import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/rbac/roles';
import {
  getInvoice,
  updateInvoice,
  issueInvoice,
  markInvoiceAsPaid
} from '$lib/server/invoicing/invoice-service';

/**
 * GET /api/invoices/[id] - Get invoice details
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager', 'driver']);

    const invoiceId = BigInt(params.id);
    const invoice = await getInvoice(invoiceId);

    return json({ data: invoice });
  } catch (cause) {
    console.error('GET /api/invoices/[id] error:', cause);
    const message = String(cause);
    if (message.includes('not found')) {
      return json({ error: { message } }, { status: 404 });
    }
    return json({ error: { message } }, { status: 400 });
  }
};

/**
 * PUT /api/invoices/[id] - Update invoice
 * Can only update draft invoices
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const body = await request.json();
    const invoiceId = BigInt(params.id);
    const { status, amount, vat, dueAt, notes } = body;

    const invoice = await updateInvoice(invoiceId, {
      status,
      amount: amount ? parseFloat(amount) : undefined,
      vat: vat ? parseFloat(vat) : undefined,
      dueAt: dueAt ? new Date(dueAt) : undefined,
      notes
    });

    return json({ data: invoice });
  } catch (cause) {
    console.error('PUT /api/invoices/[id] error:', cause);
    const message = String(cause);
    if (message.includes('not found')) {
      return json({ error: { message } }, { status: 404 });
    }
    return json({ error: { message } }, { status: 400 });
  }
};

/**
 * POST /api/invoices/[id]/issue - Issue an invoice
 * Changes status from draft to issued
 */
export const POST: RequestHandler = async ({ params, url, locals }) => {
  try {
    requireRole(locals.user?.role, ['admin', 'manager']);

    const invoiceId = BigInt(params.id);
    const action = url.searchParams.get('action');

    if (action === 'issue') {
      const invoice = await issueInvoice(invoiceId);
      return json({ data: invoice });
    } else if (action === 'pay') {
      const paidAtStr = url.searchParams.get('paidAt');
      const paidAt = paidAtStr ? new Date(paidAtStr) : undefined;
      const invoice = await markInvoiceAsPaid(invoiceId, paidAt);
      return json({ data: invoice });
    } else {
      return json(
        { error: { message: 'Unknown action. Use ?action=issue or ?action=pay' } },
        { status: 400 }
      );
    }
  } catch (cause) {
    console.error('POST /api/invoices/[id] error:', cause);
    const message = String(cause);
    if (message.includes('not found')) {
      return json({ error: { message } }, { status: 404 });
    }
    return json({ error: { message } }, { status: 400 });
  }
};
