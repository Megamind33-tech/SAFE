/** Route → minimum permission (must match backend dashboardPermissions.ts). */

export const ROUTE_PERMISSIONS = {
  '/': 'overview.view',
  '/vehicles': 'vehicles.view',
  '/partners': 'partners.view',
  '/covers': 'covers.view',
  '/claims': 'claims.view',
  '/payments': 'payments.view',
  '/live-trips': 'trips.view',
  '/qr-scans': 'qr.scans.view',
  '/support': 'support.view',
  '/users': 'users.view',
  '/settings': 'settings.view',
  '/customers': 'drivers.view',
  '/staff': 'staff.manage',
};

export const NAV_ITEMS = [
  { to: '/', label: 'Overview', permission: 'overview.view' },
  { to: '/vehicles', label: 'Vehicles', permission: 'vehicles.view' },
  { to: '/partners', label: 'Partners', permission: 'partners.view' },
  { to: '/covers', label: 'Covers', permission: 'covers.view' },
  { to: '/claims', label: 'Claims', permission: 'claims.view' },
  { to: '/payments', label: 'Payments', permission: 'payments.view' },
  { to: '/live-trips', label: 'Live trips', permission: 'trips.view' },
  { to: '/qr-scans', label: 'QR scans', permission: 'qr.scans.view' },
  { to: '/support', label: 'Support', permission: 'support.view' },
  { to: '/users', label: 'Passengers', permission: 'users.view' },
  { to: '/staff', label: 'Staff users', permission: 'staff.manage' },
  { to: '/settings', label: 'Settings', permission: 'settings.view' },
  { to: '/customers', label: 'Drivers', permission: 'drivers.view' },
];

export function hasPermission(permissions, permission) {
  return Array.isArray(permissions) && permissions.includes(permission);
}

export function canAccessRoute(permissions, pathname) {
  const perm = ROUTE_PERMISSIONS[pathname];
  if (!perm) return true;
  return hasPermission(permissions, perm);
}

export function canMutate(permissions) {
  const write = [
    'staff.manage',
    'settings.manage',
    'vehicles.create',
    'vehicles.update',
    'vehicles.suspend',
    'qr.generate',
    'qr.disable',
    'qr.regenerate',
    'partners.manage',
    'payments.reconcile',
    'claims.update_status',
    'claims.approve',
    'claims.reject',
    'claims.mark_paid',
    'support.update',
    'drivers.create',
  ];
  return write.some((p) => hasPermission(permissions, p));
}
