import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import type { Prisma, PrismaClient } from "@prisma/client";
import prisma from "./prisma";

function startOfDayUtc(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function upsertLotDailyMetric(client: PrismaClient | Prisma.TransactionClient, lotId: string, date: Date, updates: {
  reservationsDelta?: number;
  chargingSessionsDelta?: number;
  energyKwhDelta?: number;
  revenueDelta?: number;
  occupancySample?: number;
}) {
  const day = startOfDayUtc(date);
  await client.lotDailyMetric.upsert({
    where: { lotId_date: { lotId, date: day } },
    update: {
      ...(updates.reservationsDelta === undefined ? {} : { reservationsCount: { increment: updates.reservationsDelta } }),
      ...(updates.chargingSessionsDelta === undefined
        ? {}
        : { chargingSessionsCount: { increment: updates.chargingSessionsDelta } }),
      ...(updates.energyKwhDelta === undefined ? {} : { energyKwh: { increment: updates.energyKwhDelta } }),
      ...(updates.revenueDelta === undefined ? {} : { revenueCents: { increment: updates.revenueDelta } }),
      ...(updates.occupancySample === undefined ? {} : { avgOccupancyPercent: updates.occupancySample })
    },
    create: {
      lotId,
      date: day,
      reservationsCount: updates.reservationsDelta ?? 0,
      chargingSessionsCount: updates.chargingSessionsDelta ?? 0,
      energyKwh: updates.energyKwhDelta ?? 0,
      revenueCents: updates.revenueDelta ?? 0,
      avgOccupancyPercent: updates.occupancySample
    }
  });
}

async function cleanupReservations(client: Prisma.TransactionClient, reservationIds: string[]) {
  if (reservationIds.length === 0) {
    return;
  }

  await client.reservationEvent.deleteMany({ where: { reservationId: { in: reservationIds } } });
  await client.transaction.deleteMany({ where: { reservationId: { in: reservationIds } } });
  await client.chargingSession.updateMany({
    where: { reservationId: { in: reservationIds } },
    data: { reservationId: null }
  });
  await client.reservation.deleteMany({ where: { id: { in: reservationIds } } });
}

async function deleteLotCascade(lotId: string) {
  await prisma.$transaction(async (tx) => {
    const reservations = await tx.reservation.findMany({ where: { lotId }, select: { id: true } });
    const reservationIds = reservations.map((r) => r.id);
    await cleanupReservations(tx, reservationIds);

    const stations = await tx.chargingStation.findMany({ where: { lotId }, select: { id: true } });
    const stationIds = stations.map((s) => s.id);

    if (stationIds.length > 0) {
      await tx.chargingSession.deleteMany({ where: { stationId: { in: stationIds } } });
    }

    await tx.usageEvent.deleteMany({ where: { lotId } });
    await tx.lotDailyMetric.deleteMany({ where: { lotId } });
    await tx.chargingStation.deleteMany({ where: { lotId } });
    await tx.parkingSpot.deleteMany({ where: { lotId } });
    await tx.parkingLot.delete({ where: { id: lotId } });
  });
}

async function deleteSpotCascade(spotId: string) {
  await prisma.$transaction(async (tx) => {
    const reservations = await tx.reservation.findMany({ where: { spotId }, select: { id: true } });
    const reservationIds = reservations.map((r) => r.id);
    await cleanupReservations(tx, reservationIds);

    await tx.usageEvent.deleteMany({ where: { spotId } });
    await tx.parkingSpot.delete({ where: { id: spotId } });
  });
}

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "Smart Parking & EV API",
    docs: "/api/health"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/lots", async (_req, res, next) => {
  try {
    const now = new Date();
    const data = await prisma.parkingLot.findMany({
      include: {
        spots: { select: { id: true } },
        reservations: {
          where: {
            startTime: { lte: now },
            OR: [{ endTime: null }, { endTime: { gt: now } }]
          },
          select: { spotId: true }
        },
        lotDailyMetrics: { orderBy: { date: "desc" }, take: 1 }
      }
    });

    const payload = data.map((lot) => ({
      id: lot.id,
      name: lot.name,
      address: lot.address,
      totalSpots: lot.totalSpots,
      availableSpots: Math.max(0, lot.spots.length - new Set(lot.reservations.map((r) => r.spotId)).size),
      pricePerHour: lot.pricePerHour,
      hasEvCharging: lot.hasEvCharging,
      distanceMeters: lot.distanceMeters,
      latestAvgOccupancyPercent: lot.lotDailyMetrics[0]?.avgOccupancyPercent ?? null,
      latestReservations: lot.lotDailyMetrics[0]?.reservationsCount ?? null
    }));

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

app.get("/api/lots/:id/spots", async (req, res, next) => {
  try {
    const list = await prisma.parkingSpot.findMany({ where: { lotId: req.params.id } });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

app.post("/api/reservations", async (req, res, next) => {
  try {
    const { lotId, spotId, userId = "demo-user", vehiclePlate, startTime, durationMinutes } = req.body;
    if (!lotId || !spotId || !vehiclePlate) {
      return res.status(400).json({ message: "lotId, spotId, vehiclePlate are required" });
    }

    const spot = await prisma.parkingSpot.findUnique({ where: { id: spotId } });
    if (!spot || spot.lotId !== lotId) {
      return res.status(400).json({ message: "Spot not found for lot" });
    }

    const start = startTime ? new Date(startTime) : new Date();
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ message: "Invalid startTime" });
    }

    const reservationMinutes = Math.max(1, Number(durationMinutes ?? 60));
    const end = new Date(start.getTime() + reservationMinutes * 60 * 1000);

    const conflict = await prisma.reservation.findFirst({
      where: {
        spotId,
        startTime: { lt: end },
        OR: [{ endTime: null }, { endTime: { gt: start } }]
      },
      select: { id: true }
    });

    if (conflict) {
      return res.status(409).json({ message: "Spot already reserved for this time window" });
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const created = await tx.reservation.create({
        data: { lotId, spotId, userId, vehiclePlate, startTime: start, endTime: end, status: "reserved" }
      });

      await tx.reservationEvent.create({
        data: { reservationId: created.id, status: "reserved", note: "Created via API" }
      });

      await tx.usageEvent.create({
        data: {
          lotId,
          spotId,
          eventType: "reservation_start",
          recordedAt: start,
          deltaAvailable: -1
        }
      });

      await upsertLotDailyMetric(tx, lotId, start, { reservationsDelta: 1 });
      return created;
    });

    res.status(201).json(reservation);
  } catch (err) {
    next(err);
  }
});

app.get("/api/reservations/:id", async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { reservationEvents: { orderBy: { recordedAt: "desc" } }, chargingSessions: true }
    });
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    res.json(reservation);
  } catch (err) {
    next(err);
  }
});

