-- Operational tables
CREATE TABLE IF NOT EXISTS driver (
  driver_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  phone TEXT,
  hire_date DATE,
  status TEXT NOT NULL CHECK (status IN ('active','inactive'))
);

CREATE TABLE IF NOT EXISTS car (
  car_id BIGSERIAL PRIMARY KEY,
  license_plate TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  make TEXT NOT NULL,
  year INT,
  seats INT,
  transmission TEXT,
  fuel_type TEXT,
  car_class TEXT,
  status TEXT NOT NULL CHECK (status IN ('available','rented','maintenance'))
);

CREATE TABLE IF NOT EXISTS customer (
  customer_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  driver_license TEXT,
  registration_date DATE
);

CREATE TABLE IF NOT EXISTS location (
  location_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  type TEXT CHECK (type IN ('pickup','dropoff','both'))
);

CREATE TABLE IF NOT EXISTS booking (
  booking_id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customer(customer_id),
  pickup_location_id BIGINT NOT NULL REFERENCES location(location_id),
  dropoff_location_id BIGINT NOT NULL REFERENCES location(location_id),
  requested_start TIMESTAMP NOT NULL,
  requested_end TIMESTAMP NOT NULL,
  car_class TEXT,
  status TEXT NOT NULL CHECK (status IN ('reserved','confirmed','completed','cancelled')),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip (
  trip_id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT UNIQUE REFERENCES booking(booking_id),
  driver_id BIGINT NOT NULL REFERENCES driver(driver_id),
  car_id BIGINT NOT NULL REFERENCES car(car_id),
  customer_id BIGINT NOT NULL REFERENCES customer(customer_id),
  pickup_location_id BIGINT NOT NULL REFERENCES location(location_id),
  dropoff_location_id BIGINT NOT NULL REFERENCES location(location_id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved','confirmed','completed','cancelled')),
  duration_minutes INT NOT NULL,
  distance_km NUMERIC(10,2),
  fare_amount NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS driver_availability (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES driver(driver_id),
  shift_start TIMESTAMP NOT NULL,
  shift_end TIMESTAMP NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS maintenance_log (
  id BIGSERIAL PRIMARY KEY,
  car_id BIGINT NOT NULL REFERENCES car(car_id),
  service_date TIMESTAMP NOT NULL,
  details TEXT NOT NULL,
  cost NUMERIC(12,2)
);

CREATE TABLE IF NOT EXISTS payment (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trip(trip_id),
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Star schema dimensions and fact
CREATE TABLE IF NOT EXISTS dim_driver (
  driver_id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  phone TEXT,
  hire_date DATE,
  status TEXT NOT NULL CHECK (status IN ('active','inactive'))
);

CREATE TABLE IF NOT EXISTS dim_car (
  car_id BIGINT PRIMARY KEY,
  license_plate TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  make TEXT NOT NULL,
  year INT,
  seats INT,
  transmission TEXT,
  fuel_type TEXT,
  status TEXT NOT NULL CHECK (status IN ('available','rented','maintenance'))
);

CREATE TABLE IF NOT EXISTS dim_customer (
  customer_id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  driver_license TEXT,
  registration_date DATE
);

CREATE TABLE IF NOT EXISTS dim_location (
  location_id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  type TEXT CHECK (type IN ('pickup','dropoff','both'))
);

CREATE TABLE IF NOT EXISTS dim_date (
  date_id INT PRIMARY KEY,
  full_date DATE UNIQUE NOT NULL,
  year INT NOT NULL,
  quarter INT NOT NULL,
  month INT NOT NULL,
  day INT NOT NULL,
  weekday INT NOT NULL,
  is_weekend BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_time (
  time_id INT PRIMARY KEY,
  hour INT NOT NULL,
  minute INT NOT NULL,
  time_of_day TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_booking_status (
  status_id INT PRIMARY KEY,
  status_name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS fact_trip (
  trip_id BIGSERIAL PRIMARY KEY,
  date_id INT NOT NULL REFERENCES dim_date(date_id),
  time_id_start INT NOT NULL REFERENCES dim_time(time_id),
  time_id_end INT NOT NULL REFERENCES dim_time(time_id),
  driver_id BIGINT NOT NULL REFERENCES dim_driver(driver_id),
  car_id BIGINT NOT NULL REFERENCES dim_car(car_id),
  customer_id BIGINT NOT NULL REFERENCES dim_customer(customer_id),
  pickup_location_id BIGINT NOT NULL REFERENCES dim_location(location_id),
  dropoff_location_id BIGINT NOT NULL REFERENCES dim_location(location_id),
  status_id INT NOT NULL REFERENCES dim_booking_status(status_id),
  duration_minutes INT NOT NULL,
  distance_km NUMERIC(10,2),
  fare_amount NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL
);

-- Core indexes for overlap and analytics scans
CREATE INDEX IF NOT EXISTS idx_trip_driver_time ON trip(driver_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_trip_car_time ON trip(car_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_fact_trip_date ON fact_trip(date_id);
CREATE INDEX IF NOT EXISTS idx_fact_trip_driver ON fact_trip(driver_id);
CREATE INDEX IF NOT EXISTS idx_fact_trip_car ON fact_trip(car_id);
