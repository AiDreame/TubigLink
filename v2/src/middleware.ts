import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Protected routes
    const isDashboardRoute = path.startsWith("/dashboard");
    const isAdminRoute = path.startsWith("/admin");
    const isCartRoute = path.startsWith("/cart");
    const isProfileRoute = path.startsWith("/profile");
    const isOrdersRoute = path.startsWith("/orders");
    const isMyRoute = path.startsWith("/my");

    // If not authenticated, redirect to login
    if (!token && (isDashboardRoute || isAdminRoute || isCartRoute || isProfileRoute || isOrdersRoute || isMyRoute)) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(loginUrl);
    }

    // Only PROVIDER or ADMIN can access dashboard
    if (isDashboardRoute && token?.role !== "PROVIDER" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Only ADMIN can access admin panel
    if (isAdminRoute && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/cart/:path*",
    "/profile/:path*",
    "/orders/:path*",
    "/my/:path*",
  ],
};
