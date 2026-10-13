import { prisma } from '$lib/server/db/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface InvoiceCreateData {
  tripId: BigInt;
  customerId: BigInt;
  amount: Decimal | number;
  vat?: Decimal | number; // Optional, will be calculated if not provided (default 20% for Austria)
  notes?: string;
}

export interface InvoiceUpdateData {
  status?: 'draft' | 'issued' | 'paid' | 'overdue';
  amount?: Decimal | number;
  vat?: Decimal | number;
  dueAt?: Date;
  notes?: string;
}

const DEFAULT_VAT_RATE = 0.20; // 20% VAT for Austria
const INVOICE_PREFIX = 'INV';
const INVOICE_DUE_DAYS = 14; // Standard 14-day payment terms

/**
 * Generates a unique invoice number
 * Format: INV-YYYY-XXXXXX (e.g., INV-2024-000001)
 */
export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();

  // Count invoices issued in this year
  const invoiceCount = await prisma.invoice.count({
    where: {
      issuedAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
      }
    }
  });

  const sequenceNumber = (invoiceCount + 1).toString().padStart(6, '0');
  return `${INVOICE_PREFIX}-${year}-${sequenceNumber}`;
}

/**
 * Calculates VAT amount based on invoice amount
 * Austrian standard VAT: 20%
 */
export function calculateVAT(amount: Decimal | number, vatRate: number = DEFAULT_VAT_RATE): Decimal {
  const amountDecimal = new Decimal(amount);
  return amountDecimal.times(vatRate);
}

/**
 * Creates a new invoice for a trip
 * Automatically calculates VAT and generates invoice number
 */
export async function createInvoice(data: InvoiceCreateData): Promise<any> {
  try {
    // Verify trip exists and get customer/amount info
    const trip = await prisma.trip.findUnique({
      where: { id: data.tripId },
      select: {
        id: true,
        customerId: true,
        totalAmount: true,
        status: true
      }
    });

    if (!trip) {
      throw new Error(`Trip ${data.tripId} not found`);
    }

    if (trip.customerId !== data.customerId) {
      throw new Error('Customer ID mismatch with trip');
    }

    // Check if invoice already exists for this trip
    const existingInvoice = await prisma.invoice.findFirst({
      where: { tripId: data.tripId }
    });

    if (existingInvoice) {
      throw new Error(`Invoice already exists for trip ${data.tripId}`);
    }

    // Calculate amounts
    const amount = new Decimal(data.amount || trip.totalAmount);
    const vat = data.vat !== undefined 
      ? new Decimal(data.vat) 
      : calculateVAT(amount);
    const totalAmount = amount.plus(vat);

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Set issue and due dates
    const issuedAt = new Date();
    const dueAt = new Date(issuedAt);
    dueAt.setDate(dueAt.getDate() + INVOICE_DUE_DAYS);

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        tripId: data.tripId,
        customerId: data.customerId,
        amount,
        vat,
        totalAmount,
        status: 'draft',
        issuedAt,
        dueAt,
        notes: data.notes
      },
      include: {
        trip: {
          select: {
            id: true,
            customerId: true,
            totalAmount: true,
            startTime: true,
            endTime: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true
          }
        }
      }
    });

    return invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

/**
 * Issues an invoice (changes status from draft to issued)
 * Typically done when sending to customer
 */
export async function issueInvoice(invoiceId: BigInt): Promise<any> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (invoice.status !== 'draft') {
      throw new Error(`Cannot issue invoice with status: ${invoice.status}`);
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'issued',
        issuedAt: new Date()
      },
      include: {
        customer: true,
        trip: true
      }
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        actorUserId: 'system', // Should pass userId in production
        action: 'issue_invoice',
        entityType: 'Invoice',
        entityId: invoiceId.toString(),
        newValue: { status: 'issued', issuedAt: new Date() }
      }
    }).catch(() => {}); // Ignore if AuditLog fails

    return updated;
  } catch (error) {
    console.error('Error issuing invoice:', error);
    throw error;
  }
}

/**
 * Marks an invoice as paid
 */
export async function markInvoiceAsPaid(invoiceId: BigInt, paidAt?: Date): Promise<any> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    if (!['issued', 'overdue'].includes(invoice.status)) {
      throw new Error(`Cannot mark invoice as paid with status: ${invoice.status}`);
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: paidAt || new Date()
      },
      include: {
        customer: true,
        trip: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: 'system',
        action: 'mark_invoice_paid',
        entityType: 'Invoice',
        entityId: invoiceId.toString(),
        newValue: { status: 'paid', paidAt: paidAt || new Date() }
      }
    }).catch(() => {});

    return updated;
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    throw error;
  }
}

