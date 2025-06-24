const express = require('express');
const router = express.Router();
const {
  guestLogin,
  createBooking,
  getAllBookings,
  deleteBooking
} = require('../controllers/bookingController');

router.post('/guest-login', guestLogin);
router.post('/book', createBooking);
router.get('/book', getAllBookings);
router.delete('/book/:email/:date/:time', deleteBooking);

module.exports = router;
