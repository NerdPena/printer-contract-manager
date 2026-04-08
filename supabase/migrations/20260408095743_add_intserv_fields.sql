ALTER TABLE public.clients 
ADD COLUMN fiscal_code TEXT,
ADD COLUMN trade_registry_number TEXT,
ADD COLUMN furnizor TEXT,
ADD COLUMN contract_number TEXT,
ADD COLUMN contract_date DATE;

ALTER TABLE public.monthly_counters
ADD COLUMN bnr_rate NUMERIC(10,4) DEFAULT 0;
