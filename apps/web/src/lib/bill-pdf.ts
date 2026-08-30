import { jsPDF } from "jspdf";
import type { GasBillDetailRow } from "@/components/gas-bill-detail-modal";
import { formatBillDateTime } from "@/lib/format";

// jsPDF's built-in fonts don't ship the Bengali Taka glyph (৳), so the PDF uses
// a plain "Tk" prefix instead of the symbol used elsewhere in the UI.
function pdfMoney(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `Tk ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function loadImageAsDataUrl(
  url: string,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => reject(new Error("image load failed"));
        img.src = dataUrl;
      },
    );
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

export async function downloadBillPdf(bill: GasBillDetailRow): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  const contentWidth = pageWidth - marginX * 2;

  const usageM3 = Number(bill.usageQuantity);
  const usageKg = Number.isFinite(usageM3) ? usageM3 * 1.8315 : 0;

  // Header band
  doc.setFillColor(24, 24, 27);
  doc.rect(0, 0, pageWidth, 96, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Gas Bill", marginX, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(212, 212, 216);
  doc.text("PRRMS - LPG Reticulation Billing System", marginX, 66);
  doc.setFontSize(10);
  doc.text(
    `Invoice #${bill.billId}   .   ${formatBillDateTime(bill.billingDate)}`,
    pageWidth - marginX,
    46,
    { align: "right" },
  );

  let y = 132;

  // Total payable hero
  doc.setFillColor(244, 244, 245);
  doc.roundedRect(marginX, y - 24, contentWidth, 64, 8, 8, "F");
  doc.setTextColor(113, 113, 122);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL PAYABLE", marginX + 18, y - 4);
  doc.setTextColor(24, 24, 27);
  doc.setFontSize(22);
  doc.text(pdfMoney(bill.totalBill), marginX + 18, y + 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text(
    `${bill.usageQuantity} m3 used   @ ${pdfMoney(bill.unitPrice)}/unit`,
    pageWidth - marginX - 18,
    y + 20,
    { align: "right" },
  );

  y += 70;

  const drawSection = (
    title: string,
    rows: Array<[string, string]>,
  ): void => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122);
    doc.text(title.toUpperCase(), marginX, y);
    y += 8;
    doc.setDrawColor(228, 228, 231);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 16;

    doc.setFontSize(11);
    for (const [label, value] of rows) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(113, 113, 122);
      doc.text(label, marginX, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(39, 39, 42);
      doc.text(value, pageWidth - marginX, y, { align: "right" });
      y += 20;
    }
    y += 12;
  };

  drawSection("Resident & location", [
    ["Full name", bill.fullName],
    ["User name", bill.userName],
    ["Building", bill.buildingName],
    ["Flat", bill.flatNo],
    ["Gas meter no.", bill.gasMeterNo],
  ]);

  drawSection("Meter readings", [
    ["Previous reading (m3)", bill.previousReading],
    ["Current reading (m3)", bill.currentReading],
    ["Usage (m3)", bill.usageQuantity],
    ["Usage (kg)", usageKg.toFixed(3)],
  ]);

  drawSection("Charges", [
    ["Unit price", pdfMoney(bill.unitPrice)],
    ["Usage (m3)", bill.usageQuantity],
    ["Total bill", pdfMoney(bill.totalBill)],
  ]);

  // Optional meter image
  if (bill.ocrImageUrl) {
    const img = await loadImageAsDataUrl(bill.ocrImageUrl);
    if (img) {
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxW = contentWidth;
      const maxH = 220;
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * ratio;
      const h = img.height * ratio;
      if (y + h + 40 > pageHeight - 48) {
        doc.addPage();
        y = 72;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(113, 113, 122);
      doc.text("METER IMAGE (AT BILLING)", marginX, y);
      y += 12;
      const format = img.dataUrl.includes("image/png") ? "PNG" : "JPEG";
      try {
        doc.addImage(img.dataUrl, format, marginX, y, w, h);
        y += h + 20;
      } catch {
        // Skip image if jsPDF can't decode it.
      }
    }
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(228, 228, 231);
  doc.line(marginX, pageHeight - 56, pageWidth - marginX, pageHeight - 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(161, 161, 170);
  doc.text(`Bill #${bill.billId}`, marginX, pageHeight - 38);
  doc.text(
    `Generated ${new Date().toLocaleString()}`,
    pageWidth - marginX,
    pageHeight - 38,
    { align: "right" },
  );

  doc.save(`gas-bill-${bill.billId}.pdf`);
}

function ellipsize(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && doc.getTextWidth(`${s}...`) > maxWidth) {
    s = s.slice(0, -1);
  }
  return `${s}...`;
}

type ListPdfCol = {
  label: string;
  width: number;
  align: "left" | "right";
  value: (r: GasBillDetailRow) => string;
};

function unpaidListColumns(): ListPdfCol[] {
  return [
    { label: "Id", width: 40, align: "right", value: (r) => `#${r.billId}` },
    {
      label: "Date",
      width: 118,
      align: "left",
      value: (r) => formatBillDateTime(r.billingDate),
    },
    {
      label: "User",
      width: 168,
      align: "left",
      value: (r) => `${r.fullName} (${r.userName})`,
    },
    {
      label: "Building",
      width: 108,
      align: "left",
      value: (r) => r.buildingName,
    },
    { label: "Flat", width: 52, align: "left", value: (r) => r.flatNo },
    { label: "Meter", width: 96, align: "left", value: (r) => r.gasMeterNo },
    {
      label: "Current",
      width: 64,
      align: "right",
      value: (r) => String(r.currentReading ?? ""),
    },
    {
      label: "Total",
      width: 84,
      align: "right",
      value: (r) => pdfMoney(r.totalBill),
    },
  ];
}

function historyListColumns(showUser: boolean): ListPdfCol[] {
  return [
    { label: "Id", width: 34, align: "right", value: (r) => `#${r.billId}` },
    {
      label: "Date",
      width: 100,
      align: "left",
      value: (r) => formatBillDateTime(r.billingDate),
    },
    ...(showUser
      ? [
          {
            label: "User",
            width: 112,
            align: "left" as const,
            value: (r: GasBillDetailRow) => `${r.fullName} (${r.userName})`,
          },
        ]
      : []),
    {
      label: "Meter",
      width: showUser ? 78 : 96,
      align: "left",
      value: (r) => r.gasMeterNo,
    },
    {
      label: "Building",
      width: showUser ? 78 : 100,
      align: "left",
      value: (r) => r.buildingName,
    },
    { label: "Flat", width: 42, align: "left", value: (r) => r.flatNo },
    {
      label: "Prev",
      width: 50,
      align: "right",
      value: (r) => String(r.previousReading ?? ""),
    },
    {
      label: "Curr",
      width: 50,
      align: "right",
      value: (r) => String(r.currentReading ?? ""),
    },
    {
      label: "Usage",
      width: 46,
      align: "right",
      value: (r) => String(r.usageQuantity ?? ""),
    },
    {
      label: "Unit",
      width: 56,
      align: "right",
      value: (r) => pdfMoney(r.unitPrice),
    },
    {
      label: "Total",
      width: 68,
      align: "right",
      value: (r) => pdfMoney(r.totalBill),
    },
    {
      label: "Status",
      width: 56,
      align: "left",
      value: (r) => (r.status ? r.status : "—"),
    },
  ];
}

function downloadBillingListPdf(
  rows: GasBillDetailRow[],
  options: {
    title: string;
    fileName: string;
    countLabel: string;
    cols: ListPdfCol[];
  },
): void {
  const { title, fileName, countLabel, cols } = options;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36;
  const contentWidth = pageWidth - marginX * 2;
  const rowH = 18;
  const headerBandH = 52;
  const tableHeaderY = 70;
  const tableStartY = 90;
  const footerY = pageHeight - 28;

  const drawChrome = () => {
    doc.setFillColor(24, 24, 27);
    doc.rect(0, 0, pageWidth, headerBandH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, marginX, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(212, 212, 216);
    doc.text(
      `${rows.length} ${countLabel}   ·   Generated ${new Date().toLocaleString()}`,
      marginX,
      40,
    );

    doc.setFillColor(244, 244, 245);
    doc.rect(marginX, tableHeaderY - 12, contentWidth, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(82, 82, 91);
    let x = marginX;
    for (const col of cols) {
      const label =
        col.align === "right"
          ? ellipsize(doc, col.label, col.width - 8)
          : ellipsize(doc, col.label, col.width - 6);
      const tx = col.align === "right" ? x + col.width - 4 : x + 4;
      doc.text(label, tx, tableHeaderY, { align: col.align });
      x += col.width;
    }
  };

  drawChrome();
  let y = tableStartY;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  for (const row of rows) {
    if (y + rowH > footerY - 16) {
      doc.addPage();
      drawChrome();
      y = tableStartY;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }
    let x = marginX;
    doc.setTextColor(39, 39, 42);
    for (const col of cols) {
      const raw = col.value(row) || "—";
      const text = ellipsize(doc, raw, col.width - 8);
      const tx = col.align === "right" ? x + col.width - 4 : x + 4;
      doc.text(text, tx, y, { align: col.align });
      x += col.width;
    }
    doc.setDrawColor(244, 244, 245);
    doc.line(marginX, y + 6, pageWidth - marginX, y + 6);
    y += rowH;
  }

  const grandTotal = rows.reduce((sum, r) => {
    const n = Number(r.totalBill);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  if (y + 28 > footerY - 16) {
    doc.addPage();
    drawChrome();
    y = tableStartY;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text("Grand total", pageWidth - marginX - 100, y + 16, {
    align: "right",
  });
  doc.text(pdfMoney(grandTotal), pageWidth - marginX, y + 16, {
    align: "right",
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, footerY, {
      align: "right",
    });
    doc.text("PRRMS - LPG Reticulation Billing System", marginX, footerY);
  }

  doc.save(`${fileName}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/** Downloads the unpaid-bills list (as currently displayed/sorted) as one PDF. */
export function downloadUnpaidBillsPdf(
  rows: GasBillDetailRow[],
  fileName = "unpaid-gas-bills",
): void {
  downloadBillingListPdf(rows, {
    title: "Unpaid Gas Bills",
    fileName,
    countLabel: "unpaid bill(s)",
    cols: unpaidListColumns(),
  });
}

/** Downloads the billing-history list (as currently displayed/sorted) as one PDF. */
export function downloadBillingHistoryPdf(
  rows: GasBillDetailRow[],
  options?: { fileName?: string; showUser?: boolean },
): void {
  downloadBillingListPdf(rows, {
    title: "Billing List",
    fileName: options?.fileName ?? "gas-billing-history",
    countLabel: "bill(s)",
    cols: historyListColumns(options?.showUser ?? true),
  });
}
