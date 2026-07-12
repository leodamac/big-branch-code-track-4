import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, ChevronDown } from 'lucide-react';
import type { UserRole } from '../types';

export const RoleSelector: React.FC = () => {
  const { role, setRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roles: { id: UserRole; name: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'OPERADOR',
      name: 'Operador de Valores',
      desc: 'Gestión de casos, ingreso y negociación',
      icon: <User className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'CUMPLIMIENTO',
      name: 'Oficial de Cumplimiento',
      desc: 'Validación de riesgos y aprobaciones',
      icon: <Shield className="w-4 h-4 text-amber-400" />,
    },
  ];

  const currentRole = roles.find((r) => r.id === role) || roles[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-700/50 hover:border-slate-600 rounded-lg text-sm text-slate-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      >
        <span className="flex items-center justify-center">
          {currentRole.icon}
        </span>
        <span className="font-medium">{currentRole.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl glass-panel shadow-2xl z-50 py-1.5 border border-slate-700/50 focus:outline-none animate-fade-in">
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 border-b border-slate-800/60">
            SELECCIONAR MOCK ROLE
          </div>
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setRole(r.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-slate-800/40 ${
                role === r.id ? 'bg-brand-500/10 border-r-2 border-brand-500' : ''
              }`}
            >
              <span className="mt-0.5 flex items-center justify-center">
                {r.icon}
              </span>
              <div>
                <div className={`font-medium ${role === r.id ? 'text-brand-400' : 'text-slate-200'}`}>
                  {r.name}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {r.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
