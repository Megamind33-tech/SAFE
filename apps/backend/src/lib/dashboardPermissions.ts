/**
 * Dashboard RBAC — permissions and role → capability map.
 * Backend enforcement is required; frontend checks are UX only.
 */

export const DASHBOARD_PERMISSIONS = [
  'dashboard.view',
  'staff.manage',
  'settings.view',
  'settings.manage',
  'overview.view',
  'vehicles.view',
  'vehicles.create',
  'vehicles.update',
  'vehicles.suspend',
  'qr.view',
  'qr.generate',
  'qr.disable',
  'qr.regenerate',
  'qr.scans.view',
  'partners.view',
  'partners.manage',
  'covers.view',
  'payments.view',
  'payments.reconcile',
  'payments.admin_override',
  'claims.view',
  'claims.update_status',
  'claims.approve',
  'claims.reject',
  'claims.mark_paid',
  'claims.notes',
  'support.view',
  'support.update',
  'users.view',
  'users.sensitive_view',
  'trips.view',
  'drivers.view',
  'drivers.create',
] as const;

export type DashboardPermission = (typeof DASHBOARD_PERMISSIONS)[number];

/** Roles that may use the operations dashboard (company staff only). */
export const DASHBOARD_ACCESS_ROLES = [
  'super_admin',
  'admin',
  'operations_manager',
  'claims_officer',
  'finance_officer',
  'support_agent',
  'fleet_manager',
  'partner_manager',
  'auditor',
] as const;

export type DashboardAccessRole = (typeof DASHBOARD_ACCESS_ROLES)[number];

/**
 * External partner enum values — no dashboard API access until row-level partner scoping exists.
 * Use internal `partner_manager` staff role for company operators managing partners.
 */
export const DASHBOARD_BLOCKED_EXTERNAL_ROLES = ['transport_partner', 'insurance_partner'] as const;

/** Company staff roles (shown on Staff Users page). */
export const DASHBOARD_STAFF_ROLES = [
  'super_admin',
  'admin',
  'operations_manager',
  'claims_officer',
  'finance_officer',
  'support_agent',
  'fleet_manager',
  'partner_manager',
  'auditor',
] as const;

export type DashboardStaffRole = (typeof DASHBOARD_STAFF_ROLES)[number];

const ALL: DashboardPermission[] = [...DASHBOARD_PERMISSIONS];

const VIEW_ONLY: DashboardPermission[] = [
  'dashboard.view',
  'overview.view',
  'settings.view',
  'vehicles.view',
  'qr.view',
  'qr.scans.view',
  'partners.view',
  'covers.view',
  'payments.view',
  'claims.view',
  'support.view',
  'users.view',
  'users.sensitive_view',
  'trips.view',
  'drivers.view',
];

function set(...perms: DashboardPermission[]): Set<DashboardPermission> {
  return new Set(perms);
}

