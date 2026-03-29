-- Populate dimension tables from operational layer
INSERT INTO dim_driver (driver_id, name, license_number, phone, hire_date, status)
SELECT driver_id, name, license_number, phone, hire_date, status
FROM driver
ON CONFLICT (driver_id) DO UPDATE
SET name = EXCLUDED.name,
    license_number = EXCLUDED.license_number,
    phone = EXCLUDED.phone,
    hire_date = EXCLUDED.hire_date,
    status = EXCLUDED.status;

INSERT INTO dim_car (car_id, license_plate, model, make, year, seats, transmission, fuel_type, status)
SELECT car_id, license_plate, model, make, year, seats, transmission, fuel_type, status
FROM car
ON CONFLICT (car_id) DO UPDATE
SET license_plate = EXCLUDED.license_plate,
    model = EXCLUDED.model,
    make = EXCLUDED.make,
    year = EXCLUDED.year,
    seats = EXCLUDED.seats,
    transmission = EXCLUDED.transmission,
    fuel_type = EXCLUDED.fuel_type,
    status = EXCLUDED.status;

INSERT INTO dim_customer (customer_id, name, email, phone, address, driver_license, registration_date)
SELECT customer_id, name, email, phone, address, driver_license, registration_date
FROM customer
ON CONFLICT (customer_id) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    driver_license = EXCLUDED.driver_license,
    registration_date = EXCLUDED.registration_date;

INSERT INTO dim_location (location_id, name, address, city, postal_code, type)
SELECT location_id, name, address, city, postal_code, type
FROM location
ON CONFLICT (location_id) DO UPDATE
SET name = EXCLUDED.name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    postal_code = EXCLUDED.postal_code,
    type = EXCLUDED.type;

INSERT INTO dim_booking_status (status_id, status_name)
VALUES
  (1, 'reserved'),
  (2, 'confirmed'),
  (3, 'completed'),
  (4, 'cancelled')
ON CONFLICT (status_id) DO UPDATE SET status_name = EXCLUDED.status_name;

-- Time and date dimensions from trip data
INSERT INTO dim_date (date_id, full_date, year, quarter, month, day, weekday, is_weekend)
SELECT DISTINCT
  to_char(start_time::date, 'YYYYMMDD')::INT AS date_id,
  start_time::date AS full_date,
  EXTRACT(YEAR FROM start_time)::INT,
  EXTRACT(QUARTER FROM start_time)::INT,
  EXTRACT(MONTH FROM start_time)::INT,
  EXTRACT(DAY FROM start_time)::INT,
  EXTRACT(DOW FROM start_time)::INT,
  EXTRACT(DOW FROM start_time) IN (0, 6)
FROM trip
ON CONFLICT (date_id) DO NOTHING;

INSERT INTO dim_time (time_id, hour, minute, time_of_day)
SELECT DISTINCT
  (EXTRACT(HOUR FROM start_time)::INT * 100 + EXTRACT(MINUTE FROM start_time)::INT) AS time_id,
  EXTRACT(HOUR FROM start_time)::INT,
  EXTRACT(MINUTE FROM start_time)::INT,
  CASE
    WHEN EXTRACT(HOUR FROM start_time) < 12 THEN 'morning'
    WHEN EXTRACT(HOUR FROM start_time) < 18 THEN 'afternoon'
    ELSE 'evening'
  END
FROM trip
ON CONFLICT (time_id) DO NOTHING;

INSERT INTO dim_time (time_id, hour, minute, time_of_day)
SELECT DISTINCT
  (EXTRACT(HOUR FROM end_time)::INT * 100 + EXTRACT(MINUTE FROM end_time)::INT) AS time_id,
  EXTRACT(HOUR FROM end_time)::INT,
  EXTRACT(MINUTE FROM end_time)::INT,
  CASE
    WHEN EXTRACT(HOUR FROM end_time) < 12 THEN 'morning'
    WHEN EXTRACT(HOUR FROM end_time) < 18 THEN 'afternoon'
    ELSE 'evening'
  END
FROM trip
ON CONFLICT (time_id) DO NOTHING;

-- Rebuild fact table snapshot from operational trips
TRUNCATE TABLE fact_trip;

INSERT INTO fact_trip (
  trip_id,
  date_id,
  time_id_start,
  time_id_end,
  driver_id,
  car_id,
  customer_id,
  pickup_location_id,
  dropoff_location_id,
  status_id,
  duration_minutes,
  distance_km,
  fare_amount,
  discount_amount,
  total_amount
)
SELECT
  t.trip_id,
  to_char(t.start_time::date, 'YYYYMMDD')::INT,
  (EXTRACT(HOUR FROM t.start_time)::INT * 100 + EXTRACT(MINUTE FROM t.start_time)::INT),
  (EXTRACT(HOUR FROM t.end_time)::INT * 100 + EXTRACT(MINUTE FROM t.end_time)::INT),
  t.driver_id,
  t.car_id,
  t.customer_id,
  t.pickup_location_id,
  t.dropoff_location_id,
  CASE t.status
    WHEN 'reserved' THEN 1
    WHEN 'confirmed' THEN 2
    WHEN 'completed' THEN 3
    ELSE 4
  END,
  t.duration_minutes,
  t.distance_km,
  t.fare_amount,
  t.discount_amount,
  t.total_amount
FROM trip t;
