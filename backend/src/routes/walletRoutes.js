const express = require('express');
const walletController = require('../controllers/walletController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, walletController.getWallet);

module.exports = router;
