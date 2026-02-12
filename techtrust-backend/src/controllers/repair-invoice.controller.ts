/**
 * ============================================
 * REPAIR INVOICE CONTROLLER
 * ============================================
 * FDACS-compliant Repair Invoice management.
 * Invoices are auto-generated when a Written Estimate
 * is approved (via service-flow controller).
 *
 * Endpoints:
 * - GET    /my                → List my invoices
 * - GET    /:id               → Get invoice detail
 * - PATCH  /:id/update-work   → Update work performed (provider)
 * - PATCH  /:id/complete      → Mark invoice as completed (provider)
 * - PATCH  /:id/accept        → Customer accepts final invoice
 * - PATCH  /:id/dispute       → Customer disputes invoice
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';
import { generateInvoiceNumber } from '../utils/number-generators';

// ============================================
// HELPER: Create Repair Invoice from approved Quote
// Called from service-flow.controller when estimate approved
// ============================================
export const createRepairInvoiceFromQuote = async (
  quoteId: string,
  workOrderId: string,
  tx?: any
): Promise<any> => {
  const db = tx || prisma;

  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: {
      serviceRequest: {
        include: { vehicle: true },
      },
      provider: {
        select: {
          id: true,
          fullName: true,
          providerProfile: {
            select: {
              businessName: true,
              fdacsRegistrationNumber: true,
            },
          },
        },
      },
    },
  });

  if (!quote) throw new AppError('Quote not found', 404, 'QUOTE_NOT_FOUND');

  const customer = await db.user.findUnique({
    where: { id: quote.serviceRequest.userId },
    select: { id: true, fullName: true, email: true, phone: true },
  });

  const vehicle = quote.serviceRequest.vehicle;
  const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.licensePlate ? ` (${vehicle.licensePlate})` : ''}`;

  const invoiceNumber = await generateInvoiceNumber();

  // Build line items from quote partsList (JSON field)
  const rawParts = (quote.partsList as any[]) || [];
  const lineItems = rawParts.map((item: any) => ({
    description: item.description || item.name || 'Part/Service',
    partsCost: Number(item.partsCost || item.cost || 0),
    laborCost: Number(item.laborCost || 0),
    quantity: item.quantity || 1,
    partCondition: item.partCondition || 'NEW',
    isNoCharge: item.isNoCharge || false,
    total: (Number(item.partsCost || item.cost || 0) + Number(item.laborCost || 0)) * (item.quantity || 1),
  }));

  const repairInvoice = await db.repairInvoice.create({
    data: {
      invoiceNumber,
      quoteId,
      workOrderId,
      customerId: customer!.id,
      customerName: customer!.fullName,
      customerContact: customer!.phone || customer!.email,
      providerId: quote.providerId,
      providerName: quote.provider.fullName,
      providerBusinessName: quote.provider.providerProfile?.businessName,
      fdacsRegistrationNumber: quote.provider.providerProfile?.fdacsRegistrationNumber,
      vehicleInfo,
      originalPartsCost: quote.partsCost || 0,
      originalLaborCost: quote.laborCost || 0,
      originalTravelFee: quote.travelFee || 0,
      originalTaxAmount: quote.taxAmount || 0,
      originalTotal: quote.totalAmount,
      lineItems,
      approvedSupplements: [],
      rejectedSupplements: [],
      supplementsTotal: 0,
      finalPartsCost: quote.partsCost || 0,
      finalLaborCost: quote.laborCost || 0,
      finalTotal: quote.totalAmount,
      warrantyMonths: quote.warrantyMonths,
      warrantyMileage: quote.warrantyMileage,
      diagnosticFee: quote.diagnosticFee || 0,
      diagnosticFeeWaived: quote.diagnosticFeeWaived || false,
      status: 'DRAFT',
    },
  });

  logger.info(`Repair Invoice created: ${invoiceNumber} from quote ${quote.quoteNumber}`);

  return repairInvoice;
};

// ============================================
// HELPER: Update invoice when supplement is approved/rejected
// ============================================
export const updateInvoiceWithSupplement = async (
  workOrderId: string,
  supplementData: {
    supplementId: string;
    description: string;
    amount: number;
    approved: boolean;
    approvedAt?: Date;
    rejectedAt?: Date;
    reason?: string;
  }
) => {
  const invoice = await prisma.repairInvoice.findFirst({
    where: { workOrderId },
  });

  if (!invoice) return; // No invoice yet

  if (supplementData.approved) {
    const currentApproved = (invoice.approvedSupplements as any[]) || [];
    currentApproved.push({
      supplementId: supplementData.supplementId,
      description: supplementData.description,
      amount: supplementData.amount,
      approvedAt: supplementData.approvedAt || new Date(),
    });

    const newSupplementsTotal = Number(invoice.supplementsTotal) + supplementData.amount;

    await prisma.repairInvoice.update({
      where: { id: invoice.id },
      data: {
        approvedSupplements: currentApproved,
        supplementsTotal: newSupplementsTotal,
        finalTotal: Number(invoice.originalTotal) + newSupplementsTotal,
      },
    });
  } else {
    const currentRejected = (invoice.rejectedSupplements as any[]) || [];
    currentRejected.push({
      supplementId: supplementData.supplementId,
      description: supplementData.description,
      amount: supplementData.amount,
      rejectedAt: supplementData.rejectedAt || new Date(),
      reason: supplementData.reason,
    });

    await prisma.repairInvoice.update({
      where: { id: invoice.id },
      data: { rejectedSupplements: currentRejected },
    });
  }
};

// ============================================
// 1. LIST MY INVOICES
// ============================================
export const getMyInvoices = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const role = req.user!.role;
  const { status, page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (role === 'PROVIDER') {
    where.providerId = userId;
  } else {
    where.customerId = userId;
  }
  if (status) {
    where.status = status as string;
  }

  const [invoices, total] = await Promise.all([
    prisma.repairInvoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        providerName: true,
        providerBusinessName: true,
        vehicleInfo: true,
        originalTotal: true,
        finalTotal: true,
        supplementsTotal: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.repairInvoice.count({ where }),
  ]);

  return res.json({
    success: true,
    data: {
      invoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
};

// ============================================
// 2. GET INVOICE DETAIL
// ============================================
export const getInvoice = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  const invoice = await prisma.repairInvoice.findUnique({
    where: { id },
    include: {
      quote: {
        select: {
          id: true,
          quoteNumber: true,
          estimateNumber: true,
          totalAmount: true,
          status: true,
          partsList: true,
        },
      },
      workOrder: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          beforePhotos: true,
          duringPhotos: true,
          afterPhotos: true,
        },
      },
    },
  });

  if (!invoice) throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  if (invoice.customerId !== userId && invoice.providerId !== userId) {
    throw new AppError('Not authorized', 403, 'FORBIDDEN');
  }

  return res.json({ success: true, data: { invoice } });
};

// ============================================
// 3. UPDATE WORK PERFORMED (provider)
// ============================================
export const updateWorkPerformed = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;
  const { servicePerformed, warrantyStatement, odometerReading } = req.body;

  const invoice = await prisma.repairInvoice.findFirst({
    where: { id, providerId, status: { in: ['DRAFT', 'IN_PROGRESS'] } },
  });

  if (!invoice) throw new AppError('Invoice not found or cannot be updated', 404, 'NOT_FOUND');

  const updated = await prisma.repairInvoice.update({
    where: { id },
    data: {
      servicePerformed,
      warrantyStatement,
      odometerReading,
      status: 'IN_PROGRESS',
    },
  });

  return res.json({
    success: true,
    message: 'Invoice updated.',
    data: { invoice: updated },
  });
};

// ============================================
// 4. COMPLETE INVOICE (provider)
// ============================================
export const completeInvoice = async (req: Request, res: Response) => {
  const providerId = req.user!.id;
  const { id } = req.params;
  const { servicePerformed, warrantyStatement } = req.body;

  const invoice = await prisma.repairInvoice.findFirst({
    where: { id, providerId, status: { in: ['DRAFT', 'IN_PROGRESS'] } },
  });

  if (!invoice) throw new AppError('Invoice not found or already completed', 404, 'NOT_FOUND');

  const updated = await prisma.repairInvoice.update({
    where: { id },
    data: {
      servicePerformed: servicePerformed || invoice.servicePerformed,
      warrantyStatement: warrantyStatement || invoice.warrantyStatement,
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  // Notify customer
  await prisma.notification.create({
    data: {
      userId: invoice.customerId,
      type: 'REPAIR_INVOICE_GENERATED',
      title: 'Repair Invoice Ready',
      message: `Your repair invoice ${invoice.invoiceNumber} is ready for review. Final total: $${Number(updated.finalTotal).toFixed(2)}.`,
      data: JSON.stringify({
        invoiceId: id,
        invoiceNumber: invoice.invoiceNumber,
        finalTotal: Number(updated.finalTotal),
      }),
    },
  });

  logger.info(`Repair Invoice completed: ${invoice.invoiceNumber}`);

  return res.json({
    success: true,
    message: 'Invoice marked as completed. Customer has been notified.',
    data: { invoice: updated },
  });
};

// ============================================
// 5. CUSTOMER ACCEPTS INVOICE
// ============================================
export const acceptInvoice = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { id } = req.params;
  const { signature } = req.body; // Optional digital signature

  const invoice = await prisma.repairInvoice.findFirst({
    where: { id, customerId, status: 'COMPLETED' },
  });

  if (!invoice) throw new AppError('Invoice not found or cannot be accepted', 404, 'NOT_FOUND');

  const updated = await prisma.repairInvoice.update({
    where: { id },
    data: {
      status: 'APPROVED',
      customerAcceptedAt: new Date(),
      customerSignature: signature || null,
    },
  });

  logger.info(`Repair Invoice accepted by customer: ${invoice.invoiceNumber}`);

  return res.json({
    success: true,
    message: 'Invoice accepted.',
    data: { invoice: updated },
  });
};

// ============================================
// 6. CUSTOMER DISPUTES INVOICE
// ============================================
export const disputeInvoice = async (req: Request, res: Response) => {
  const customerId = req.user!.id;
  const { id } = req.params;
  const { reason } = req.body;

  const invoice = await prisma.repairInvoice.findFirst({
    where: { id, customerId, status: 'COMPLETED' },
  });

  if (!invoice) throw new AppError('Invoice not found or cannot be disputed', 404, 'NOT_FOUND');

  const updated = await prisma.repairInvoice.update({
    where: { id },
    data: { status: 'DISPUTED' },
  });

  // Notify provider
  await prisma.notification.create({
    data: {
      userId: invoice.providerId,
      type: 'REPAIR_INVOICE_GENERATED',
      title: 'Invoice Disputed',
      message: `Customer has disputed invoice ${invoice.invoiceNumber}.${reason ? ` Reason: ${reason}` : ''}`,
      data: JSON.stringify({ invoiceId: id, reason }),
    },
  });

  logger.info(`Repair Invoice disputed: ${invoice.invoiceNumber}`);

  return res.json({
    success: true,
    message: 'Invoice disputed. Support team will review.',
    data: { invoice: updated },
  });
};
