-- CHAPTER 3
-- Complex queries based on constraints, sets, subqueries, joins, views, triggers and cursors
-- Minimum 3 questions per topic
-- Database: sparev (MySQL 8+)

USE sparev;

DELIMITER ;

/* ============================================================
   3.1 Adding Constraints and Queries Based on Constraints
   ============================================================ */

-- Question 1:
-- Add a CHECK constraint so reservation status is always valid.
-- SQL Statement:
SET @c1_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'Reservation'
    AND constraint_name = 'chk_reservation_status_c3'
);
SET @c1_sql := IF(
  @c1_exists = 0,
  'ALTER TABLE Reservation ADD CONSTRAINT chk_reservation_status_c3 CHECK (status IN (''reserved'',''completed'',''cancelled''))',
  'SELECT ''chk_reservation_status_c3 already exists'' AS message'
);
PREPARE stmt FROM @c1_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = DATABASE()
  AND table_name = 'Reservation'
  AND constraint_name = 'chk_reservation_status_c3';

-- Output:
-- Shows 1 row with constraint_name = chk_reservation_status_c3 and constraint_type = CHECK.


-- Question 2:
-- Ensure each parking spot label is unique within the same lot.
-- SQL Statement:
SET @c2_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'ParkingSpot'
    AND index_name = 'uq_parkingspot_lot_label_c3'
);
SET @c2_sql := IF(
  @c2_exists = 0,
  'CREATE UNIQUE INDEX uq_parkingspot_lot_label_c3 ON ParkingSpot(lotId, label)',
  'SELECT ''uq_parkingspot_lot_label_c3 already exists'' AS message'
);
PREPARE stmt FROM @c2_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT index_name, non_unique
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name = 'ParkingSpot'
  AND index_name = 'uq_parkingspot_lot_label_c3'
GROUP BY index_name, non_unique;

-- Output:
-- non_unique = 0 confirms a unique index exists on (lotId, label).


-- Question 3:
-- Add a CHECK constraint so transaction amount cannot be negative.
-- SQL Statement:
SET @c3_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'Transaction'
    AND constraint_name = 'chk_transaction_amount_nonnegative_c3'
);
SET @c3_sql := IF(
  @c3_exists = 0,
  'ALTER TABLE `Transaction` ADD CONSTRAINT chk_transaction_amount_nonnegative_c3 CHECK (amountCents >= 0)',
  'SELECT ''chk_transaction_amount_nonnegative_c3 already exists'' AS message'
);
PREPARE stmt FROM @c3_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = DATABASE()
  AND table_name = 'Transaction'
  AND constraint_name = 'chk_transaction_amount_nonnegative_c3';

-- Output:
-- Shows the CHECK constraint row for non-negative transaction amount.


/* ============================================================
   3.2 Queries Based on Aggregate Functions
   ============================================================ */

-- Question 1:
-- Find total revenue and average transaction amount by lot.
-- SQL Statement:
SELECT
  pl.id AS lot_id,
  pl.name AS lot_name,
  COUNT(t.id) AS transaction_count,
  COALESCE(SUM(t.amountCents), 0) AS total_revenue_cents,
  ROUND(COALESCE(AVG(t.amountCents), 0), 2) AS avg_transaction_cents
FROM ParkingLot pl
LEFT JOIN Reservation r ON r.lotId = pl.id
LEFT JOIN `Transaction` t ON t.reservationId = r.id
GROUP BY pl.id, pl.name
ORDER BY total_revenue_cents DESC;

-- Output:
-- One row per lot with transaction_count, total_revenue_cents, and avg_transaction_cents.


-- Question 2:
-- Show lots where average occupancy is above 70% from daily metrics.
-- SQL Statement:
SELECT
  pl.id AS lot_id,
  pl.name AS lot_name,
  ROUND(AVG(ldm.avgOccupancyPercent), 2) AS avg_occupancy_pct,
  COUNT(ldm.id) AS metric_days
