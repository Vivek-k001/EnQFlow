import { Request, Response } from 'express';
import { db } from '../database/index';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import os from 'os';

const getLocalIp = () => {
  const nets = os.networkInterfaces();
  let fallbackIp: string | null = null;
  for (const k of Object.keys(nets)) {
    for (const n of nets[k] || []) {
      if (n.family === 'IPv4' && !n.internal && !k.includes('vEthernet') && !k.includes('Virtual') && !k.includes('Switch')) {
        if (k.toLowerCase().includes('wi-fi') || k.toLowerCase().includes('wifi') || k.toLowerCase().includes('wlan')) {
          return n.address;
        }
        if (!fallbackIp) fallbackIp = n.address;
      }
    }
  }
  return fallbackIp || 'localhost';
};

export const getPrimaryOrganization = (req: Request, res: Response) => {
  try {
    const org = db.prepare('SELECT id, name, logo_url, contact_info, operating_hours FROM organizations LIMIT 1').get() as any;
    if (!org) {
      return res.status(404).json({ error: 'No organization found' });
    }
    res.json({ ...org, server_ip: getLocalIp() });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrganizationInfo = (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user.organization_id;
    const org = db.prepare('SELECT id, name, logo_url, contact_info, operating_hours FROM organizations WHERE id = ?').get(orgId) as any;
    res.json({ ...org, server_ip: getLocalIp() });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getServices = (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const services = db.prepare('SELECT * FROM services WHERE organization_id = ? AND is_active = 1').all(organizationId);
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCounters = (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user.organization_id;
    const counters = db.prepare('SELECT * FROM counters WHERE organization_id = ? AND is_active = 1').all(orgId);
    res.json(counters);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
