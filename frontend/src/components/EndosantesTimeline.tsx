import React from 'react';
import type { Endoso } from '../types';
import { Check, AlertOctagon, Link2 } from 'lucide-react';

interface EndosantesTimelineProps {
  endosos: Endoso[];
  clienteRuc: string;
  clienteRazonSocial: string;
}

export const EndosantesTimeline: React.FC<EndosantesTimelineProps> = ({
  endosos,
  clienteRuc,
  clienteRazonSocial
}) => {
  const hasEndosos = endosos.length > 0;
  
  // Calculate if the chain of endorsements matches the current client's RUC
  const lastEndoso = hasEndosos ? endosos[endosos.length - 1] : null;
  const isChainValid = lastEndoso ? lastEndoso.endosatario === clienteRuc : true;

  return (
    <div className="space-y-4">
      {hasEndosos ? (
        <div className="relative border-l border-ink-200/80 ml-3 pl-6 space-y-6 py-1">
          {/* Origin Beneficiary Node */}
          <div className="relative animate-fade-in">
            <span className="absolute -left-[31px] top-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-brand-500 ring-4 ring-white">
              <Check className="w-2.5 h-2.5 text-ink-900" />
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-600 tracking-wider">Beneficiario Originario</span>
              <h4 className="font-semibold text-xs text-ink-700 mt-0.5">
                {hasEndosos 
                  ? (endosos[0].razonSocialEndosante || 'Beneficiario Originario') 
                  : (clienteRazonSocial || 'Beneficiario Originario')
                }
              </h4>
              <p className="text-[10px] text-ink-400 mt-0.5 font-mono">
                RUC: {hasEndosos ? endosos[0].endosante : clienteRuc}
              </p>
            </div>
          </div>

          {/* Endorsement Nodes */}
          {endosos.map((endoso, index) => {
            const isLast = index === endosos.length - 1;
            const matchesCurrentClient = endoso.endosatario === clienteRuc;
            
            return (
              <div key={index} className="relative animate-fade-in" style={{ animationDelay: `${(index + 1) * 0.05}s` }}>
                {/* Connector circle node */}
                <span className={`absolute -left-[31px] top-1.5 flex items-center justify-center w-4 h-4 rounded-full ring-4 ring-white ${
                  matchesCurrentClient 
                    ? 'bg-emerald-500' 
                    : isLast 
                      ? 'bg-red-500' 
                      : 'bg-brand-500'
                }`}>
                  {matchesCurrentClient ? (
                    <Check className="w-2.5 h-2.5 text-ink-900" />
                  ) : isLast && !isChainValid ? (
                    <AlertOctagon className="w-2.5 h-2.5 text-ink-900" />
                  ) : (
                    <Link2 className="w-2.5 h-2.5 text-ink-900" />
                  )}
                </span>

                <div className={`p-3.5 bg-ink-50/30 border rounded-xl space-y-1.5 transition-all ${
                  isLast && !isChainValid 
                    ? 'border-red-100 bg-red-50' 
                    : 'border-ink-200/80 hover:border-ink-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] uppercase font-bold tracking-wider ${
                      isLast && !isChainValid ? 'text-red-700' : 'text-ink-400'
                    }`}>
                      Endoso #{index + 1}
                    </span>
                    <span className="text-[9px] font-medium text-ink-400">{endoso.fecha}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] text-ink-400 block uppercase">De (Endosante):</span>
                      <span className="font-semibold text-ink-600">{endoso.razonSocialEndosante || 'Persona Natural'}</span>
                      <span className="block text-[10px] font-mono text-ink-400 mt-0.5">{endoso.endosante}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-ink-400 block uppercase">A (Endosatario):</span>
                      <span className="font-semibold text-ink-600">{endoso.razonSocialEndosatario || 'Persona Natural'}</span>
                      <span className="block text-[10px] font-mono text-ink-400 mt-0.5">{endoso.endosatario}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Broken chain alert block */}
          {!isChainValid && (
            <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex gap-2.5 items-start glow-danger animate-fade-in">
              <AlertOctagon className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold uppercase tracking-wider text-[9px]">RIESGO CRÍTICO (MSG-15)</div>
                <p className="text-ink-600 leading-relaxed">
                  El cliente actual <strong className="text-ink-900">{clienteRazonSocial || 'No Registrado'}</strong> con RUC <strong className="text-ink-900">{clienteRuc}</strong> no coincide con el último beneficiario de la nota (<strong className="text-ink-900">{lastEndoso?.razonSocialEndosatario || lastEndoso?.endosatario}</strong>). La cadena de endosos está rota.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-ink-50/10 border border-ink-200/60 rounded-xl text-ink-400 text-center text-xs">
          Este es un título ordinario sin endosos previos registrados en el SRI.
        </div>
      )}
    </div>
  );
};
