-- Review 2 - Week 6
-- Topic: Functions, Procedures, Triggers, Cursors, Exception Handling
-- DB: MySQL 8+ (Stored Programs)
-- Run review2/00_precheck_and_seed.sql first

-- MySQL CLI note:
-- 1) Execute DELIMITER commands on their own line (do not chain with other SQL).
-- 2) If CLI state is unclear after an interrupted command, run: DELIMITER ;

DELIMITER ;

USE sparev;

-- ------------------------------------------------------------
-- SECTION A: Helper table for exception logging
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS DbmsErrorLog (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  routineName VARCHAR(120) NOT NULL,
  errorCode INT NULL,
  errorMessage VARCHAR(1000) NOT NULL,
  loggedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- SECTION B: Function
-- ------------------------------------------------------------

DROP FUNCTION IF EXISTS fn_calculate_total_bill_cents;
DELIMITER $$
CREATE FUNCTION fn_calculate_total_bill_cents(p_reservation_id VARCHAR(191))
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_parking_cents INT DEFAULT 0;
  DECLARE v_charging_cents INT DEFAULT 0;

  -- Parking cost = billed hours * lot.pricePerHour
  SELECT
    COALESCE(
      CEIL(TIMESTAMPDIFF(MINUTE, r.startTime, COALESCE(r.endTime, NOW())) / 60) * pl.pricePerHour,
      0
    )
  INTO v_parking_cents
  FROM Reservation r
  JOIN ParkingLot pl
    ON pl.id = r.lotId
  WHERE CONVERT(r.id USING utf8mb4) COLLATE utf8mb4_unicode_ci
      = CONVERT(p_reservation_id USING utf8mb4) COLLATE utf8mb4_unicode_ci;

  -- Charging cost from charging sessions linked to this reservation
  SELECT COALESCE(SUM(cs.cost), 0)
  INTO v_charging_cents
  FROM ChargingSession cs
  WHERE CONVERT(cs.reservationId USING utf8mb4) COLLATE utf8mb4_unicode_ci
      = CONVERT(p_reservation_id USING utf8mb4) COLLATE utf8mb4_unicode_ci;

  RETURN COALESCE(v_parking_cents, 0) + COALESCE(v_charging_cents, 0);
END $$
DELIMITER ;

-- Demo usage (pick any existing reservation id)
-- SELECT @reservation_id := id FROM Reservation ORDER BY startTime DESC LIMIT 1;
-- SELECT fn_calculate_total_bill_cents(@reservation_id) AS total_bill_cents;

-- ------------------------------------------------------------
-- SECTION C: Trigger
-- ------------------------------------------------------------

-- C1) Trigger on INSERT: mark spot unavailable and log event
DROP TRIGGER IF EXISTS trg_reservation_after_insert;
DELIMITER $$
CREATE TRIGGER trg_reservation_after_insert
AFTER INSERT ON Reservation
FOR EACH ROW
BEGIN
  UPDATE ParkingSpot
  SET isAvailable = FALSE
  WHERE id = NEW.spotId;

  INSERT INTO ReservationEvent (id, reservationId, status, recordedAt, note, metadata)
  VALUES (
    UUID(),
    NEW.id,
    NEW.status,
    NOW(),
    'Reservation created via trigger',
    JSON_OBJECT('trigger', 'trg_reservation_after_insert')
  );
END $$
DELIMITER ;

-- C2) Trigger on UPDATE: free spot when completed/cancelled
DROP TRIGGER IF EXISTS trg_reservation_after_update;
DELIMITER $$
CREATE TRIGGER trg_reservation_after_update
AFTER UPDATE ON Reservation
FOR EACH ROW
BEGIN
  IF NEW.status IN ('completed', 'cancelled') THEN
    UPDATE ParkingSpot
    SET isAvailable = TRUE
    WHERE id = NEW.spotId;

    INSERT INTO ReservationEvent (id, reservationId, status, recordedAt, note, metadata)
    VALUES (
      UUID(),
      NEW.id,
      NEW.status,
      NOW(),
      'Reservation closed via trigger',
      JSON_OBJECT('trigger', 'trg_reservation_after_update')
    );
  END IF;
END $$
DELIMITER ;

