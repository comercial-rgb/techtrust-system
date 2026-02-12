/**
 * Technician Controller
 * Manage technician records and EPA 609 certifications
 */

import { Request, Response } from "express";
import { PrismaClient, ComplianceStatus, TechnicianRole } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================
// GET /technicians/:providerProfileId
// List all technicians for a provider
// ============================================
export const getTechnicians = async (req: Request, res: Response) => {
  try {
    const { providerProfileId } = req.params;

    const technicians = await prisma.technician.findMany({
      where: { providerProfileId },
      orderBy: { fullName: "asc" },
    });

    res.json({ success: true, data: { technicians } });
  } catch (error: any) {
    console.error("Error fetching technicians:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch technicians" });
  }
};

// ============================================
// POST /technicians/:providerProfileId
// Add a technician
// ============================================
export const addTechnician = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { providerProfileId } = req.params;
    const user = (req as any).user;
    const {
      fullName,
      phone,
      email,
      role,
      epa609CertNumber,
      epa609IssuingOrg,
      epa609IssueDate,
      epa609ExpirationDate,
      epa609Uploads,
    } = req.body;

    // Verify ownership or admin
    const profile = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });
    if (!profile)
      return res
        .status(404)
        .json({ success: false, message: "Provider profile not found" });
    if (profile.userId !== user.userId && user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    if (!fullName?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Technician name is required" });
    }

    // Determine EPA 609 status
    let epa609Status: ComplianceStatus = "NOT_PROVIDED";
    if (epa609CertNumber || (epa609Uploads && epa609Uploads.length > 0)) {
      epa609Status = "PROVIDED_UNVERIFIED";
    }

    const technician = await prisma.technician.create({
      data: {
        providerProfileId,
        fullName: fullName.trim(),
        phone: phone || null,
        email: email || null,
        role: (role as TechnicianRole) || "TECH",
        epa609Status,
        epa609CertNumber: epa609CertNumber || null,
        epa609IssuingOrg: epa609IssuingOrg || null,
        epa609IssueDate: epa609IssueDate ? new Date(epa609IssueDate) : null,
        epa609ExpirationDate: epa609ExpirationDate
          ? new Date(epa609ExpirationDate)
          : null,
        epa609Uploads: epa609Uploads || [],
      },
    });

    res.status(201).json({ success: true, data: { technician } });
  } catch (error: any) {
    console.error("Error adding technician:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to add technician" });
  }
};

// ============================================
// PUT /technicians/:technicianId
// Update technician
// ============================================
export const updateTechnician = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { technicianId } = req.params;
    const user = (req as any).user;
    const {
      fullName,
      phone,
      email,
      role,
      isActive,
      epa609CertNumber,
      epa609IssuingOrg,
      epa609IssueDate,
      epa609ExpirationDate,
      epa609Uploads,
    } = req.body;

    const existing = await prisma.technician.findUnique({
      where: { id: technicianId },
      include: { providerProfile: true },
    });

    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Technician not found" });
    if (
      existing.providerProfile.userId !== user.userId &&
      user.role !== "ADMIN"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Re-evaluate EPA 609 status if cert info changed
    let epa609Status = existing.epa609Status;
    const newCert =
      epa609CertNumber !== undefined
        ? epa609CertNumber
        : existing.epa609CertNumber;
    const newUploads =
      epa609Uploads !== undefined ? epa609Uploads : existing.epa609Uploads;
    if (epa609CertNumber !== undefined || epa609Uploads !== undefined) {
      if (!newCert && (!newUploads || (newUploads as any[]).length === 0)) {
        epa609Status = "NOT_PROVIDED";
      } else if (existing.epa609Status === "NOT_PROVIDED") {
        epa609Status = "PROVIDED_UNVERIFIED";
      }
    }

    const technician = await prisma.technician.update({
      where: { id: technicianId },
      data: {
        fullName: fullName || undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        role: role ? (role as TechnicianRole) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        epa609Status,
        epa609CertNumber:
          epa609CertNumber !== undefined ? epa609CertNumber : undefined,
        epa609IssuingOrg:
          epa609IssuingOrg !== undefined ? epa609IssuingOrg : undefined,
        epa609IssueDate:
          epa609IssueDate !== undefined
            ? epa609IssueDate
              ? new Date(epa609IssueDate)
              : null
            : undefined,
        epa609ExpirationDate:
          epa609ExpirationDate !== undefined
            ? epa609ExpirationDate
              ? new Date(epa609ExpirationDate)
              : null
            : undefined,
        epa609Uploads: epa609Uploads !== undefined ? epa609Uploads : undefined,
      },
    });

    res.json({ success: true, data: { technician } });
  } catch (error: any) {
    console.error("Error updating technician:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update technician" });
  }
};

// ============================================
// DELETE /technicians/:technicianId
// Remove technician (soft-delete via isActive=false)
// ============================================
export const deactivateTechnician = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { technicianId } = req.params;
    const user = (req as any).user;

    const existing = await prisma.technician.findUnique({
      where: { id: technicianId },
      include: { providerProfile: true },
    });

    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Technician not found" });
    if (
      existing.providerProfile.userId !== user.userId &&
      user.role !== "ADMIN"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    await prisma.technician.update({
      where: { id: technicianId },
      data: { isActive: false },
    });

    res.json({ success: true, message: "Technician deactivated" });
  } catch (error: any) {
    console.error("Error deactivating technician:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to deactivate technician" });
  }
};