FROM ParkingLot pl
JOIN LotDailyMetric ldm ON ldm.lotId = pl.id
GROUP BY pl.id, pl.name
HAVING AVG(ldm.avgOccupancyPercent) > 70
ORDER BY avg_occupancy_pct DESC;

-- Output:
-- Lots with avg_occupancy_pct > 70 and number of metric_days considered.


-- Question 3:
-- Rank connector types by total energy delivered.
-- SQL Statement:
SELECT
  csn.connectorType,
  COUNT(css.id) AS sessions,
  ROUND(COALESCE(SUM(css.energyKwh), 0), 2) AS total_energy_kwh,
  ROUND(COALESCE(AVG(css.energyKwh), 0), 2) AS avg_energy_kwh
FROM ChargingStation csn
LEFT JOIN ChargingSession css ON css.stationId = csn.id
GROUP BY csn.connectorType
ORDER BY total_energy_kwh DESC;

-- Output:
-- Connector-wise session count, total energy, and average energy.


/* ============================================================
   3.3 Complex Queries Based on Sets
   ============================================================ */

-- Question 1:
-- List all user IDs who made either a reservation or a charging session (UNION).
-- SQL Statement:
SELECT userId, 'reservation' AS source
FROM Reservation
UNION
SELECT userId, 'charging_session' AS source
FROM ChargingSession
ORDER BY userId;

-- Output:
-- Distinct set of user IDs from both sources with one representative source value.


-- Question 2:
-- Find users who have reservations but no charging sessions (set difference using NOT EXISTS).
-- SQL Statement:
SELECT DISTINCT r.userId
FROM Reservation r
WHERE NOT EXISTS (
  SELECT 1
  FROM ChargingSession cs
  WHERE cs.userId = r.userId
)
ORDER BY r.userId;

-- Output:
-- User IDs present in Reservation and absent in ChargingSession.


-- Question 3:
-- Find users common to both reservations and charging sessions (set intersection).
-- SQL Statement:
SELECT DISTINCT r.userId
FROM Reservation r
INNER JOIN ChargingSession cs
  ON cs.userId = r.userId
ORDER BY r.userId;

-- Output:
-- User IDs that appear in both tables.


/* ============================================================
   3.4 Complex Queries Based on Subqueries
   ============================================================ */

-- Question 1:
-- Find reservations whose transaction amount is above overall average transaction amount.
-- SQL Statement:
SELECT
  r.id AS reservation_id,
  r.userId,
  t.amountCents
FROM Reservation r
JOIN `Transaction` t ON t.reservationId = r.id
WHERE t.amountCents > (
  SELECT AVG(amountCents)
  FROM `Transaction`
)
ORDER BY t.amountCents DESC;

-- Output:
-- Reservations with high-value transactions compared to global transaction average.


-- Question 2:
-- For each lot, show latest reservation using a correlated subquery.
-- SQL Statement:
SELECT
  pl.id AS lot_id,
  pl.name AS lot_name,
  r.id AS latest_reservation_id,
  r.userId,
  r.startTime
FROM ParkingLot pl
JOIN Reservation r ON r.lotId = pl.id
WHERE r.startTime = (
  SELECT MAX(r2.startTime)
  FROM Reservation r2
  WHERE r2.lotId = pl.id
)
ORDER BY r.startTime DESC;

-- Output:
-- Latest reservation record per parking lot.


-- Question 3:
-- Identify spots that were never reserved.
-- SQL Statement:
SELECT
  ps.id AS spot_id,
  ps.lotId,
  ps.label
FROM ParkingSpot ps
WHERE ps.id NOT IN (
  SELECT DISTINCT r.spotId
  FROM Reservation r
  WHERE r.spotId IS NOT NULL
)
ORDER BY ps.lotId, ps.label;

-- Output:
-- List of parking spots with no reservation history.


/* ============================================================
   3.5 Complex Queries Based on Joins
   ============================================================ */

