import type { GasBillDetailRow } from "@/components/gas-bill-detail-modal";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Downloads the given billing rows (as currently displayed/sorted) as a CSV
 * file. Used by the "Download" button on the Gas Billing History pages.
 */
export function downloadBillingHistoryCsv(
  rows: GasBillDetailRow[],
  fileName = "gas-billing-history",
) {
  const headers = [
    "Bill ID",
    "Billing Date",
    "Status",
    "User Name",
    "Full Name",
    "Gas Meter No",
    "Building",
    "Flat",
    "Previous (m³)",
    "Current (m³)",
    "Usage (m³)",
    "Unit Price",
    "Total Bill",
    "Update Reason",
    "Previous Bill ID",
  ];

  const lines = rows.map((r) =>
    [
      r.billId,
      r.billingDate,
      r.status ?? "",
      r.userName,
      r.fullName,
      r.gasMeterNo,
      r.buildingName,
      r.flatNo,
      r.previousReading,
      r.currentReading,
      r.usageQuantity,
      r.unitPrice,
      r.totalBill,
      r.updateReason ?? "",
      r.previousBillId ?? "",
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = [headers.join(","), ...lines].join("\r\n");
  // Prefix BOM so Excel opens UTF-8 (m³) correctly.
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
