export enum UserRole {
  Admin = 'admin',
  Staff = 'staff',
  User = 'user',
}

export type BillingPreview = {
  previousReading: number;
  currentReading: number;
  usageQuantity: number;
  unitPrice: number;
  totalBill: number;
};
