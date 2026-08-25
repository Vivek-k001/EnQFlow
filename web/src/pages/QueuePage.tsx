import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTicket } from '../services/api';
import { io } from 'socket.io-client';
import { 
  Layers, 
  Clock, 
  Users, 
  Radio, 
  CheckCircle2, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle,
  Megaphone,
  QrCode
} from 'lucide-react';

const socket = io(`http://${window.location.hostname}:5000`);

export const QueuePage = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calledAlert, setCalledAlert] = useState(false);
  const [completedAlert, setCompletedAlert] = useState(false);

  const calledAudioRef = useRef<HTMLAudioElement | null>(null);
  const completedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    calledAudioRef.current = new Audio('/sounds/called.mp3');
    completedAudioRef.current = new Audio('/sounds/completed.wav');
  }, []);

  const fetchTicket = () => {
    if (!ticketId) return;
    getTicket(ticketId)
      .then(data => {
        setTicket(data);
        if (data.status === 'CALLED') {
          setCalledAlert(prev => {
            if (!prev) {
              // Triple ding!
              let count = 0;
              const playDing = () => {
                if (calledAudioRef.current) {
                  calledAudioRef.current.currentTime = 0;
                  calledAudioRef.current.play().catch(() => {});
                }
              };
              playDing();
              const interval = setInterval(() => {
                count++;
                if (count >= 2) clearInterval(interval);
                playDing();
              }, 500);
            }
            return true;
          });
        }
        
        if (data.status === 'COMPLETED' || data.status === 'SERVING') {
          setCompletedAlert(prev => {
            if (!prev) {
              if (calledAudioRef.current) {
                calledAudioRef.current.pause();
                calledAudioRef.current.currentTime = 0;
              }
              if (completedAudioRef.current) {
                completedAudioRef.current.currentTime = 0;
                completedAudioRef.current.play().catch(() => {});
              }
            }
            return true;
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTicket();

    if (ticketId) {
      socket.on('queue:updated', fetchTicket);
      socket.on('queue:position-updated', fetchTicket);
      
      socket.on('queue:customer-called', (data) => {
        if (data.id === ticketId) {
          fetchTicket();
        }
      });
      
      socket.on('queue:customer-serving', (data) => {
        if (data.id === ticketId) fetchTicket();
      });
      
      socket.on('queue:customer-completed', (data) => {
        if (data.id === ticketId) fetchTicket();
      });

      return () => {
        socket.off('queue:updated');
        socket.off('queue:position-updated');
        socket.off('queue:customer-called');
        socket.off('queue:customer-serving');
        socket.off('queue:customer-completed');
      };
    }
  }, [ticketId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted p-4 font-sans">
        <div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold">Retrieving Live Queue Pass...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground p-4 font-sans text-center">
        <AlertCircle className="w-12 h-12 text-danger mb-4" />
        <h2 className="text-xl font-bold text-foreground">Ticket Not Found</h2>
        <p className="text-sm text-muted mt-1 mb-6">The requested queue ticket session has expired or does not exist.</p>
        <Link to="/" className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-sm">
          Return to Check-in
        </Link>
      </div>
    );
  }

  const isCalled = ticket.status === 'CALLED';
  const isServing = ticket.status === 'SERVING';
  const isCompleted = ticket.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 py-8 relative overflow-hidden font-sans selection:bg-secondary selection:text-white">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-sm relative z-10 space-y-5">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between px-2">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Check-in
          </Link>
        </div>

        {/* CALLED HERO NOTIFICATION */}
        {isCalled && (
          <div className="p-5 rounded-3xl bg-primary text-white shadow-xl shadow-primary/25 animate-in zoom-in-95 duration-300 text-center space-y-2 border border-primary-hover">
            <div className="inline-flex p-2 bg-white/20 rounded-2xl mb-1">
              <Megaphone className="w-6 h-6 animate-bounce text-white" />
            </div>
            <h3 className="text-xl font-black tracking-tight">IT'S YOUR TURN!</h3>
            <p className="text-xs font-bold opacity-95">
              Please proceed immediately to <span className="underline font-black">{ticket.called_to_counter_id || 'Counter 1'}</span>
            </p>
          </div>
        )}

        {/* DIGITAL QUEUE PASS (APPLE WALLET STYLE) */}
        <div className="relative w-full perspective-[1000px]">
          
          {/* Top Stub */}
          <div className={`glass-card-light rounded-t-3xl overflow-hidden border border-border border-b-0 relative z-20 ${isCompleted ? 'animate-tear-top' : ''}`}>
            <div className="bg-primary p-6 text-center relative overflow-hidden">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary-light block mb-1 relative z-10">
                {ticket.service_name || 'General Consultation'}
              </span>
              <div className="text-6xl font-black text-white tracking-tight my-2 relative z-10">
                {ticket.ticket_number}
              </div>
              <p className="text-xs font-medium text-blue-100 relative z-10">
                Assigned to: <span className="text-white font-bold">{ticket.customer_name || 'Guest'}</span>
              </p>

              {/* Simulated Barcode */}
              <div className="mt-5 flex justify-center items-center h-8 opacity-40 relative z-10">
                <div className="w-full flex justify-between gap-[2px]">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-white h-full" 
                      style={{ 
                        width: `${Math.random() * 4 + 1}px`,
                        opacity: Math.random() > 0.8 ? 0.5 : 1 
                      }}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Completed Watermark Stamp */}
              {isCompleted && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                  <div className="text-5xl font-black text-danger border-[6px] border-danger px-4 py-2 rounded-2xl uppercase tracking-widest bg-white/10 backdrop-blur-sm animate-stamp-in shadow-2xl transform -rotate-12">
                    SERVED
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Perforation Line and Bottom Stub Container */}
          <div className={`relative z-10 ${isCompleted ? 'animate-tear-bottom' : ''}`}>
            
            {/* The joint connecting top and bottom */}
            <div className="h-0 w-full relative">
              {/* Left Notch Cutout (Larger) */}
              <div className="absolute left-[-1px] top-[-16px] w-4 h-8 bg-background rounded-r-full border-y border-r border-border z-30 shadow-[inset_3px_0_5px_rgba(0,0,0,0.06)]"></div>
              {/* Right Notch Cutout (Larger) */}
              <div className="absolute right-[-1px] top-[-16px] w-4 h-8 bg-background rounded-l-full border-y border-l border-border z-30 shadow-[inset_-3px_0_5px_rgba(0,0,0,0.06)]"></div>
              
              {/* Dashed Line with Scissors (hidden if torn) */}
              <div className="absolute top-[0px] left-6 right-6 border-t-[4px] border-dashed border-border/80 z-20 flex items-center justify-center">
                {!isCompleted && (
                  <span className="absolute -top-[12px] text-muted/50 text-[12px]">✂</span>
                )}
              </div>

              {/* Torn Jagged Edges (Triangles) - Visible only when completed */}
              {isCompleted && (
                <>
                  {/* Top Stub Jagged Edge (Points down, matches primary blue header) */}
                  <div 
                    className="absolute bottom-[0px] left-0 w-full h-[12px] z-40"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='0,0 12,12 24,0' fill='%232563EB'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'repeat-x'
                    }}
                  ></div>
                  
                  {/* Bottom Stub Jagged Edge (Points up, matches white glass card) */}
                  <div 
                    className="absolute top-[0px] left-0 w-full h-[12px] z-40"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='0,12 12,0 24,12' fill='%23ffffff'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'repeat-x'
                    }}
                  ></div>
                </>
              )}
            </div>

            {/* Bottom Stub */}
            <div className="glass-card-light rounded-b-3xl overflow-hidden border border-border border-t-0 relative">
              <div className="p-6 space-y-6 pt-8">
                
                {/* Position & Ahead Stats */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-background border border-border p-4 rounded-2xl text-center shadow-sm">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
                      Your Position
                    </span>
                    <p className="text-3xl font-black text-primary">
                      {ticket.position === 0 || isCalled || isServing ? 'NOW' : `#${ticket.position}`}
                    </p>
                  </div>

                  <div className="bg-background border border-border p-4 rounded-2xl text-center shadow-sm">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
                      Ahead of You
                    </span>
                    <p className="text-3xl font-black text-secondary">
                      {ticket.peopleAhead ?? 0}
                    </p>
                  </div>
                </div>

                {/* Estimated Wait Card */}
                <div className="bg-surface border border-border p-4 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-warning/10 border border-warning/20 text-warning">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                        Estimated Wait
                      </span>
                      <span className="text-sm font-extrabold text-foreground">
                        ~{ticket.estimatedWait || 0} Minutes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Currently Serving Station */}
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    NOW SERVING AT COUNTER
                  </span>
                  <p className="text-xl font-extrabold text-foreground">
                    {ticket.currentlyServing || 'Idle'}
                  </p>
                </div>

                {/* Live Status Badge */}
                <div className="pt-2 text-center">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-sm ${
                    isCompleted 
                      ? 'bg-danger/10 text-danger border border-danger/30'
                      : isServing
                      ? 'bg-secondary/10 text-secondary border border-secondary/30'
                      : isCalled
                      ? 'bg-primary text-white animate-bounce shadow-lg shadow-primary/30'
                      : 'bg-warning/10 text-warning border border-warning/30'
                  }`}>
                    {!isCompleted && <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>}
                    {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                    Status: {ticket.status}
                  </span>
                </div>



              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-muted font-medium space-y-1">
          <p>Please keep this page open. We will vibrate & notify your device when called.</p>
        </div>
      </div>
    </div>
  );
};
