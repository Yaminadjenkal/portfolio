require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000;

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => {
    console.error('❌ Erreur MongoDB', err.message);
    process.exit(1);
  });

// Schémas Mongoose
const Guest = mongoose.model('Guest', new mongoose.Schema({ email: { type: String, required: true, unique: true } }));
const Appointment = mongoose.model('Appointment', new mongoose.Schema({
  name: String, email: String, service: String, date: String, time: String
}));
const Review = mongoose.model('Review', new mongoose.Schema({
  name: String, comment: String, note: Number, date: { type: Date, default: Date.now }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`🔄 ${req.method} ${req.url}`);
  next();
});

// 🔐 Guest login
app.post('/api/guest-login', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).send('Invalid email');

  await Guest.updateOne({ email }, {}, { upsert: true });
  res.send('Guest login successful');
});

// 📅 Créer rdv + ✉️ confirmation
app.post('/api/book', async (req, res) => {
  const { name, email, service, date, time } = req.body;
  if (!name || !email || !service || !date || !time) return res.status(400).send('Champs manquants');

  const conflict = await Appointment.findOne({ date, time });
  if (conflict) return res.status(409).send('Créneau déjà réservé');

  await Appointment.create({ name, email, service, date, time });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const message = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🎀 Confirmation de réservation – Beauty Studio',
    text: `Bonjour ${name},\n\nMerci pour votre réservation pour un ${service} le ${date} à ${time}.\n\nÀ bientôt,\nBeauty Studio`
  };

  try {
    await transporter.sendMail(message);
    console.log('📤 Email envoyé à', email);
  } catch (e) {
    console.error('❌ Erreur envoi mail', e);
  }

  res.send('Rendez-vous confirmé et email envoyé');
});

// 📖 Lire les rdvs (tous ou par date)
app.get('/api/book', async (req, res) => {
  const { date } = req.query;
  const rdvs = date
    ? await Appointment.find({ date })
    : await Appointment.find();
  res.json(rdvs);
});

// 🔁 Modifier un rdv
app.put('/api/book/:email/:date/:time', async (req, res) => {
  const { email, date, time } = req.params;
  const { name, email: newEmail, service, newDate, newTime } = req.body;

  const rdv = await Appointment.findOne({ email, date, time });
  if (!rdv) return res.status(404).send('Rendez-vous introuvable');

  const conflict = await Appointment.findOne({
    date: newDate,
    time: newTime,
    _id: { $ne: rdv._id }
  });
  if (conflict) return res.status(409).send('Nouveau créneau déjà pris');

  Object.assign(rdv, {
    name, email: newEmail, service, date: newDate, time: newTime
  });
  await rdv.save();
  res.send('Rendez-vous modifié');
});

// 🗑️ Supprimer rdv
app.delete('/api/book/:email/:date/:time', async (req, res) => {
  const { email, date, time } = req.params;
  const result = await Appointment.deleteOne({ email, date, time });
  result.deletedCount
    ? res.send('Rendez-vous supprimé')
    : res.status(404).send('Non trouvé');
});

// 📊 Rdvs admin
app.get('/api/admin/bookings', async (req, res) => {
  const all = await Appointment.find();
  res.json(all);
});

// ✍️ Enregistrer un avis
app.post('/api/reviews', async (req, res) => {
  const { name, comment, note } = req.body;
  if (!name || !comment || !note) return res.status(400).send("Champs manquants");

  await Review.create({ name, comment, note });
  res.send("Merci pour votre avis 💖");
});

// 📥 Lire les avis
app.get('/api/reviews', async (req, res) => {
  const reviews = await Review.find().sort({ date: -1 });
  res.json(reviews);
});

// 🌍 Fichiers statiques + accueil
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin/dashboard', (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// 🚀 Lancement
app.listen(port, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});
