# AquaLink PH — Comprehensive Technical Documentation

## 1. 📋 Feature Roadmap

### ✅ Phase 1 — MVP (Complete)
- [x] **Customer registration & login** (Phone/email + OTP via NextAuth)
- [x] **Station provider onboarding** (Register station along with account)
- [x] **Homepage** — Hero with search bar, water type cards, featured stations
- [x] **Station browsing** — Search/filter by location, water type, price
- [x] **Station detail** — Product listing, reviews, operating hours, delivery zones
- [x] **Shopping cart** — Add/remove items, quantity controls, station scoping
- [x] **Checkout & ordering** — Address selection, payment method, delivery notes, recurring scheduling
- [x] **Order history & tracking** — Real-time status, order progress
- [x] **Ratings & reviews** — Post-delivery feedback with star ratings
- [x] **Provider dashboard** — Orders, products, earnings, analytics
- [x] **Admin panel** — Station moderation, user management
- [x] **PWA support** — Service worker, manifest, offline fallback
- [x] **Filipino-friendly UI** — Tagalog text, PH address fields, mobile-first

### 🚧 Phase 2 — Enhancements (Next)
- [ ] **Real-time notifications** — Push notifications via WebPush
- [ ] **SMS OTP** — Semaphore/Twilio integration for actual SMS
- [ ] **PayMongo/Xendit** — Real GCash/Card payment processing
- [ ] **Rider/driver app** — Separate mobile interface for delivery personnel
- [ ] **Recurring orders** — Weekly/bi-weekly auto-delivery schedules
- [ ] **Station map view** — Interactive map with Leaflet
- [ ] **Image uploads** — Station logos, product photos via upload service

### 🔮 Phase 3 — Scale
- [ ] **Multi-language** — Full Tagalog/English toggle
- [ ] **Advanced analytics** — Station performance, customer insights
- [ ] **Referral system** — Share-to-earn network effects
- [ ] **Real-time tracking** — Live rider location on map
- [ ] **Promotions & coupons** — Discount codes, featured listings
- [ ] **Hyper-local expansion** — One barangay at a time rollout

## 2. 🗄️ Database Schema

### Entity Relationship Diagram (Text)

```
User (1) ────< Station (1) ────< Product
  │                │                  │
  │                ├───< DeliveryZone  │
  │                │                  │
  ├───< Address    │                  │
  ├───< Order ─────┤                  │
  │       │        │                  │
  │       └───< OrderItem >───────────┘
  ├───< Review ────┤
  └───< Notification
```

### Models

**User** — Core user entity
- `id` (cuid), `phone` (unique), `email` (unique, optional)
- `name`, `password` (bcrypt hash)
- `role`: CUSTOMER | PROVIDER | ADMIN
- `isVerified`, `avatar`

**Station** — Water refilling station
- `name`, `slug` (unique), `description`
- `address`, `barangay`, `city`, `province`
- `latitude`, `longitude` (for geo-queries)
- `rating`, `totalReviews` (denormalized for fast reads)
- `deliveryFee`, `minOrder`, `isFeatured`, `isActive`
- `openingTime`, `closingTime` (HH:MM format)

**Product** — Water product offered by a station
- `name`, `type` (PURIFIED | MINERAL | ALKALINE)
- `size` (5-gallon | 1-gallon | 500ml)
- `price`, `stock`, `isAvailable`

**DeliveryZone** — Areas a station delivers to
- `barangay`, `city` (composite unique with stationId)
- `deliveryFee`, `estimatedMinutes`

**Order** — Customer order
- `status` (PENDING → ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED | CANCELLED)
- `orderType` (ONCE | RECURRING), `recurringDay`
- `subtotal`, `deliveryFee`, `total`
- `paymentMethod` (COD | GCASH | CARD | PAYMAYA)
- `paymentStatus` (PENDING | PAID | FAILED | REFUNDED)

**OrderItem** — Line items within an order
- `quantity`, `unitPrice` (snapshot of price at order time)

**Review** — Customer rating after delivery
- `rating` (1-5), `comment`
- One review per order enforced via `orderId` unique

**Address** — Saved customer addresses
- PH-specific: `street`, `barangay`, `city`, `province`, `zipCode`, `landmark`
- `isDefault` flag

**Notification** — In-app notifications
- `type` (ORDER_STATUS | PROMO | SYSTEM)
- `data` JSON field for flexible payload

## 3. 🔌 API Design

### Auth Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create account (customer/provider) | Public |
| POST | `/api/auth/[...nextauth]` | NextAuth handler (credentials/OTP) | Public |

