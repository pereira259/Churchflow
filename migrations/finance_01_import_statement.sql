-- Migration to add external_id and origin to transactions table for Bank Statement Import feature

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual';

COMMENT ON COLUMN transactions.external_id IS 'ID único da transação bancária (OFX/CSV) para evitar duplicatas';
COMMENT ON COLUMN transactions.origem IS 'Origem do lançamento: manual ou extrato_importado';
