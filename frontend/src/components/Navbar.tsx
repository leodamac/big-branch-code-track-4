import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <nav className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-ink-200 py-3">
      <div className="max-w-7xl mx-auto px-6 flex items-center">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-md bg-ink-900 flex items-center justify-center group-hover:bg-ink-800 transition-colors duration-150 shrink-0">
            <Cpu className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-ink-900 leading-none">
            SRI Copilot
          </span>
        </Link>
      </div>
    </nav>
  );
};
