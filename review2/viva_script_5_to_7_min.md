# SPAREV Review 2 Viva Script (5 to 7 Minutes)

## 0) Opening (20 to 30 seconds)
Good morning. Our project is SPAREV, a Smart Parking and EV Charging platform.
For Review 2, I will demonstrate DBMS concepts from Week 4 to Week 6 directly on our MySQL schema and data.

## 1) Week 4 Demo - Constraints, Aggregates, Set Operations (1.5 to 2 minutes)
1. I start by showing constraints from information_schema:
- Primary keys on all core tables.
- Foreign keys like Reservation.lotId -> ParkingLot.id and Reservation.spotId -> ParkingSpot.id.
- Unique constraints and indexes.

2. Next, aggregate functions:
- Reservation count per lot using COUNT + GROUP BY.
- Revenue per lot using SUM of transaction amount.
- Charging energy totals using SUM(energyKwh).
- HAVING clause to filter lots with reservation count above threshold.

3. Then set operations:
- UNION for users from Reservation and ChargingSession.
- Intersection equivalent for users who both reserved and charged.
- Difference equivalent for users who reserved but never charged.

Line to say:
These queries help us convert raw rows into business KPIs for usage, revenue, and user behavior.

## 2) Week 5 Demo - Complex Joins, Subqueries, Views (1.5 to 2 minutes)
1. Complex joins:
- INNER JOIN Reservation + ParkingLot + ParkingSpot for detailed booking report.
- LEFT JOIN to include lots with zero reservations.
- Multi-table join for charging sessions with station and lot context.

2. Subqueries:
- Nested subquery to find lots above average reservation volume.
- Correlated subquery to identify transactions above each lot average.
- EXISTS-based query to find lots with active charging sessions.

3. Views:
- vw_lot_daily_analytics for admin reporting.
- vw_lot_availability for simplified availability output.

Line to say:
Views reduce query complexity for frontend and make reporting reusable and secure.

## 3) Week 6 Demo - Function, Trigger, Procedure, Cursor, Exception Handling (2 to 2.5 minutes)
1. Function:
- fn_calculate_total_bill_cents(reservation_id) returns final bill in cents.

2. Triggers:
- After Reservation insert, mark spot unavailable and log event.
- After Reservation update to completed/cancelled, free spot and log event.

3. Procedure with exception handling:
- sp_close_stale_reservations(cutoff_minutes) closes old reservations.
- Uses transaction and SQL exception handler with logging.

4. Cursor procedure:
- sp_refresh_lot_daily_metrics_for_date(date) loops through each lot and upserts LotDailyMetric.

5. Exception log table:
- DbmsErrorLog captures procedure errors for reliability and debugging.

Line to say:
This part shows procedural SQL, automation, and fault handling integrated with project logic.

## 4) Closing (20 to 30 seconds)
To conclude, our implementation covers all rubric requirements:
- Constraints, aggregate functions, set operations.
- Complex joins, subqueries, views.
- Functions, triggers, cursors, and exception handling.
All demonstrations are mapped to real SPAREV tables and business workflows.

## 5) Likely Viva Questions + Ready Answers
Q1. Why did you create views?
A1. To simplify repeated complex joins, improve readability, and expose only needed columns for reporting.

Q2. Why use trigger for spot availability?
A2. It enforces data consistency automatically whenever reservation state changes.

Q3. Why cursor when set-based SQL exists?
A3. Cursor demonstrates procedural control required by rubric; for many cases set-based operations are faster.

Q4. How do you handle DB errors?
A4. Through SQL exception handlers with rollback and logging to DbmsErrorLog.

Q5. How is this useful to SPAREV?
A5. It supports analytics, operational automation, billing logic, and reliable reservation lifecycle management.

## 6) Demo Order in Lab (Quick Checklist)
1. Run Week4_queries.sql
2. Run Week5_queries.sql
3. Run Week6_plsql.sql
4. Execute demo calls for function and procedures
5. Show trigger effects via insert/update on Reservation
6. Show output from views and DbmsErrorLog
