import { prisma } from './src/lib/server/db/client.js';

async function main() {
  console.log('🌱 Seeding database with comprehensive test data...');

  // Clear existing data
  await prisma.tourPricingConfig.deleteMany();
  await prisma.driverAvailability.deleteMany();
  await prisma.cityTour.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.tourStop.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();

  // ========== USERS ==========
  console.log('\n📝 Creating users...');

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      role: 'admin',
      passwordHash: null
    }
  });
  console.log('✅ admin@test.com (Admin)');

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@test.com',
      role: 'manager',
      passwordHash: null
    }
  });
  console.log('✅ manager@test.com (Manager)');

  // ========== DRIVERS ==========
  console.log('\n🚗 Creating drivers...');

  const drivers = [];
  const driverData = [
    { name: 'John Schmidt', license: 'DL123456', phone: '+49123456789', hire: '2024-01-15' },
    { name: 'Maria Müller', license: 'DL789012', phone: '+49987654321', hire: '2023-06-01' },
    { name: 'Hans Weber', license: 'DL456789', phone: '+49456789123', hire: '2023-03-10' },
    { name: 'Sophie Fischer', license: 'DL234567', phone: '+49234567890', hire: '2024-02-20' },
    { name: 'Peter Becker', license: 'DL567890', phone: '+49567890234', hire: '2024-06-01' }
  ];

  for (const data of driverData) {
    const driverUser = await prisma.user.create({
      data: {
        email: `driver-${data.name.toLowerCase().replace(' ', '-')}@test.com`,
        role: 'driver',
        passwordHash: null
      }
    });

    const driver = await prisma.driver.create({
      data: {
        name: data.name,
        licenseNumber: data.license,
        phone: data.phone,
        status: 'active',
        hireDate: new Date(data.hire)
      }
    });

    await prisma.user.update({
      where: { id: driverUser.id },
      data: { driverId: driver.id }
    });

    drivers.push(driver);
    console.log(`✅ ${data.name}`);
  }

  // ========== TOUR PRICING CONFIGS ==========
  console.log('\n💰 Creating pricing configs...');

  const pricingConfigs = [
    // Silver Tier
    { tier: 'silver', min: 1, max: 2, base: 45, extra: 15, duration: 60, commission: 25 },
    { tier: 'silver', min: 3, max: 4, base: 60, extra: 12, duration: 75, commission: 28 },
    { tier: 'silver', min: 5, max: 8, base: 80, extra: 10, duration: 90, commission: 30 },
    // Gold Tier
    { tier: 'gold', min: 1, max: 2, base: 75, extra: 25, duration: 75, commission: 32 },
    { tier: 'gold', min: 3, max: 4, base: 95, extra: 20, duration: 90, commission: 35 },
    { tier: 'gold', min: 5, max: 8, base: 120, extra: 15, duration: 120, commission: 38 },
    // Platinum Tier
    { tier: 'platinum', min: 1, max: 2, base: 120, extra: 40, duration: 90, commission: 40 },
    { tier: 'platinum', min: 3, max: 4, base: 150, extra: 35, duration: 120, commission: 42 },
    { tier: 'platinum', min: 5, max: 8, base: 180, extra: 30, duration: 150, commission: 45 }
  ];

  for (const config of pricingConfigs) {
    await prisma.tourPricingConfig.create({
      data: {
        tier: config.tier,
        minGuests: config.min,
        maxGuests: config.max,
        basePricePerTour: config.base,
        pricePerAdditionalGuestBeyond: config.extra,
        durationMinutes: config.duration,
        driverCommissionPercentage: config.commission
      }
    });
  }
  console.log(`✅ ${pricingConfigs.length} pricing configs created`);

  // ========== TOUR STOPS ==========
  console.log('\n🗽 Creating tour stops...');

  const tourStops = [
    { name: 'Brandenburg Gate', order: 1 },
    { name: 'Reichstag Building', order: 2 },
    { name: 'Museum Island', order: 3 },
    { name: 'Berlin Cathedral', order: 4 },
    { name: 'Checkpoint Charlie', order: 5 },
    { name: 'East Side Gallery', order: 6 },
    { name: 'Potsdamer Platz', order: 7 },
    { name: 'Victory Column', order: 8 }
  ];

  const stops = [];
  for (const stop of tourStops) {
    const created = await prisma.tourStop.create({
      data: {
        name: stop.name,
        order: stop.order
      }
    });
    stops.push(created);
  }
  console.log(`✅ ${stops.length} tour stops created`);

  // ========== DRIVER AVAILABILITY ==========
  console.log('\n📅 Creating driver availability...');

  for (let i = 0; i < drivers.length; i++) {
    // Today
    const today = new Date();
    await prisma.driverAvailability.create({
      data: {
        driverId: drivers[i].id,
        shiftStart: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0),
        shiftEnd: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0),
        isAvailable: true
      }
    });

    // Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    await prisma.driverAvailability.create({
      data: {
        driverId: drivers[i].id,
        shiftStart: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0),
        shiftEnd: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 19, 0),
        isAvailable: true
      }
    });

    // Day after tomorrow
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    await prisma.driverAvailability.create({
      data: {
        driverId: drivers[i].id,
        shiftStart: new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 8, 0),
        shiftEnd: new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 17, 0),
        isAvailable: true
      }
    });
  }
  console.log(`✅ Availability created for ${drivers.length} drivers (3 days each)`);

  // ========== CITY TOURS ==========
  console.log('\n🎫 Creating city tours...');

  const tourStatuses = ['in_progress', 'completed'];
  const tourTiers = ['silver', 'gold', 'platinum'];
  const languages = ['en', 'de', 'fr', 'es'];

  let tourCount = 0;
  for (let i = 0; i < 12; i++) {
    const driver = drivers[i % drivers.length];
    const tier = tourTiers[i % tourTiers.length];
    const language = languages[i % languages.length];
    const guestCount = (i % 6) + 1;
    const status = i % 3 === 0 ? 'completed' : 'in_progress';

    const now = new Date();
    const startTime = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);

    await prisma.cityTour.create({
      data: {
        driverId: driver.id,
        tier,
        guestCount,
        language,
        durationMinutes: tier === 'silver' ? 60 : tier === 'gold' ? 90 : 120,
        priceAmount: 50 + (i * 10),
        commissionAmount: 15 + (i * 3),
        status,
        startedAt: startTime,
        endedAt: status === 'completed' ? new Date(startTime.getTime() + 90 * 60 * 1000) : null
      }
    });
    tourCount++;
  }
  console.log(`✅ ${tourCount} city tours created`);

  // ========== BOOKINGS ==========
  console.log('\n📦 Creating bookings...');

  const bookingStatuses = ['reserved', 'confirmed', 'completed', 'cancelled'];
  let bookingCount = 0;

  for (let i = 0; i < 15; i++) {
    const driver = drivers[i % drivers.length];
    const status = bookingStatuses[i % bookingStatuses.length];
    const now = new Date();
    const bookingDate = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    await prisma.booking.create({
      data: {
        driverId: driver.id,
        passengersCount: (i % 8) + 1,
        pickupLocation: `Berlin Location ${i + 1}`,
        dropoffLocation: `Destination ${i + 1}`,
        estimatedDurationMinutes: 45 + (i * 5),
        status,
        createdAt: bookingDate
      }
    });
    bookingCount++;
  }
  console.log(`✅ ${bookingCount} bookings created`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`   • Users: 1 Admin + 1 Manager + ${drivers.length} Drivers`);
  console.log(`   • Drivers: ${drivers.length}`);
  console.log(`   • Pricing Configs: ${pricingConfigs.length}`);
  console.log(`   • Tour Stops: ${stops.length}`);
  console.log(`   • Driver Availability: ${drivers.length * 3}`);
  console.log(`   • City Tours: ${tourCount}`);
  console.log(`   • Bookings: ${bookingCount}`);
  
  console.log('\n📝 Test Credentials:');
  console.log('   Admin: admin@test.com');
  console.log('   Manager: manager@test.com');
  driverData.forEach((d, i) => {
    const email = `driver-${d.name.toLowerCase().replace(' ', '-')}@test.com`;
    console.log(`   Driver ${i + 1}: ${email} (${d.name})`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
