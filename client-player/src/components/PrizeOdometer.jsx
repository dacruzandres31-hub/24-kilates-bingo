import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * PrizeOdometer Component - Animador de Premios en Tiempo Real
 * Muestra pots actuales con animación de cambio
 */

export default function PrizeOdometer({ 
  potBingo = 0, 
  potLinea = 0, 
  potJackpot = 0,
  roomType = 'bronce'
}) {
  const [displayBingo, setDisplayBingo] = useState(potBingo);
  const [displayLinea, setDisplayLinea] = useState(potLinea);
  const [displayJackpot, setDisplayJackpot] = useState(potJackpot);
  
  const [animateBingo, setAnimateBingo] = useState(false);
  const [animateLinea, setAnimateLinea] = useState(false);
  const [animateJackpot, setAnimateJackpot] = useState(false);

  // Animar cambios en pots
  useEffect(() => {
    if (displayBingo !== potBingo) {
      setAnimateBingo(true);
      const timer = setTimeout(() => {
        setDisplayBingo(potBingo);
        setAnimateBingo(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [potBingo, displayBingo]);

  useEffect(() => {
    if (displayLinea !== potLinea) {
      setAnimateLinea(true);
      const timer = setTimeout(() => {
        setDisplayLinea(potLinea);
        setAnimateLinea(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [potLinea, displayLinea]);

  useEffect(() => {
    if (displayJackpot !== potJackpot) {
      setAnimateJackpot(true);
      const timer = setTimeout(() => {
        setDisplayJackpot(potJackpot);
        setAnimateJackpot(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [potJackpot, displayJackpot]);

  // Color por tipo de sala
  const getRoomColor = () => {
    switch(roomType) {
      case 'bronce': return 'from-amber-600 to-amber-700';
      case 'plata': return 'from-slate-400 to-slate-500';
      case 'oro': return 'from-yellow-400 to-yellow-600';
      case 'free_starter': return 'from-green-400 to-green-600';
      default: return 'from-blue-400 to-blue-600';
    }
  };

  const getRoomBadge = () => {
    switch(roomType) {
      case 'bronce': return '🥉 Bronce';
      case 'plata': return '🥈 Plata';
      case 'oro': return '🥇 Oro';
      case 'free_starter': return '🎁 Inicio';
      default: return 'Sala';
    }
  };

  const PotCard = ({ title, amount, icon, bgGradient, animate, accentColor }) => (
    <div className={`
      bg-gradient-to-br ${bgGradient} rounded-xl p-6 border-2 ${accentColor}
      transition-all duration-300 transform
      ${animate ? 'scale-110 shadow-lg shadow-current' : 'scale-100'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl">{icon}</span>
        <div className="text-white text-xs font-semibold opacity-80">
          {animate && <TrendingUp size={16} className="animate-bounce" />}
        </div>
      </div>
      
      <p className="text-white text-sm opacity-80 mb-2 font-medium">{title}</p>
      
      <div className={`
        text-3xl font-black text-white drop-shadow-lg
        transition-all duration-300
        ${animate ? 'scale-105' : 'scale-100'}
      `}>
        ${amount.toFixed(2)}
      </div>
      
      <p className="text-white text-xs opacity-60 mt-2 font-mono">
        ${(amount / 100).toFixed(0)}k
      </p>
    </div>
  );

  const totalPots = displayBingo + displayLinea + displayJackpot;

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className={`
        bg-gradient-to-r ${getRoomColor()} rounded-t-2xl p-6 border-t-2 border-l-2 border-r-2 border-white
        text-white shadow-lg
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-5xl">🎲</div>
            <div>
              <h2 className="text-3xl font-black">{getRoomBadge()}</h2>
              <p className="text-white text-sm opacity-80">Premios en juego</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80 mb-1">Total Acumulado</p>
            <p className="text-4xl font-black drop-shadow-lg">
              ${totalPots.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Pots Grid */}
      <div className="bg-slate-900 border-b-2 border-l-2 border-r-2 border-white px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* BINGO Pot */}
          <PotCard
            title="🎰 BINGO (50%)"
            amount={displayBingo}
            icon="🎯"
            bgGradient="from-orange-500 to-red-600"
            animate={animateBingo}
            accentColor="border-orange-400"
          />

          {/* LINEA Pot */}
          <PotCard
            title="✨ LÍNEA (15%)"
            amount={displayLinea}
            icon="⚡"
            bgGradient="from-green-500 to-emerald-600"
            animate={animateLinea}
            accentColor="border-green-400"
          />

          {/* JACKPOT Pot */}
          <PotCard
            title="💎 JACKPOT (5%)"
            amount={displayJackpot}
            icon="🌟"
            bgGradient="from-purple-500 to-pink-600"
            animate={animateJackpot}
            accentColor="border-purple-400"
          />
        </div>
      </div>

      {/* Footer Stats */}
      <div className="bg-slate-950 rounded-b-2xl p-4 border-b-2 border-l-2 border-r-2 border-white">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-slate-400 text-xs">Distribución</p>
            <p className="text-white text-sm font-mono mt-1">50% | 15% | 5%</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Casa (30%)</p>
            <p className="text-cyan-400 text-sm font-bold mt-1">${(totalPots * 0.30).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Total Ingresos</p>
            <p className="text-green-400 text-sm font-bold mt-1">${(totalPots / 0.70).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="mt-4 bg-blue-950 border-2 border-blue-400 rounded-lg p-3 text-blue-200 text-sm">
        <p>
          💡 Los premios son actualizados en tiempo real. El 30% restante es para mantenimiento de la plataforma.
        </p>
      </div>
    </div>
  );
}
