import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hasPermission, canAccess } from "@/lib/permissions";

/**
 * Get the current user's staff membership for a specific station.
 * Returns null if the user is not a staff member of that station.
 */
export async function getStaffSession(
  stationId: string
): Promise<{
  staffId: string;
  role: string;
  permissions: string[];
  stationId: string;
} | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  // Check if user is the station owner
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { userId: true },
  });

  if (station?.userId === userId) {
    // Owner has full access
    return {
      staffId: "owner",
      role: "OWNER",
      permissions: [], // Owners bypass all permission checks
      stationId,
    };
  }

  // Check if user is an active staff member
  const staff = await prisma.stationStaff.findFirst({
    where: {
      stationId,
      userId,
      status: "ACTIVE",
    },
  });

  if (!staff) return null;

  let permissions: string[];
  try {
    permissions = JSON.parse(staff.permissions);
  } catch {
    permissions = [];
  }

  return {
    staffId: staff.id,
    role: staff.role,
    permissions,
    stationId,
  };
}

/**
 * Require that the authenticated user is a staff member (or owner) of the station
 * AND has the specified permission(s).
 *
 * Returns an object with `allowed: boolean` and optionally `error` and `status`.
 */
export async function requireStaffPermission(
  stationId: string,
  requiredPermission: string | string[]
): Promise<{ allowed: boolean; error?: string; status?: number }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { allowed: false, error: "Unauthorized", status: 401 };
  }

  const userId = session.user.id;

  // Check if user is the station owner (full access)
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { userId: true },
  });

  if (!station) {
    return { allowed: false, error: "Station not found", status: 404 };
  }

  if (station.userId === userId) {
    // Owner has full access — allow everything
    return { allowed: true };
  }

  // Check if user is an active staff member
  const staff = await prisma.stationStaff.findFirst({
    where: {
      stationId,
      userId,
      status: "ACTIVE",
    },
  });

  if (!staff) {
    return {
      allowed: false,
      error: "You are not a staff member of this station",
      status: 403,
    };
  }

  // ADMIN role has all permissions
  if (staff.role === "ADMIN") {
    return { allowed: true };
  }

  // Check specific permissions
  let permissions: string[];
  try {
    permissions = JSON.parse(staff.permissions);
  } catch {
    permissions = [];
  }

  // MANAGER role has extensive permissions
  if (staff.role === "MANAGER" && requiredPermission !== "staff:manage") {
    // Managers can do almost everything except manage staff
    // Let the specific permission check handle it
  }

  if (!canAccess(permissions, requiredPermission)) {
    return {
      allowed: false,
      error: "You do not have the required permission for this action",
      status: 403,
    };
  }

  return { allowed: true };
}

/**
 * Check if a user is the owner of a station.
 */
export async function isStationOwner(
  stationId: string,
  userId: string
): Promise<boolean> {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { userId: true },
  });
  return station?.userId === userId;
}