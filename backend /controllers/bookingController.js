const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'db.json');

function readDB() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

exports.guestLogin = (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).send('Invalid email');
  }

  const db = readDB();
  if (!db.guests.find(g => g.email === email)) {
    db.guests.push({ email });
    writeDB(db);
  }

  res.status(200).send('Guest login successful');
};

exports.createBooking = (req, res) => {
  const { name, email, service, date, time } = req.body;
  if (!name || !email || !service || !date || !time) {
    return res.status(400).send('Missing fields');
  }

  const db = readDB();
  const conflict = db.appointments.find(a => a.date === date && a.time === time);
  if (conflict) {
    return res.status(409).send('Time slot already booked');
  }

  db.appointments.push({ name, email, service, date, time });
  writeDB(db);
  res.status(200).send('Appointment confirmed');
};

exports.getAllBookings = (req, res) => {
  const db = readDB();
  res.status(200).json(db.appointments);
};

exports.deleteBooking = (req, res) => {
  const { email, date, time } = req.params;
  const db = readDB();
  db.appointments = db.appointments.filter(
    a => !(a.email === email && a.date === date && a.time === time)
  );
  writeDB(db);
  res.status(200).send('Appointment deleted');
};
