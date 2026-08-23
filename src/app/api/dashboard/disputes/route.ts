import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyAutoEscalateMany } from "@/lib/disputes";
const include = { order: { select: { id: true, total: true } }, customer: { select: { id: true, name: true, phone: true } }, station: { select: { id: true, name: true } }, refund: true, messages: { orderBy: { createdAt: "asc" } } } as const;
async function stationFor(user: any) { if (user.role === "ADMIN") return null; const owned = await prisma.station.findFirst({ where: { userId: user.id }, select: { id: true } }); if (owned) return owned.id; const staff = await prisma.stationStaff.findFirst({ where: { userId: user.id, status: "ACTIVE" }, select: { stationId: true } }); return staff?.stationId || undefined; }
export async function GET(req: NextRequest) { const user = (await getServerSession(authOptions))?.user as any; if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const stationId = await stationFor(user); if (!stationId && user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 }); const p = new URL(req.url).searchParams; const where: any = {}; if (stationId) where.stationId = stationId; if (p.get("status")) where.status = p.get("status"); const rows = await prisma.dispute.findMany({ where, include, orderBy: { openedAt: "desc" } }); return NextResponse.json({ success: true, data: await applyAutoEscalateMany(rows) }); }
