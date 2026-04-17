-- Enables gen_random_uuid() for UUID primary keys.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enables the lo_manage trigger function for automatic
-- pg_largeobject cleanup when OID-bearing rows are deleted.
CREATE EXTENSION IF NOT EXISTS lo;
