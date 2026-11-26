CREATE TABLE IF NOT EXISTS areas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE CHECK (btrim(name) <> '')
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE CHECK (btrim(code) <> ''),
  seats integer NOT NULL CHECK (seats > 0),
  area_id integer NOT NULL REFERENCES areas(id),
  state text NOT NULL DEFAULT 'AVAILABLE'
    CHECK (state IN ('AVAILABLE', 'OCCUPIED', 'NEEDS_CLEANING', 'UNAVAILABLE')),
  configuration_state text NOT NULL DEFAULT 'ENABLED'
    CHECK (configuration_state IN ('ENABLED', 'DISABLED'))
);

CREATE TABLE IF NOT EXISTS service_sessions (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE CHECK (btrim(code) <> ''),
  business_date date NOT NULL,
  state text NOT NULL CHECK (state IN ('ACTIVE', 'CLOSED')),
  open_time timestamptz NOT NULL,
  close_time timestamptz,
  CHECK ((state = 'ACTIVE' AND close_time IS NULL)
    OR (state = 'CLOSED' AND close_time IS NOT NULL AND close_time >= open_time))
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_service_session
  ON service_sessions (state) WHERE state = 'ACTIVE';

CREATE TABLE IF NOT EXISTS dining_sessions (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE CHECK (btrim(code) <> ''),
  service_session_id integer NOT NULL REFERENCES service_sessions(id),
  party_size integer NOT NULL CHECK (party_size > 0),
  arrival_time timestamptz NOT NULL,
  leaving_time timestamptz,
  state text NOT NULL CHECK (state IN ('ACTIVE', 'CLOSED')),
  CHECK ((state = 'ACTIVE' AND leaving_time IS NULL)
    OR (state = 'CLOSED' AND leaving_time IS NOT NULL AND leaving_time >= arrival_time))
);

CREATE TABLE IF NOT EXISTS dining_session_tables (
  dining_session_id integer NOT NULL REFERENCES dining_sessions(id),
  table_id integer NOT NULL REFERENCES restaurant_tables(id),
  PRIMARY KEY (dining_session_id, table_id)
);

CREATE INDEX IF NOT EXISTS dining_session_tables_by_table ON dining_session_tables (table_id);
