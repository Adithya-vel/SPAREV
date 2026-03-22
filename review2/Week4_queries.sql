-- Review 2 - Week 4
-- Topic: Constraints, Aggregate Functions, Set Operations
-- DB: MySQL 8+
-- Run review2/00_precheck_and_seed.sql first

USE sparev;

-- ------------------------------------------------------------
-- SECTION A: Show constraints in your schema
-- ------------------------------------------------------------

-- A1) Primary Keys
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
 AND tc.table_name = kcu.table_name
WHERE tc.table_schema = DATABASE()
  AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY tc.table_name, kcu.ordinal_position;

-- A2) Foreign Keys
SELECT
  rc.constraint_name,
  rc.table_name,
  kcu.column_name,
  rc.referenced_table_name,
  kcu.referenced_column_name
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu
  ON rc.constraint_schema = kcu.constraint_schema
 AND rc.constraint_name = kcu.constraint_name
WHERE rc.constraint_schema = DATABASE()
ORDER BY rc.table_name, rc.constraint_name;

-- A3) Unique Constraints / Indexes
SELECT
  table_name,
  index_name,
  non_unique,
  GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns_in_index
FROM information_schema.statistics
WHERE table_schema = DATABASE()
GROUP BY table_name, index_name, non_unique
HAVING non_unique = 0
ORDER BY table_name, index_name;

-- ------------------------------------------------------------
-- SECTION B: Aggregate Functions (GROUP BY / HAVING)
-- ------------------------------------------------------------

-- B1) Total reservations per parking lot
SELECT
  pl.id AS lot_id,
  pl.name AS lot_name,
  COUNT(r.id) AS total_reservations
FROM ParkingLot pl
LEFT JOIN Reservation r
  ON r.lotId = pl.id
GROUP BY pl.id, pl.name
ORDER BY total_reservations DESC;

-- B2) Revenue per lot from transactions
SELECT
  pl.id AS lot_id,
  pl.name AS lot_name,
  COALESCE(SUM(t.amountCents), 0) AS revenue_cents,
  ROUND(COALESCE(SUM(t.amountCents), 0) / 100.0, 2) AS revenue_inr
FROM ParkingLot pl
LEFT JOIN Reservation r
  ON r.lotId = pl.id
LEFT JOIN `Transaction` t
  ON t.reservationId = r.id
GROUP BY pl.id, pl.name
ORDER BY revenue_cents DESC;

-- B3) Charging sessions and energy by lot
SELECT
  pl.id AS lot_id,
  pl.name AS lot_name,
  COUNT(cs.id) AS charging_sessions,
  ROUND(COALESCE(SUM(cs.energyKwh), 0), 2) AS total_energy_kwh
FROM ParkingLot pl
LEFT JOIN ChargingStation cst
  ON cst.lotId = pl.id
LEFT JOIN ChargingSession cs
  ON cs.stationId = cst.id
GROUP BY pl.id, pl.name
ORDER BY total_energy_kwh DESC;

-- B4) Lots with more than 3 reservations (HAVING)
SELECT
  pl.id AS lot_id,
  pl.name AS lot_name,
  COUNT(r.id) AS total_reservations
FROM ParkingLot pl
JOIN Reservation r
  ON r.lotId = pl.id
GROUP BY pl.id, pl.name
HAVING COUNT(r.id) > 3
ORDER BY total_reservations DESC;

-- B5) Daily reservation count trend
SELECT
  DATE(r.startTime) AS booking_date,
  COUNT(*) AS reservations_count
FROM Reservation r
GROUP BY DATE(r.startTime)
ORDER BY booking_date DESC;

-- ------------------------------------------------------------
-- SECTION C: Set Operations
-- ------------------------------------------------------------

-- C1) UNION: Users who either reserved a spot OR started charging
SELECT DISTINCT r.userId AS user_id, 'reservation' AS source
FROM Reservation r
UNION
SELECT DISTINCT cs.userId AS user_id, 'charging' AS source
FROM ChargingSession cs
ORDER BY user_id, source;

-- C2) INTERSECTION equivalent (portable): Users present in both Reservation and ChargingSession
SELECT DISTINCT r.userId AS user_in_both
FROM Reservation r
INNER JOIN ChargingSession cs
  ON cs.userId = r.userId
ORDER BY user_in_both;

-- C3) EXCEPT/MINUS equivalent (portable): Users who reserved but never charged
SELECT DISTINCT r.userId AS reserved_not_charged
FROM Reservation r
WHERE NOT EXISTS (
  SELECT 1
  FROM ChargingSession cs
  WHERE cs.userId = r.userId
)
ORDER BY reserved_not_charged;

-- C4) Lots having EV support either by lot flag OR EV-enabled spot
SELECT pl.id, pl.name, 'lot_flag' AS source
FROM ParkingLot pl
WHERE pl.hasEvCharging = TRUE
UNION
SELECT pl.id, pl.name, 'spot_flag' AS source
FROM ParkingLot pl
JOIN ParkingSpot ps
  ON ps.lotId = pl.id
WHERE ps.supportsEv = TRUE
ORDER BY name, source;

-- End of Week4_queries.sql
