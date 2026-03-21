import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function startOfDayUtc(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const lotTemplates = [
  { name: "North Atrium", address: "Block A", distanceMeters: 110 },
  { name: "Library Deck", address: "Central Library", distanceMeters: 90 },
  { name: "Sports Hub", address: "Stadium Wing", distanceMeters: 140 },
  { name: "Innovation Yard", address: "Tech Park", distanceMeters: 170 }
];

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

  const lots = [] as Array<{
    id: string;
    spots: Array<{ id: string; label: string }>;
    chargers: Array<{ id: string }>;
  }>;

  for (let i = 0; i < lotTemplates.length; i += 1) {
    const template = lotTemplates[i];
    const lot = await prisma.parkingLot.create({
      data: {
        name: template.name,
        address: template.address,
        totalSpots: 7,
        pricePerHour: 35,
        hasEvCharging: true,
        distanceMeters: template.distanceMeters,
        spots: {
          create: Array.from({ length: 7 }, (_, index) => ({
            label: `S${index + 1}`,
            isAvailable: true,
            supportsEv: index < 2
          }))
        },
        chargingStations: {
          create: [
            { name: `Fast-${i + 1}`, connectorType: "CCS2", maxKw: 60, isAvailable: true },
            { name: `Type2-${i + 1}`, connectorType: "Type2", maxKw: 22, isAvailable: true }
          ]
        }
      },
      include: { spots: true, chargingStations: true }
    });

    lots.push({
      id: lot.id,
      spots: lot.spots.map((spot) => ({ id: spot.id, label: spot.label })),
      chargers: lot.chargingStations.map((station) => ({ id: station.id }))
    });
  }

  const now = new Date();
  const activeReservation = await prisma.reservation.create({
    data: {
      lotId: lots[0].id,
      spotId: lots[0].spots[0].id,
      userId: "demo-user",
      vehiclePlate: "TN-00-XX-0000",
      status: "reserved",
      startTime: new Date(now.getTime() - 20 * 60 * 1000),
      endTime: new Date(now.getTime() + 40 * 60 * 1000)
    }
  });

  await prisma.reservationEvent.create({
    data: {
      reservationId: activeReservation.id,
      status: "reserved",
      note: "seed created"
    }
  });

  await prisma.chargingSession.create({
    data: {
      stationId: lots[0].chargers[0].id,
      reservationId: activeReservation.id,
      userId: activeReservation.userId,
      startedAt: new Date(Date.now() - 1000 * 60 * 30),
      endedAt: new Date(),
      energyKwh: 18.4,
      cost: 2400,
      status: "completed"
    }
  });

  const today = startOfDayUtc();
  for (const lot of lots) {
    await prisma.lotDailyMetric.create({
      data: {
        lotId: lot.id,
        date: today,
        reservationsCount: 3,
        chargingSessionsCount: 2,
        energyKwh: 25.5,
        revenueCents: 4200,
        avgOccupancyPercent: 45
      }
    });
  }

  await prisma.tariff.create({
    data: {
      name: "Standard",
      pricePerHour: 35,
      pricePerKwh: 12.5,
      peakMultiplier: 1.2
    }
  });

  await prisma.transaction.create({
    data: {
      reservationId: activeReservation.id,
      amountCents: 2000,
      currency: "INR",
      status: "paid"
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
