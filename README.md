# AquaLink PH 🇵🇭 — Tubig, delivered!

> A two-sided marketplace connecting households, offices, and sari-sari stores with local water refilling stations for on-demand delivery.

## 📁 Repository Structure

| Directory | Description |
|-----------|-------------|
| `v2/` | **Current AquaLink PH platform** — Next.js 14+ full-stack web app with 18 pages, 20+ API endpoints, Prisma ORM, NextAuth.js, shadcn/ui, and PWA support. This is the active codebase (Phase 2 — Polish & UX). |
| `main` root | Legacy v1 snapshot. All active development is in `v2/`.

## ✨ Quick Start

```bash
npm install --legacy-peer-deps
cp .env.example .env
npx prisma generate && npx prisma db push && npx tsx prisma/seed.ts
npm run dev
```

**🔗 http://localhost:3000**

## 👤 Test Accounts (password: `password123`)

| Role | Name | Phone |
|------|------|-------|
| 👤 Customer | Juan dela Cruz | `09170000002` |
| 👤 Customer | Maria Santos | `09170000003` |
| 🏪 Provider | Aquino Water Station | `09170000004` |
| 🏪 Provider | Lim's Pure Water | `09170000005` |
| 🏪 Provider | Torres Alkaline Water Hub | `09170000006` |
| 🔧 Admin | Admin AquaLink | `09170000001` |

## 📱 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing, search, featured stations |
| `/stations` | Browse | Filter stations by location/water type |
| `/stations/[id]` | Station Detail | Products, reviews, info |
| `/cart` | Cart | Review items, checkout |
| `/orders` | Orders | Order history |
| `/orders/[id]` | Order Tracking | Real-time status |
| `/profile` | Profile | Account settings |
| `/dashboard` | Provider Dashboard | Analytics, orders, products |
| `/admin` | Admin Panel | Station/user management |

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router) | Full-stack React |
| Database | SQLite/PostgreSQL + Prisma | Type-safe ORM |
| Auth | NextAuth.js + JWT | Phone/password + OTP |
| UI | Tailwind CSS + shadcn/ui | Responsive components |
| State | Zustand | Cart management |
| Icons | Lucide React | UI icons |
| Validation | Zod + React Hook Form | Form validation |
| PWA | Service Worker + Manifest | Offline support |
| Maps | Leaflet + OpenStreetMap | Location (future) |

## 📂 Project Structure

```
aqualink-ph/
├── prisma/          # Schema + seed data
├── public/          # Static assets, PWA files
├── src/
│   ├── app/         # Pages + API routes
│   │   ├── api/     # 16 API endpoints
│   │   ├── auth/    # Login/Register
│   │   ├── stations/# Browse/Detail
│   │   ├── cart/    # Shopping cart
│   │   ├── orders/  # History + Tracking
│   │   ├── profile/ # User settings
│   │   ├── dashboard/ # Provider panel
│   │   └── admin/   # Admin panel
│   ├── components/  # Reusable UI
│   ├── hooks/       # useCart, useGeo, etc.
│   ├── lib/         # Config, utils, constants
│   └── types/       # TypeScript definitions
├── ARCHITECTURE.md  # Full technical docs
├── DEVELOPMENT.md   # Development guide
└── README.md        # You are here
```

## 🔌 API Summary

**16 endpoints** covering auth, stations, products, orders, addresses, reviews, dashboard, admin, notifications, and user profile. See `ARCHITECTURE.md` for full reference.

## 🗺️ Roadmap

- ✅ **MVP** — Web app with all core features
- 🚧 **Payments** — PayMongo (GCash/Maya/Card)
- 🚧 **SMS OTP** — Semaphore integration
- 🔮 **Mobile app** — React Native / Expo
- 🔮 **Rider tracking** — Real-time delivery tracking
- 🔮 **Referral program** — Word-of-mouth growth

## 📄 License

Built with [cto.new](https://cto.new) — Private project.