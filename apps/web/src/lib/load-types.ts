export type LoadStatus = "running" | "consumed" | "cancelled";

export type LoadRow = {
  id: number;
  buildingId: number;
  buildingName: string | null;
  buildingNo: string | null;
  quantityKg: number;
  costBdt: number;
  status: LoadStatus;
  createdAt: string;
  updatedAt: string;
  previousLoadId: number | null;
  supersededByLoadId: number | null;
};

export function loadBuildingLabel(row: Pick<LoadRow, "buildingName" | "buildingNo">): string {
  if (row.buildingNo && row.buildingName) {
    return `${row.buildingNo} (${row.buildingName})`;
  }
  return row.buildingName || row.buildingNo || "—";
}
