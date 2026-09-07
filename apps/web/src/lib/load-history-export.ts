import { jsPDF } from "jspdf";
import { formatBillDateTime } from "@/lib/format";
import { gasPricePerKg, gasPricePerM3 } from "@/lib/load-pricing";
import { loadBuildingLabel, type LoadRow } from "@/lib/load-types";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function pdfMoney(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `Tk ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ellipsize(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && doc.getTextWidth(`${s}...`) > maxWidth) {
    s = s.slice(0, -1);
  }
  return `${s}...`;
}

function rowPrices(row: LoadRow) {
  const priceKg = gasPricePerKg(row.costBdt, row.quantityKg);
  return { priceKg, priceM3: gasPricePerM3(priceKg) };
}

export function downloadLoadingHistoryCsv(rows: LoadRow[]): void {
  const headers = [
    "Id",
    "Building",
    "Quantity (KG)",
    "Cost (BDT)",
    "Gas Price Per KG",
    "Gas Price Per m3",
    "Status",
    "Loading Date",
    "Update Date",
  ];
  const lines = rows.map((r) => {
    const { priceKg, priceM3 } = rowPrices(r);
    return [
      r.id,
      loadBuildingLabel(r),
      r.quantityKg.toFixed(3),
      r.costBdt.toFixed(2),
      priceKg == null ? "" : priceKg.toFixed(2),
      priceM3 == null ? "" : priceM3.toFixed(2),
      r.status,
      formatBillDateTime(r.createdAt),
      formatBillDateTime(r.updatedAt),
    ]
      .map(csvCell)
      .join(",");
  });
  const csv = [headers.join(","), ...lines].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(
    blob,
    `loading-history-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

type PdfCol = {
  label: string;
  width: number;
  align: "left" | "right";
  value: (r: LoadRow) => string;
};

export function downloadLoadingHistoryPdf(rows: LoadRow[]): void {
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

  const cols: PdfCol[] = [
    { label: "Id", width: 36, align: "right", value: (r) => `#${r.id}` },
    {
      label: "Building",
      width: 88,
      align: "left",
      value: (r) => loadBuildingLabel(r),
    },
    {
      label: "Qty (KG)",
      width: 62,
      align: "right",
      value: (r) => r.quantityKg.toFixed(3),
    },
    {
      label: "Cost (BDT)",
      width: 78,
      align: "right",
      value: (r) => pdfMoney(r.costBdt),
    },
    {
      label: "Price / KG",
      width: 70,
      align: "right",
      value: (r) => pdfMoney(rowPrices(r).priceKg),
    },
    {
      label: "Price / m3",
      width: 70,
      align: "right",
      value: (r) => pdfMoney(rowPrices(r).priceM3),
    },
    {
      label: "Status",
      width: 64,
      align: "left",
      value: (r) => r.status.charAt(0).toUpperCase() + r.status.slice(1),
    },
    {
      label: "Loading Date",
      width: 110,
      align: "left",
      value: (r) => formatBillDateTime(r.createdAt),
    },
    {
      label: "Update Date",
      width: contentWidth - 36 - 88 - 62 - 78 - 70 - 70 - 64 - 110,
      align: "left",
      value: (r) => formatBillDateTime(r.updatedAt),
    },
  ];

  const drawChrome = () => {
    doc.setFillColor(24, 24, 27);
    doc.rect(0, 0, pageWidth, headerBandH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Loading History", marginX, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(212, 212, 216);
    doc.text(
      `${rows.length} load(s)   ·   Generated ${new Date().toLocaleString()}`,
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
      const text = ellipsize(doc, col.value(row) || "—", col.width - 8);
      const tx = col.align === "right" ? x + col.width - 4 : x + 4;
      doc.text(text, tx, y, { align: col.align });
      x += col.width;
    }
    doc.setDrawColor(244, 244, 245);
    doc.line(marginX, y + 6, pageWidth - marginX, y + 6);
    y += rowH;
  }

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

  doc.save(`loading-history-${new Date().toISOString().slice(0, 10)}.pdf`);
}