-- ------------------------------------------------------------
-- SECTION D: Procedure with exception handling
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_close_stale_reservations;
DELIMITER $$
CREATE PROCEDURE sp_close_stale_reservations(IN p_cutoff_minutes INT)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    -- Generic SQL exception handler
    INSERT INTO DbmsErrorLog (routineName, errorCode, errorMessage)
    VALUES ('sp_close_stale_reservations', NULL, 'SQL exception occurred while closing stale reservations');
    ROLLBACK;
  END;

  START TRANSACTION;

  IF p_cutoff_minutes <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'p_cutoff_minutes must be > 0';
  END IF;

  UPDATE Reservation
  SET
    status = 'completed',
    endTime = COALESCE(endTime, NOW())
  WHERE status = 'reserved'
    AND startTime < DATE_SUB(NOW(), INTERVAL p_cutoff_minutes MINUTE);

  COMMIT;
END $$
DELIMITER ;

-- Demo call
-- CALL sp_close_stale_reservations(180);

-- ------------------------------------------------------------
-- SECTION E: Cursor-based procedure
-- ------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_refresh_lot_daily_metrics_for_date;
DELIMITER $$
CREATE PROCEDURE sp_refresh_lot_daily_metrics_for_date(IN p_metric_date DATE)
BEGIN
  DECLARE v_done INT DEFAULT 0;
  DECLARE v_lot_id VARCHAR(191);

  DECLARE cur_lots CURSOR FOR
    SELECT id FROM ParkingLot;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    INSERT INTO DbmsErrorLog (routineName, errorCode, errorMessage)
    VALUES ('sp_refresh_lot_daily_metrics_for_date', NULL, 'SQL exception in cursor-based metrics refresh');
    ROLLBACK;
  END;

  START TRANSACTION;

  OPEN cur_lots;

  read_loop: LOOP
    FETCH cur_lots INTO v_lot_id;
    IF v_done = 1 THEN
      LEAVE read_loop;
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
      p_metric_date,
      (
        SELECT COUNT(*)
        FROM Reservation r
        WHERE r.lotId = v_lot_id
          AND DATE(r.startTime) = p_metric_date
      ),
      (
        SELECT COUNT(*)
        FROM ChargingSession cs
        JOIN ChargingStation cst
          ON cst.id = cs.stationId
        WHERE cst.lotId = v_lot_id
          AND DATE(cs.startedAt) = p_metric_date
      ),
      (
        SELECT COALESCE(SUM(cs.energyKwh), 0)
        FROM ChargingSession cs
        JOIN ChargingStation cst
          ON cst.id = cs.stationId
        WHERE cst.lotId = v_lot_id
          AND DATE(cs.startedAt) = p_metric_date
      ),
      (
        SELECT COALESCE(SUM(t.amountCents), 0)
        FROM `Transaction` t
        JOIN Reservation r
          ON r.id = t.reservationId
        WHERE r.lotId = v_lot_id
          AND DATE(r.startTime) = p_metric_date
      ),
      (
        SELECT
          CASE
            WHEN pl.totalSpots = 0 THEN 0
            ELSE ROUND(((pl.totalSpots - SUM(CASE WHEN ps.isAvailable THEN 1 ELSE 0 END)) / pl.totalSpots) * 100, 2)
          END
        FROM ParkingLot pl
        LEFT JOIN ParkingSpot ps
          ON ps.lotId = pl.id
        WHERE pl.id = v_lot_id
        GROUP BY pl.id, pl.totalSpots
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

  CLOSE cur_lots;
  COMMIT;
END $$
DELIMITER ;

-- Demo call
-- CALL sp_refresh_lot_daily_metrics_for_date(CURDATE());
-- SELECT * FROM LotDailyMetric WHERE date = CURDATE();

-- ------------------------------------------------------------
-- SECTION F: Quick verification queries
-- ------------------------------------------------------------

-- F1) Check that triggers are installed
SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
ORDER BY TRIGGER_NAME;

-- F2) Check stored routines
SELECT ROUTINE_NAME, ROUTINE_TYPE
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
ORDER BY ROUTINE_TYPE, ROUTINE_NAME;

-- F3) Check any logged exceptions
SELECT *
FROM DbmsErrorLog
ORDER BY loggedAt DESC;

-- End of Week6_plsql.sql
