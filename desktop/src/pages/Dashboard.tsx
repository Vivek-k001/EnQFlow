import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { 
  getPendingRequests, 
  getQueueTickets,
  getActiveServingTickets,
  approveRequest, 
  declineRequest, 
  callNext, 
  updateTicketStatus,
  getCounters,
  getOrganizationInfo
} from '../services/api';
import { io } from 'socket.io-client';
import { 
  Layers, 
  LogOut, 
  Bell, 
  UserCheck, 
  Clock, 
  Users, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Volume2, 
  Phone, 
  Radio, 
  RefreshCw,
  Sliders,
  Megaphone,
  Search,
  Check,
  UserX,
  Play,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

const socket = io('http://localhost:5000');

export const Dashboard = () => {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'hub' | 'registry' | 'counters'>('hub');
  const [requests, setRequests] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [counters, setCounters] = useState<any[]>([]);
  const [selectedCounter, setSelectedCounter] = useState<string>('Counter 1');
  const [orgInfo, setOrgInfo] = useState<any>(null);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [callingNext, setCallingNext] = useState(false);

  // Queue Registry Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchInitialData = async () => {
    try {
      const [reqData, ticketData, activeData, counterData, orgData] = await Promise.all([
        getPendingRequests(),
        getQueueTickets(),
        getActiveServingTickets(),
        getCounters(),
        getOrganizationInfo()
      ]);
      setRequests(reqData || []);
      setTickets(ticketData || []);
      setCounters(counterData || []);
      if (orgData) setOrgInfo(orgData);

      if (counterData && counterData.length > 0) {
        setSelectedCounter(counterData[0].name || 'Counter 1');
      }

      // Check if there is an active ticket for the selected counter or any called/serving
      if (activeData && activeData.length > 0) {
        const matching = activeData.find((t: any) => t.called_to_counter_id === selectedCounter) || activeData[0];
        setActiveTicket(matching);
      } else {
        setActiveTicket(null);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();

    socket.on('queue:request-created', (newReq) => {
      setRequests(prev => [newReq, ...prev.filter(r => r.id !== newReq.id)]);
      showNotification(`New arrival: ${newReq.customer_name} requested a ticket!`);
    });

    socket.on('queue:request-approved', (data) => {
      setRequests(prev => prev.filter(r => r.id !== data.id));
    });

    socket.on('queue:request-declined', (data) => {
      setRequests(prev => prev.filter(r => r.id !== data.id));
    });

    socket.on('queue:ticket-created', (newTicket) => {
      setTickets(prev => [newTicket, ...prev.filter(t => t.id !== newTicket.id)]);
    });

    socket.on('queue:customer-called', (data) => {
      setTickets(prev => prev.map(t => t.id === data.id ? { ...t, ...data, status: 'CALLED' } : t));
      if (!data.called_to_counter_id || data.called_to_counter_id === selectedCounter) {
        setActiveTicket(data);
      }
      showNotification(`Ticket ${data.ticket_number || ''} called to ${data.called_to_counter_id || selectedCounter}`);
    });

    socket.on('queue:customer-serving', (data) => {
      setTickets(prev => prev.map(t => t.id === data.id ? { ...t, ...data, status: 'SERVING' } : t));
      if (activeTicket?.id === data.id) {
        setActiveTicket((prev: any) => ({ ...prev, ...data, status: 'SERVING' }));
      }
    });

    socket.on('queue:customer-completed', (data) => {
      setTickets(prev => prev.map(t => t.id === data.id ? { ...t, ...data, status: 'COMPLETED' } : t));
      if (activeTicket?.id === data.id) {
        setActiveTicket(null);
      }
    });

    socket.on('queue:customer-cancelled', (data) => {
      setTickets(prev => prev.map(t => t.id === data.id ? { ...t, ...data, status: 'CANCELLED' } : t));
      if (activeTicket?.id === data.id) {
        setActiveTicket(null);
      }
    });

    socket.on('queue:updated', () => {
      getQueueTickets().then(data => setTickets(data || [])).catch(() => {});
      getPendingRequests().then(data => setRequests(data || [])).catch(() => {});
    });

    return () => {
      socket.off('queue:request-created');
      socket.off('queue:request-approved');
      socket.off('queue:request-declined');
      socket.off('queue:ticket-created');
      socket.off('queue:customer-called');
      socket.off('queue:customer-serving');
      socket.off('queue:customer-completed');
      socket.off('queue:customer-cancelled');
      socket.off('queue:updated');
    };
  }, [selectedCounter, activeTicket?.id]);

  const handleApprove = async (id: string, name: string) => {
    setActionLoading(id);
    try {
      const res = await approveRequest(id);
      showNotification(`Approved request for ${name}. Ticket ${res.ticket?.ticket_number || ''} generated!`);
      setRequests(prev => prev.filter(r => r.id !== id));
      if (res.ticket) {
        setTickets(prev => [res.ticket, ...prev.filter(t => t.id !== res.ticket.id)]);
      }
    } catch (err) {
      alert('Failed to approve request.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id: string, name: string) => {
    setActionLoading(id);
    try {
      await declineRequest(id);
      showNotification(`Declined arrival for ${name}.`);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert('Failed to decline request.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCallNext = async () => {
    setCallingNext(true);
    try {
      const res = await callNext(selectedCounter);
      if (res.ticket) {
        setActiveTicket(res.ticket);
        setTickets(prev => prev.map(t => t.id === res.ticket.id ? res.ticket : t));
        showNotification(`Called ${res.ticket.ticket_number} (${res.ticket.customer_name || 'Customer'}) to ${selectedCounter}!`);
      }
    } catch (err: any) {
      alert(err.message || 'No waiting customers in queue.');
    } finally {
      setCallingNext(false);
    }
  };

  const handleStatusUpdate = async (status: string, ticketId?: string) => {
    const targetId = ticketId || activeTicket?.id;
    if (!targetId) return;
    try {
      const res = await updateTicketStatus(targetId, status);
      showNotification(`Ticket marked as ${status}`);
      if (res.ticket) {
        setTickets(prev => prev.map(t => t.id === targetId ? { ...t, ...res.ticket } : t));
      }
      if (activeTicket?.id === targetId) {
        if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'NO_SHOW') {
          setActiveTicket(null);
        } else {
          setActiveTicket((prev: any) => ({ ...prev, status: status === 'RECALLED' ? 'CALLED' : status }));
        }
      }
    } catch (err) {
      alert('Failed to update ticket status.');
    }
  };

  // Metrics computation
  const waitingTickets = tickets.filter(t => t.status === 'WAITING');
  const completedToday = tickets.filter(t => t.status === 'COMPLETED');
  const activeServingCount = tickets.filter(t => t.status === 'CALLED' || t.status === 'SERVING').length;
  const avgWaitMinutes = tickets.length > 0 
    ? Math.round(tickets.reduce((acc, curr) => acc + (curr.average_service_time_minutes || 8), 0) / tickets.length)
    : 8;

  // Filtered tickets for Registry
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      (t.ticket_number?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (t.customer_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (t.service_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (t.customer_phone || '').includes(searchQuery);
    
    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return t.status === 'CALLED' || t.status === 'SERVING';
    return t.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden font-sans selection:bg-secondary selection:text-white">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-primary text-white border border-primary-hover px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-300">
          <div className="p-1.5 bg-white/20 rounded-lg text-white">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-72 bg-surface border-r border-border flex flex-col justify-between p-6 backdrop-blur-xl relative z-20 shrink-0">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center mb-8">
            <img src="/logo-landscape.png" alt="EnQFlow" className="h-9 w-auto object-contain" />
          </div>

          {/* User Profile Card */}
          <div className="p-3.5 bg-background border border-border rounded-2xl mb-6 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center font-bold text-white shadow-sm border border-primary/30">
              {user?.name ? user.name[0] : 'R'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-foreground truncate">{user?.name || 'Staff User'}</h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                {user?.role || 'RECEPTIONIST'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('hub')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === 'hub'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-background/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Activity className={`w-4 h-4 ${activeTab === 'hub' ? 'text-primary' : 'text-muted'}`} />
                Live Reception Hub
              </div>
              {requests.length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-warning text-white font-extrabold animate-pulse">
                  {requests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('registry')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === 'registry'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-background/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className={`w-4 h-4 ${activeTab === 'registry' ? 'text-primary' : 'text-muted'}`} />
                Queue Registry
              </div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-surface border border-border text-muted font-bold">
                {tickets.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('counters')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === 'counters'
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-background/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders className={`w-4 h-4 ${activeTab === 'counters' ? 'text-primary' : 'text-muted'}`} />
                Counter Stations
              </div>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Actions */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between text-xs text-muted px-1">
            <span className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              Queue Engine Online
            </span>
            <span className="text-[10px] font-mono text-muted">Port 5000</span>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-background hover:bg-danger/10 text-foreground hover:text-danger border border-border hover:border-danger/30 text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out Terminal
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="px-8 py-5 bg-surface/80 border-b border-border backdrop-blur-xl flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              {orgInfo?.name || 'ABC Health Center'}
            </h1>
            <p className="text-xs text-muted font-medium">
              {activeTab === 'hub' && 'Real-Time Verification & Counter Dispatcher'}
              {activeTab === 'registry' && 'Live Queue Registry & Ticket Management'}
              {activeTab === 'counters' && 'Multi-Counter Station Overview'}
            </p>
          </div>

          {/* Counter Switcher & Big Call Action */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-1.5 shadow-sm">
              <Radio className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs font-bold text-muted">Active Counter:</span>
              <select
                value={selectedCounter}
                onChange={(e) => setSelectedCounter(e.target.value)}
                className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer"
              >
                {counters.length > 0 ? (
                  counters.map(c => <option key={c.id} value={c.name} className="bg-surface text-foreground">{c.name}</option>)
                ) : (
                  <>
                    <option value="Counter 1" className="bg-surface text-foreground">Counter 1</option>
                    <option value="Counter 2" className="bg-surface text-foreground">Counter 2</option>
                    <option value="Counter 3" className="bg-surface text-foreground">Counter 3</option>
                  </>
                )}
              </select>
            </div>

            {/* Calling Next Action */}
            <button
              onClick={handleCallNext}
              disabled={callingNext || waitingTickets.length === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-extrabold text-sm transition-all shadow-lg cursor-pointer ${
                waitingTickets.length > 0
                  ? 'bg-primary hover:bg-primary-hover text-white shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-surface text-muted border border-border cursor-not-allowed opacity-75'
              }`}
            >
              <Megaphone className="w-4 h-4 fill-current" />
              {callingNext ? 'Calling Next...' : `CALL NEXT (${waitingTickets.length} in line)`}
            </button>
          </div>
        </header>

        {/* Dashboard Content Area */}
        <div className="p-8 space-y-8">
          
          {/* Real Operational Metrics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Metric 1: Incoming Arrivals */}
            <div className="glass-card-light rounded-2xl p-5 border border-border shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-warning">Incoming Arrivals</span>
                <div className="p-2 bg-warning/10 rounded-xl text-warning border border-warning/20">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-foreground mt-3">{requests.length}</p>
              <span className="text-[11px] font-semibold text-muted mt-1 block">Awaiting Staff Approval</span>
            </div>

            {/* Metric 2: Waiting in Line */}
            <div className="glass-card-light rounded-2xl p-5 border border-border shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Waiting in Queue</span>
                <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-foreground mt-3">{waitingTickets.length}</p>
              <span className="text-[11px] font-semibold text-muted mt-1 block">Approved & In Line</span>
            </div>

            {/* Metric 3: Currently Serving */}
            <div className="glass-card-light rounded-2xl p-5 border border-border shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">Currently Serving</span>
                <div className="p-2 bg-secondary/10 rounded-xl text-secondary border border-secondary/20">
                  <Radio className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-foreground mt-3 truncate">
                {activeTicket?.ticket_number ? `${activeTicket.ticket_number}` : 'Idle'}
              </p>
              <span className="text-[11px] font-semibold text-muted mt-1 block truncate">
                {activeTicket ? `At ${activeTicket.called_to_counter_id || selectedCounter} (${activeTicket.customer_name || 'Guest'})` : 'Station is Available'}
              </span>
            </div>

            {/* Metric 4: Completed Today */}
            <div className="glass-card-light rounded-2xl p-5 border border-border shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-success">Served Today</span>
                <div className="p-2 bg-success/10 rounded-xl text-success border border-success/20">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-black text-foreground mt-3">{completedToday.length}</p>
              <span className="text-[11px] font-semibold text-muted mt-1 block">~{avgWaitMinutes}m avg service time</span>
            </div>
          </div>

          {/* TAB 1: LIVE RECEPTION HUB */}
          {activeTab === 'hub' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Column 1: Incoming QR Requests (Gatekeeper Verification) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-warning/15 rounded-lg text-warning">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">
                      Incoming Customer Requests
                    </h2>
                    <span className="px-2 py-0.5 text-xs font-extrabold bg-warning/10 text-warning border border-warning/20 rounded-full">
                      {requests.length}
                    </span>
                  </div>
                  <button
                    onClick={fetchInitialData}
                    className="text-xs font-bold text-muted hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                {requests.length === 0 ? (
                  <div className="glass-card-light rounded-3xl p-12 text-center border border-border shadow-sm">
                    <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4 text-muted border border-border">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">No Pending Requests</h3>
                    <p className="text-xs text-muted max-w-xs mx-auto mt-1">
                      When customers scan the QR code and request a ticket, they will appear here for staff verification.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {requests.map((req) => (
                      <div
                        key={req.id}
                        className="glass-card-light rounded-2xl p-5 border border-border shadow-sm hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-base font-extrabold text-foreground">{req.customer_name}</h3>
                            <span className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20 rounded-md">
                              {req.service_name || 'General Consultation'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted">
                            {req.customer_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-muted" />
                                {req.customer_phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1 font-mono text-[11px] text-muted">
                              <Clock className="w-3 h-3 text-muted" />
                              {req.requested_at ? new Date(req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                          </div>
                        </div>

                        {/* Approval Actions */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            onClick={() => handleDecline(req.id, req.customer_name)}
                            disabled={actionLoading === req.id}
                            className="px-4 py-2 rounded-xl bg-surface hover:bg-danger/10 text-muted hover:text-danger border border-border hover:border-danger/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleApprove(req.id, req.customer_name)}
                            disabled={actionLoading === req.id}
                            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-extrabold text-xs transition-all shadow-md shadow-primary/20 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve Ticket
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: Active Counter & Serving Station */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-secondary/10 rounded-lg text-secondary">
                      <Radio className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">Active Counter Station</h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-secondary/10 text-secondary border border-secondary/20">
                    {selectedCounter}
                  </span>
                </div>

                {/* Active Serving Card */}
                <div className="glass-card-light rounded-3xl p-6 border border-border shadow-sm relative overflow-hidden">
                  {activeTicket ? (
                    <div className="space-y-6">
                      <div className="text-center py-5 bg-surface rounded-2xl border border-border shadow-inner space-y-2">
                        <span className="text-xs font-extrabold text-primary uppercase tracking-widest block">
                          NOW SERVING AT {activeTicket.called_to_counter_id || selectedCounter}
                        </span>
                        <p className="text-5xl font-black text-foreground tracking-tight">
                          {activeTicket.ticket_number || 'T-001'}
                        </p>
                        <div className="pt-1">
                          <p className="text-base font-bold text-foreground">{activeTicket.customer_name || 'Customer'}</p>
                          <span className="text-xs font-semibold text-muted">{activeTicket.service_name || 'General Consultation'}</span>
                        </div>
                        <div className="pt-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                            activeTicket.status === 'SERVING'
                              ? 'bg-secondary/10 text-secondary border border-secondary/20'
                              : 'bg-warning/10 text-warning border border-warning/20'
                          }`}>
                            <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
                            {activeTicket.status === 'SERVING' ? 'SERVICE IN PROGRESS' : 'CALLED - AWAITING ARRIVAL'}
                          </span>
                        </div>
                      </div>

                      {/* Operational Controls */}
                      <div className="space-y-2.5">
                        {activeTicket.status !== 'SERVING' && (
                          <button
                            onClick={() => handleStatusUpdate('SERVING')}
                            className="w-full py-3.5 rounded-xl bg-secondary hover:bg-secondary-light text-white font-extrabold text-sm transition-all shadow-md shadow-secondary/25 hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            Start Serving Customer
                          </button>
                        )}

                        <button
                          onClick={() => handleStatusUpdate('COMPLETED')}
                          className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-extrabold text-sm transition-all shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Complete Service & Close
                        </button>

                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            onClick={() => handleStatusUpdate('RECALLED')}
                            className="py-2.5 rounded-xl bg-surface hover:bg-border text-foreground border border-border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-primary" />
                            Re-Announce
                          </button>
                          <button
                            onClick={() => handleStatusUpdate('NO_SHOW')}
                            className="py-2.5 rounded-xl bg-surface hover:bg-danger/10 text-muted hover:text-danger border border-border hover:border-danger/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Mark No-Show
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center mx-auto text-muted border border-border shadow-sm">
                        <Megaphone className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground">{selectedCounter} is Currently Idle</h4>
                        <p className="text-xs text-muted max-w-xs mx-auto mt-1">
                          {waitingTickets.length > 0 
                            ? `There are ${waitingTickets.length} customers waiting in line.`
                            : 'No customers are waiting in the queue.'}
                        </p>
                      </div>
                      {waitingTickets.length > 0 && (
                        <button
                          onClick={handleCallNext}
                          className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          Call Next in Line ({waitingTickets[0]?.ticket_number})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: QUEUE REGISTRY */}
          {activeTab === 'registry' && (
            <div className="space-y-6">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border shadow-sm">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ticket, customer name, phone..."
                    className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-foreground placeholder-muted outline-none focus:border-primary"
                  />
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {['ALL', 'WAITING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === st
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-background text-muted border border-border hover:text-foreground'
                      }`}
                    >
                      {st === 'ACTIVE' ? 'CALLED / SERVING' : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tickets Table */}
              <div className="glass-card-light rounded-3xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface border-b border-border text-muted uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Ticket</th>
                        <th className="px-6 py-4">Customer Name</th>
                        <th className="px-6 py-4">Service</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Issued At</th>
                        <th className="px-6 py-4">Counter</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium text-foreground">
                      {filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-muted">
                            <Users className="w-8 h-8 mx-auto mb-2 text-muted/50" />
                            No queue tickets found matching the criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredTickets.map((t) => (
                          <tr key={t.id} className="hover:bg-background/60 transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-mono font-extrabold text-sm text-primary">
                                {t.ticket_number}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-foreground">
                              {t.customer_name || 'Guest'}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 rounded-md bg-surface border border-border text-[11px] font-bold text-muted">
                                {t.service_name || 'General'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-muted">
                              {t.customer_phone || '—'}
                            </td>
                            <td className="px-6 py-4 font-mono text-[11px] text-muted">
                              {t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td className="px-6 py-4 font-semibold text-muted">
                              {t.called_to_counter_id || '—'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                t.status === 'COMPLETED'
                                  ? 'bg-success/10 text-success border border-success/20'
                                  : t.status === 'CALLED' || t.status === 'SERVING'
                                  ? 'bg-secondary/10 text-secondary border border-secondary/20'
                                  : t.status === 'WAITING'
                                  ? 'bg-warning/10 text-warning border border-warning/20'
                                  : 'bg-surface text-muted border border-border'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                {t.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {t.status === 'WAITING' && (
                                  <button
                                    onClick={() => handleStatusUpdate('CALLED', t.id)}
                                    className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-bold transition-all shadow-sm cursor-pointer"
                                  >
                                    Call Now
                                  </button>
                                )}
                                {(t.status === 'CALLED' || t.status === 'SERVING') && (
                                  <button
                                    onClick={() => handleStatusUpdate('COMPLETED', t.id)}
                                    className="px-2.5 py-1 rounded-lg bg-success hover:bg-emerald-600 text-white text-[11px] font-bold transition-all shadow-sm cursor-pointer"
                                  >
                                    Complete
                                  </button>
                                )}
                                {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (
                                  <button
                                    onClick={() => handleStatusUpdate('CANCELLED', t.id)}
                                    className="px-2.5 py-1 rounded-lg bg-surface hover:bg-danger/10 text-muted hover:text-danger border border-border text-[11px] font-bold transition-all cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COUNTER STATIONS */}
          {activeTab === 'counters' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Counter Dispatch Overview</h2>
                  <p className="text-xs text-muted">Monitor and switch between physical counter terminals.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(counters.length > 0 ? counters : [{ id: '1', name: 'Counter 1' }, { id: '2', name: 'Counter 2' }, { id: '3', name: 'Counter 3' }]).map((c) => {
                  const counterTicket = tickets.find(t => t.called_to_counter_id === c.name && (t.status === 'CALLED' || t.status === 'SERVING'));
                  const isCurrentSelected = selectedCounter === c.name;

                  return (
                    <div
                      key={c.id}
                      className={`glass-card-light rounded-3xl p-6 border transition-all relative overflow-hidden flex flex-col justify-between ${
                        isCurrentSelected 
                          ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20' 
                          : 'border-border shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-surface rounded-xl border border-border">
                              <Radio className={`w-4 h-4 ${counterTicket ? 'text-secondary animate-pulse' : 'text-muted'}`} />
                            </div>
                            <h3 className="text-base font-extrabold text-foreground">{c.name}</h3>
                          </div>
                          {isCurrentSelected && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                              CURRENT
                            </span>
                          )}
                        </div>

                        {counterTicket ? (
                          <div className="py-4 text-center bg-surface rounded-2xl border border-border my-2 space-y-1">
                            <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest">
                              ACTIVE TICKET
                            </span>
                            <p className="text-3xl font-black text-foreground">{counterTicket.ticket_number}</p>
                            <p className="text-xs font-bold text-foreground">{counterTicket.customer_name}</p>
                            <span className="text-[11px] text-muted">{counterTicket.service_name}</span>
                          </div>
                        ) : (
                          <div className="py-8 text-center bg-surface/50 rounded-2xl border border-dashed border-border my-2">
                            <span className="text-xs font-bold text-muted">Counter is Idle</span>
                            <p className="text-[11px] text-muted/70 mt-0.5">Ready to receive customers</p>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 mt-2">
                        <button
                          onClick={() => {
                            setSelectedCounter(c.name);
                            setActiveTab('hub');
                            showNotification(`Switched active terminal to ${c.name}`);
                          }}
                          className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            isCurrentSelected
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-surface hover:bg-border text-foreground border border-border'
                          }`}
                        >
                          {isCurrentSelected ? 'Currently Operating' : `Operate ${c.name}`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};