-- Question 1:
-- Generate a full billing snapshot per reservation (parking + charging + paid).
-- SQL Statement:
SELECT
  r.id AS reservation_id,
  pl.name AS lot_name,
  ps.label AS spot_label,
  r.userId,
  r.status,
  COALESCE(SUM(DISTINCT cs.cost), 0) AS charging_cost_cents,
  COALESCE(SUM(DISTINCT t.amountCents), 0) AS paid_amount_cents
FROM Reservation r
JOIN ParkingLot pl ON pl.id = r.lotId
JOIN ParkingSpot ps ON ps.id = r.spotId
LEFT JOIN ChargingSession cs ON cs.reservationId = r.id
LEFT JOIN `Transaction` t ON t.reservationId = r.id
GROUP BY r.id, pl.name, ps.label, r.userId, r.status
ORDER BY r.startTime DESC;

-- Output:
-- Reservation-wise billing summary with lot and spot details.


-- Question 2:
-- Show EV-capable lots with count of available EV spots and charging stations.
-- SQL Statement:
SELECT
  pl.id AS lot_id,
  pl.name,
  SUM(CASE WHEN ps.supportsEv = TRUE AND ps.isAvailable = TRUE THEN 1 ELSE 0 END) AS available_ev_spots,
  COUNT(DISTINCT csn.id) AS charging_stations
FROM ParkingLot pl
LEFT JOIN ParkingSpot ps ON ps.lotId = pl.id
LEFT JOIN ChargingStation csn ON csn.lotId = pl.id
GROUP BY pl.id, pl.name
HAVING available_ev_spots > 0 OR charging_stations > 0
ORDER BY available_ev_spots DESC, charging_stations DESC;

-- Output:
-- Lots having EV infrastructure with live availability indicators.


-- Question 3:
-- Find reservations that have no successful paid transaction.
-- SQL Statement:
SELECT
  r.id AS reservation_id,
  r.userId,
  r.status,
  pl.name AS lot_name,
  r.startTime
FROM Reservation r
JOIN ParkingLot pl ON pl.id = r.lotId
LEFT JOIN `Transaction` t
  ON t.reservationId = r.id
 AND t.status = 'paid'
WHERE t.id IS NULL
ORDER BY r.startTime DESC;

-- Output:
-- Reservations missing paid transaction records.


/* ============================================================
   3.6 Complex Queries Based on Views
   ============================================================ */

-- Question 1:
-- Create a view for reservation finance summary and query top expensive reservations.
-- SQL Statement:
DROP VIEW IF EXISTS vw_reservation_finance_c3;
CREATE VIEW vw_reservation_finance_c3 AS
SELECT
  r.id AS reservation_id,
  r.userId,
  r.lotId,
  pl.name AS lot_name,
  r.status,
  r.startTime,
  r.endTime,
  COALESCE(SUM(cs.cost), 0) AS charging_cost_cents,
  COALESCE(SUM(t.amountCents), 0) AS total_paid_cents
FROM Reservation r
JOIN ParkingLot pl ON pl.id = r.lotId
LEFT JOIN ChargingSession cs ON cs.reservationId = r.id
LEFT JOIN `Transaction` t ON t.reservationId = r.id
GROUP BY r.id, r.userId, r.lotId, pl.name, r.status, r.startTime, r.endTime;

SELECT reservation_id, userId, lot_name, total_paid_cents
FROM vw_reservation_finance_c3
ORDER BY total_paid_cents DESC
LIMIT 5;

-- Output:
-- Top 5 reservations by total_paid_cents from the view.


-- Question 2:
-- Create a utilization view per lot and list high-utilization lots.
-- SQL Statement:
DROP VIEW IF EXISTS vw_lot_utilization_c3;
CREATE VIEW vw_lot_utilization_c3 AS
SELECT
  pl.id AS lot_id,
  pl.name AS lot_name,
  pl.totalSpots,
  SUM(CASE WHEN ps.isAvailable = FALSE THEN 1 ELSE 0 END) AS occupied_spots,
  ROUND(
    CASE
      WHEN pl.totalSpots = 0 THEN 0
      ELSE (SUM(CASE WHEN ps.isAvailable = FALSE THEN 1 ELSE 0 END) / pl.totalSpots) * 100
    END,
    2
  ) AS occupancy_percent
