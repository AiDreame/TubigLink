// ═══════════════════════════════════════════════════════
// PERMISSIONS SYSTEM
// ═══════════════════════════════════════════════════════

// Permission keys organized by module
export const PERMISSION_KEYS = {
  orders: {
    view: "orders:view",
    manage: "orders:manage",
    deliver: "orders:deliver", // Mark orders as delivered, view delivery addresses
  },
  products: {
    view: "products:view",
    manage: "products:manage",
  },
  customers: {
    view: "customers:view",
  },
  earnings: {
    view: "earnings:view",
  },
  analytics: {
    view: "analytics:view",
  },
  delivery_zones: {
    view: "delivery_zones:view",
    manage: "delivery_zones:manage",
  },
  settings: {
    view: "settings:view",
    manage: "settings:manage",
  },
  staff: {
    view: "staff:view",
    manage: "staff:manage", // Owner only
  },
} as const;

// All available permissions with labels and descriptions
export const ALL_PERMISSIONS = [
  {
    key: PERMISSION_KEYS.orders.view,
    module: "orders",
    label: "View Orders",
    description: "View incoming and past orders",
  },
  {
    key: PERMISSION_KEYS.orders.manage,
    module: "orders",
    label: "Manage Orders",
    description: "Accept, prepare, and mark orders as delivered",
  },
  {
    key: PERMISSION_KEYS.orders.deliver,
    module: "orders",
    label: "Deliver Orders",
    description: "Mark orders as delivered and view delivery addresses",
  },
  {
    key: PERMISSION_KEYS.products.view,
    module: "products",
    label: "View Products",
    description: "View product listings and prices",
  },
  {
    key: PERMISSION_KEYS.products.manage,
    module: "products",
    label: "Manage Products",
    description: "Add, edit, and remove products",
  },
  {
    key: PERMISSION_KEYS.customers.view,
    module: "customers",
    label: "View Customers",
    description: "View customer information and order history",
  },
  {
    key: PERMISSION_KEYS.earnings.view,
    module: "earnings",
    label: "View Earnings",
    description: "View earnings and payout information",
  },
  {
    key: PERMISSION_KEYS.analytics.view,
    module: "analytics",
    label: "View Analytics",
    description: "View dashboard analytics and reports",
  },
  {
    key: PERMISSION_KEYS.delivery_zones.view,
    module: "delivery_zones",
    label: "View Delivery Zones",
    description: "View delivery zone coverage",
  },
  {
    key: PERMISSION_KEYS.delivery_zones.manage,
    module: "delivery_zones",
    label: "Manage Delivery Zones",
    description: "Add, edit, and remove delivery zones",
  },
  {
    key: PERMISSION_KEYS.settings.view,
    module: "settings",
    label: "View Settings",
    description: "View station settings and configuration",
  },
  {
    key: PERMISSION_KEYS.settings.manage,
    module: "settings",
    label: "Manage Settings",
    description: "Edit station settings and configuration",
  },
  {
    key: PERMISSION_KEYS.staff.view,
    module: "staff",
    label: "View Staff",
    description: "View staff list and details",
  },
  {
    key: PERMISSION_KEYS.staff.manage,
    module: "staff",
    label: "Manage Staff",
    description: "Invite, update, and remove staff members (owner only)",
  },
];

// Default permission sets by role
export const STAFF_DEFAULT_PERMISSIONS = [
  PERMISSION_KEYS.orders.view,
  PERMISSION_KEYS.orders.manage,
  PERMISSION_KEYS.products.view,
  PERMISSION_KEYS.customers.view,
  PERMISSION_KEYS.delivery_zones.view,
];

export const MANAGER_DEFAULT_PERMISSIONS = [
  PERMISSION_KEYS.orders.view,
  PERMISSION_KEYS.orders.manage,
  PERMISSION_KEYS.products.view,
  PERMISSION_KEYS.products.manage,
  PERMISSION_KEYS.customers.view,
  PERMISSION_KEYS.earnings.view,
  PERMISSION_KEYS.analytics.view,
  PERMISSION_KEYS.delivery_zones.view,
  PERMISSION_KEYS.delivery_zones.manage,
  PERMISSION_KEYS.settings.view,
  PERMISSION_KEYS.staff.view,
];

export const DRIVER_DEFAULT_PERMISSIONS = [
  PERMISSION_KEYS.orders.view,
  PERMISSION_KEYS.orders.deliver,
  PERMISSION_KEYS.customers.view,
  PERMISSION_KEYS.delivery_zones.view,
];

/**
 * Get default permissions for a given role.
 */
export function getDefaultPermissions(role: string): string[] {
  switch (role) {
    case "MANAGER":
      return [...MANAGER_DEFAULT_PERMISSIONS];
    case "DRIVER":
      return [...DRIVER_DEFAULT_PERMISSIONS];
    case "STAFF":
    default:
      return [...STAFF_DEFAULT_PERMISSIONS];
  }
}

/**
 * Check if a staff member has a specific permission.
 * @param staffPermissions - JSON string of permission keys or parsed array
 * @param requiredPermission - The permission key to check
 */
export function hasPermission(
  staffPermissions: string | string[],
  requiredPermission: string
): boolean {
  let permissions: string[];
  if (typeof staffPermissions === "string") {
    try {
      permissions = JSON.parse(staffPermissions);
    } catch {
      permissions = [];
    }
  } else {
    permissions = staffPermissions;
  }

  // ADMIN role has all permissions
  // Managers have all permissions too
  // We check via the permission array itself

  return permissions.includes(requiredPermission);
}

/**
 * Check if a staff member has ALL of the required permissions.
 * @param staffPermissions - JSON string or array of permission keys
 * @param requiredPermissions - Array of required permission keys
 */
export function canAccess(
  staffPermissions: string | string[],
  requiredPermissions: string | string[]
): boolean {
  if (Array.isArray(requiredPermissions) && requiredPermissions.length === 0) {
    return true;
  }
  if (typeof requiredPermissions === "string") {
    return hasPermission(staffPermissions, requiredPermissions);
  }
  return requiredPermissions.every((p) => hasPermission(staffPermissions, p));
}

/**
 * Get human-readable labels for a set of permission keys.
 */
export function getPermissionLabels(permissionKeys: string[]): string[] {
  return permissionKeys
    .map((key) => ALL_PERMISSIONS.find((p) => p.key === key)?.label)
    .filter(Boolean) as string[];
}

/**
 * Get permissions grouped by module.
 */
export function getPermissionsByModule(permissionKeys: string[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const key of permissionKeys) {
    const perm = ALL_PERMISSIONS.find((p) => p.key === key);
    if (perm) {
      if (!grouped[perm.module]) grouped[perm.module] = [];
      grouped[perm.module].push(perm.key);
    }
  }
  return grouped;
}