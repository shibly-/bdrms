export enum UserRole {
  Admin = 'admin',
  BuildingAdmin = 'building_admin',
  Staff = 'staff',
  User = 'user',
}

export type BillingPreview = {
  previousReading: number;
  currentReading: number;
  usageQuantity: number;
  unitPrice: number;
  operatingCostPerFlat: number;
  totalBill: number;
};
