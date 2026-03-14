const express = require('express');
const { z } = require('zod');
const transferController = require('../controllers/transferController');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

router.post(
  '/',
  authRequired,
  rateLimit({ keyPrefix: 'transfer', windowSeconds: 60, max: 10 }),
  validate(
    z.object({
      body: z.object({
        recipientEmail: z.string().email(),
        amount: z.number().positive()
      })
    })
  ),
  transferController.transfer
);

module.exports = router;
