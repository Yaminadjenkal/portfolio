const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
const dbPath = path.join(__dirname, 'db.json');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Lire le fichier JSON
function readDB() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

// Écrire dans le fichier JSON
function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Route pour créer ou reconnaître un invité
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

// Créer un nouveau rendez-vous
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

// Lire les rendez-vous (filtrés par date si besoin)
app.get('/api/book', (req, res) => {
  const db = readDB();
  const { date } = req.query;

  if (date) {
    const filtered = db.appointments.filter(r => r.date === date);
    return res.status(200).json(filtered);
  }

  res.status(200).json(db.appointments);
});

// Supprimer un rendez-vous
app.delete('/api/book/:email/:date/:time', (req, res) => {
  const { email, date, time } = req.params;
  const db = readDB();
  db.appointments = db.appointments.filter(
    a => !(a.email === email && a.date === date && a.time === time)
  );
  writeDB(db);
  res.status(200).send('Appointment deleted');
});

// Lancer le serveur
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
