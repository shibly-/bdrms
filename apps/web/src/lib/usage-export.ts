import { jsPDF } from "jspdf";
import type { UsagePeriod, UsageSeries } from "@/components/usage-line-chart";

export type UsageExportInput = {
  buildingName: string;
  buildingNo: string | null;
  granularity: "weekly" | "monthly";
  startDate: string;
  endDate: string;
  periods: UsagePeriod[];
  series: UsageSeries[];
};

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatM3(value: number): string {
  return value.toFixed(3);
}

function buildingLabel(data: UsageExportInput): string {
  return data.buildingNo
    ? `${data.buildingNo} (${data.buildingName})`
    : data.buildingName;
}

function fileStem(data: UsageExportInput): string {
  const building = (data.buildingNo || data.buildingName || "usage")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `usage-${building || "building"}-${data.granularity}`;
}

function rowTotal(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0);
}

function periodTotals(periods: UsagePeriod[], series: UsageSeries[]): number[] {
  return periods.map((_, i) =>
    series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0),
  );
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

function ellipsize(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && doc.getTextWidth(`${s}...`) > maxWidth) {
    s = s.slice(0, -1);
  }
  return `${s}...`;
}

/** Downloads the Usage table as CSV (UTF-8 with BOM for Excel). */
export function downloadUsageCsv(data: UsageExportInput): void {
  const totals = periodTotals(data.periods, data.series);
  const grandTotal = totals.reduce((sum, v) => sum + v, 0);
  const headers = [
    "Flat",
    ...data.periods.map((p) => p.label),
    "Total (m3)",
  ];
  const meta = [
    ["Building", buildingLabel(data)],
    ["Start date", data.startDate],
    ["End date", data.endDate],
    ["Projection", data.granularity === "weekly" ? "Weekly" : "Monthly"],
    ["Unit", "m3"],
  ].map((row) => row.map(csvCell).join(","));

  const body = data.series.map((s) =>
    [s.flatNo, ...s.values.map(formatM3), formatM3(rowTotal(s.values))]
      .map(csvCell)
      .join(","),
  );
  const footer = ["All flats", ...totals.map(formatM3), formatM3(grandTotal)]
    .map(csvCell)
    .join(",");

  const csv = [...meta, "", headers.join(","), ...body, footer].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(
    blob,
    `${fileStem(data)}-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

/** Downloads the Usage table as a landscape PDF. */
export function downloadUsagePdf(data: UsageExportInput): void {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36;
  const contentWidth = pageWidth - marginX * 2;
  const rowH = 16;
  const headerBandH = 58;
  const tableHeaderY = 76;
  const tableStartY = 94;
  const footerY = pageHeight - 28;
  const flatW = 58;
  const totalW = 52;
  const minPeriodW = 40;

  const totals = periodTotals(data.periods, data.series);
  const grandTotal = totals.reduce((sum, v) => sum + v, 0);
  const periodBudget = contentWidth - flatW - totalW;
  const maxPeriodCols = Math.max(
    1,
    Math.floor(periodBudget / minPeriodW),
  );

  type Col = { label: string; width: number; align: "left" | "right"; values: string[] };
  const periodChunks: UsagePeriod[][] = [];
  for (let i = 0; i < data.periods.length; i += maxPeriodCols) {
    periodChunks.push(data.periods.slice(i, i + maxPeriodCols));
  }
  if (periodChunks.length === 0) periodChunks.push([]);

  const subtitle = [
    buildingLabel(data),
    `${data.startDate} to ${data.endDate}`,
    data.granularity === "weekly" ? "Weekly" : "Monthly",
    "m3",
  ].join("   ·   ");

  const drawChrome = (cols: Col[], chunkIndex: number, chunkCount: number) => {
    doc.setFillColor(24, 24, 27);
    doc.rect(0, 0, pageWidth, headerBandH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Usage", marginX, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(212, 212, 216);
    doc.text(
      `${data.series.length} flat(s)   ·   Generated ${new Date().toLocaleString()}`,
      marginX,
      40,
    );
    const chunkNote =
      chunkCount > 1 ? `   ·   Columns ${chunkIndex + 1} of ${chunkCount}` : "";
    doc.text(ellipsize(doc, `${subtitle}${chunkNote}`, contentWidth), marginX, 52);

    doc.setFillColor(244, 244, 245);
    doc.rect(marginX, tableHeaderY - 12, contentWidth, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
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

  periodChunks.forEach((chunk, chunkIndex) => {
    if (chunkIndex > 0) doc.addPage();
    const isLastChunk = chunkIndex === periodChunks.length - 1;
    const periodW =
      chunk.length > 0
        ? (contentWidth - flatW - (isLastChunk ? totalW : 0)) / chunk.length
        : minPeriodW;

    const cols: Col[] = [
      {
        label: "Flat",
        width: flatW,
        align: "left",
        values: data.series.map((s) => s.flatNo),
      },
      ...chunk.map((p) => {
        const pi = data.periods.findIndex((x) => x.key === p.key);
        return {
          label: p.label,
          width: periodW,
          align: "right" as const,
          values: data.series.map((s) => formatM3(s.values[pi] ?? 0)),
        };
      }),
    ];
    if (isLastChunk) {
      cols.push({
        label: "Total (m3)",
        width: totalW,
        align: "right",
        values: data.series.map((s) => formatM3(rowTotal(s.values))),
      });
    }

    drawChrome(cols, chunkIndex, periodChunks.length);
    let y = tableStartY;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    for (let row = 0; row < data.series.length; row += 1) {
      if (y + rowH > footerY - 22) {
        doc.addPage();
        drawChrome(cols, chunkIndex, periodChunks.length);
        y = tableStartY;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }
      let x = marginX;
      doc.setTextColor(39, 39, 42);
      for (const col of cols) {
        const text = ellipsize(doc, col.values[row] || "—", col.width - 8);
        const tx = col.align === "right" ? x + col.width - 4 : x + 4;
        doc.text(text, tx, y, { align: col.align });
        x += col.width;
      }
      doc.setDrawColor(244, 244, 245);
      doc.line(marginX, y + 5, pageWidth - marginX, y + 5);
      y += rowH;
    }

    if (y + 20 > footerY - 16) {
      doc.addPage();
      drawChrome(cols, chunkIndex, periodChunks.length);
      y = tableStartY;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(24, 24, 27);
    let x = marginX;
    const footerValues = [
      "All flats",
      ...chunk.map((p) => {
        const pi = data.periods.findIndex((item) => item.key === p.key);
        return formatM3(totals[pi] ?? 0);
      }),
      ...(isLastChunk ? [formatM3(grandTotal)] : []),
    ];
    cols.forEach((col, i) => {
      const text = ellipsize(doc, footerValues[i] ?? "", col.width - 8);
      const tx = col.align === "right" ? x + col.width - 4 : x + 4;
      doc.text(text, tx, y + 12, { align: col.align });
      x += col.width;
    });
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

  doc.save(`${fileStem(data)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
