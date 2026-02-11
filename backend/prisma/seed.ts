import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
    include: { spots: true }
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
    include: { spots: true }
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
