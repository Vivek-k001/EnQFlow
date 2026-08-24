const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const login = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
};

export const getPendingRequests = async () => {
  const res = await fetch(`${API_BASE}/queue/requests`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch requests');
  return res.json();
};

export const approveRequest = async (id: string) => {
  const res = await fetch(`${API_BASE}/queue/requests/${id}/approve`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to approve request');
  return res.json();
};

export const declineRequest = async (id: string) => {
  const res = await fetch(`${API_BASE}/queue/requests/${id}/decline`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to decline request');
  return res.json();
};

export const callNext = async (counterId?: string) => {
  const res = await fetch(`${API_BASE}/queue/call-next`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ counter_id: counterId || 'Counter 1' })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Queue is empty');
  }
  return res.json();
};

export const updateTicketStatus = async (id: string, status: string) => {
  const res = await fetch(`${API_BASE}/queue/tickets/${id}/status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
};

export const getQueueTickets = async () => {
  const res = await fetch(`${API_BASE}/queue/tickets`, { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
};

export const getActiveServingTickets = async () => {
  const res = await fetch(`${API_BASE}/queue/active`, { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
};

export const getCounters = async () => {
  const res = await fetch(`${API_BASE}/organizations/counters`, { headers: getAuthHeaders() });
  if (!res.ok) return [];
  return res.json();
};

export const getOrganizationInfo = async () => {
  const res = await fetch(`${API_BASE}/organizations/info`, { headers: getAuthHeaders() });
  if (!res.ok) return null;
  return res.json();
};

