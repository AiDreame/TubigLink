import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { clientIp, rateLimit } from "./rate-limit";

// S-04 (security audit 2026-08-14): pre-computed bcrypt hash (cost 12) of a
// random string, used to equalize login timing for unknown phone numbers.
const DUMMY_PASSWORD_HASH =
  "$2a$12$Ioxn9SvsW9YvhDFDRVsHV.LVNdtpBLy9WrkrvST13opV7XCGQ.DRe";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/register",
  },
  providers: [
    CredentialsProvider({
      name: "phone",
      credentials: {
        phone: { label: "Phone Number", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.phone) {
          throw new Error("Phone number is required");
        }

        // S-05 (security audit 2026-08-14): brute-force throttle — per
        // phone+IP, 5 attempts / 15 min (token bucket). Checked BEFORE bcrypt
        // so throttled attempts cost nothing. Returning null surfaces the same
        // generic "invalid credentials" error as a bad password — no lockout
        // info leak to an attacker.
        const ip = clientIp(req);
        const rl = rateLimit(`login:${credentials.phone.trim()}:${ip}`, 5, 15 * 60 * 1000);
        if (!rl.ok) {
          console.warn(
            `[rate-limit] login throttled phone=${credentials.phone} ip=${ip} retryIn=${rl.retryAfterSec}s`
          );
          return null;
        }

        // For phone OTP flow, we check if the user exists
        // Password can be a temporary OTP or a real password
        const user = await prisma.user.findUnique({
          where: { phone: credentials.phone },
        });

        // Audit-trail Phase 1 (S-07): login success + failure capture. The
        // helper runs post-decision, fire-and-forget, and never throws — so it
        // cannot change auth behavior. Lazy import avoids an auth<->audit
        // module cycle (audit.ts imports authOptions from this file).
        const auditLogin = (ok: boolean, userId?: string, role?: string) => {
          import("./audit")
            .then((m) =>
              m.recordAudit({
                actor: ok && userId ? { id: userId, role: role || "CUSTOMER" } : null,
                action: ok ? "user.login" : "user.login_failed",
                entityType: "user",
                entityId: userId,
                details: { phone: credentials.phone },
              })
            )
            .catch(() => undefined);
        };

        if (!user) {
          // S-04 (security audit 2026-08-14): run bcrypt against a dummy hash
          // so unknown-phone attempts take the same time as a real password
          // check (mitigates user-enumeration timing).
          await bcrypt.compare(credentials.password || "", DUMMY_PASSWORD_HASH);
          auditLogin(false);
          return null;
        }

        // Account deletion (Apple 5.1.1(v)): deleted users can never sign back
        // in. Generic null (same as unknown phone) to avoid leaking which
        // numbers belonged to deleted accounts.
        if ((user as any).deletedAt) {
          await bcrypt.compare(credentials.password || "", DUMMY_PASSWORD_HASH);
          auditLogin(false, user.id, user.role);
          return null;
        }

        // S-04: always require a valid password — no passwordless bypass.
        // A missing/null password fails the bcrypt compare like any bad one.
        const storedPassword = user.password || "";
        const isValid = await bcrypt.compare(
          credentials.password || "",
          storedPassword
        );
        if (!isValid) {
          auditLogin(false, user.id, user.role);
          throw new Error("Invalid credentials");
        }
        auditLogin(true, user.id, user.role);

        return {
          id: user.id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "CUSTOMER";
        token.phone = (user as any).phone;
      }
      // Ensure token.id has a value (use token.sub as fallback)
      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      // Account deletion (Apple 5.1.1(v)): a soft-deleted user's existing
      // sessions stop working — clear the token identity so protected routes
      // 401 and the client is forced back to sign-in.
      if (token.id) {
        try {
          const live = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { deletedAt: true },
          });
          if (!live || live.deletedAt) {
            return { ...token, id: undefined, role: undefined, phone: undefined } as any;
          }
        } catch {
          // DB hiccup — keep the token rather than logging everyone out.
        }
      }

      // Check if user is a station staff member (driver, staff, manager, admin)
      if (token.id) {
        try {
          const staffRecord = await prisma.stationStaff.findFirst({
            where: {
              userId: token.id as string,
              status: "ACTIVE",
            },
            select: { id: true, role: true, stationId: true },
          });
          if (staffRecord) {
            token.staffId = staffRecord.id;
            token.staffRole = staffRecord.role;
            token.stationId = staffRecord.stationId;
          }
        } catch {
          // Silently ignore — staff lookup is best-effort
        }
      }

      // Check if user owns a station (for provider dashboard "View Store" link)
      if (token.id && token.role === "PROVIDER") {
        try {
          const station = await prisma.station.findFirst({
            where: { userId: token.id as string },
            select: { slug: true },
          });
          if (station) {
            token.stationSlug = station.slug;
          }
        } catch {
          // Silently ignore — station slug lookup is best-effort
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
        (session.user as any).staffId = token.staffId;
        (session.user as any).staffRole = token.staffRole;
        (session.user as any).stationId = token.stationId;
        (session.user as any).stationSlug = token.stationSlug;
      }
      return session;
    },
  },
};

// Helper to check user roles
export function isProvider(role: string | undefined): boolean {
  return role === "PROVIDER";
}

export function isAdmin(role: string | undefined): boolean {
  return role === "ADMIN";
}

export function isCustomer(role: string | undefined): boolean {
  return role === "CUSTOMER" || !role;
}