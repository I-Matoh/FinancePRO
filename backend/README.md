# SecurePay Backend (Supabase)

## Overview
Node.js API for authentication, wallets, transfers, transactions, admin, and audit logging.
Supabase is used as the database and RPC host for atomic transfers.

## Required Supabase Setup
Run `backend/migrations/001_init.sql` in the Supabase SQL editor.
This creates tables and the `transfer_funds` function used for atomic balance updates.

## Environment
Copy `.env.example` to `.env` and set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

## Run
```powershell
npm install
npm run dev
```
