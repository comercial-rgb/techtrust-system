/**
 * ============================================
 * PDF GENERATION SERVICE
 * ============================================
 * Generates PDF documents for:
 * - Repair Invoices (FDACS compliant)
 * - Receipts
 * Uses pdfmake (pure JS, no native deps)
 * Uploads to Cloudinary, stores URL in DB
 */

import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

const prisma = new PrismaClient();

// pdfmake Node.js setup with PdfPrinter (v0.2.x)
const PdfPrinter = require("pdfmake/src/printer");
const vfsFonts = require("pdfmake/build/vfs_fonts");

const fonts = {
  Roboto: {
    normal: Buffer.from(vfsFonts["Roboto-Regular.ttf"], "base64"),
    bold: Buffer.from(vfsFonts["Roboto-Medium.ttf"], "base64"),
    italics: Buffer.from(vfsFonts["Roboto-Italic.ttf"], "base64"),
    bolditalics: Buffer.from(vfsFonts["Roboto-MediumItalic.ttf"], "base64"),
  },
};

const printer = new PdfPrinter(fonts);

function createPdfBuffer(docDefinition: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Upload PDF buffer to Cloudinary
 */
async function uploadPdfToCloudinary(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const useCloudinary = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== "sua_cloud_name"
  );

  if (!useCloudinary) {
    // Fallback: save locally
    const fs = require("fs");
    const path = require("path");
    const dir = path.join(__dirname, "../../uploads/pdfs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/pdfs/${filename}`;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "techtrust/pdfs",
        public_id: filename.replace(".pdf", ""),
        format: "pdf",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result?.secure_url || result?.url || "");
      },
    );
    uploadStream.end(buffer);
  });
}

/**
 * Generate Repair Invoice PDF (FDACS Compliant)
 */
