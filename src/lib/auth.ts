import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

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
      async authorize(credentials) {
        if (!credentials?.phone) {
          throw new Error("Phone number is required");
        }

        // For phone OTP flow, we check if the user exists
        // Password can be a temporary OTP or a real password
        const user = await prisma.user.findUnique({
          where: { phone: credentials.phone },
        });

        if (!user) {
          // New user - they'll complete registration after OTP
          // For now, return a minimal object that triggers the registration flow
          return null;
        }

        // For demo/development, allow login without password
        // In production, verify against bcrypt password
        if (user.password) {
          const isValid = await bcrypt.compare(
            credentials.password || "",
            user.password
          );
          if (!isValid) {
            throw new Error("Invalid credentials");
          }
        }

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
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
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