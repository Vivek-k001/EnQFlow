import { db, initDb } from './index';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const generateId = () => crypto.randomUUID();

export async function seedDb() {
  initDb();
  
  // Check if organization already exists
  const orgCount = db.prepare('SELECT count(*) as count FROM organizations').get() as { count: number };
  if (orgCount.count > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  console.log('Seeding database with initial data...');

  const orgId = generateId();
  db.prepare(`
    INSERT INTO organizations (id, name, contact_info, operating_hours) 
    VALUES (?, ?, ?, ?)
  `).run(orgId, 'ABC Health Center', 'contact@abchealth.com', 'Mon-Fri 09:00 - 17:00');

  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const receptionistPasswordHash = await bcrypt.hash('recept123', 10);

  db.prepare(`
    INSERT INTO users (id, organization_id, name, email, password_hash, role) 
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(generateId(), orgId, 'Admin User', 'admin@abchealth.com', adminPasswordHash, 'ADMIN');

  db.prepare(`
    INSERT INTO users (id, organization_id, name, email, password_hash, role) 
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(generateId(), orgId, 'Receptionist One', 'receptionist@abchealth.com', receptionistPasswordHash, 'RECEPTIONIST');

  const services = [
    { name: 'General Consultation', prefix: 'G', time: 12 },
    { name: 'Laboratory', prefix: 'L', time: 7 },
    { name: 'Billing', prefix: 'B', time: 4 },
    { name: 'Pharmacy', prefix: 'P', time: 5 },
  ];

  const insertService = db.prepare(`
    INSERT INTO services (id, organization_id, name, prefix, average_service_time_minutes) 
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const s of services) {
    insertService.run(generateId(), orgId, s.name, s.prefix, s.time);
  }

  const counters = ['Counter 1', 'Counter 2', 'Counter 3'];
  const insertCounter = db.prepare(`
    INSERT INTO counters (id, organization_id, name) 
    VALUES (?, ?, ?)
  `);

  for (const c of counters) {
    insertCounter.run(generateId(), orgId, c);
  }

  console.log('Database seeded successfully.');
}

if (require.main === module) {
  seedDb().catch(console.error);
}