/**
 * Updates invoice details (draft invoices only)
 */
export async function updateInvoice(invoiceId: BigInt, data: InvoiceUpdateData): Promise<any> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Only allow updates if invoice is still in draft
    if (invoice.status !== 'draft' && (data.amount || data.vat)) {
      throw new Error('Cannot modify amounts on issued or paid invoices');
    }

    const updateData: any = {};

    if (data.status) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.dueAt) updateData.dueAt = data.dueAt;

    if (data.amount !== undefined) {
      const amount = new Decimal(data.amount);
      updateData.amount = amount;
      updateData.vat = data.vat !== undefined ? new Decimal(data.vat) : calculateVAT(amount);
      updateData.totalAmount = amount.plus(updateData.vat);
    } else if (data.vat !== undefined) {
      updateData.vat = new Decimal(data.vat);
      updateData.totalAmount = invoice.amount.plus(updateData.vat);
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        customer: true,
        trip: true
      }
    });

    return updated;
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
}

/**
 * Gets a single invoice by ID
 */
export async function getInvoice(invoiceId: BigInt): Promise<any> {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        trip: {
          include: {
            driver: true,
            car: true,
            pickupLocation: true,
            dropoffLocation: true
          }
        }
      }
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    return serializeInvoice(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
}

/**
 * Gets invoices by customer
 */
export async function getCustomerInvoices(customerId: BigInt, status?: string): Promise<any[]> {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId,
        ...(status && { status: status as any })
      },
      include: {
        trip: {
          select: {
            id: true,
            startTime: true,
            totalAmount: true
          }
        }
      },
      orderBy: { issuedAt: 'desc' }
    });

    return invoices.map(serializeInvoice);
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    throw error;
  }
}

/**
 * Gets all invoices with optional filtering
 */
export async function getAllInvoices(
  status?: string,
  skip: number = 0,
  take: number = 50
): Promise<{ invoices: any[]; total: number }> {
  try {
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: status ? { status: status as any } : undefined,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          trip: {
            select: {
              id: true,
              startTime: true,
              totalAmount: true
            }
          }
        },
        orderBy: { issuedAt: 'desc' },
        skip,
        take
      }),
      prisma.invoice.count({
        where: status ? { status: status as any } : undefined
      })
    ]);

    return {
      invoices: invoices.map(serializeInvoice),
      total
    };
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
}

/**
 * Checks for overdue invoices and updates their status
 * Should be run periodically (e.g., daily cron job)
 */
export async function checkAndUpdateOverdueInvoices(): Promise<number> {
  try {
    const now = new Date();

    const result = await prisma.invoice.updateMany({
      where: {
        status: 'issued',
        dueAt: {
          lt: now
        }
      },
      data: {
        status: 'overdue'
      }
    });

    console.log(`Updated ${result.count} invoices to overdue status`);
    return result.count;
  } catch (error) {
    console.error('Error checking overdue invoices:', error);
    throw error;
  }
}

/**
 * Gets invoice summary statistics
 */
export async function getInvoiceStats(): Promise<{
  total: number;
  draft: number;
  issued: number;
  paid: number;
  overdue: number;
  totalRevenue: Decimal;
  totalVAT: Decimal;
  totalOutstanding: Decimal;
}> {
  try {
    const invoices = await prisma.invoice.findMany({
      select: {
        status: true,
        amount: true,
        vat: true,
        totalAmount: true
      }
    });

    const stats = {
      total: invoices.length,
      draft: invoices.filter(i => i.status === 'draft').length,
      issued: invoices.filter(i => i.status === 'issued').length,
      paid: invoices.filter(i => i.status === 'paid').length,
      overdue: invoices.filter(i => i.status === 'overdue').length,
      totalRevenue: invoices.reduce((sum, i) => sum.plus(i.amount), new Decimal(0)),
      totalVAT: invoices.reduce((sum, i) => sum.plus(i.vat), new Decimal(0)),
      totalOutstanding: invoices
        .filter(i => ['issued', 'overdue'].includes(i.status))
        .reduce((sum, i) => sum.plus(i.totalAmount), new Decimal(0))
    };

    return stats;
  } catch (error) {
    console.error('Error calculating invoice stats:', error);
    throw error;
  }
}

/**
 * Serializes invoice for JSON response (converts Decimal to number)
 */
function serializeInvoice(invoice: any): any {
  return {
    ...invoice,
    amount: Number(invoice.amount),
    vat: Number(invoice.vat),
    totalAmount: Number(invoice.totalAmount)
  };
}
