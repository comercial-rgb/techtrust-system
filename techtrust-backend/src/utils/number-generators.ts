/**
 * ============================================
 * NUMBER GENERATORS
 * ============================================
 * Generates unique, human-readable identifiers for:
 * - Written Estimates (WE-2026-XXXXXX)
 * - Repair Invoices (RI-2026-XXXXXX)
 * - Appointments (APT-XXXXXX)
 * - Estimate Shares (ES-XXXXXX)
 */

import { prisma } from "../config/database";

/**
 * Generate a random alphanumeric string
 */
const randomAlphaNum = (length: number): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars (0,O,1,I)
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate Written Estimate number: WE-2026-A3B4C5
 */
export const generateEstimateNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  let attempts = 0;
  while (attempts < 10) {
    const number = `WE-${year}-${randomAlphaNum(6)}`;
    const existing = await prisma.quote.findFirst({
      where: { estimateNumber: number },
      select: { id: true },
    });
    if (!existing) return number;
    attempts++;
  }
  // Fallback with timestamp
  return `WE-${year}-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * Generate Repair Invoice number: RI-2026-A3B4C5
 */
export const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  let attempts = 0;
  while (attempts < 10) {
    const number = `RI-${year}-${randomAlphaNum(6)}`;
    const existing = await prisma.repairInvoice.findFirst({
      where: { invoiceNumber: number },
      select: { id: true },
    });
    if (!existing) return number;
    attempts++;
  }
  return `RI-${year}-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * Generate Appointment number: APT-A3B4C5
 */
export const generateAppointmentNumber = async (): Promise<string> => {
  let attempts = 0;
  while (attempts < 10) {
    const number = `APT-${randomAlphaNum(6)}`;
    const existing = await prisma.appointment.findFirst({
      where: { appointmentNumber: number },
      select: { id: true },
    });
    if (!existing) return number;
    attempts++;
  }
  return `APT-${Date.now().toString(36).toUpperCase()}`;
};

/**
 * Generate Estimate Share number: ES-A3B4C5
 */
export const generateShareNumber = async (): Promise<string> => {
  let attempts = 0;
  while (attempts < 10) {
    const number = `ES-${randomAlphaNum(6)}`;
    const existing = await prisma.estimateShare.findFirst({
      where: { shareNumber: number },
      select: { id: true },
    });
    if (!existing) return number;
    attempts++;
  }
  return `ES-${Date.now().toString(36).toUpperCase()}`;
};
