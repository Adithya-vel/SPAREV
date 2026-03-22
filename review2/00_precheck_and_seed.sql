-- Review 2 - Run this first
-- Purpose: precheck schema and seed minimum demo data safely
-- Compatible with MySQL 8 and common SQL modes

USE sparev;

-- ------------------------------------------------------------
-- SECTION A: Environment checks
-- ------------------------------------------------------------

SELECT DATABASE() AS active_database;
SELECT VERSION() AS mysql_version;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
ORDER BY table_name;

SELECT
  (SELECT COUNT(*) FROM ParkingLot) AS lots,
  (SELECT COUNT(*) FROM ParkingSpot) AS spots,
  (SELECT COUNT(*) FROM Reservation) AS reservations,
  (SELECT COUNT(*) FROM `Transaction`) AS transactions,
  (SELECT COUNT(*) FROM ChargingStation) AS charging_stations,
  (SELECT COUNT(*) FROM ChargingSession) AS charging_sessions;

-- ------------------------------------------------------------
-- SECTION B: Seed reservations if empty
-- ------------------------------------------------------------

SET @base_res_count := (SELECT COUNT(*) FROM Reservation);

INSERT INTO Reservation (
  id,
  lotId,
  spotId,
  userId,
  vehiclePlate,
  startTime,
  endTime,
  status
)
SELECT
  UUID(),
  s.lotId,
  s.spotId,
  CONCAT('user_', s.rn),
  CONCAT('TN10AB', LPAD(s.rn, 3, '0')),
  DATE_SUB(NOW(), INTERVAL s.rn HOUR),
  DATE_SUB(NOW(), INTERVAL (s.rn - 1) HOUR),
  CASE WHEN MOD(s.rn, 3) = 0 THEN 'completed' ELSE 'reserved' END
FROM (
  SELECT
    p.id AS spotId,
    p.lotId,
    (@rn := @rn + 1) AS rn
  FROM (SELECT @rn := 0) init
  CROSS JOIN ParkingSpot p
  ORDER BY p.id
  LIMIT 8
) s
WHERE @base_res_count = 0;

-- ------------------------------------------------------------
-- SECTION C: Seed one transaction per reservation if missing
-- ------------------------------------------------------------

INSERT INTO `Transaction` (
  id,
  reservationId,
  amountCents,
  currency,
  status,
  createdAt
)
SELECT
  UUID(),
  r.id,
  500 + MOD(CRC32(r.id), 1000),
  'INR',
  'paid',
  NOW()
FROM Reservation r
LEFT JOIN `Transaction` t
  ON t.reservationId = r.id
WHERE t.id IS NULL;

-- ------------------------------------------------------------
-- SECTION D: Seed charging sessions if none
-- ------------------------------------------------------------

SET @base_cs_count := (SELECT COUNT(*) FROM ChargingSession);

INSERT INTO ChargingSession (
  id,
  stationId,
  reservationId,
  userId,
  startedAt,
  endedAt,
  status,
  energyKwh,
  cost
)
SELECT
  UUID(),
  s.stationId,
  r.reservationId,
  r.userId,
  DATE_SUB(NOW(), INTERVAL (1 + MOD(s.rn, 6)) HOUR),
  DATE_SUB(NOW(), INTERVAL MOD(s.rn, 3) HOUR),
  CASE WHEN MOD(s.rn, 2) = 0 THEN 'completed' ELSE 'active' END,
  ROUND(4 + (MOD(s.rn, 5) * 1.7), 2),
  120 + MOD(s.rn, 6) * 40
FROM (
  SELECT
    c.id AS stationId,
    (@rs := @rs + 1) AS rn
  FROM (SELECT @rs := 0) init
  CROSS JOIN ChargingStation c
  ORDER BY c.id
  LIMIT 8
) s
JOIN (
  SELECT
    rr.id AS reservationId,
    rr.userId,
    (@rrn := @rrn + 1) AS rn
  FROM (SELECT @rrn := 0) init
  CROSS JOIN (
    SELECT id, userId
    FROM Reservation
    ORDER BY startTime DESC
    LIMIT 8
  ) rr
) r
  ON r.rn = s.rn
WHERE @base_cs_count = 0;

-- ------------------------------------------------------------
-- SECTION E: Final sanity counts
-- ------------------------------------------------------------

SELECT
  (SELECT COUNT(*) FROM ParkingLot) AS lots,
  (SELECT COUNT(*) FROM ParkingSpot) AS spots,
  (SELECT COUNT(*) FROM Reservation) AS reservations,
  (SELECT COUNT(*) FROM `Transaction`) AS transactions,
  (SELECT COUNT(*) FROM ChargingStation) AS charging_stations,
  (SELECT COUNT(*) FROM ChargingSession) AS charging_sessions;

-- End of 00_precheck_and_seed.sql