export async function generateRepairInvoicePdf(
  invoiceId: string,
): Promise<string> {
  const invoice = await prisma.repairInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      quote: { select: { quoteNumber: true } },
      workOrder: { select: { orderNumber: true } },
    },
  });

  if (!invoice) throw new Error("Repair invoice not found");

  const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];

  // Build line items table body
  const tableBody: any[][] = [
    [
      { text: "Type", style: "tableHeader" },
      { text: "Description", style: "tableHeader" },
      { text: "Condition", style: "tableHeader" },
      { text: "Qty", style: "tableHeader", alignment: "center" },
      { text: "Unit Price", style: "tableHeader", alignment: "right" },
      { text: "Total", style: "tableHeader", alignment: "right" },
    ],
  ];

  for (const item of lineItems as any[]) {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const total = qty * price;
    const noCharge = item.isNoCharge ? " (NO CHARGE)" : "";

    tableBody.push([
      item.type || "PART",
      `${item.description || ""}${noCharge}`,
      item.partCondition || "-",
      { text: String(qty), alignment: "center" },
      { text: `$${price.toFixed(2)}`, alignment: "right" },
      { text: `$${total.toFixed(2)}`, alignment: "right" },
    ]);
  }

  const docDefinition: any = {
    pageSize: "LETTER",
    pageMargins: [40, 40, 40, 60],
    content: [
      // Header
      {
        columns: [
          { text: "REPAIR INVOICE", style: "header", width: "*" },
          {
            text: [
              { text: `${invoice.invoiceNumber}\n`, style: "invoiceNumber" },
              {
                text: `Date: ${new Date(invoice.createdAt).toLocaleDateString("en-US")}`,
                fontSize: 10,
              },
            ],
            alignment: "right",
            width: "auto",
          },
        ],
      },
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 2,
            lineColor: "#1976d2",
          },
        ],
        margin: [0, 5, 0, 15],
      },

      // Provider info
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: "SERVICE PROVIDER", style: "sectionTitle" },
              {
                text: invoice.providerBusinessName || invoice.providerName,
                fontSize: 12,
                bold: true,
              },
              { text: invoice.providerName, fontSize: 10, color: "#555" },
              invoice.fdacsRegistrationNumber
                ? {
                    text: `FDACS Reg #: ${invoice.fdacsRegistrationNumber}`,
                    fontSize: 10,
                    color: "#1976d2",
                    margin: [0, 4, 0, 0],
                  }
                : {},
            ],
          },
          {
            width: "50%",
            stack: [
              { text: "CUSTOMER", style: "sectionTitle" },
              { text: invoice.customerName, fontSize: 12, bold: true },
              invoice.customerContact
                ? { text: invoice.customerContact, fontSize: 10, color: "#555" }
                : {},
            ],
          },
        ],
        margin: [0, 0, 0, 15],
      },

      // Vehicle info
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: "VEHICLE", style: "sectionTitle" },
              { text: invoice.vehicleInfo, fontSize: 11 },
              invoice.odometerReading
                ? {
                    text: `Odometer: ${invoice.odometerReading.toLocaleString()} mi`,
                    fontSize: 10,
                    color: "#555",
                  }
                : {},
            ],
          },
          {
            width: "50%",
            stack: [
              { text: "REFERENCES", style: "sectionTitle" },
              {
                text: `Quote: ${invoice.quote?.quoteNumber || "-"}`,
                fontSize: 10,
              },
              {
                text: `Work Order: ${invoice.workOrder?.orderNumber || "-"}`,
                fontSize: 10,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 15],
      },

      // Service performed
      invoice.servicePerformed
        ? [
            { text: "SERVICE PERFORMED", style: "sectionTitle" },
            {
              text: invoice.servicePerformed,
              fontSize: 10,
              margin: [0, 0, 0, 15],
            },
          ]
        : {},

      // Line items table
      { text: "ITEMIZED SERVICES & PARTS", style: "sectionTitle" },
      {
        table: {
          headerRows: 1,
          widths: [50, "*", 60, 30, 60, 60],
          body: tableBody,
        },
        layout: {
          hLineWidth: (i: number, node: any) =>
            i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i <= 1 ? "#333" : "#ddd"),
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
        margin: [0, 5, 0, 15],
      },

      // Totals
      {
        columns: [
          { width: "*", text: "" },
          {
            width: 200,
            table: {
              widths: ["*", 80],
              body: [
                [
                  "Parts:",
                  {
                    text: `$${Number(invoice.finalPartsCost).toFixed(2)}`,
                    alignment: "right",
                  },
                ],
                [
                  "Labor:",
                  {
                    text: `$${Number(invoice.finalLaborCost).toFixed(2)}`,
                    alignment: "right",
                  },
                ],
                ...(Number(invoice.originalTravelFee) > 0
                  ? [
                      [
                        "Travel Fee:",
                        {
                          text: `$${Number(invoice.originalTravelFee).toFixed(2)}`,
                          alignment: "right",
                        },
                      ],
                    ]
                  : []),
                ...(Number(invoice.diagnosticFee) > 0
                  ? [
                      [
                        invoice.diagnosticFeeWaived
                          ? "Diagnostic Fee (WAIVED):"
                          : "Diagnostic Fee:",
                        {
                          text: invoice.diagnosticFeeWaived
                            ? "$0.00"
                            : `$${Number(invoice.diagnosticFee).toFixed(2)}`,
                          alignment: "right",
                        },
                      ],
                    ]
                  : []),
                ...(Number(invoice.shopSuppliesFee) > 0
                  ? [
                      [
                        "Shop Supplies*:",
                        {
                          text: `$${Number(invoice.shopSuppliesFee).toFixed(2)}`,
                          alignment: "right",
                        },
                      ],
                    ]
                  : []),
                ...(Number(invoice.tireFee) > 0
                  ? [
                      [
                        "Tire Fee (FS 403.718):",
                        {
                          text: `$${Number(invoice.tireFee).toFixed(2)}`,
                          alignment: "right",
                        },
                      ],
                    ]
                  : []),
                ...(Number(invoice.batteryFee) > 0
                  ? [
                      [
                        "Battery Fee (FS 403.7185):",
                        {
                          text: `$${Number(invoice.batteryFee).toFixed(2)}`,
                          alignment: "right",
                        },
                      ],
                    ]
                  : []),
                ...(Number(invoice.supplementsTotal) > 0
                  ? [
                      [
                        "Approved Supplements:",
                        {
                          text: `$${Number(invoice.supplementsTotal).toFixed(2)}`,
                          alignment: "right",
                        },
                      ],
                    ]
                  : []),
                ...(Number(invoice.originalTaxAmount) > 0
                  ? [
                      [
                        "Tax:",
                        {
                          text: `$${Number(invoice.originalTaxAmount).toFixed(2)}`,
                          alignment: "right",
                        },
                      ],
                    ]
                  : []),
                [
                  { text: "TOTAL:", bold: true, fontSize: 13 },
                  {
                    text: `$${Number(invoice.finalTotal).toFixed(2)}`,
                    alignment: "right",
                    bold: true,
                    fontSize: 13,
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: (i: number, node: any) =>
                i === node.table.body.length - 1 ? 1 : 0,
              vLineWidth: () => 0,
              hLineColor: () => "#333",
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
          },
        ],
        margin: [0, 0, 0, 15],
      },

      // Warranty
      invoice.warrantyStatement
        ? {
            stack: [
              { text: "WARRANTY / GUARANTEE", style: "sectionTitle" },
              { text: invoice.warrantyStatement, fontSize: 10 },
              invoice.warrantyMonths
                ? {
                    text: `Duration: ${invoice.warrantyMonths} months`,
                    fontSize: 9,
                    color: "#555",
                  }
                : {},
              invoice.warrantyMileage
                ? {
                    text: `Mileage: ${invoice.warrantyMileage.toLocaleString()} miles`,
                    fontSize: 9,
                    color: "#555",
                  }
                : {},
            ],
            margin: [0, 0, 0, 15],
          }
        : {},

      // Labor charge basis (FDACS §559.905(1)(g))
      invoice.laborChargeType
        ? {
            stack: [
              { text: "LABOR CHARGES BASED ON", style: "sectionTitle" },
              {
                text: `${invoice.laborChargeType === "FLAT_RATE" ? "Flat Rate" : invoice.laborChargeType === "HOURLY" ? "Hourly Rate" : "Both Flat Rate and Hourly Rate"}${invoice.hourlyRate ? ` — $${Number(invoice.hourlyRate).toFixed(2)}/hour` : ""}`,
                fontSize: 10,
              },
            ],
            margin: [0, 0, 0, 10],
          }
        : {},

      // Storage charge (FDACS §559.905(1)(n))
      Number(invoice.dailyStorageCharge) > 0
        ? {
            stack: [
              { text: "STORAGE CHARGE", style: "sectionTitle" },
              {
                text: `A storage fee of $${Number(invoice.dailyStorageCharge).toFixed(2)} per day may be applied to vehicles which are not claimed within 3 working days of notification of completion.`,
                fontSize: 9,
                color: "#555",
              },
            ],
            margin: [0, 0, 0, 10],
          }
        : {},

      // FDACS mandatory statements (§559.905(1)(h))
      Number(invoice.shopSuppliesFee) > 0 ||
      Number(invoice.tireFee) > 0 ||
      Number(invoice.batteryFee) > 0
        ? {
            stack: [
              { text: "REGULATORY NOTICES", style: "sectionTitle" },
              ...(Number(invoice.shopSuppliesFee) > 0
                ? [
                    {
                      text: "*This charge represents costs and profits to the motor vehicle repair facility for miscellaneous shop supplies or waste disposal.",
                      fontSize: 8,
                      color: "#555",
                      margin: [0, 0, 0, 4] as [number, number, number, number],
                    },
                  ]
                : []),
              ...(Number(invoice.tireFee) > 0
                ? [
                    {
                      text: "F.S. 403.718 mandates a $1.00 fee for each new tire sold in the State of Florida.",
                      fontSize: 8,
                      color: "#555",
                      margin: [0, 0, 0, 4] as [number, number, number, number],
                    },
                  ]
                : []),
              ...(Number(invoice.batteryFee) > 0
                ? [
                    {
                      text: "F.S. 403.7185 mandates a $1.50 fee for each new or remanufactured battery sold in the State of Florida.",
                      fontSize: 8,
                      color: "#555",
                      margin: [0, 0, 0, 4] as [number, number, number, number],
                    },
                  ]
                : []),
            ],
            margin: [0, 0, 0, 15],
          }
        : {},

      // Signature
      invoice.customerSignature
        ? {
            columns: [
              { width: "*", text: "" },
              {
                width: 200,
                stack: [
                  { text: "CUSTOMER ACCEPTANCE", style: "sectionTitle" },
                  {
                    text: `Accepted: ${invoice.customerAcceptedAt ? new Date(invoice.customerAcceptedAt).toLocaleDateString("en-US") : ""}`,
                    fontSize: 9,
                  },
                  {
                    text: `Signature: ${invoice.customerSignature}`,
                    fontSize: 10,
                    italics: true,
                    margin: [0, 5, 0, 0],
                  },
                ],
              },
            ],
          }
        : {},
    ],

    // Footer
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: "Generated by TechTrust AutoSolutions",
          fontSize: 8,
          color: "#999",
          margin: [40, 0, 0, 0],
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          fontSize: 8,
          color: "#999",
          alignment: "right",
          margin: [0, 0, 40, 0],
        },
      ],
    }),

    // Styles
    styles: {
      header: { fontSize: 22, bold: true, color: "#1976d2" },
      invoiceNumber: { fontSize: 14, bold: true, color: "#333" },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        color: "#1976d2",
        margin: [0, 0, 0, 4],
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: "#333",
        fillColor: "#f3f4f6",
      },
    },
    defaultStyle: { font: "Roboto", fontSize: 10 },
  };

  try {
    const buffer = await createPdfBuffer(docDefinition);
    const filename = `invoice-${invoice.invoiceNumber}.pdf`;
    const url = await uploadPdfToCloudinary(buffer, filename);

    // Update the invoice record with the PDF URL
    await prisma.repairInvoice.update({
      where: { id: invoiceId },
      data: { pdfUrl: url },
    });

    console.log(
      `[PDF] Generated repair invoice PDF: ${invoice.invoiceNumber} → ${url}`,
    );
    return url;
  } catch (error) {
    console.error("[PDF] Error generating repair invoice PDF:", error);
    throw error;
  }
}

