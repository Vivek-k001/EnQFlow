export const schema = `
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  contact_info TEXT,
  operating_hours TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('RECEPTIONIST')),
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  average_service_time_minutes INTEGER DEFAULT 10,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS counters (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS queue_requests (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  service_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'DECLINED')),
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS queue_tickets (
  id TEXT PRIMARY KEY,
  request_id TEXT UNIQUE NOT NULL,
  organization_id TEXT,
  service_id TEXT,
  ticket_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'SKIPPED', 'NO_SHOW')),
  called_to_counter_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  called_at DATETIME,
  served_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (request_id) REFERENCES queue_requests(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (service_id) REFERENCES services(id),
  FOREIGN KEY (called_to_counter_id) REFERENCES counters(id)
);

CREATE TABLE IF NOT EXISTS queue_events (
  id TEXT PRIMARY KEY,
  ticket_id TEXT,
  action TEXT NOT NULL,
  performed_by_user_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES queue_tickets(id),
  FOREIGN KEY (performed_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;