### Customer Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/stations` | List stations (filters: city, barangay, type, query, featured) | Public |
| GET | `/api/stations/[id]` | Station detail with products, reviews | Public |
| GET | `/api/stations/[id]/products` | Station's product list | Public |
| POST | `/api/orders` | Create order | Required |
| GET | `/api/orders` | List user orders | Required |
| GET | `/api/orders/[id]` | Order detail with tracking | Required |
| POST | `/api/reviews` | Submit review for delivered order | Required |
| GET | `/api/addresses` | List saved addresses | Required |
| POST | `/api/addresses` | Add new address | Required |
| GET | `/api/user/profile` | Get user profile | Required |
| PUT | `/api/user/profile` | Update user profile | Required |

### Provider Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/dashboard` | Dashboard analytics (stats, orders, products) | PROVIDER |
| PUT | `/api/dashboard/orders/[id]` | Update order status (accept/decline/deliver) | PROVIDER |
| POST | `/api/stations/[id]/products` | Add product | PROVIDER |
| PUT | `/api/products/[id]` | Update product | PROVIDER |
| DELETE | `/api/products/[id]` | Remove product | PROVIDER |

### Admin Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/admin/stations` | List all stations with stats | ADMIN |
| PUT | `/api/admin/stations` | Update station (activate/feature) | ADMIN |
| GET | `/api/admin/users` | List all users | ADMIN |

### Notification Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/notifications` | Get user notifications | Required |
| PUT | `/api/notifications` | Mark notification as read | Required |

## 4. 🔐 Authentication

### Strategy: NextAuth.js v4 with Credentials Provider

```
Flow:
  1. User enters phone → POST /api/auth/register
  2. Password hashed with bcrypt → User created
  3. User logs in → NextAuth credentials provider validates
  4. JWT session created with id, role, phone embedded
  5. Middleware checks role for protected routes
```

### Session Token Structure
```json
{
  "id": "cmq...",
  "role": "CUSTOMER | PROVIDER | ADMIN",
  "phone": "0917...",
  "name": "Juan dela Cruz"
}
```

### Route Protection
- `/dashboard/*` → requires PROVIDER or ADMIN role
- `/admin/*` → requires ADMIN role
- `/cart`, `/orders`, `/profile` → requires any authenticated user

## 5. 👥 User Roles

### Customer 👤
- Browse stations, search by location/water type
- View station details, products, reviews
- Add to cart, place orders (one-time or recurring)
- Track order status in real-time
- Rate and review after delivery
- Manage saved addresses

### Provider (Water Station) 🏪
- Manage station profile (hours, delivery zones, fees)
- Product inventory CRUD (add/update/remove water types)
- View incoming orders and update status
- Accept/decline orders → prepare → out for delivery → delivered
- View earnings dashboard with revenue stats

### Admin 🔧
- View all registered stations and users
- Activate/deactivate stations
- Feature/unfeature stations
- Monitor platform metrics

## 6. 🎨 UI Wireframes

### Customer Flow
```
Home → Search/Filter → Station List → Station Detail
  ↓                                            ↓
Login/Register                              Add to Cart
  ↓                                            ↓
Profile/Addresses ← Checkout → Cart
  ↓                 ↓
Address Select    Payment Method
  ↓                 ↓
Confirm → Order Confirmed → Order Tracking
                                ↓
                          Rate & Review
```

### Provider Flow
```
Dashboard Home (Analytics)
  ├── Orders (Incoming → Accept → Deliver)
  ├── Products (Add/Edit/Remove water types)
  └── Earnings (Revenue, payouts)
```

### Pages Inventory

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Landing, search, featured stations |
| `/stations` | Browse | Grid/list of stations with filters |
| `/stations/[id]` | Station Detail | Products, reviews, info tabs |
| `/cart` | Cart | Order summary, quantity, checkout |
| `/orders` | Orders | Order history list |
| `/orders/[id]` | Order Tracking | Status progress, details |
| `/profile` | Profile | User info, addresses |
| `/profile/addresses` | Addresses | Manage saved addresses |
| `/profile/settings` | Settings | Account settings |
| `/auth/login` | Login | Phone/password + OTP login |
| `/auth/register` | Register | Customer or provider signup |
| `/dashboard` | Provider Dashboard | Analytics overview |
| `/dashboard/orders` | Order Management | Incoming & active orders |
| `/dashboard/products` | Product Management | CRUD water products |
| `/dashboard/earnings` | Earnings | Revenue & payouts |
| `/admin` | Admin Dashboard | Platform metrics |
| `/admin/stations` | Station Moderation | Manage all stations |

## 7. 📁 Folder Structure

