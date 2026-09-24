const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const { checkActiveMember } = require('../middleware/checkActiveMember');

router.get('/', classController.getUpcomingClasses);
router.get('/:id', classController.getClassById);
router.post('/', classController.createClass);
router.post('/:id/book', ensureAuthenticated, checkActiveMember, classController.bookClass);
router.delete('/:id/cancel', ensureAuthenticated, classController.cancelBooking);

module.exports = router;
