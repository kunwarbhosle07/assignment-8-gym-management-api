const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');

router.patch('/:id/renew', memberController.renewMembership);
router.get('/expired', memberController.getExpiredMemberships);

module.exports = router;
