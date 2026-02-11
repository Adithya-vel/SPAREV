import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import prisma from "./prisma";

function startOfDayUtc(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function upsertLotDailyMetric(client: typeof prisma, lotId: string, date: Date, updates: {
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
    const data = await prisma.parkingLot.findMany({
      include: {
        spots: { select: { isAvailable: true } },
        lotDailyMetrics: { orderBy: { date: "desc" }, take: 1 }
      }
    });

    const payload = data.map((lot) => ({
      id: lot.id,
      name: lot.name,
      address: lot.address,
      totalSpots: lot.totalSpots,
      availableSpots: lot.spots.filter((s) => s.isAvailable).length,
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
    const { lotId, spotId, userId = "demo-user", vehiclePlate, startTime } = req.body;
    if (!lotId || !spotId || !vehiclePlate) {
      return res.status(400).json({ message: "lotId, spotId, vehiclePlate are required" });
    }

    const spot = await prisma.parkingSpot.findUnique({ where: { id: spotId } });
    if (!spot || spot.lotId !== lotId) {
      return res.status(400).json({ message: "Spot not found for lot" });
    }
    if (!spot.isAvailable) {
      return res.status(409).json({ message: "Spot is not available" });
    }

    const start = startTime ? new Date(startTime) : new Date();

    const reservation = await prisma.$transaction(async (tx) => {
      const created = await tx.reservation.create({
        data: { lotId, spotId, userId, vehiclePlate, startTime: start, status: "reserved" }
      });

      await tx.parkingSpot.update({ where: { id: spotId }, data: { isAvailable: false } });

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

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