FROM ParkingLot pl
LEFT JOIN ParkingSpot ps ON ps.lotId = pl.id
GROUP BY pl.id, pl.name, pl.totalSpots;

SELECT lot_id, lot_name, occupancy_percent
FROM vw_lot_utilization_c3
WHERE occupancy_percent >= 60
ORDER BY occupancy_percent DESC;

-- Output:
-- Lots with occupancy_percent >= 60.


-- Question 3:
-- Create an EV activity view and retrieve station performance.
-- SQL Statement:
DROP VIEW IF EXISTS vw_ev_station_activity_c3;
CREATE VIEW vw_ev_station_activity_c3 AS
SELECT
  csn.id AS station_id,
  csn.lotId,
  pl.name AS lot_name,
  csn.name AS station_name,
  csn.connectorType,
  COUNT(css.id) AS total_sessions,
  ROUND(COALESCE(SUM(css.energyKwh), 0), 2) AS total_energy_kwh,
  ROUND(COALESCE(AVG(css.energyKwh), 0), 2) AS avg_energy_kwh
FROM ChargingStation csn
JOIN ParkingLot pl ON pl.id = csn.lotId
LEFT JOIN ChargingSession css ON css.stationId = csn.id
GROUP BY csn.id, csn.lotId, pl.name, csn.name, csn.connectorType;

SELECT *
FROM vw_ev_station_activity_c3
ORDER BY total_energy_kwh DESC, total_sessions DESC;

-- Output:
-- Station-level EV analytics for sessions and energy usage.


/* ============================================================
   3.7 Complex Queries Based on Triggers
   ============================================================ */

-- Question 1:
-- Automatically create reservation event records after new reservation insertion.
-- SQL Statement:
DROP TRIGGER IF EXISTS trg_c3_reservation_after_insert;
DELIMITER $$
CREATE TRIGGER trg_c3_reservation_after_insert
AFTER INSERT ON Reservation
FOR EACH ROW
BEGIN
  INSERT INTO ReservationEvent (id, reservationId, status, recordedAt, note, metadata)
  VALUES (
    UUID(),
    NEW.id,
    NEW.status,
    NOW(),
    'Auto-log: reservation inserted',
    JSON_OBJECT('trigger', 'trg_c3_reservation_after_insert')
  );
END $$
DELIMITER ;

-- Test query:
SELECT id, lotId, spotId, userId, vehiclePlate, startTime, endTime, status
INTO @new_res_id, @new_lot, @new_spot, @new_user, @new_plate, @new_start, @new_end, @new_status
FROM Reservation
ORDER BY startTime DESC
LIMIT 1;

INSERT INTO Reservation (id, lotId, spotId, userId, vehiclePlate, startTime, endTime, status)
VALUES (
  UUID(),
  @new_lot,
  @new_spot,
  CONCAT(@new_user, '_c3'),
  CONCAT(@new_plate, 'X'),
  NOW(),
  NULL,
  'reserved'
);

SELECT reservationId, status, note
FROM ReservationEvent
ORDER BY recordedAt DESC
LIMIT 3;

-- Output:
-- Latest ReservationEvent row includes note: Auto-log: reservation inserted.


-- Question 2:
-- When reservation status changes to completed/cancelled, create an event row.
-- SQL Statement:
DROP TRIGGER IF EXISTS trg_c3_reservation_after_update;
DELIMITER $$
CREATE TRIGGER trg_c3_reservation_after_update
AFTER UPDATE ON Reservation
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO ReservationEvent (id, reservationId, status, recordedAt, note, metadata)
    VALUES (
      UUID(),
      NEW.id,
      NEW.status,
      NOW(),
      'Auto-log: status changed',
      JSON_OBJECT('from', OLD.status, 'to', NEW.status)
    );
  END IF;
