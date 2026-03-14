const express = require('express');
const { z } = require('zod');
const transactionController = require('../controllers/transactionController');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.get(
  '/',
  authRequired,
  validate(
    z.object({
      query: z.object({
        page: z.string().optional(),
        pageSize: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional()
      })
    })
  ),
  transactionController.list
);

module.exports = router;
