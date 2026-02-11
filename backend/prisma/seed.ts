import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function startOfDayUtc(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function main() {
  await prisma.reservationEvent.deleteMany();
  await prisma.usageEvent.deleteMany();
  await prisma.lotDailyMetric.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.chargingSession.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.chargingStation.deleteMany();
  await prisma.parkingSpot.deleteMany();
  await prisma.parkingLot.deleteMany();
  await prisma.tariff.deleteMany();

  const lot1 = await prisma.parkingLot.create({
    data: {
      name: "Main Gate Lot",
      address: "Campus Main Gate",
      totalSpots: 60,
      pricePerHour: 40,
      hasEvCharging: true,
      distanceMeters: 150,
      spots: {
        create: [
          { label: "A1", isAvailable: true, supportsEv: true },
          { label: "A2", isAvailable: false, supportsEv: false }
        ]
      },
      chargingStations: {
        create: [
          { name: "Charger A", connectorType: "CCS2", maxKw: 50, isAvailable: true }
        ]
      }
    },
    include: { spots: true, chargingStations: true }
  });

  const lot2 = await prisma.parkingLot.create({
    data: {
      name: "Library Basement",
      address: "Central Library",
      totalSpots: 80,
      pricePerHour: 30,
      hasEvCharging: true,
      distanceMeters: 120,
      spots: {
        create: [
          { label: "B1", isAvailable: true, supportsEv: true },
          { label: "B2", isAvailable: true, supportsEv: false }
        ]
      },
      chargingStations: {
        create: [
          { name: "Charger B", connectorType: "Type2", maxKw: 22, isAvailable: true }
        ]
      }
    },
    include: { spots: true, chargingStations: true }
  });

  const reservation = await prisma.reservation.create({
    data: {
      lotId: lot1.id,
      spotId: lot1.spots[0].id,
      userId: "demo-user",
      vehiclePlate: "TN-00-XX-0000",
      status: "reserved"
    }
  });

  await prisma.reservationEvent.create({
    data: {
      reservationId: reservation.id,
      status: "reserved",
      note: "seed created"
    }
  });

  await prisma.chargingSession.create({
    data: {
      stationId: lot1.chargingStations[0].id,
      reservationId: reservation.id,
      userId: reservation.userId,
      startedAt: new Date(Date.now() - 1000 * 60 * 30),
      endedAt: new Date(),
      energyKwh: 18.4,
      cost: 2400,
      status: "completed"
    }
  });

  const today = startOfDayUtc();
  await prisma.usageEvent.createMany({
    data: [
      {
        lotId: lot1.id,
        spotId: lot1.spots[0].id,
        eventType: "reservation_start",
        recordedAt: new Date(today.getTime() + 1000 * 60 * 8),
        note: "Initial occupancy change",
        deltaAvailable: -1,
        occupancy: 45
      },
      {
        lotId: lot1.id,
        spotId: lot1.spots[0].id,
        eventType: "charging_start",
        recordedAt: new Date(today.getTime() + 1000 * 60 * 10),
        note: "Charger engaged",
        occupancy: 46
      }
    ]
  });

  await prisma.lotDailyMetric.createMany({
    data: [
      {
        lotId: lot1.id,
        date: today,
        reservationsCount: 5,
        chargingSessionsCount: 2,
        energyKwh: 42.5,
        revenueCents: 5200,
        avgOccupancyPercent: 62.5
      },
      {
        lotId: lot2.id,
        date: today,
        reservationsCount: 3,
        chargingSessionsCount: 1,
        energyKwh: 21.3,
        revenueCents: 3000,
        avgOccupancyPercent: 48.0
      }
    ]
  });

  await prisma.tariff.create({
    data: {
      name: "Standard",
      pricePerHour: 40,
      pricePerKwh: 12.5,
      peakMultiplier: 1.2
    }
  });

  await prisma.transaction.create({
    data: {
      reservationId: reservation.id,
      amountCents: 2000,
      currency: "INR",
      status: "paid"
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
