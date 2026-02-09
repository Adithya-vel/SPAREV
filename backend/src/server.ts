import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import prisma from "./prisma";

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
      include: { spots: { select: { isAvailable: true } } }
    });

    const payload = data.map((lot) => ({
      id: lot.id,
      name: lot.name,
      address: lot.address,
      totalSpots: lot.totalSpots,
      availableSpots: lot.spots.filter((s) => s.isAvailable).length,
      pricePerHour: lot.pricePerHour,
      hasEvCharging: lot.hasEvCharging,
      distanceMeters: lot.distanceMeters
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
    const { lotId, spotId, userId = "demo-user", vehiclePlate } = req.body;
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

    const reservation = await prisma.$transaction(async (tx) => {
      const created = await tx.reservation.create({
        data: { lotId, spotId, userId, vehiclePlate }
      });
      await tx.parkingSpot.update({ where: { id: spotId }, data: { isAvailable: false } });
      return created;
    });

    res.status(201).json(reservation);
  } catch (err) {
    next(err);
  }
});

app.get("/api/reservations/:id", async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
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
    const { stationId, reservationId, userId = "demo-user" } = req.body;
    if (!stationId) {
      return res.status(400).json({ message: "stationId is required" });
    }

    const station = await prisma.chargingStation.findUnique({ where: { id: stationId } });
    if (!station) {
      return res.status(404).json({ message: "Charging station not found" });
    }

    const session = await prisma.chargingSession.create({
      data: { stationId, reservationId, userId }
    });
    res.status(201).json(session);
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
