const API_BASE = `http://${window.location.hostname}:5000/api`;

export const getPrimaryOrganization = async () => {
  const res = await fetch(`${API_BASE}/organizations/primary`);
  if (!res.ok) throw new Error('Failed to load primary organization');
  return res.json();
};

export const getOrganizationServices = async (orgId: string) => {
  const res = await fetch(`${API_BASE}/organizations/${orgId}/services`);
  if (!res.ok) throw new Error('Failed to load services');
  return res.json();
};

export const createQueueRequest = async (orgId: string, data: { service_id: string; customer_name: string; customer_phone?: string }) => {
  const res = await fetch(`${API_BASE}/queue/organizations/${orgId}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create request');
  return res.json();
};

export const getQueueRequest = async (requestId: string) => {
  const res = await fetch(`${API_BASE}/queue/requests/${requestId}`);
  if (!res.ok) throw new Error('Failed to get request status');
  return res.json();
};

export const getTicket = async (ticketId: string) => {
  const res = await fetch(`${API_BASE}/queue/tickets/${ticketId}`);
  if (!res.ok) throw new Error('Failed to get ticket status');
  return res.json();
};
