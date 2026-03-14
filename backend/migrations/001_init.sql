CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'USER',
  status text NOT NULL DEFAULT 'ACTIVE',
  mfa_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_wallet_id uuid NOT NULL REFERENCES wallets(id),
  receiver_wallet_id uuid NOT NULL REFERENCES wallets(id),
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'COMPLETED',
  fraud_flag boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_sender_created ON transactions (sender_wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_created ON transactions (receiver_wallet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id),
  transaction_id uuid NOT NULL REFERENCES transactions(id),
  amount numeric(18,2) NOT NULL,
  entry_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  rule text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION transfer_funds(
  p_sender_user_id uuid,
  p_receiver_email text,
  p_amount numeric,
  p_status text,
  p_fraud_flag boolean
) RETURNS TABLE (
  id uuid,
  status text,
  fraud_flag boolean,
  created_at timestamptz
) LANGUAGE plpgsql AS $$
DECLARE
  sender_wallet wallets%ROWTYPE;
  receiver_wallet wallets%ROWTYPE;
BEGIN
  SELECT w.* INTO sender_wallet
  FROM wallets w
  WHERE w.user_id = p_sender_user_id
  FOR UPDATE;
  IF sender_wallet.id IS NULL THEN
    RAISE EXCEPTION 'sender_wallet_not_found';
  END IF;

  SELECT w.* INTO receiver_wallet
  FROM wallets w
  JOIN users u ON u.id = w.user_id
  WHERE u.email = p_receiver_email
  FOR UPDATE;
  IF receiver_wallet.id IS NULL THEN
    RAISE EXCEPTION 'receiver_wallet_not_found';
  END IF;

  IF sender_wallet.status <> 'ACTIVE' OR receiver_wallet.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'wallet_inactive';
  END IF;

  IF sender_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount, status, fraud_flag)
  VALUES (sender_wallet.id, receiver_wallet.id, p_amount, p_status, p_fraud_flag)
  RETURNING transactions.id, transactions.status, transactions.fraud_flag, transactions.created_at
  INTO id, status, fraud_flag, created_at;

  IF p_status = 'COMPLETED' THEN
    UPDATE wallets SET balance = balance - p_amount WHERE id = sender_wallet.id;
    UPDATE wallets SET balance = balance + p_amount WHERE id = receiver_wallet.id;

    INSERT INTO ledger_entries (wallet_id, transaction_id, amount, entry_type)
    VALUES (sender_wallet.id, id, -p_amount, 'DEBIT');

    INSERT INTO ledger_entries (wallet_id, transaction_id, amount, entry_type)
    VALUES (receiver_wallet.id, id, p_amount, 'CREDIT');
  END IF;

  RETURN NEXT;
END;
$$;
