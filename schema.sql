CREATE TABLE hospitals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  address TEXT
);

CREATE TABLE beds (
  id SERIAL PRIMARY KEY,
  hospital_id INTEGER REFERENCES hospitals(id),
  type VARCHAR(50) NOT NULL, -- General, ICU, Emergency
  total INTEGER NOT NULL,
  occupied INTEGER DEFAULT 0
);

CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  hospital_id INTEGER REFERENCES hospitals(id),
  name VARCHAR(255) NOT NULL,
  shift_start TIME,
  shift_end TIME
);

CREATE TABLE attendance_logs (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER REFERENCES doctors(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  type VARCHAR(10) NOT NULL -- IN or OUT
);

CREATE TABLE admissions (
  id SERIAL PRIMARY KEY,
  patient_name VARCHAR(255),
  abha_id VARCHAR(50),
  bed_id INTEGER REFERENCES beds(id),
  in_time TIMESTAMP DEFAULT NOW(),
  out_time TIMESTAMP
);

CREATE TABLE diagnostics (
  id SERIAL PRIMARY KEY,
  hospital_id INTEGER REFERENCES hospitals(id),
  service_name VARCHAR(255),
  available BOOLEAN DEFAULT true
);

CREATE INDEX idx_beds_hospital ON beds(hospital_id);
CREATE INDEX idx_doctors_hospital ON doctors(hospital_id);
CREATE INDEX idx_diagnostics_hospital ON diagnostics(hospital_id);