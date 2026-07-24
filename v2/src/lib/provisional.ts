import prisma from "@/lib/prisma";

// Constants for provisional access limits
export const PROVISIONAL_MAX_ORDERS_PER_DAY = 10;
export const PROVISIONAL_MAX_UNIQUE_CUSTOMERS_PER_DAY = 3;
export const PROVISIONAL_DURATION_DAYS = 30;
export const PROVISIONAL_COMPLIANCE_SCORE = 0.3;

/**
 * Check if a station is in provisional (under review) mode.
 */
export function isProvisional(station: {
  onboardingComplete: boolean;
  provisionalUntil: Date | null;
  isActive: boolean;
}): boolean {
  if (!station.isActive) return false;
  if (station.onboardingComplete) return false;
  if (!station.provisionalUntil) return false;
  // Check if provisional period has expired
  if (new Date() > station.provisionalUntil) return false;
  return true;
}

/**
 * Check if a station's provisional period has expired.
 * Returns true if the station is provisional and the period has lapsed.
 */
export function isProvisionalExpired(station: {
  provisionalUntil: Date | null;
}): boolean {
  if (!station.provisionalUntil) return false;
  return new Date() > station.provisionalUntil;
}

/**
 * Check if a provisional station has exceeded its daily order limits.
 * Returns an object with check results. If `allowed` is false, `reason` explains why.
 */
export async function checkProvisionalLimits(
  stationId: string,
  customerUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Count today's orders for this station
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = await prisma.order.count({
    where: {
      stationId,
      createdAt: { gte: todayStart },
      status: { not: "CANCELLED" },
    },
  });

  if (todayOrders >= PROVISIONAL_MAX_ORDERS_PER_DAY) {
    return {
      allowed: false,
      reason: "Station is under review and has reached its daily order limit.",
    };
  }

  // Count unique customers who have ordered from this station today
  const uniqueCustomerIds = await prisma.order.findMany({
    where: {
      stationId,
      createdAt: { gte: todayStart },
      status: { not: "CANCELLED" },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  const uniqueCustomerCount = uniqueCustomerIds.length;

  // Check if this customer has already ordered today (they don't count toward limit)
  const isReturnCustomer = uniqueCustomerIds.some(
    (o) => o.userId === customerUserId
  );

  if (!isReturnCustomer && uniqueCustomerCount >= PROVISIONAL_MAX_UNIQUE_CUSTOMERS_PER_DAY) {
    return {
      allowed: false,
      reason: "Station is under review and has reached its daily customer limit.",
    };
  }

  return { allowed: true };
}

/**
 * Get a human-readable label for a station's verification status.
 */
export function getStationVerificationLabel(station: {
  onboardingComplete: boolean;
  provisionalUntil: Date | null;
  rejectionReason: string | null;
  approvedAt: Date | null;
  isActive: boolean;
}): string {
  if (!station.isActive) return "Inactive";
  if (station.approvedAt) return "Verified";
  if (station.rejectionReason) return "Rejected";
  if (station.onboardingComplete) return "Approved";
  if (station.provisionalUntil) {
    if (new Date() > station.provisionalUntil) return "Provisional (Expired)";
    return "Under Review";
  }
  return "Pending";
}