```
aqualink-ph/
├── prisma/
│   ├── schema.prisma          # Database schema (8 models)
│   └── seed.ts                # PH-specific seed data
├── public/
│   ├── icons/                  # PWA app icons (SVG)
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service worker (offline cache)
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (Inter font, Providers, BottomNav)
│   │   ├── page.tsx            # Landing page (hero, search, CTA)
│   │   ├── globals.css         # Global styles + Tailwind
│   │   ├── middleware.ts       # Auth middleware (role-based routing)
│   │   ├── auth/               # Login & register pages
│   │   ├── stations/           # Browse & detail pages
│   │   ├── cart/               # Shopping cart
│   │   ├── orders/             # Order history & tracking
│   │   ├── profile/            # User profile & addresses
│   │   ├── dashboard/          # Provider dashboard (analytics, orders, products, earnings)
│   │   ├── admin/              # Admin panel (stations, users)
│   │   └── api/                # All API routes (auth, stations, orders, etc.)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives (Button, Input, Card, etc.)
│   │   ├── shared/             # Providers, BottomNav
│   │   └── customer/           # StationCard, ProductCard
│   ├── hooks/                  # useCart, useGeolocation, useDebounce
│   ├── lib/                    # Prisma client, auth config, utils, constants
│   └── types/                  # TypeScript types + NextAuth type augmentation
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
├── components.json             # shadcn/ui config
└── README.md
```

## 8. 📖 Project Documentation

### Quick Start
```bash
# Setup
cp .env.example .env     # Edit DATABASE_URL as needed
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts

# Run
npm run dev              # http://localhost:3000
```

### Test Accounts
| Role | Phone | Password |
|------|-------|----------|
| Customer | 09170000002 | password123 |
| Customer | 09170000003 | password123 |
| Provider | 09170000004 | password123 |
| Provider | 09170000005 | password123 |
| Provider | 09170000006 | password123 |
| Admin | 09170000001 | password123 |

### Key Libraries
- **Next.js 14** (App Router) — Full-stack framework
- **Prisma** — Type-safe ORM with auto-generated client
- **NextAuth.js** — Authentication with JWT sessions
- **shadcn/ui** — Accessible React components
- **Tailwind CSS** — Utility-first styling
- **Zustand** — Lightweight state management (cart)
- **Zod** — Schema validation
- **React Hook Form** — Form handling
- **Lucide React** — Icon library
- **React Hot Toast** — Toast notifications

## 9. ⚙️ Technical Specifications

### Performance Targets
- **First Contentful Paint:** < 2s (mobile)
- **Time to Interactive:** < 3.5s
- **API response time:** < 200ms (p95)
- **Offline support:** Service worker caches static assets

### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | SQLite (dev) → PostgreSQL (prod) | Prisma abstracts both |
| Auth | NextAuth + JWT | No session DB needed, stateless |
| State | Zustand | Minimal boilerplate vs Redux |
| Maps | Leaflet + OSM | Free, no API key needed |
| Hosting | Vercel + Supabase | Free tier, PH-friendly latency |
| Payments | PayMongo (future) | GCash, Maya, card support |
| SMS | Semaphore (future) | PH-specific, affordable |

### Security
- Password hashing via bcrypt (12 rounds)
- JWT with role embedded for authorization
- Middleware route protection
- Input validation via Zod schemas
- Rate limiting headers (configurable)

### Philippines-Specific
- PH region/city/barangay address model
- GCash, PayMaya, COD payment options
- Tagalog UI strings where appropriate
- Metro Manila focus for initial rollout
- Skeleton loading for slow network conditions
- Mobile-first design (90%+ PH internet is mobile)

## 10. 🎯 Milestone Planning

### Milestone 1: MVP Launch (Current) ✅
- Complete web app with all features listed above
- 3 seeded stations in Metro Manila
- Test accounts for all roles
- PWA ready

### Milestone 2: Production Hardening (Week 1-2)
- [ ] Fix TypeScript build errors (type augmentation, missing exports)
- [ ] Add error boundaries for all pages
- [ ] Implement proper SMS OTP via Semaphore
- [ ] Add loading skeletons on all data-fetching pages
- [ ] Write unit tests (Vitest) for API routes
- [ ] End-to-end testing with Playwright

### Milestone 3: Payments & Real Data (Week 3-4)
- [ ] Integrate PayMongo SDK for GCash/Card payments
- [ ] Onboard 5-10 real water stations
- [ ] Beta test with 50+ customers
- [ ] Add real-time order updates via WebSockets

### Milestone 4: Mobile & Scale (Month 2)
- [ ] React Native / Expo mobile app
- [ ] Rider delivery tracking interface
- [ ] Advanced analytics dashboard
- [ ] Expansion to second city
- [ ] Referral program launch
