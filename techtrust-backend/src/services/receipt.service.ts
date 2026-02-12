/**
 * ============================================
 * RECEIPT SERVICE - Geração de Recibos
 * ============================================
 * Gera recibos para pagamentos processados.
 */

import { prisma } from '../config/database';
import { logger } from '../config/logger';

interface GenerateReceiptParams {
  paymentId: string;
  customerName: string;
  customerEmail: string;
  providerName: string;
  providerBusinessName?: string;
  serviceDescription: string;
  vehicleInfo: string;
  orderNumber: string;
  subtotal: number;
  platformFee: number;
  processingFee: number;
  totalAmount: number;
  supplementsTotal?: number;
  paymentProcessor: 'STRIPE' | 'CHASE';
  paymentMethodInfo: string;
  termsAcceptedAt?: Date;
  fraudDisclaimerAcceptedAt?: Date;
  // FDACS Compliance fields
  lineItems?: any[];           // Itemized parts/labor/merchandise
  odometerReading?: number;    // Vehicle odometer at time of service
  fdacsNumber?: string;        // Provider FDACS registration number
  warrantyStatement?: string;  // Guarantee with time and mileage
  servicePerformed?: string;   // What was done to correct the problem
}

/**
 * Gerar recibo após pagamento capturado
 */
export async function generateReceipt(params: GenerateReceiptParams) {
  const receiptNumber = `RCT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const receipt = await prisma.receipt.create({
    data: {
      receiptNumber,
      paymentId: params.paymentId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      providerName: params.providerName,
      providerBusinessName: params.providerBusinessName,
      serviceDescription: params.serviceDescription,
      vehicleInfo: params.vehicleInfo,
      orderNumber: params.orderNumber,
      subtotal: params.subtotal,
      platformFee: params.platformFee,
      processingFee: params.processingFee,
      totalAmount: params.totalAmount,
      supplementsTotal: params.supplementsTotal || 0,
      paymentProcessor: params.paymentProcessor,
      paymentMethodInfo: params.paymentMethodInfo,
      termsAcceptedAt: params.termsAcceptedAt,
      fraudDisclaimerAcceptedAt: params.fraudDisclaimerAcceptedAt,
      // FDACS Compliance
      lineItems: params.lineItems || [],
      odometerReading: params.odometerReading || null,
      fdacsNumber: params.fdacsNumber || null,
      warrantyStatement: params.warrantyStatement || null,
      servicePerformed: params.servicePerformed || null,
    },
  });

  logger.info(`Receipt generated: ${receiptNumber} for payment ${params.paymentId}`);

  return receipt;
}

/**
 * Buscar recibo por ID do pagamento
 */
export async function getReceiptByPaymentId(paymentId: string) {
  return prisma.receipt.findUnique({
    where: { paymentId },
  });
}

/**
 * Buscar recibo por número
 */
export async function getReceiptByNumber(receiptNumber: string) {
  return prisma.receipt.findUnique({
    where: { receiptNumber },
  });
}

/**
 * Formatação HTML do recibo (para email/PDF futuro)
 */
export function formatReceiptHtml(receipt: any): string {
  // Build itemized line items table (FDACS Req #3, #4, #5)
  const lineItems = Array.isArray(receipt.lineItems) ? receipt.lineItems : [];
  const itemsTableRows = lineItems.map((item: any) => {
    const conditionLabel = item.partCondition && item.type === 'PART' ? ` (${item.partCondition})` : '';
    const noChargeLabel = item.isNoCharge ? ' <span style="color:#16a34a;font-weight:bold;">NO CHARGE</span>' : '';
    const total = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
    return `<tr>
      <td>${item.type || 'PART'}</td>
      <td>${item.description || ''}${conditionLabel}${noChargeLabel}</td>
      <td style="text-align:center">${item.quantity || 1}</td>
      <td style="text-align:right">$${Number(item.unitPrice || 0).toFixed(2)}</td>
      <td style="text-align:right">$${total.toFixed(2)}</td>
    </tr>`;
  }).join('');

  const itemsTable = lineItems.length > 0 ? `
    <div class="section">
      <h3>Itemized Services &amp; Parts</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid #333;text-align:left;">
            <th style="padding:6px 4px;">Type</th>
            <th style="padding:6px 4px;">Description</th>
            <th style="padding:6px 4px;text-align:center;">Qty</th>
            <th style="padding:6px 4px;text-align:right;">Unit Price</th>
            <th style="padding:6px 4px;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsTableRows}</tbody>
      </table>
    </div>` : '';

  // FDACS warranty statement (Req #6)
  const warrantySection = receipt.warrantyStatement ? `
    <div class="section">
      <h3>Guarantee / Warranty</h3>
      <p>${receipt.warrantyStatement}</p>
    </div>` : '';

  // FDACS service performed description (Req #2)
  const servicePerformedSection = receipt.servicePerformed ? `
    <div class="section">
      <h3>Service Performed</h3>
      <p>${receipt.servicePerformed}</p>
    </div>` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
        .header h1 { color: #2563eb; margin: 0; }
        .receipt-number { color: #666; font-size: 14px; }
        .section { margin: 20px 0; }
        .section h3 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        .row { display: flex; justify-content: space-between; padding: 4px 0; }
        .row.total { border-top: 2px solid #333; font-weight: bold; font-size: 18px; padding-top: 10px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
        .legal { background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 11px; color: #666; margin-top: 20px; }
        .fdacs { background: #eff6ff; padding: 12px; border-radius: 8px; font-size: 12px; color: #1e40af; margin-top: 15px; border: 1px solid #bfdbfe; }
        table td, table th { padding: 4px; }
        table tbody tr { border-bottom: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>TechTrust AutoSolutions</h1>
        <p class="receipt-number">Receipt #${receipt.receiptNumber}</p>
        <p>${new Date(receipt.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      
      <div class="section">
        <h3>Service Details</h3>
        <div class="row"><span>Order:</span><span>${receipt.orderNumber}</span></div>
        <div class="row"><span>Service:</span><span>${receipt.serviceDescription}</span></div>
        <div class="row"><span>Vehicle:</span><span>${receipt.vehicleInfo}</span></div>
        <div class="row"><span>Provider:</span><span>${receipt.providerBusinessName || receipt.providerName}</span></div>
        ${receipt.odometerReading ? `<div class="row"><span>Odometer Reading:</span><span>${receipt.odometerReading.toLocaleString()} mi</span></div>` : ''}
      </div>
      
      ${servicePerformedSection}
      ${itemsTable}
      
      <div class="section">
        <h3>Payment Breakdown</h3>
        <div class="row"><span>Service Amount:</span><span>$${Number(receipt.subtotal).toFixed(2)}</span></div>
        ${Number(receipt.supplementsTotal) > 0 ? `<div class="row"><span>Additional Services:</span><span>$${Number(receipt.supplementsTotal).toFixed(2)}</span></div>` : ''}
        <div class="row"><span>Platform Fee:</span><span>$${Number(receipt.platformFee).toFixed(2)}</span></div>
        <div class="row"><span>Processing Fee (${receipt.paymentProcessor}):</span><span>$${Number(receipt.processingFee).toFixed(2)}</span></div>
        <div class="row total"><span>Total Charged:</span><span>$${Number(receipt.totalAmount).toFixed(2)}</span></div>
      </div>
      
      ${warrantySection}
      
      <div class="section">
        <h3>Payment Information</h3>
        <div class="row"><span>Method:</span><span>${receipt.paymentMethodInfo}</span></div>
        <div class="row"><span>Processor:</span><span>${receipt.paymentProcessor}</span></div>
        <div class="row"><span>Customer:</span><span>${receipt.customerName}</span></div>
      </div>
      
      ${receipt.fdacsNumber ? `<div class="fdacs"><strong>FDACS Registration #:</strong> ${receipt.fdacsNumber}</div>` : ''}
      
      <div class="legal">
        <p><strong>Terms Accepted:</strong> ${receipt.termsAcceptedAt ? new Date(receipt.termsAcceptedAt).toISOString() : 'N/A'}</p>
        <p><strong>Fraud Disclaimer Accepted:</strong> ${receipt.fraudDisclaimerAcceptedAt ? new Date(receipt.fraudDisclaimerAcceptedAt).toISOString() : 'N/A'}</p>
        <p>By accepting these terms, the customer acknowledges that this transaction is legitimate and agrees not to dispute this charge with their financial institution. Fraudulent chargebacks may result in legal action.</p>
      </div>
      
      <div class="footer">
        <p>TechTrust AutoSolutions &copy; ${new Date().getFullYear()}</p>
        <p>Questions? Contact support@techtrust.com</p>
      </div>
    </body>
    </html>
  `;
}

export default {
  generateReceipt,
  getReceiptByPaymentId,
  getReceiptByNumber,
  formatReceiptHtml,
};
