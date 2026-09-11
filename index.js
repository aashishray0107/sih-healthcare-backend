require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.json());
app.use(require('cors')());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/', (req, res) => res.send('SIH Healthcare Backend Running'));

// ADMIT patient
app.post('/admit', async (req, res) => {
  const { patient_name, abha_id, bed_id } = req.body;
  try {
    const bed = await pool.query('SELECT * FROM beds WHERE id=$1', [bed_id]);
    if (bed.rows[0].occupied >= bed.rows[0].total) {
      return res.status(400).json({ error: 'No beds available' });
    }
    await pool.query('UPDATE beds SET occupied = occupied + 1 WHERE id=$1', [bed_id]);
    const admission = await pool.query(
      'INSERT INTO admissions (patient_name, abha_id, bed_id) VALUES ($1,$2,$3) RETURNING *',
      [patient_name, abha_id, bed_id]
    );
    io.emit('bed-update', { bed_id, action: 'admit' });
    res.json(admission.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DISCHARGE patient
app.post('/discharge', async (req, res) => {
  const { admission_id, bed_id } = req.body;
  try {
    await pool.query('UPDATE admissions SET out_time = NOW() WHERE id=$1', [admission_id]);
    await pool.query('UPDATE beds SET occupied = occupied - 1 WHERE id=$1', [bed_id]);
    io.emit('bed-update', { bed_id, action: 'discharge' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ATTENDANCE log
app.post('/attendance', async (req, res) => {
  const { doctor_id, type } = req.body;
  try {
    const log = await pool.query(
      'INSERT INTO attendance_logs (doctor_id, type) VALUES ($1,$2) RETURNING *',
      [doctor_id, type]
    );
    res.json(log.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEARBY hospitals
app.get('/hospitals/nearby', async (req, res) => {
  const { lat, lng } = req.query;
  try {
    const result = await pool.query(`
      SELECT *, 
      ( 6371 * acos( cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat)) ) ) AS distance_km
      FROM hospitals ORDER BY distance_km ASC
    `, [lat, lng]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HOSPITAL status
app.get('/hospital/:id/status', async (req, res) => {
  const { id } = req.params;
  try {
    const beds = await pool.query('SELECT * FROM beds WHERE hospital_id=$1', [id]);
    const doctors = await pool.query('SELECT * FROM doctors WHERE hospital_id=$1', [id]);
    const diagnostics = await pool.query('SELECT * FROM diagnostics WHERE hospital_id=$1', [id]);
    res.json({ beds: beds.rows, doctors: doctors.rows, diagnostics: diagnostics.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));