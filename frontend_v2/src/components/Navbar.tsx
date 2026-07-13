import React from 'react';
import { Link } from 'react-router-dom';
import { RoleSelector } from './RoleSelector';
import { Cpu } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <nav className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                SRI Copilot
              </span>
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                TRACK 4
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors duration-150"
          >
            Expedientes
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <RoleSelector />
        </div>
      </div>
    </nav>
  );
};