app.get("/api/charging-stations", async (_req, res, next) => {
  try {
    const data = await prisma.chargingStation.findMany();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

app.post("/api/charging-sessions", async (req, res, next) => {
  try {
    const { stationId, reservationId, userId = "demo-user", energyKwh, cost } = req.body;
    if (!stationId) {
      return res.status(400).json({ message: "stationId is required" });
    }

    const station = await prisma.chargingStation.findUnique({ where: { id: stationId } });
    if (!station) {
      return res.status(404).json({ message: "Charging station not found" });
    }

    const startedAt = new Date();
    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.chargingSession.create({
        data: { stationId, reservationId, userId, startedAt, energyKwh, cost, status: "active" }
      });

      await tx.usageEvent.create({
        data: {
          lotId: station.lotId,
          eventType: "charging_start",
          recordedAt: startedAt,
          metadata: JSON.stringify({ stationId })
        }
      });

      await upsertLotDailyMetric(tx, station.lotId, startedAt, { chargingSessionsDelta: 1, energyKwhDelta: energyKwh, revenueDelta: cost });
      return created;
    });

    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

app.get("/api/lots/:id/history", async (req, res, next) => {
  try {
    const events = await prisma.usageEvent.findMany({
      where: { lotId: req.params.id },
      orderBy: { recordedAt: "desc" },
      take: 200
    });
    res.json(events);
  } catch (err) {
    next(err);
  }
});

app.get("/api/analytics/daily", async (req, res, next) => {
  try {
    const days = Number.parseInt(String(req.query.days ?? "7"), 10);
    const since = startOfDayUtc(new Date(Date.now() - (Number.isNaN(days) ? 7 : days) * 24 * 60 * 60 * 1000));

    const metrics = await prisma.lotDailyMetric.findMany({
      where: { date: { gte: since } },
      include: { lot: { select: { name: true, hasEvCharging: true } } },
      orderBy: [{ date: "asc" }]
    });

    const payload = metrics.map((m) => ({
      lotId: m.lotId,
      lotName: m.lot.name,
      date: m.date,
      reservations: m.reservationsCount,
      chargingSessions: m.chargingSessionsCount,
      energyKwh: m.energyKwh,
      revenueCents: m.revenueCents,
      avgOccupancyPercent: m.avgOccupancyPercent,
      hasEvCharging: m.lot.hasEvCharging
    }));

    res.json(payload);
  } catch (err) {
    next(err);
  }
});

app.get("/api/admin/lots", async (_req, res, next) => {
  try {
    const lots = await prisma.parkingLot.findMany({
      include: {
        _count: {
          select: { spots: true, chargingStations: true, reservations: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(lots);
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/lots", async (req, res, next) => {
  try {
    const { name, address, totalSpots, pricePerHour, hasEvCharging, distanceMeters, timezone } = req.body;

    if (!name || !address || totalSpots === undefined || pricePerHour === undefined) {
      return res.status(400).json({ message: "name, address, totalSpots and pricePerHour are required" });
    }

    const lot = await prisma.parkingLot.create({
      data: {
        name: String(name),
        address: String(address),
        totalSpots: Number(totalSpots),
        pricePerHour: Number(pricePerHour),
        hasEvCharging: Boolean(hasEvCharging),
        distanceMeters: distanceMeters === undefined || distanceMeters === null ? null : Number(distanceMeters),
        timezone: timezone ? String(timezone) : "UTC"
      }
    });

    res.status(201).json(lot);
  } catch (err) {
    next(err);
  }
});

app.patch("/api/admin/lots/:id", async (req, res, next) => {
  try {
    const { name, address, totalSpots, pricePerHour, hasEvCharging, distanceMeters, timezone } = req.body;

    const lot = await prisma.parkingLot.update({
      where: { id: req.params.id },
      data: {
        ...(name === undefined ? {} : { name: String(name) }),
        ...(address === undefined ? {} : { address: String(address) }),
        ...(totalSpots === undefined ? {} : { totalSpots: Number(totalSpots) }),
        ...(pricePerHour === undefined ? {} : { pricePerHour: Number(pricePerHour) }),
        ...(hasEvCharging === undefined ? {} : { hasEvCharging: Boolean(hasEvCharging) }),
        ...(distanceMeters === undefined ? {} : { distanceMeters: distanceMeters === null ? null : Number(distanceMeters) }),
        ...(timezone === undefined ? {} : { timezone: String(timezone) })
      }
    });

    res.json(lot);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/admin/lots/:id", async (req, res, next) => {
  try {
    const lot = await prisma.parkingLot.findUnique({ where: { id: req.params.id } });
    if (!lot) {
      return res.status(404).json({ message: "Lot not found" });
    }

    await deleteLotCascade(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/spots", async (req, res, next) => {
  try {
    const { lotId, label, isAvailable = true, supportsEv = false } = req.body;
    if (!lotId || !label) {
      return res.status(400).json({ message: "lotId and label are required" });
    }

    const spot = await prisma.parkingSpot.create({
      data: {
        lotId: String(lotId),
        label: String(label),
        isAvailable: Boolean(isAvailable),
        supportsEv: Boolean(supportsEv)
      }
    });

    await prisma.parkingLot.update({
      where: { id: String(lotId) },
      data: { totalSpots: { increment: 1 } }
    });

    res.status(201).json(spot);
  } catch (err) {
    next(err);
  }
});

app.patch("/api/admin/spots/:id", async (req, res, next) => {
  try {
    const { label, isAvailable, supportsEv } = req.body;

    const spot = await prisma.parkingSpot.update({
      where: { id: req.params.id },
      data: {
        ...(label === undefined ? {} : { label: String(label) }),
        ...(isAvailable === undefined ? {} : { isAvailable: Boolean(isAvailable) }),
        ...(supportsEv === undefined ? {} : { supportsEv: Boolean(supportsEv) })
      }
    });
    res.json(spot);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/admin/spots/:id", async (req, res, next) => {
  try {
    const spot = await prisma.parkingSpot.findUnique({ where: { id: req.params.id } });
    if (!spot) {
      return res.status(404).json({ message: "Spot not found" });
    }

    await deleteSpotCascade(req.params.id);
    await prisma.parkingLot.update({
      where: { id: spot.lotId },
      data: { totalSpots: { decrement: 1 } }
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/charging-stations", async (req, res, next) => {
  try {
    const { lotId, name, connectorType, maxKw, isAvailable = true } = req.body;
    if (!lotId || !name || !connectorType || maxKw === undefined) {
      return res.status(400).json({ message: "lotId, name, connectorType and maxKw are required" });
    }

    const station = await prisma.chargingStation.create({
      data: {
        lotId: String(lotId),
        name: String(name),
        connectorType: String(connectorType),
        maxKw: Number(maxKw),
        isAvailable: Boolean(isAvailable)
      }
    });

    await prisma.parkingLot.update({ where: { id: String(lotId) }, data: { hasEvCharging: true } });
    res.status(201).json(station);
  } catch (err) {
    next(err);
  }
});

app.patch("/api/admin/charging-stations/:id", async (req, res, next) => {
  try {
    const { name, connectorType, maxKw, isAvailable } = req.body;

    const station = await prisma.chargingStation.update({
      where: { id: req.params.id },
      data: {
        ...(name === undefined ? {} : { name: String(name) }),
        ...(connectorType === undefined ? {} : { connectorType: String(connectorType) }),
        ...(maxKw === undefined ? {} : { maxKw: Number(maxKw) }),
        ...(isAvailable === undefined ? {} : { isAvailable: Boolean(isAvailable) })
      }
    });

    res.json(station);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/admin/charging-stations/:id", async (req, res, next) => {
  try {
    const station = await prisma.chargingStation.findUnique({ where: { id: req.params.id } });
    if (!station) {
      return res.status(404).json({ message: "Charging station not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.chargingSession.deleteMany({ where: { stationId: req.params.id } });
      await tx.chargingStation.delete({ where: { id: req.params.id } });
    });

    const remaining = await prisma.chargingStation.count({ where: { lotId: station.lotId } });
    if (remaining === 0) {
      await prisma.parkingLot.update({ where: { id: station.lotId }, data: { hasEvCharging: false } });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
