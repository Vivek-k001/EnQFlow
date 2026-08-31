import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { login } from '../services/api';
import { 
  Layers, 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  Sparkles
} from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const setAuth = useAuthStore(state => state.setAuth);

  useEffect(() => {
    let mounted = true;
    const checkServer = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/health');
        if (mounted) setServerStatus(res.ok ? 'connected' : 'disconnected');
      } catch (err) {
        if (mounted) setServerStatus('disconnected');
      }
    };
    
    checkServer();
    const interval = setInterval(checkServer, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await login(email.trim(), password.trim());
      setAuth(data.token, data.user);
    } catch (err: any) {
      setErrorMsg('Invalid credentials. Please verify email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-secondary selection:text-white">
      {/* Brand Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* Top Right Status Pill */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2.5 bg-surface px-5 py-2.5 rounded-full shadow-sm">
        <span className="relative flex h-3 w-3">
          {serverStatus === 'connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/75 opacity-75"></span>}
          <span className={`relative inline-flex rounded-full h-3 w-3 ${
            serverStatus === 'connected' ? 'bg-success' : 
            serverStatus === 'checking' ? 'bg-warning' : 'bg-danger'
          }`}></span>
        </span>
        <span className="text-[13px] font-bold text-foreground">
          {serverStatus === 'connected' ? 'Queue Engine Connected' :
           serverStatus === 'checking' ? 'Connecting to Engine...' : 'Queue Engine Disconnected'}
        </span>
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="EnQFlow Icon" className="w-20 h-20 mx-auto object-contain shadow-md rounded-2xl mb-4" />
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
              EnQ<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Flow</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20 rounded-full">
              Desktop
            </span>
          </div>
          <p className="text-muted text-sm font-medium">
            Intelligent Real-Time Queue & Service Orchestration
          </p>
        </div>

        {/* Glass Card Container */}
        <div className="glass-card-light rounded-3xl p-8 shadow-xl border border-border relative">
          

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <div className="w-1.5 h-1.5 rounded-full bg-danger"></div>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Staff Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted group-focus-within:text-primary transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="enter username"
                  required
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted group-focus-within:text-primary transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="enter password"
                  required
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 group relative inline-flex items-center justify-center px-6 py-3.5 text-sm font-extrabold text-white transition-all bg-primary hover:bg-primary-hover rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Authenticating Terminal...
                  </>
                ) : (
                  <>
                    Sign In to Reception Terminal
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          <div className="mt-5 pt-4 border-t border-border/60 text-center">
            <button
              type="button"
              onClick={() => {
                setEmail('receptionist@abchealth.com');
                setPassword('recept123');
                setErrorMsg(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Click to auto-fill default demo credentials</span>
            </button>
          </div>

        </div>


      </div>
    </div>
  );
};
