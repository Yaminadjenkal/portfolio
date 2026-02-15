const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'db.json');

function readDB() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// ----------------------
// GUEST LOGIN
// ----------------------
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

// ----------------------
// CREATE BOOKING (2h + anti-doublon + horaires 10h-18h)
// ----------------------
exports.createBooking = (req, res) => {
  const { name, email, service, date, time } = req.body;

  if (!name || !email || !service || !date || !time) {
    return res.status(400).send('Missing fields');
  }

  const db = readDB();

  // Extraire l'heure directement depuis "time" (ex: "10:00")
  const hour = parseInt(time.split(':')[0], 10);

  // Vérifier horaires d'ouverture (10h–18h)
  if (hour < 10 || hour >= 18) {
    return res
      .status(400)
      .send('Les rendez-vous sont disponibles entre 10h et 18h.');
  }

  // Construire la date complète
  const startTime = new Date(`${date}T${time}:00`);

  // Durée automatique : 2h
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

  // Vérifier si un RDV existe déjà dans cette plage
  const conflict = db.appointments.find(a => {
    const existingStart = new Date(`${a.date}T${a.time}:00`);
    const existingEnd = new Date(
      existingStart.getTime() + 2 * 60 * 60 * 1000
    );

    // Chevauchement de créneaux
    return existingStart < endTime && existingEnd > startTime;
  });

  if (conflict) {
    return res.status(409).send('Ce créneau est déjà réservé.');
  }

  // Enregistrer le RDV
  db.appointments.push({
    name,
    email,
    service,
    date,
    time
  });

  writeDB(db);
  res.status(200).send('Rendez-vous confirmé');
};

// ----------------------
// GET ALL BOOKINGS
// ----------------------
exports.getAllBookings = (req, res) => {
  const db = readDB();
  res.status(200).json(db.appointments);
};

// ----------------------
// DELETE BOOKING
// ----------------------
exports.deleteBooking = (req, res) => {
  const { email, date, time } = req.params;
  const db = readDB();

  db.appointments = db.appointments.filter(
    a => !(a.email === email && a.date === date && a.time === time)
  );

  writeDB(db);
  res.status(200).send('Appointment deleted');
};
