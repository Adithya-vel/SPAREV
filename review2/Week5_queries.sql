-- Review 2 - Week 5
-- Topic: Complex Queries with Subqueries, Joins, and Views
-- DB: MySQL 8+
-- Run review2/00_precheck_and_seed.sql first

USE sparev;

-- ------------------------------------------------------------
-- SECTION A: Complex Joins
-- ------------------------------------------------------------

-- A1) INNER JOIN: Reservation with lot and spot details
SELECT
  r.id AS reservation_id,
  r.userId,
  r.vehiclePlate,
  r.status,
  r.startTime,
  r.endTime,
  pl.name AS lot_name,
  ps.label AS spot_label
FROM Reservation r
INNER JOIN ParkingLot pl
  ON pl.id = r.lotId
INNER JOIN ParkingSpot ps
  ON ps.id = r.spotId
ORDER BY r.startTime DESC;

-- A2) LEFT JOIN: Lots with reservation count including lots with zero reservations
SELECT
  pl.id,
  pl.name,
  COUNT(r.id) AS reservation_count
FROM ParkingLot pl
LEFT JOIN Reservation r
  ON r.lotId = pl.id
GROUP BY pl.id, pl.name
ORDER BY reservation_count DESC, pl.name;

-- A3) Multi-table join: charging sessions with station and lot context
SELECT
  cs.id AS session_id,
  cs.userId,
  cs.status,
  cs.startedAt,
  cs.endedAt,
  cs.energyKwh,
  cs.cost,
  cst.name AS station_name,
  cst.connectorType,
  pl.name AS lot_name
FROM ChargingSession cs
INNER JOIN ChargingStation cst
  ON cst.id = cs.stationId
INNER JOIN ParkingLot pl
  ON pl.id = cst.lotId
ORDER BY cs.startedAt DESC;

-- ------------------------------------------------------------
-- SECTION B: Subqueries (Nested + Correlated)
-- ------------------------------------------------------------

-- B1) Nested subquery: Lots with reservation count above average lot reservations
SELECT
  x.lot_id,
  x.lot_name,
  x.res_count
FROM (
  SELECT
    pl.id AS lot_id,
    pl.name AS lot_name,
    COUNT(r.id) AS res_count
  FROM ParkingLot pl
  LEFT JOIN Reservation r
    ON r.lotId = pl.id
  GROUP BY pl.id, pl.name
) x
WHERE x.res_count > (
  SELECT AVG(y.res_count)
  FROM (
    SELECT COUNT(r2.id) AS res_count
    FROM ParkingLot pl2
    LEFT JOIN Reservation r2
      ON r2.lotId = pl2.id
    GROUP BY pl2.id
  ) y
)
ORDER BY x.res_count DESC;

-- B2) Correlated subquery: Reservations whose transaction amount is above that lot's average
SELECT
  r.id AS reservation_id,
  r.lotId,
  t.amountCents
FROM Reservation r
JOIN `Transaction` t
  ON t.reservationId = r.id
WHERE t.amountCents > (
  SELECT AVG(t2.amountCents)
  FROM Reservation r2
  JOIN `Transaction` t2
    ON t2.reservationId = r2.id
  WHERE r2.lotId = r.lotId
)
ORDER BY t.amountCents DESC;

-- B3) Subquery with EXISTS: Lots where at least one active charging session exists
SELECT
  pl.id,
  pl.name
FROM ParkingLot pl
WHERE EXISTS (
  SELECT 1
  FROM ChargingStation cst
  JOIN ChargingSession cs
    ON cs.stationId = cst.id
  WHERE cst.lotId = pl.id
    AND cs.status = 'active'
)
ORDER BY pl.name;

-- ------------------------------------------------------------
-- SECTION C: Views
-- ------------------------------------------------------------

-- C1) Admin analytics view (daily lot-level KPIs)
CREATE OR REPLACE VIEW vw_lot_daily_analytics AS
SELECT
  pl.id AS lot_id,
  pl.name AS lot_name,
  d.metric_date,
  COALESCE(ragg.reservations_count, 0) AS reservations_count,
  ROUND(COALESCE(ragg.revenue_cents, 0) / 100.0, 2) AS revenue_inr,
  COALESCE(cagg.charging_sessions_count, 0) AS charging_sessions_count,
  ROUND(COALESCE(cagg.energy_kwh, 0), 2) AS energy_kwh
FROM ParkingLot pl
JOIN (
  SELECT DISTINCT DATE(startTime) AS metric_date
  FROM Reservation
  UNION
  SELECT DISTINCT DATE(startedAt) AS metric_date
  FROM ChargingSession
) d
LEFT JOIN (
  SELECT
    r.lotId,
    DATE(r.startTime) AS metric_date,
    COUNT(*) AS reservations_count,
    COALESCE(SUM(t.amountCents), 0) AS revenue_cents
  FROM Reservation r
  LEFT JOIN `Transaction` t
    ON t.reservationId = r.id
  GROUP BY r.lotId, DATE(r.startTime)
) ragg
  ON ragg.lotId = pl.id
 AND ragg.metric_date = d.metric_date
LEFT JOIN (
  SELECT
    cst.lotId,
    DATE(cs.startedAt) AS metric_date,
    COUNT(*) AS charging_sessions_count,
    COALESCE(SUM(cs.energyKwh), 0) AS energy_kwh
  FROM ChargingStation cst
  JOIN ChargingSession cs
    ON cs.stationId = cst.id
  GROUP BY cst.lotId, DATE(cs.startedAt)
) cagg
  ON cagg.lotId = pl.id
 AND cagg.metric_date = d.metric_date;

-- C2) Availability simplified view for quick UI/API use
CREATE OR REPLACE VIEW vw_lot_availability AS
SELECT
  pl.id AS lot_id,
  pl.name AS lot_name,
  pl.totalSpots,
  SUM(CASE WHEN ps.isAvailable THEN 1 ELSE 0 END) AS currently_available_spots,
  SUM(CASE WHEN ps.supportsEv THEN 1 ELSE 0 END) AS ev_spots,
  pl.hasEvCharging
FROM ParkingLot pl
LEFT JOIN ParkingSpot ps
  ON ps.lotId = pl.id
GROUP BY pl.id, pl.name, pl.totalSpots, pl.hasEvCharging;

-- C3) Read from views
SELECT *
FROM vw_lot_daily_analytics
ORDER BY metric_date DESC, lot_name;

SELECT *
FROM vw_lot_availability
ORDER BY lot_name;

-- End of Week5_queries.sql