/**
 * Generate Receipt PDF
 */
export async function generateReceiptPdf(receiptId: string): Promise<string> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
  });

  if (!receipt) throw new Error("Receipt not found");

  const lineItems = Array.isArray(receipt.lineItems) ? receipt.lineItems : [];

  const tableBody: any[][] = [
    [
      { text: "Description", style: "tableHeader" },
      { text: "Qty", style: "tableHeader", alignment: "center" },
      { text: "Price", style: "tableHeader", alignment: "right" },
      { text: "Total", style: "tableHeader", alignment: "right" },
    ],
  ];

  for (const item of lineItems as any[]) {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    tableBody.push([
      item.description || "",
      { text: String(qty), alignment: "center" },
      { text: `$${price.toFixed(2)}`, alignment: "right" },
      { text: `$${(qty * price).toFixed(2)}`, alignment: "right" },
    ]);
  }

  const docDefinition: any = {
    pageSize: "LETTER",
    pageMargins: [40, 40, 40, 60],
    content: [
      { text: "RECEIPT", style: "header" },
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 2,
            lineColor: "#1976d2",
          },
        ],
        margin: [0, 5, 0, 15],
      },
      {
        columns: [
          {
            text: `Receipt #: ${receipt.receiptNumber}`,
            fontSize: 12,
            bold: true,
          },
          {
            text: `Date: ${new Date(receipt.createdAt).toLocaleDateString("en-US")}`,
            alignment: "right",
            fontSize: 10,
          },
        ],
        margin: [0, 0, 0, 15],
      },
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: "PROVIDER", style: "sectionTitle" },
              {
                text: receipt.providerBusinessName || receipt.providerName,
                fontSize: 12,
                bold: true,
              },
              receipt.fdacsNumber
                ? {
                    text: `FDACS #: ${receipt.fdacsNumber}`,
                    fontSize: 9,
                    color: "#1976d2",
                  }
                : {},
            ],
          },
          {
            width: "50%",
            stack: [
              { text: "CUSTOMER", style: "sectionTitle" },
              { text: receipt.customerName, fontSize: 12, bold: true },
            ],
          },
        ],
        margin: [0, 0, 0, 15],
      },
      { text: "ITEMS", style: "sectionTitle" },
      {
        table: { headerRows: 1, widths: ["*", 40, 60, 60], body: tableBody },
        layout: {
          hLineWidth: (i: number, node: any) =>
            i <= 1 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i <= 1 ? "#333" : "#ddd"),
        },
        margin: [0, 5, 0, 15],
      },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: 180,
            table: {
              widths: ["*", 70],
              body: [
                [
                  "Subtotal:",
                  {
                    text: `$${Number(receipt.subtotal).toFixed(2)}`,
                    alignment: "right",
                  },
                ],
                ...(Number(receipt.supplementsTotal) > 0
                  ? [
                      [
                        "Supplements:",
                        {
                          text: `$${Number(receipt.supplementsTotal).toFixed(2)}`,
                          alignment: "right",
                        },
                      ],
                    ]
                  : []),
                [
                  { text: "TOTAL:", bold: true, fontSize: 13 },
                  {
                    text: `$${Number(receipt.totalAmount).toFixed(2)}`,
                    alignment: "right",
                    bold: true,
                    fontSize: 13,
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: (i: number, node: any) =>
                i === node.table.body.length - 1 ? 1 : 0,
              vLineWidth: () => 0,
            },
          },
        ],
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: "Generated by TechTrust AutoSolutions",
          fontSize: 8,
          color: "#999",
          margin: [40, 0, 0, 0],
        },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          fontSize: 8,
          color: "#999",
          alignment: "right",
          margin: [0, 0, 40, 0],
        },
      ],
    }),
    styles: {
      header: { fontSize: 22, bold: true, color: "#1976d2" },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        color: "#1976d2",
        margin: [0, 0, 0, 4],
      },
      tableHeader: { fontSize: 9, bold: true, fillColor: "#f3f4f6" },
    },
    defaultStyle: { font: "Roboto", fontSize: 10 },
  };

  try {
    const buffer = await createPdfBuffer(docDefinition);
    const filename = `receipt-${receipt.receiptNumber}.pdf`;
    const url = await uploadPdfToCloudinary(buffer, filename);

    await prisma.receipt.update({
      where: { id: receiptId },
      data: { pdfUrl: url },
    });

    console.log(
      `[PDF] Generated receipt PDF: ${receipt.receiptNumber} → ${url}`,
    );
    return url;
  } catch (error) {
    console.error("[PDF] Error generating receipt PDF:", error);
    throw error;
  }
}