END $$
DELIMITER ;

-- Test query:
SELECT id INTO @r_upd
FROM Reservation
WHERE status = 'reserved'
ORDER BY startTime DESC
LIMIT 1;

UPDATE Reservation
SET status = 'completed',
    endTime = COALESCE(endTime, NOW())
WHERE id = @r_upd;

SELECT reservationId, status, note
FROM ReservationEvent
WHERE reservationId = @r_upd
ORDER BY recordedAt DESC
LIMIT 3;

-- Output:
-- Latest event shows status changed to completed with trigger-generated note.


-- Question 3:
-- Prevent negative charging cost using BEFORE INSERT trigger.
-- SQL Statement:
DROP TRIGGER IF EXISTS trg_c3_charging_before_insert;
DELIMITER $$
CREATE TRIGGER trg_c3_charging_before_insert
BEFORE INSERT ON ChargingSession
FOR EACH ROW
BEGIN
  IF NEW.cost IS NOT NULL AND NEW.cost < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Charging cost cannot be negative';
  END IF;
END $$
DELIMITER ;

-- Verification query:
SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
  AND TRIGGER_NAME IN (
    'trg_c3_reservation_after_insert',
    'trg_c3_reservation_after_update',
    'trg_c3_charging_before_insert'
)
ORDER BY TRIGGER_NAME;

-- Output:
-- Shows three trigger definitions in information_schema.


/* ============================================================
   3.8 Complex Queries Based on Cursors
   ============================================================ */

-- Question 1:
-- Use a cursor to create one pending transaction for completed reservations that do not have a transaction.
-- SQL Statement:
DROP PROCEDURE IF EXISTS sp_c3_generate_pending_transactions;
DELIMITER $$
CREATE PROCEDURE sp_c3_generate_pending_transactions()
BEGIN
  DECLARE v_done INT DEFAULT 0;
  DECLARE v_res_id VARCHAR(191);
  DECLARE v_lot_price INT;

  DECLARE cur_res CURSOR FOR
    SELECT r.id, pl.pricePerHour
    FROM Reservation r
    JOIN ParkingLot pl ON pl.id = r.lotId
    LEFT JOIN `Transaction` t ON t.reservationId = r.id
    WHERE r.status = 'completed'
      AND t.id IS NULL;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  OPEN cur_res;
  read_loop: LOOP
    FETCH cur_res INTO v_res_id, v_lot_price;
    IF v_done = 1 THEN
      LEAVE read_loop;
    END IF;

    INSERT INTO `Transaction` (id, reservationId, amountCents, currency, status, createdAt)
    VALUES (
      UUID(),
      v_res_id,
      COALESCE(v_lot_price, 0),
      'INR',
      'pending',
      NOW()
    );
  END LOOP;
  CLOSE cur_res;
END $$
DELIMITER ;

CALL sp_c3_generate_pending_transactions();
SELECT status, COUNT(*) AS txn_count
FROM `Transaction`
GROUP BY status
ORDER BY txn_count DESC;

-- Output:
-- Pending transactions increase for completed reservations previously missing payment rows.


-- Question 2:
-- Use a cursor to close active charging sessions older than a threshold.
-- SQL Statement:
DROP PROCEDURE IF EXISTS sp_c3_close_old_active_charging;
DELIMITER $$
CREATE PROCEDURE sp_c3_close_old_active_charging(IN p_minutes INT)
BEGIN
  DECLARE v_done INT DEFAULT 0;
  DECLARE v_session_id VARCHAR(191);

  DECLARE cur_cs CURSOR FOR
    SELECT id
    FROM ChargingSession
    WHERE status = 'active'
      AND startedAt < DATE_SUB(NOW(), INTERVAL p_minutes MINUTE);

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  OPEN cur_cs;
  loop_cs: LOOP
    FETCH cur_cs INTO v_session_id;
    IF v_done = 1 THEN
      LEAVE loop_cs;
    END IF;

    UPDATE ChargingSession
    SET status = 'completed',
        endedAt = COALESCE(endedAt, NOW())
    WHERE id = v_session_id;
  END LOOP;
  CLOSE cur_cs;