const ROLE_PERMISSIONS: Record<string, Set<DashboardPermission>> = {
  super_admin: set(...ALL),

  admin: set(
    'dashboard.view',
    'overview.view',
    'settings.view',
    'vehicles.view',
    'vehicles.create',
    'vehicles.update',
    'vehicles.suspend',
    'qr.view',
    'qr.generate',
    'qr.disable',
    'qr.regenerate',
    'qr.scans.view',
    'partners.view',
    'partners.manage',
    'covers.view',
    'payments.view',
    'payments.reconcile',
    'payments.admin_override',
    'claims.view',
    'claims.update_status',
    'claims.approve',
    'claims.reject',
    'claims.mark_paid',
    'claims.notes',
    'support.view',
    'support.update',
    'users.view',
    'users.sensitive_view',
    'trips.view',
    'drivers.view',
    'drivers.create',
  ),

  operations_manager: set(
    'dashboard.view',
    'overview.view',
    'settings.view',
    'vehicles.view',
    'vehicles.create',
    'vehicles.update',
    'vehicles.suspend',
    'qr.view',
    'qr.generate',
    'qr.disable',
    'qr.regenerate',
    'qr.scans.view',
    'partners.view',
    'partners.manage',
    'covers.view',
    'support.view',
    'users.view',
    'trips.view',
    'drivers.view',
    'drivers.create',
  ),

  claims_officer: set(
    'dashboard.view',
    'overview.view',
    'covers.view',
    'claims.view',
    'claims.update_status',
    'claims.approve',
    'claims.reject',
    'claims.notes',
    'users.view',
    'support.view',
  ),

  finance_officer: set(
    'dashboard.view',
    'overview.view',
    'covers.view',
    'payments.view',
    'payments.reconcile',
    'payments.admin_override',
    'claims.view',
    'claims.mark_paid',
    'users.view',
  ),

  support_agent: set(
    'dashboard.view',
    'overview.view',
    'support.view',
    'support.update',
    'users.view',
    'users.sensitive_view',
    'covers.view',
    'claims.view',
  ),

  fleet_manager: set(
    'dashboard.view',
    'overview.view',
    'vehicles.view',
    'vehicles.create',
    'vehicles.update',
    'vehicles.suspend',
    'qr.view',
    'qr.generate',
    'qr.disable',
    'qr.regenerate',
    'qr.scans.view',
    'trips.view',
    'drivers.view',
  ),

  partner_manager: set(
    'dashboard.view',
    'overview.view',
    'partners.view',
    'vehicles.view',
    'qr.view',
    'qr.scans.view',
    'trips.view',
  ),

  auditor: set(...VIEW_ONLY),

  // transport_partner / insurance_partner: no permissions — blocked at requireDashboardAccess()
};

export function isDashboardAccessRole(role: string): role is DashboardAccessRole {
  return (DASHBOARD_ACCESS_ROLES as readonly string[]).includes(role);
}

export function isDashboardStaffRole(role: string): role is DashboardStaffRole {
  return (DASHBOARD_STAFF_ROLES as readonly string[]).includes(role);
}

export function getRolePermissions(role: string): Set<DashboardPermission> {
  return ROLE_PERMISSIONS[role] ?? new Set();
}

export function hasDashboardPermission(role: string, permission: DashboardPermission): boolean {
  return getRolePermissions(role).has(permission);
}

export function listPermissionsForRole(role: string): DashboardPermission[] {
  return [...getRolePermissions(role)];
}

export function canMutateDashboard(role: string): boolean {
  const perms = getRolePermissions(role);
  return [...perms].some((p) => !p.endsWith('.view') || p === 'dashboard.view');
}

/** True if role has any write capability (not pure auditor / insurance read). */
export function roleIsReadOnly(role: string): boolean {
  const perms = getRolePermissions(role);
  const writePrefixes = [
    'staff.',
    'settings.manage',
    'vehicles.create',
    'vehicles.update',
    'vehicles.suspend',
    'qr.generate',
    'qr.disable',
    'qr.regenerate',
    'partners.manage',
    'payments.reconcile',
    'payments.admin_override',
    'claims.update_status',
    'claims.approve',
    'claims.reject',
    'claims.mark_paid',
    'support.update',
    'drivers.create',
  ];
  return ![...perms].some((p) => writePrefixes.some((w) => p === w || p.startsWith(w.split('.')[0] + '.')));
}

export function permissionForClaimStatus(status: string): DashboardPermission | null {
  switch (status) {
    case 'approved':
      return 'claims.approve';
    case 'rejected':
      return 'claims.reject';
    case 'paid':
      return 'claims.mark_paid';
    case 'under_review':
    case 'needs_action':
      return 'claims.update_status';
    default:
      return null;
  }
}

export function assertClaimStatusAllowed(role: string, status: string): void {
  const required = permissionForClaimStatus(status);
  if (!required) {
    throw new Error('Status not allowed for admin update.');
  }
  if (!hasDashboardPermission(role, required)) {
    throw new Error('Your role cannot perform this claim action.');
  }
}

export const STAFF_ASSIGNABLE_ROLES: DashboardStaffRole[] = [...DASHBOARD_STAFF_ROLES];
