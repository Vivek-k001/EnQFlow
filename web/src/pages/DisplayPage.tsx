import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { 
  Layers, 
  Radio, 
  Clock, 
  Activity,
  Megaphone
} from 'lucide-react';

const socket = io('http://localhost:5000');

export const DisplayPage = () => {
  const [servingList, setServingList] = useState<{ticket: string, counter: string, time: string}[]>([]);
  const [lastCalled, setLastCalled] = useState<{ticket: string, counter: string} | null>(null);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    socket.on('queue:customer-called', (data) => {
      fetch(`http://localhost:5000/api/queue/tickets/${data.id}`)
        .then(res => res.json())
        .then(ticket => {
          const newCalled = { 
            ticket: ticket.ticket_number || 'T-001', 
            counter: data.counter_id || 'Counter 1',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setLastCalled(newCalled);
          
          try {
            const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            chime.play().catch(() => {});
          } catch (e) {}

          setServingList(prev => {
            const list = [newCalled, ...prev.filter(p => p.ticket !== newCalled.ticket)];
            return list.slice(0, 6);
          });
        })
        .catch(console.error);
    });

    return () => {
      socket.off('queue:customer-called');
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-8 lg:p-12 relative overflow-hidden font-sans selection:bg-secondary selection:text-white">
      {/* Background Gradients */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header */}
      <header className="flex items-center justify-between pb-8 border-b border-border relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary rounded-2xl text-white shadow-xl shadow-primary/20 border border-primary-hover">
            <Layers className="w-8 h-8 text-primary-light" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-foreground tracking-tight">
                EnQ<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Flow</span>
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20 rounded-full">
                Public Display
              </span>
            </div>
            <p className="text-xs text-muted font-medium mt-0.5">
              Live Waiting Lounge Broadcast System
            </p>
          </div>
        </div>

        {/* Live Clock & WebSocket Status */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-bold text-secondary bg-secondary/10 border border-secondary/20 px-3.5 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
            Real-time Live Sync
          </div>
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-foreground tracking-wider">
              {currentTime}
            </div>
            <span className="text-[11px] text-muted uppercase tracking-widest font-bold">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </header>

      {/* Main Spotlight Board */}
      <main className="flex-1 flex flex-col items-center justify-center my-10 relative z-10">
        {lastCalled ? (
          <div className="w-full max-w-4xl glass-card-light p-12 lg:p-16 rounded-[3rem] border border-border shadow-xl text-center relative overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-secondary to-accent"></div>

            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-extrabold text-sm uppercase tracking-widest mb-6 animate-pulse">
              <Megaphone className="w-4 h-4" />
              NOW CALLING TICKET
            </div>

            <div className="text-[9rem] lg:text-[11rem] font-black leading-none text-foreground tracking-tight my-4">
              {lastCalled.ticket}
            </div>

            <div className="mt-8">
              <div className="inline-flex items-center gap-4 text-3xl lg:text-4xl font-extrabold text-white bg-primary px-10 py-5 rounded-2xl shadow-xl shadow-primary/30">
                <span>Please proceed to</span>
                <span className="underline decoration-white/40">{lastCalled.counter}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 py-16">
            <div className="w-20 h-20 bg-surface rounded-3xl flex items-center justify-center mx-auto text-muted border border-border shadow-sm">
              <Radio className="w-10 h-10 animate-pulse text-secondary" />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
              Awaiting Next Customer Announcement
            </h2>
            <p className="text-sm text-muted max-w-md mx-auto font-medium">
              Please take a seat and watch this screen. Your ticket number will be announced here when a counter is ready.
            </p>
          </div>
        )}
      </main>

      {/* Bottom Counter Grid / Recent Ticker */}
      <footer className="pt-6 border-t border-border relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Recent Announcements
          </span>
          <span className="text-xs text-muted font-medium">Auto-synced</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {servingList.length > 0 ? (
            servingList.map((item, idx) => (
              <div 
                key={idx} 
                className="glass-card-light p-4 rounded-2xl border border-border shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs text-muted font-mono mb-2">
                  <span>{item.counter}</span>
                  <span className="text-[10px] text-muted">{item.time}</span>
                </div>
                <div className="text-2xl font-black text-foreground tracking-tight">
                  {item.ticket}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-4 text-center text-xs text-muted font-medium">
              No recent announcements.
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};
