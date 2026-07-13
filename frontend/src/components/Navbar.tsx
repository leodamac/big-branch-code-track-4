import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RoleSelector } from './RoleSelector';
import { Cpu, Wifi, WifiOff } from 'lucide-react';
import { apiClient } from '../services/apiClient';

const PING_INTERVAL_MS = 15000;

export const Navbar: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let active = true;
    const check = () => {
      apiClient.ping().then((ok) => {
        if (active) setIsOnline(ok);
      });
    };
    check();
    const interval = setInterval(check, PING_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-40 w-full glass-panel border-b border-ink-200/80 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
              <Cpu className="w-5 h-5 text-ink-900" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-ink-800 font-bold">
                SRI Copilot
              </span>
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-600 border border-brand-100">
                TRACK 4
              </span>
            </div>
          </Link>

          <div className="hidden sm:block">
            {isOnline ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-lg shadow-none">
                <Wifi className="w-3.5 h-3.5" />
                <span>API Online</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100 shadow-lg shadow-red-500/5 animate-pulse">
                <WifiOff className="w-3.5 h-3.5" />
                <span>API No Disponible</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-ink-500 hover:text-ink-700 transition-colors duration-150">
            Expedientes
          </Link>
          <div className="h-4 w-px bg-ink-200" />
          <RoleSelector />
        </div>
      </div>
    </nav>
  );
};
