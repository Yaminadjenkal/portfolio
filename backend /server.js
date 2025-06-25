const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'db.json');

// 💡 Middlewares globaux
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🕵️ Log des requêtes
app.use((req, res, next) => {
  console.log(`🔄 ${req.method} ${req.url}`);
  next();
});

// 📚 Fonctions lecture/écriture
function readDB() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}
function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// 👤 Connexion invité
app.post('/api/guest-login', (req, res) => {
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
});

// 📅 Créer rendez-vous
app.post('/api/book', (req, res) => {
  const { name, email, service, date, time } = req.body;
  if (!name || !email || !service || !date || !time) {
    return res.status(400).send('Missing fields');
  }

  const db = readDB();
  const conflict = db.appointments.find(
    a => a.date === date && a.time === time
  );
  if (conflict) {
    return res.status(409).send('Time slot already booked');
  }

  db.appointments.push({ name, email, service, date, time });
  writeDB(db);
  res.status(200).send('Appointment confirmed');
});

// 📖 Lire rendez-vous
app.get('/api/book', (req, res) => {
  const db = readDB();
  const { date } = req.query;

  if (date) {
    const filtered = db.appointments.filter(r => r.date === date);
    return res.status(200).json(filtered);
  }

  res.status(200).json(db.appointments);
});

// 🔁 Mettre à jour rendez-vous
app.put('/api/book/:email/:date/:time', (req, res) => {
  console.log('🎯 Route PUT appelée');

  const { email, date, time } = req.params;
  const { name, email: bodyEmail, service, newDate, newTime } = req.body;

  if (!name || !bodyEmail || !service || !newDate || !newTime) {
    return res.status(400).send('Missing fields');
  }

  const db = readDB();

  const index = db.appointments.findIndex(
    r => r.email === email && r.date === date && r.time === time
  );

  if (index === -1) {
    return res.status(404).send('Appointment not found');
  }

  const conflict = db.appointments.find(
    r => r.date === newDate && r.time === newTime &&
         !(r.email === email && r.date === date && r.time === time)
  );

  if (conflict) {
    return res.status(409).send('New time slot already booked');
  }

  db.appointments[index] = {
    name,
    email: bodyEmail,
    service,
    date: newDate,
    time: newTime
  };

  writeDB(db);
  res.status(200).send('Appointment updated');
});

// 🗑️ Supprimer rendez-vous
app.delete('/api/book/:email/:date/:time', (req, res) => {
  const { email, date, time } = req.params;
  const db = readDB();

  const initialLength = db.appointments.length;
  db.appointments = db.appointments.filter(
    a => !(a.email === email && a.date === date && a.time === time)
  );

  if (db.appointments.length === initialLength) {
    return res.status(404).send('Appointment not found');
  }

  writeDB(db);
  res.status(200).send('Appointment deleted');
});

// 🔬 Test de route PUT
app.put('/debug', (req, res) => {
  console.log('✅ Route PUT test atteinte');
  res.send('PUT reçue');
});

// 🌍 Servir les fichiers statiques (comme update.html)
app.use(express.static(path.join(__dirname, 'public')));

// 🚀 Lancer le serveur
app.listen(port, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});
