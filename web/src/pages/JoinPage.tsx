import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrganizationServices, getPrimaryOrganization, createQueueRequest } from '../services/api';
import { io } from 'socket.io-client';
import { 
  Layers, 
  User, 
  Phone, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  Activity, 
  Stethoscope, 
  FlaskConical, 
  Receipt, 
  Pill,
  Radio,
  XCircle
} from 'lucide-react';

const socket = io(`http://${window.location.hostname}:5000`);

export const JoinPage = () => {
  const { organizationId } = useParams();
  const navigate = useNavigate();
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  // Form State
  const [serviceId, setServiceId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const getServiceIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('consult') || lower.includes('general')) return <Stethoscope className="w-5 h-5 text-secondary-light" />;
    if (lower.includes('lab')) return <FlaskConical className="w-5 h-5 text-accent" />;
    if (lower.includes('bill')) return <Receipt className="w-5 h-5 text-warning" />;
    if (lower.includes('pharm')) return <Pill className="w-5 h-5 text-success" />;
    return <Activity className="w-5 h-5 text-secondary-light" />;
  };

  useEffect(() => {
    let isMounted = true;

    async function loadServices() {
      try {
        let orgId = organizationId;
        
        // If an organizationId is in URL, attempt to load services for it
        if (orgId) {
          try {
            const res = await getOrganizationServices(orgId);
            if (res && res.length > 0 && isMounted) {
              setResolvedOrgId(orgId);
              setServices(res);
              setServiceId(res[0].id);
              setLoading(false);
              return;
            }
          } catch {
            // If failed, fall through to primary org
          }
        }

        // Fallback: fetch primary organization
        const primary = await getPrimaryOrganization().catch(() => null);
        if (primary && primary.id) {
          const res = await getOrganizationServices(primary.id).catch(() => []);
          if (res && res.length > 0 && isMounted) {
            setResolvedOrgId(primary.id);
            setServices(res);
            setServiceId(res[0].id);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error loading organization services:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  useEffect(() => {
    if (requestId) {
      socket.on('queue:ticket-created', (data) => {
        if (data.request_id === requestId) {
          navigate(`/queue/${data.id}`);
        }
      });

      socket.on('queue:request-declined', (data) => {
        if (data.id === requestId) {
          alert('Your arrival request could not be approved by reception. Please approach the counter.');
          setRequestId(null);
        }
      });

      return () => {
        socket.off('queue:ticket-created');
        socket.off('queue:request-declined');
      };
    }
  }, [requestId, navigate]);

  if (!resolvedOrgId || (services.length === 0 && !loading)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="glass-card-light p-8 rounded-3xl text-center max-w-md border border-border">
          <div className="w-12 h-12 bg-danger/10 text-danger rounded-xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Invalid Queue Link</h2>
          <p className="text-muted text-sm">
            This queue link is incomplete or invalid. Please make sure you scanned the correct QR code or use the full link provided by the reception.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId || !name || !resolvedOrgId) return;
    
    setSubmitting(true);
    try {
      const res = await createQueueRequest(resolvedOrgId, {
        service_id: serviceId,
        customer_name: name,
        customer_phone: phone
      });
      setRequestId(res.id);
    } catch (err) {
      alert('Failed to send queue request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted p-4">
        <div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold tracking-wide">Connecting to Smart Queue...</p>
      </div>
    );
  }

  // Waiting for Reception Approval Screen
  if (requestId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-warning/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md glass-card-light rounded-3xl p-8 border border-border shadow-lg text-center space-y-6 relative z-10 animate-in zoom-in-95 duration-300">
          
          {/* Pulsating Radar */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-warning/20 animate-ping"></span>
            <span className="absolute inline-flex h-16 w-16 rounded-full bg-warning/30 animate-pulse"></span>
            <div className="relative z-10 w-14 h-14 bg-gradient-to-tr from-warning to-amber-400 rounded-2xl text-white flex items-center justify-center shadow-lg shadow-warning/30">
              <Radio className="w-7 h-7 animate-pulse" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              Request Sent to Reception
            </h2>
            <p className="text-muted text-sm mt-1.5 font-medium">
              Please wait while staff confirms your presence.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-4 text-left space-y-2 shadow-sm">
            <div className="flex justify-between text-xs text-muted">
              <span>Customer:</span>
              <span className="font-bold text-foreground">{name}</span>
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>Status:</span>
              <span className="font-bold text-warning flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warning animate-ping"></span>
                Awaiting Gatekeeper
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted">
            Your live ticket with position and estimated wait will appear here the moment you are approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-secondary selection:text-white">
      {/* Background Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 my-8">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="EnQFlow Icon" className="w-16 h-16 mx-auto object-contain shadow-md rounded-2xl mb-3" />
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            EnQ<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Flow</span>
          </h1>
          <p className="text-muted text-xs font-semibold uppercase tracking-wider mt-1">
            Smart Contactless Check-In
          </p>
        </div>

        {/* Join Form Card */}
        <div className="glass-card-light rounded-3xl p-7 shadow-xl border border-border">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Service Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                1. Select Desired Service
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {services.map((s) => (
                  <label
                    key={s.id}
                    onClick={() => setServiceId(s.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      serviceId === s.id
                        ? 'bg-secondary/10 border-secondary shadow-sm shadow-secondary/10'
                        : 'bg-surface border-border hover:border-secondary/40 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-background border border-border shadow-sm">
                        {getServiceIcon(s.name)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{s.name}</h4>
                        <span className="text-[11px] text-muted flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-muted" />
                          Avg. ~{s.average_service_time_minutes || 10} mins
                        </span>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      serviceId === s.id ? 'border-secondary bg-secondary' : 'border-slate-300'
                    }`}>
                      {serviceId === s.id && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                2. Your Full Name
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted group-focus-within:text-accent transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('phone-input')?.focus();
                    }
                  }}
                  pattern="^[A-Za-z\s]+$"
                  title="Name can only contain letters and spaces"
                  placeholder="Enter your name"
                  required
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Phone Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                3. Phone Number
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted group-focus-within:text-primary transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !name) {
                      e.preventDefault();
                      document.getElementById('name-input')?.focus();
                    }
                  }}
                  pattern="^[0-9]{10}$"
                  maxLength={10}
                  title="Phone number must be exactly 10 digits"
                  placeholder="Enter phone number"
                  required
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 group relative inline-flex items-center justify-center px-6 py-4 text-sm font-extrabold text-white transition-all bg-primary hover:bg-primary-hover rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                    Connecting to Queue...
                  </>
                ) : (
                  <>
                    REQUEST QUEUE TICKET
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white" />
                  </>
                )}
              </span>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
          <span>Real-Time EnQFlow Queue Engine</span>
        </div>
      </div>
    </div>
  );
};
