import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AquaLink PH — Tubig, delivered!" },
      {
        name: "description",
        content:
          "AquaLink PH delivers fresh purified, mineral, and alkaline drinking water from refilling stations near you — order on-demand and pay with GCash.",
      },
      { name: "theme-color", content: "#0EA5E9" },
      { property: "og:title", content: "AquaLink PH — Tubig, delivered!" },
      {
        property: "og:description",
        content:
          "On-demand drinking water delivery from refilling stations near you. Order purified, mineral, or alkaline water and pay with GCash.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/aqualink-icon.svg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/aqualink-icon.svg",
      },
    ],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}