import { UserRole } from './types';

/** Same API and web portal access as legacy Admin. */
export const ADMIN_PORTAL_ROLES: readonly UserRole[] = [
  UserRole.Admin,
  UserRole.BuildingAdmin,
];

/** Admin portal roles plus Staff (billing / shared staff endpoints). */
export const ADMIN_STAFF_ROLES: readonly UserRole[] = [
  UserRole.Admin,
  UserRole.BuildingAdmin,
  UserRole.Staff,
];

/** Endpoints that allow residents too. */
export const ADMIN_STAFF_USER_ROLES: readonly UserRole[] = [
  UserRole.Admin,
  UserRole.BuildingAdmin,
  UserRole.Staff,
  UserRole.User,
];