END $$
DELIMITER ;

CALL sp_c3_close_old_active_charging(120);
SELECT status, COUNT(*) AS session_count
FROM ChargingSession
GROUP BY status
ORDER BY session_count DESC;

-- Output:
-- Older active sessions are marked completed; status distribution changes.


-- Question 3:
-- Use a cursor to refresh lot daily metrics table for current date.
-- SQL Statement:
DROP PROCEDURE IF EXISTS sp_c3_refresh_metrics_today;
DELIMITER $$
CREATE PROCEDURE sp_c3_refresh_metrics_today()
BEGIN
  DECLARE v_done INT DEFAULT 0;
  DECLARE v_lot_id VARCHAR(191);
  DECLARE v_today DATE;

  DECLARE cur_lot CURSOR FOR
    SELECT id FROM ParkingLot;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SET v_today = CURDATE();

  OPEN cur_lot;
  lot_loop: LOOP
    FETCH cur_lot INTO v_lot_id;
    IF v_done = 1 THEN
      LEAVE lot_loop;
    END IF;

    INSERT INTO LotDailyMetric (
      id,
      lotId,
      date,
      reservationsCount,
      chargingSessionsCount,
      energyKwh,
      revenueCents,
      avgOccupancyPercent,
      createdAt,
      updatedAt
    )
    VALUES (
      UUID(),
      v_lot_id,
      v_today,
      (
        SELECT COUNT(*)
        FROM Reservation r
        WHERE r.lotId = v_lot_id
          AND DATE(r.startTime) = v_today
      ),
      (
        SELECT COUNT(*)
        FROM ChargingSession cs
        JOIN ChargingStation st ON st.id = cs.stationId
        WHERE st.lotId = v_lot_id
          AND DATE(cs.startedAt) = v_today
      ),
      (
        SELECT COALESCE(SUM(cs.energyKwh), 0)
        FROM ChargingSession cs
        JOIN ChargingStation st ON st.id = cs.stationId
        WHERE st.lotId = v_lot_id
          AND DATE(cs.startedAt) = v_today
      ),
      (
        SELECT COALESCE(SUM(t.amountCents), 0)
        FROM `Transaction` t
        JOIN Reservation r ON r.id = t.reservationId
        WHERE r.lotId = v_lot_id
          AND DATE(r.startTime) = v_today
      ),
      (
        SELECT ROUND(
          CASE
            WHEN pl.totalSpots = 0 THEN 0
            ELSE ((pl.totalSpots - SUM(CASE WHEN ps.isAvailable THEN 1 ELSE 0 END)) / pl.totalSpots) * 100
          END,
          2
        )
        FROM ParkingLot pl
        LEFT JOIN ParkingSpot ps ON ps.lotId = pl.id
        WHERE pl.id = v_lot_id
        GROUP BY pl.totalSpots
      ),
      NOW(),
      NOW()
    )
    ON DUPLICATE KEY UPDATE
      reservationsCount = VALUES(reservationsCount),
      chargingSessionsCount = VALUES(chargingSessionsCount),
      energyKwh = VALUES(energyKwh),
      revenueCents = VALUES(revenueCents),
      avgOccupancyPercent = VALUES(avgOccupancyPercent),
      updatedAt = NOW();

  END LOOP;
  CLOSE cur_lot;
END $$
DELIMITER ;

CALL sp_c3_refresh_metrics_today();
SELECT lotId, date, reservationsCount, chargingSessionsCount, revenueCents, avgOccupancyPercent
FROM LotDailyMetric
WHERE date = CURDATE()
ORDER BY lotId;

-- Output:
-- One metrics row per lot for today with refreshed reservation/charging/revenue/occupancy values.

-- End of Chapter3_complex_queries.sql
