const API_BASE = 'http://127.0.0.1:5005/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    let msg = 'API Error';
    try {
      const data = await res.json();
      msg = data.error || data.message || msg;
    } catch (e) {}
    throw new Error(msg);
  }
  return res.json();
};

export const login = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return handleResponse(res);
};

export const getPendingRequests = async () => {
  const res = await fetch(`${API_BASE}/queue/requests`, { headers: getAuthHeaders() });
  return handleResponse(res);
};

export const approveRequest = async (id: string) => {
  const res = await fetch(`${API_BASE}/queue/requests/${id}/approve`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

export const declineRequest = async (id: string) => {
  const res = await fetch(`${API_BASE}/queue/requests/${id}/decline`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

export const callNext = async (counterId?: string) => {
  const res = await fetch(`${API_BASE}/queue/call-next`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ counter_id: counterId || 'Counter 1' })
  });
  return handleResponse(res);
};

export const updateTicketStatus = async (id: string, status: string) => {
  const res = await fetch(`${API_BASE}/queue/tickets/${id}/status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  return handleResponse(res);
};

export const getQueueTickets = async () => {
  const res = await fetch(`${API_BASE}/queue/tickets`, { headers: getAuthHeaders() });
  return handleResponse(res).catch(() => []);
};

export const getActiveServingTickets = async () => {
  const res = await fetch(`${API_BASE}/queue/active`, { headers: getAuthHeaders() });
  return handleResponse(res).catch(() => []);
};

export const getCounters = async () => {
  const res = await fetch(`${API_BASE}/organizations/counters`, { headers: getAuthHeaders() });
  return handleResponse(res).catch(() => []);
};

export const getOrganizationInfo = async () => {
  const res = await fetch(`${API_BASE}/organizations/info`, { headers: getAuthHeaders() });
  return handleResponse(res).catch(() => null);
};

