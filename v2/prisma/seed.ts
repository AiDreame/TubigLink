import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding AquaLink PH database...");

  // ─── Clean existing data ──────────────────────
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.product.deleteMany();
  await prisma.station.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // ─── Create Users ─────────────────────────────
  const password = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Admin AquaLink",
      phone: "09170000001",
      email: "admin@aqualink.ph",
      password,
      role: "ADMIN",
      isVerified: true,
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      name: "Juan dela Cruz",
      phone: "09170000002",
      email: "juan@email.com",
      password,
      role: "CUSTOMER",
      isVerified: true,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      name: "Maria Santos",
      phone: "09170000003",
      email: "maria@email.com",
      password,
      role: "CUSTOMER",
      isVerified: true,
    },
  });

  // ─── Create Stations (Providers) ──────────────
  const provider1 = await prisma.user.create({
    data: {
      name: "Reymond Aquino",
      phone: "09170000004",
      email: "reymond@waterstation.com",
      password,
      role: "PROVIDER",
      isVerified: true,
    },
  });

  const provider2 = await prisma.user.create({
    data: {
      name: "Grace Lim",
      phone: "09170000005",
      email: "grace@waterstation.com",
      password,
      role: "PROVIDER",
      isVerified: true,
    },
  });

  const provider3 = await prisma.user.create({
    data: {
      name: "Ben Torres",
      phone: "09170000006",
      email: "ben@waterstation.com",
      password,
      role: "PROVIDER",
      isVerified: true,
    },
  });

  // Cebu Providers
  const provider4 = await prisma.user.create({
    data: {
      name: "Carlo Rodriguez",
      phone: "09170000007",
      email: "carlo@cebuwater.com",
      password,
      role: "PROVIDER",
      isVerified: true,
    },
  });

  const provider5 = await prisma.user.create({
    data: {
      name: "Diana Reyes",
      phone: "09170000008",
      email: "diana@mandauewater.com",
      password,
      role: "PROVIDER",
      isVerified: true,
    },
  });

  // Mindanao Providers
  const provider6 = await prisma.user.create({
    data: {
      name: "Efren Mercado",
      phone: "09170000009",
      email: "efren@davaowater.com",
      password,
      role: "PROVIDER",
      isVerified: true,
    },
  });

  const provider7 = await prisma.user.create({
    data: {
      name: "Fatima Alonto",
      phone: "09170000010",
      email: "fatima@cdowater.com",
      password,
      role: "PROVIDER",
      isVerified: true,
    },
  });

  const provider8 = await prisma.user.create({
    data: {
      name: "Gary Santos",
      phone: "09170000011",
      email: "gary@gensanwater.com",
      password,
      role: "PROVIDER",
      isVerified: true,
    },
  });

  // ─── Station 1: Aquino Water Station (Makati) ──────
  const station1 = await prisma.station.create({
    data: {
      userId: provider1.id,
      name: "Aquino Water Refilling Station",
      slug: "aquino-water-makati",
      description:
        "Family-owned water refilling station serving Makati for over 10 years. We offer purified and mineral water with free delivery within 30 minutes.",
      phone: "0281234567",
      address: "123 P. Burgos St., Barangay Poblacion",
      barangay: "Poblacion",
      city: "Makati",
      province: "Metro Manila",
      latitude: 14.5505,
      longitude: 121.0282,
      deliveryFee: 0,
      minOrder: 50,
      isFeatured: true,
      isActive: true,
      openingTime: "06:00",
      closingTime: "22:00",
    },
  });

  // Products for Station 1
  const s1p1 = await prisma.product.create({
    data: {
      stationId: station1.id,
      name: "Purified Water 5 Gallons",
      type: "PURIFIED",
      size: "5-gallon",
      price: 35,
      stock: 100,
      description: "Triple-filtered purified drinking water. Safe and clean.",
    },
  });

  const s1p2 = await prisma.product.create({
    data: {
      stationId: station1.id,
      name: "Mineral Water 5 Gallons",
      type: "MINERAL",
      size: "5-gallon",
      price: 60,
      stock: 50,
      description: "Natural mineral water with essential minerals for better health.",
    },
  });

  const s1p3 = await prisma.product.create({
    data: {
      stationId: station1.id,
      name: "Alkaline Water 5 Gallons",
      type: "ALKALINE",
      size: "5-gallon",
      price: 95,
      stock: 30,
      description: "Premium alkaline water with pH 8.5+. Good for acidity relief.",
    },
  });

  // Delivery Zones for Station 1
  await prisma.deliveryZone.createMany({
    data: [
      { stationId: station1.id, barangay: "Poblacion", city: "Makati", deliveryFee: 0, estimatedMinutes: 20 },
      { stationId: station1.id, barangay: "Bel-Air", city: "Makati", deliveryFee: 0, estimatedMinutes: 25 },
      { stationId: station1.id, barangay: "San Antonio", city: "Makati", deliveryFee: 0, estimatedMinutes: 30 },
      { stationId: station1.id, barangay: "Salcedo Village", city: "Makati", deliveryFee: 0, estimatedMinutes: 25 },
      { stationId: station1.id, barangay: "Legazpi Village", city: "Makati", deliveryFee: 0, estimatedMinutes: 25 },
    ],
  });

  // ─── Station 2: Lim's Pure Water (Quezon City) ────
  const station2 = await prisma.station.create({
    data: {
      userId: provider2.id,
      name: "Lim's Pure Water",
      slug: "lims-pure-water-qc",
      description:
        "Quality water at affordable prices. Serving Quezon City with fast and reliable delivery service.",
      phone: "0289876543",
      address: "456 Kamuning Rd., Barangay Kamuning",
      barangay: "Kamuning",
      city: "Quezon City",
      province: "Metro Manila",
      latitude: 14.6212,
      longitude: 121.0397,
      deliveryFee: 10,
      minOrder: 40,
      isFeatured: true,
      isActive: true,
      openingTime: "05:00",
      closingTime: "23:00",
    },
  });

  await prisma.product.createMany({
    data: [
      {
        stationId: station2.id,
        name: "Purified Water 5 Gallons",
        type: "PURIFIED",
        size: "5-gallon",
        price: 30,
        stock: 200,
        description: "Affordable purified water for daily use.",
      },
      {
        stationId: station2.id,
        name: "Mineral Water 5 Gallons",
        type: "MINERAL",
        size: "5-gallon",
        price: 55,
        stock: 80,
        description: "Natural mineral water sourced from local springs.",
      },
      {
        stationId: station2.id,
        name: "Purified Water 1 Gallon",
        type: "PURIFIED",
        size: "1-gallon",
        price: 15,
        stock: 150,
        description: "Small container perfect for offices and small households.",
      },
    ],
  });

  await prisma.deliveryZone.createMany({
    data: [
      { stationId: station2.id, barangay: "Kamuning", city: "Quezon City", deliveryFee: 0, estimatedMinutes: 20 },
      { stationId: station2.id, barangay: "South Triangle", city: "Quezon City", deliveryFee: 0, estimatedMinutes: 25 },
      { stationId: station2.id, barangay: "Diliman", city: "Quezon City", deliveryFee: 10, estimatedMinutes: 35 },
      { stationId: station2.id, barangay: "Cubao", city: "Quezon City", deliveryFee: 10, estimatedMinutes: 30 },
    ],
  });

  // ─── Station 3: Torres Alkaline Water (Manila) ────
  const station3 = await prisma.station.create({
    data: {
      userId: provider3.id,
      name: "Torres Alkaline Water Hub",
      slug: "torres-alkaline-manila",
      description:
        "Specializing in alkaline and mineral water. We use state-of-the-art filtration for the best water experience.",
      phone: "0287654321",
      address: "789 Taft Ave., Barangay Malate",
      barangay: "Malate",
      city: "Manila",
      province: "Metro Manila",
      latitude: 14.5730,
      longitude: 120.9990,
      deliveryFee: 0,
      minOrder: 60,
      isFeatured: false,
      isActive: true,
      openingTime: "07:00",
      closingTime: "21:00",
    },
  });

  await prisma.product.createMany({
    data: [
      {
        stationId: station3.id,
        name: "Premium Alkaline 5 Gallons",
        type: "ALKALINE",
        size: "5-gallon",
        price: 120,
        stock: 40,
        description: "Premium alkaline water, pH 9.0. Ionized and antioxidant-rich.",
      },
      {
        stationId: station3.id,
        name: "Mineral Water 5 Gallons",
        type: "MINERAL",
        size: "5-gallon",
        price: 75,
        stock: 60,
        description: "Natural mineral water with balanced electrolytes.",
      },
      {
        stationId: station3.id,
        name: "Purified Water 5 Gallons",
        type: "PURIFIED",
        size: "5-gallon",
        price: 40,
        stock: 80,
        description: "Standard purified water for everyday drinking.",
      },
    ],
  });

  await prisma.deliveryZone.createMany({
    data: [
      { stationId: station3.id, barangay: "Malate", city: "Manila", deliveryFee: 0, estimatedMinutes: 25 },
      { stationId: station3.id, barangay: "Ermita", city: "Manila", deliveryFee: 0, estimatedMinutes: 20 },
      { stationId: station3.id, barangay: "Paco", city: "Manila", deliveryFee: 10, estimatedMinutes: 30 },
    ],
  });

  // ─── Customer Addresses ─────────────────────────
  await prisma.address.createMany({
    data: [
      {
        userId: customer1.id,
        label: "Home",
        name: "Juan dela Cruz",
        phone: "09170000002",
        street: "22 Banawe St.",
        barangay: "Diliman",
        city: "Quezon City",
        province: "Metro Manila",
        landmark: "Near Banawe Church",
        isDefault: true,
      },
      {
        userId: customer2.id,
        label: "Office",
        name: "Maria Santos",
        phone: "09170000003",
        street: "100 Ayala Ave. Unit 5B",
        barangay: "Salcedo Village",
        city: "Makati",
        province: "Metro Manila",
        landmark: "Near Greenbelt",
        isDefault: true,
      },
      {
        userId: customer1.id,
        label: "Office",
        name: "Juan dela Cruz",
        phone: "09170000002",
        street: "88 Corporate Center, 3rd Floor",
        barangay: "San Antonio",
        city: "Makati",
        province: "Metro Manila",
        isDefault: false,
      },
      // Cebu addresses
      {
        userId: customer1.id,
        label: "Cebu Office",
        name: "Juan dela Cruz",
        phone: "09170000002",
        street: "45 Osmeña Blvd.",
        barangay: "Lahug",
        city: "Cebu City",
        province: "Cebu",
        landmark: "Near Ayala Center Cebu",
        isDefault: false,
      },
      {
        userId: customer2.id,
        label: "Davao Home",
        name: "Maria Santos",
        phone: "09170000003",
        street: "88 Matina Crossing",
        barangay: "Ma-a",
        city: "Davao City",
        province: "Davao del Sur",
        landmark: "Near SM City Davao",
        isDefault: false,
      },
    ],
  });

  // ─── CEBU STATIONS ────────────────────────────────

  // ─── Station 4: Sugbo Water Refilling Station (Cebu City) ────
  const station4 = await prisma.station.create({
    data: {
      userId: provider4.id,
      name: "Sugbo Water Refilling Station",
      slug: "sugbo-water-cebu",
      description:
        "Cebu's premier water refilling station serving the Queen City of the South. We offer purified, mineral, and alkaline water with fast delivery across Cebu City barangays.",
      phone: "0324123456",
      address: "100 Osmeña Blvd., Barangay Capitol Site",
      barangay: "Capitol Site",
      city: "Cebu City",
      province: "Cebu",
      latitude: 10.3157,
      longitude: 123.8854,
      deliveryFee: 0,
      minOrder: 50,
      isFeatured: true,
      isActive: true,
      openingTime: "06:00",
      closingTime: "22:00",
    },
  });

  // Products for Station 4 (Sugbo Water)
  await prisma.product.createMany({
    data: [
      {
        stationId: station4.id,
        name: "Purified Water 5 Gallons",
        type: "PURIFIED",
        size: "5-gallon",
        price: 35,
        stock: 120,
        description: "Triple-filtered purified water. Limpyo ug luwas!",
      },
      {
        stationId: station4.id,
        name: "Mineral Water 5 Gallons",
        type: "MINERAL",
        size: "5-gallon",
        price: 60,
        stock: 60,
        description: "Natural mineral water with essential minerals from Cebu's natural springs.",
      },
      {
        stationId: station4.id,
        name: "Alkaline Water 5 Gallons",
        type: "ALKALINE",
        size: "5-gallon",
        price: 100,
        stock: 35,
        description: "Premium alkaline water pH 8.5+. Para sa mas himsog nga lawas.",
      },
      {
        stationId: station4.id,
        name: "Purified Water 1 Gallon",
        type: "PURIFIED",
        size: "1-gallon",
        price: 15,
        stock: 100,
        description: "Sulit na purified water para sa opisina o balay.",
      },
    ],
  });

  // Delivery Zones for Station 4
  await prisma.deliveryZone.createMany({
    data: [
      { stationId: station4.id, barangay: "Capitol Site", city: "Cebu City", deliveryFee: 0, estimatedMinutes: 20 },
      { stationId: station4.id, barangay: "Lahug", city: "Cebu City", deliveryFee: 0, estimatedMinutes: 25 },
      { stationId: station4.id, barangay: "Mabolo", city: "Cebu City", deliveryFee: 0, estimatedMinutes: 25 },
      { stationId: station4.id, barangay: "Kamputhaw", city: "Cebu City", deliveryFee: 0, estimatedMinutes: 20 },
      { stationId: station4.id, barangay: "Guadalupe", city: "Cebu City", deliveryFee: 10, estimatedMinutes: 30 },
      { stationId: station4.id, barangay: "Banilad", city: "Cebu City", deliveryFee: 10, estimatedMinutes: 30 },
      { stationId: station4.id, barangay: "Tisa", city: "Cebu City", deliveryFee: 15, estimatedMinutes: 35 },
    ],
  });

  // ─── Station 5: Mandaue Aqua Pure (Mandaue) ──────
  const station5 = await prisma.station.create({
    data: {
      userId: provider5.id,
      name: "Mandaue Aqua Pure",
      slug: "mandaue-aqua-pure",
      description:
        "Quality water delivery in Mandaue City and nearby areas. Affordable and reliable — order now and get same-day delivery!",
      phone: "0324987654",
      address: "200 A. Del Rosario St., Barangay Centro",
      barangay: "Centro",
      city: "Mandaue",
      province: "Cebu",
      latitude: 10.3277,
      longitude: 123.9355,
      deliveryFee: 0,
      minOrder: 40,
      isFeatured: true,
      isActive: true,
      openingTime: "05:30",
      closingTime: "21:00",
    },
  });

  // Products for Station 5 (Mandaue Aqua Pure)
  await prisma.product.createMany({
    data: [
      {
        stationId: station5.id,
        name: "Purified Water 5 Gallons",
        type: "PURIFIED",
        size: "5-gallon",
        price: 30,
        stock: 150,
        description: "Affordable purified water everyday.",
      },
      {
        stationId: station5.id,
        name: "Mineral Water 5 Gallons",
        type: "MINERAL",
        size: "5-gallon",
        price: 55,
        stock: 70,
        description: "Mineral water sourced from Cebu mountain springs.",
      },
      {
        stationId: station5.id,
        name: "Alkaline Water 5 Gallons",
        type: "ALKALINE",
        size: "5-gallon",
        price: 90,
        stock: 40,
        description: "Alkaline ionized water, pH 9.0. Good for acidity.",
      },
    ],
  });

  // Delivery Zones for Station 5
  await prisma.deliveryZone.createMany({
    data: [
      { stationId: station5.id, barangay: "Centro", city: "Mandaue", deliveryFee: 0, estimatedMinutes: 20 },
      { stationId: station5.id, barangay: "Tipolo", city: "Mandaue", deliveryFee: 0, estimatedMinutes: 20 },
      { stationId: station5.id, barangay: "Mantuyong", city: "Mandaue", deliveryFee: 0, estimatedMinutes: 25 },
      { stationId: station5.id, barangay: "Looc", city: "Mandaue", deliveryFee: 5, estimatedMinutes: 30 },
      { stationId: station5.id, barangay: "Basak", city: "Mandaue", deliveryFee: 5, estimatedMinutes: 30 },
      { stationId: station5.id, barangay: "Banilad", city: "Mandaue", deliveryFee: 10, estimatedMinutes: 35 },
    ],
  });

  // ─── MINDANAO STATIONS ────────────────────────────

  // ─── Station 6: Durian Water Solutions (Davao City) ────
  const station6 = await prisma.station.create({
    data: {
      userId: provider6.id,
      name: "Durian Water Solutions",
      slug: "durian-water-davao",
      description:
        "Davao's trusted water refilling station. We serve purified and mineral water across Davao City with the fastest delivery in Mindanao!",
      phone: "0821234567",
      address: "300 J.P. Laurel Ave., Barangay Bajada",
      barangay: "Bajada",
      city: "Davao City",
      province: "Davao del Sur",
      latitude: 7.0645,
      longitude: 125.6080,
      deliveryFee: 0,
      minOrder: 50,
      isFeatured: true,
      isActive: true,
      openingTime: "06:00",
      closingTime: "22:00",
    },
  });

  // Products for Station 6 (Durian Water Solutions)
  await prisma.product.createMany({
    data: [
      {
        stationId: station6.id,
        name: "Purified Water 5 Gallons",
        type: "PURIFIED",
        size: "5-gallon",
        price: 30,
        stock: 200,
        description: "Barato ug limpyo nga purified water. Sulit kaayo!",
      },
      {
        stationId: station6.id,
        name: "Mineral Water 5 Gallons",
        type: "MINERAL",
        size: "5-gallon",
        price: 55,
        stock: 80,
        description: "Natural mineral water from Davao's mountain springs.",
      },
      {
        stationId: station6.id,
        name: "Alkaline Water 5 Gallons",
        type: "ALKALINE",
        size: "5-gallon",
        price: 95,
        stock: 45,
        description: "Premium alkaline water pH 8.5. Healthy hydration for every Davaoeño.",
      },
      {
        stationId: station6.id,
        name: "Purified Water 1 Gallon",
        type: "PURIFIED",
        size: "1-gallon",
        price: 12,
        stock: 200,
        description: "Small purified water container, perfect for on-the-go.",
      },
    ],
  });

  // Delivery Zones for Station 6
  await prisma.deliveryZone.createMany({
    data: [
      { stationId: station6.id, barangay: "Bajada", city: "Davao City", deliveryFee: 0, estimatedMinutes: 20 },
      { stationId: station6.id, barangay: "Agdao", city: "Davao City", deliveryFee: 0, estimatedMinutes: 25 },
      { stationId: station6.id, barangay: "Sasa", city: "Davao City", deliveryFee: 10, estimatedMinutes: 30 },
      { stationId: station6.id, barangay: "Talomo", city: "Davao City", deliveryFee: 10, estimatedMinutes: 30 },
      { stationId: station6.id, barangay: "Ma-a", city: "Davao City", deliveryFee: 15, estimatedMinutes: 35 },
      { stationId: station6.id, barangay: "Toril", city: "Davao City", deliveryFee: 20, estimatedMinutes: 40 },
    ],
  });

  // ─── Station 7: CDO Clear Water (Cagayan de Oro) ─────
  const station7 = await prisma.station.create({
    data: {
      userId: provider7.id,
      name: "CDO Clear Water",
      slug: "cdo-clear-water",
      description:
        "Cagayan de Oro's reliable water delivery service. We provide purified and mineral water to homes and offices across CDO with same-day delivery.",
      phone: "0887654321",
      address: "150 Velez St., Barangay Carmen",
      barangay: "Carmen",
      city: "Cagayan de Oro",
      province: "Misamis Oriental",
      latitude: 8.4822,
      longitude: 124.6472,
      deliveryFee: 0,
      minOrder: 40,
      isFeatured: false,
      isActive: true,
      openingTime: "06:00",
      closingTime: "21:00",
    },
  });

  // Products for Station 7 (CDO Clear Water)
  await prisma.product.createMany({
    data: [
      {
        stationId: station7.id,
        name: "Purified Water 5 Gallons",
        type: "PURIFIED",
        size: "5-gallon",
        price: 28,
        stock: 180,
        description: "Affordable purified water. Limpyo ug barato!",
      },
      {
        stationId: station7.id,
        name: "Mineral Water 5 Gallons",
        type: "MINERAL",
        size: "5-gallon",
        price: 50,
        stock: 65,
        description: "Natural mineral water rich in electrolytes.",
      },
      {
        stationId: station7.id,
        name: "Alkaline Water 5 Gallons",
        type: "ALKALINE",
        size: "5-gallon",
        price: 85,
        stock: 30,
        description: "Alkaline water pH 8.5. Para sa mas healthy nga lifestyle.",
      },
    ],
  });

  // Delivery Zones for Station 7
  await prisma.deliveryZone.createMany({
    data: [
      { stationId: station7.id, barangay: "Carmen", city: "Cagayan de Oro", deliveryFee: 0, estimatedMinutes: 20 },
      { stationId: station7.id, barangay: "Kauswagan", city: "Cagayan de Oro", deliveryFee: 0, estimatedMinutes: 25 },
      { stationId: station7.id, barangay: "Macasandig", city: "Cagayan de Oro", deliveryFee: 5, estimatedMinutes: 30 },
      { stationId: station7.id, barangay: "Gusa", city: "Cagayan de Oro", deliveryFee: 10, estimatedMinutes: 35 },
      { stationId: station7.id, barangay: "Balulang", city: "Cagayan de Oro", deliveryFee: 10, estimatedMinutes: 30 },
    ],
  });

  // ─── Station 8: GenSan Spring Water (General Santos) ────
  const station8 = await prisma.station.create({
    data: {
      userId: provider8.id,
      name: "GenSan Spring Water",
      slug: "gensan-spring-water",
      description:
        "General Santos City's homegrown water refilling station. We bring the purest water from the mountains of South Cotabato right to your doorstep.",
      phone: "0831234567",
      address: "400 National Highway, Barangay Dadiangas North",
      barangay: "Dadiangas North",
      city: "General Santos",
      province: "South Cotabato",
      latitude: 6.1107,
      longitude: 125.1714,
      deliveryFee: 0,
      minOrder: 40,
      isFeatured: false,
      isActive: true,
      openingTime: "06:00",
      closingTime: "20:00",
    },
  });

  // Products for Station 8 (GenSan Spring Water)
  await prisma.product.createMany({
    data: [
      {
        stationId: station8.id,
        name: "Purified Water 5 Gallons",
        type: "PURIFIED",
        size: "5-gallon",
        price: 30,
        stock: 130,
        description: "Standard purified water for daily drinking needs.",
      },
      {
        stationId: station8.id,
        name: "Mineral Water 5 Gallons",
        type: "MINERAL",
        size: "5-gallon",
        price: 55,
        stock: 50,
        description: "Mineral water sourced from South Cotabato springs.",
      },
      {
        stationId: station8.id,
        name: "Alkaline Water 5 Gallons",
        type: "ALKALINE",
        size: "5-gallon",
        price: 90,
        stock: 25,
        description: "Premium alkaline water. Puro, presko, pang-masa!",
      },
    ],
  });

  // Delivery Zones for Station 8
  await prisma.deliveryZone.createMany({
    data: [
      { stationId: station8.id, barangay: "Dadiangas North", city: "General Santos", deliveryFee: 0, estimatedMinutes: 20 },
      { stationId: station8.id, barangay: "Dadiangas South", city: "General Santos", deliveryFee: 0, estimatedMinutes: 25 },
      { stationId: station8.id, barangay: "Lagao", city: "General Santos", deliveryFee: 5, estimatedMinutes: 30 },
      { stationId: station8.id, barangay: "City Heights", city: "General Santos", deliveryFee: 10, estimatedMinutes: 30 },
      { stationId: station8.id, barangay: "Bula", city: "General Santos", deliveryFee: 10, estimatedMinutes: 35 },
    ],
  });

  // ─── Sample Orders ──────────────────────────────
  const order1 = await prisma.order.create({
    data: {
      userId: customer1.id,
      stationId: station1.id,
      status: "DELIVERED",
      orderType: "ONCE",
      subtotal: 70,
      deliveryFee: 0,
      total: 70,
      paymentMethod: "GCASH",
      paymentStatus: "PAID",
      addressId: (await prisma.address.findFirst({ where: { userId: customer1.id } }))!.id,
      notes: "Please leave at the door",
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      productId: s1p1.id,
      quantity: 2,
      unitPrice: 35,
    },
  });

  // Review for order 1
  await prisma.review.create({
    data: {
      userId: customer1.id,
      stationId: station1.id,
      orderId: order1.id,
      rating: 4,
      comment: "Mabilis ang delivery at mabait ang driver. Sariwa ang tubig!",
    },
  });

  // Update station rating
  await prisma.station.update({
    where: { id: station1.id },
    data: { rating: 4.0, totalReviews: 1 },
  });

  const order2 = await prisma.order.create({
    data: {
      userId: customer2.id,
      stationId: station2.id,
      status: "OUT_FOR_DELIVERY",
      orderType: "RECURRING",
      recurringDay: "MON",
      subtotal: 60,
      deliveryFee: 0,
      total: 60,
      paymentMethod: "COD",
      paymentStatus: "PENDING",
      addressId: (await prisma.address.findFirst({ where: { userId: customer2.id } }))!.id,
    },
  });

  const s2p1 = await prisma.product.findFirst({ where: { stationId: station2.id, type: "PURIFIED" } });
  if (s2p1) {
    await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        productId: s2p1.id,
        quantity: 2,
        unitPrice: 30,
      },
    });
  }

  const order3 = await prisma.order.create({
    data: {
      userId: customer1.id,
      stationId: station2.id,
      status: "PENDING",
      orderType: "ONCE",
      subtotal: 55,
      deliveryFee: 0,
      total: 55,
      paymentMethod: "COD",
      paymentStatus: "PENDING",
      addressId: (await prisma.address.findFirst({ where: { userId: customer1.id, isDefault: true } }))!.id,
      notes: "Tawag po pag dating",
    },
  });

  const s2p2 = await prisma.product.findFirst({ where: { stationId: station2.id, type: "MINERAL" } });
  if (s2p2) {
    await prisma.orderItem.create({
      data: {
        orderId: order3.id,
        productId: s2p2.id,
        quantity: 1,
        unitPrice: 55,
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log("─── Test Accounts ───");
  console.log("📱 All accounts use password: password123");
  console.log("👤 Customer 1: 09170000002 (Juan dela Cruz)");
  console.log("👤 Customer 2: 09170000003 (Maria Santos)");
  console.log("🏪 Provider 1: 09170000004 (Aquino Water Station — Makati)");
  console.log("🏪 Provider 2: 09170000005 (Lim's Pure Water — Quezon City)");
  console.log("🏪 Provider 3: 09170000006 (Torres Alkaline Water Hub — Manila)");
  console.log("🏪 Provider 4: 09170000007 (Sugbo Water — Cebu City)");
  console.log("🏪 Provider 5: 09170000008 (Mandaue Aqua Pure — Mandaue)");
  console.log("🏪 Provider 6: 09170000009 (Durian Water Solutions — Davao City)");
  console.log("🏪 Provider 7: 09170000010 (CDO Clear Water — Cagayan de Oro)");
  console.log("🏪 Provider 8: 09170000011 (GenSan Spring Water — General Santos)");
  console.log("🔧 Admin:      09170000001");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });