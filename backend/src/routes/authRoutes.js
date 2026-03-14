const express = require('express');
const { z } = require('zod');
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

router.post(
  '/register',
  rateLimit({ keyPrefix: 'register', windowSeconds: 60, max: 5 }),
  validate(z.object({ body: z.object({ email: z.string().email(), password: z.string().min(8) }) })),
  authController.register
);

router.post(
  '/login',
  rateLimit({ keyPrefix: 'login', windowSeconds: 60, max: 5 }),
  validate(z.object({ body: z.object({ email: z.string().email(), password: z.string().min(8) }) })),
  authController.login
);

router.post(
  '/refresh',
  rateLimit({ keyPrefix: 'refresh', windowSeconds: 60, max: 10 }),
  validate(z.object({ body: z.object({ refreshToken: z.string().optional() }) })),
  authController.refresh
);

router.post(
  '/logout',
  validate(z.object({ body: z.object({ refreshToken: z.string().optional() }) })),
  authController.logout
);

module.exports = router;
