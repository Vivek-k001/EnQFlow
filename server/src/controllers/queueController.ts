import { Request, Response } from 'express';
import { db } from '../database/index';
import crypto from 'crypto';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { io } from '../index';

const createRequestSchema = z.object({
  service_id: z.string(),
  customer_name: z.string().min(1).regex(/^[A-Za-z\s]+$/, 'Name can only contain letters and spaces'),
  customer_phone: z.string().regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits').optional().or(z.literal('')),
});

export const createQueueRequest = (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { service_id, customer_name, customer_phone } = createRequestSchema.parse(req.body);

    const requestId = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO queue_requests (id, organization_id, service_id, customer_name, customer_phone, status)
      VALUES (?, ?, ?, ?, ?, 'PENDING')
    `).run(requestId, organizationId, service_id, customer_name, customer_phone);

    const service = db.prepare('SELECT name, prefix FROM services WHERE id = ?').get(service_id) as any;

    io.emit('queue:request-created', {
      id: requestId,
      organization_id: organizationId,
      service_id,
      service_name: service?.name || 'General Consultation',
      service_prefix: service?.prefix || 'G',
      customer_name,
      customer_phone,
      status: 'PENDING',
      requested_at: new Date().toISOString()
    });

    res.json({ id: requestId, status: 'PENDING' });
  } catch (error) {
    console.error('Error creating queue request:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    }
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

export const getQueueRequest = (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const request = db.prepare(`
      SELECT r.*, s.name as service_name, s.prefix as service_prefix 
      FROM queue_requests r 
      LEFT JOIN services s ON r.service_id = s.id 
      WHERE r.id = ?
    `).get(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingRequests = (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user.organization_id;
    const requests = db.prepare(`
      SELECT r.*, s.name as service_name, s.prefix as service_prefix, s.average_service_time_minutes
      FROM queue_requests r
      LEFT JOIN services s ON r.service_id = s.id
      WHERE r.organization_id = ? AND r.status = 'PENDING'
      ORDER BY r.requested_at ASC
    `).all(orgId);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQueueTickets = (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user.organization_id;
    const tickets = db.prepare(`
      SELECT t.*, s.name as service_name, s.prefix as service_prefix, s.average_service_time_minutes,
             r.customer_name, r.customer_phone, r.requested_at
      FROM queue_tickets t
      JOIN services s ON t.service_id = s.id
      JOIN queue_requests r ON t.request_id = r.id
      WHERE t.organization_id = ?
      ORDER BY t.created_at DESC
    `).all(orgId);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getActiveServingTickets = (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user.organization_id;
    const tickets = db.prepare(`
      SELECT t.*, s.name as service_name, s.prefix as service_prefix, s.average_service_time_minutes,
             r.customer_name, r.customer_phone
      FROM queue_tickets t
      JOIN services s ON t.service_id = s.id
      JOIN queue_requests r ON t.request_id = r.id
      WHERE t.organization_id = ? AND t.status IN ('CALLED', 'SERVING')
      ORDER BY t.called_at DESC
    `).all(orgId);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveRequest = (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organization_id;

    const request = db.prepare('SELECT * FROM queue_requests WHERE id = ? AND organization_id = ?').get(id, orgId) as any;
    if (!request || request.status !== 'PENDING') return res.status(400).json({ error: 'Invalid request' });

    // Mark request as APPROVED
    db.prepare('UPDATE queue_requests SET status = ? WHERE id = ?').run('APPROVED', id);
    
    io.emit('queue:request-approved', { id });

    // Fetch service prefix
    const service = db.prepare('SELECT name, prefix FROM services WHERE id = ?').get(request.service_id) as any;
    const prefix = service?.prefix || 'T';

    // Generate ticket number (prefix + daily sequence)
    const today = new Date().toISOString().split('T')[0] + '%';
    const countQuery = db.prepare('SELECT count(*) as count FROM queue_tickets WHERE organization_id = ? AND created_at LIKE ?').get(orgId, today) as { count: number };
    const ticketNumber = `${prefix}-${(countQuery.count + 1).toString().padStart(3, '0')}`;

    const ticketId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO queue_tickets (id, request_id, organization_id, service_id, ticket_number, status)
      VALUES (?, ?, ?, ?, ?, 'WAITING')
    `).run(ticketId, id, orgId, request.service_id, ticketNumber);

    const ticketData = {
      id: ticketId,
      request_id: id,
      organization_id: orgId,
      service_id: request.service_id,
      service_name: service?.name || 'General Consultation',
      service_prefix: prefix,
      customer_name: request.customer_name,
      customer_phone: request.customer_phone,
      ticket_number: ticketNumber,
      status: 'WAITING',
      created_at: new Date().toISOString()
    };

    io.emit('queue:ticket-created', ticketData);
    io.emit('queue:updated');

    res.json({ message: 'Approved', ticket_id: ticketId, ticket: ticketData });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const declineRequest = (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organization_id;

    const request = db.prepare('SELECT * FROM queue_requests WHERE id = ? AND organization_id = ?').get(id, orgId) as any;
    if (!request || request.status !== 'PENDING') return res.status(400).json({ error: 'Invalid request' });

    db.prepare('UPDATE queue_requests SET status = ? WHERE id = ?').run('DECLINED', id);
    
    io.emit('queue:request-declined', { id });
    io.emit('queue:updated');

    res.json({ message: 'Declined' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTicket = (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const ticket = db.prepare(`
      SELECT t.*, s.name as service_name, s.average_service_time_minutes, r.customer_name, r.customer_phone 
      FROM queue_tickets t
      JOIN services s ON t.service_id = s.id
      JOIN queue_requests r ON t.request_id = r.id
      WHERE t.id = ?
    `).get(ticketId) as any;

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const positionQuery = db.prepare(`
      SELECT count(*) as ahead FROM queue_tickets 
      WHERE service_id = ? AND status = 'WAITING' AND created_at <= ?
    `).get(ticket.service_id, ticket.created_at) as { ahead: number };

    const servingQuery = db.prepare(`
      SELECT ticket_number, called_to_counter_id FROM queue_tickets 
      WHERE service_id = ? AND status IN ('CALLED', 'SERVING')
      ORDER BY called_at DESC LIMIT 1
    `).get(ticket.service_id) as any;

    const peopleAhead = positionQuery.ahead > 0 ? positionQuery.ahead - 1 : 0;
    const estimatedWait = peopleAhead * (ticket.average_service_time_minutes || 10);

    res.json({
      ...ticket,
      position: positionQuery.ahead,
      peopleAhead,
      estimatedWait,
      currentlyServing: servingQuery ? servingQuery.ticket_number : 'None',
      counter_name: servingQuery ? servingQuery.called_to_counter_id : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const callNext = (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user.organization_id;
    const { counter_id } = req.body;

    // Find the next waiting ticket (oldest first)
    const nextTicket = db.prepare(`
      SELECT t.*, s.name as service_name, s.prefix as service_prefix, s.average_service_time_minutes,
             r.customer_name, r.customer_phone
      FROM queue_tickets t
      JOIN services s ON t.service_id = s.id
      JOIN queue_requests r ON t.request_id = r.id
      WHERE t.organization_id = ? AND t.status = 'WAITING' 
      ORDER BY t.created_at ASC LIMIT 1
    `).get(orgId) as any;

    if (!nextTicket) return res.status(404).json({ message: 'Queue is empty' });

    db.prepare(`
      UPDATE queue_tickets 
      SET status = 'CALLED', called_to_counter_id = ?, called_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(counter_id || 'Counter 1', nextTicket.id);

    const fullTicket = {
      ...nextTicket,
      status: 'CALLED',
      called_to_counter_id: counter_id || 'Counter 1',
      called_at: new Date().toISOString()
    };

    io.emit('queue:updated');
    io.emit('queue:customer-called', fullTicket);

    res.json({ message: 'Next customer called', ticket: fullTicket });
  } catch (error) {
    console.error('Error in callNext:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTicketStatus = (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // SERVING, COMPLETED, CANCELLED, NO_SHOW, RECALLED
    const orgId = req.user.organization_id;

    const ticket = db.prepare(`
      SELECT t.*, s.name as service_name, r.customer_name, r.customer_phone
      FROM queue_tickets t
      JOIN services s ON t.service_id = s.id
      JOIN queue_requests r ON t.request_id = r.id
      WHERE t.id = ? AND t.organization_id = ?
    `).get(id, orgId) as any;
    
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    let timeUpdate = '';
    if (status === 'SERVING') timeUpdate = ', served_at = CURRENT_TIMESTAMP';
    if (status === 'COMPLETED') timeUpdate = ', completed_at = CURRENT_TIMESTAMP';
    if (status === 'RECALLED') timeUpdate = ', called_at = CURRENT_TIMESTAMP';

    const finalStatus = status === 'RECALLED' ? 'CALLED' : status;
    db.prepare(`UPDATE queue_tickets SET status = ?${timeUpdate} WHERE id = ?`).run(finalStatus, id);

    const updated = {
      ...ticket,
      status: finalStatus
    };

    io.emit('queue:updated');
    
    if (finalStatus === 'SERVING') io.emit('queue:customer-serving', updated);
    if (finalStatus === 'COMPLETED') io.emit('queue:customer-completed', updated);
    if (status === 'CANCELLED') io.emit('queue:customer-cancelled', updated);
    if (status === 'RECALLED') io.emit('queue:customer-called', updated);

    res.json({ message: `Ticket marked as ${status}`, ticket: updated });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

