import React, { useState } from 'react';
import { Trophy, X, Copy, CheckCircle } from 'lucide-react';

/**
 * WinnerModal Component - Modal de Ganador
 * Muestra premio ganado y formulario para reclamar (CBU/Alias + WhatsApp)
 */

export default function WinnerModal({ 
  isOpen = false, 
  onClose = () => {}, 
  winnerData = null,
  onClaim = async () => {}
}) {
  const [formData, setFormData] = useState({
    cbu_alias: '',
    whatsapp: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [claimStatus, setClaimStatus] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !winnerData) return null;

  const { amount, type, boleaNumber } = winnerData;

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit claim
  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    
    if (!formData.cbu_alias.trim() || !formData.whatsapp.trim()) {
      setClaimStatus({ type: 'error', message: 'Completa todos los campos' });
      return;
    }

    setIsLoading(true);
    try {
      await onClaim({
        amount,
        ...formData
      });
      
      setClaimStatus({ 
        type: 'success', 
        message: 'Premio reclamado exitosamente. Te contactaremos pronto por WhatsApp.' 
      });

      // Cerrar después de 2 segundos
      setTimeout(() => {
        onClose();
        setFormData({ cbu_alias: '', whatsapp: '' });
        setClaimStatus(null);
      }, 2000);
    } catch (error) {
      setClaimStatus({ 
        type: 'error', 
        message: error.message || 'Error reclamando premio' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine color based on prize type
  const getTypeColor = () => {
    switch(type) {
      case 'bingo': return 'from-yellow-400 to-orange-500';
      case 'linea': return 'from-green-400 to-emerald-500';
      case 'jackpot': return 'from-red-400 to-pink-500';
      default: return 'from-blue-400 to-cyan-500';
    }
  };

  const getTypeLabel = () => {
    switch(type) {
      case 'bingo': return '🎰 ¡BINGO!';
      case 'linea': return '✨ LÍNEA';
      case 'jackpot': return '💎 JACKPOT';
      default: return 'PREMIO';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border-2 border-cyan-500 shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X size={24} className="text-slate-400" />
        </button>

        {/* Header with Trophy Animation */}
        <div className={`
          bg-gradient-to-r ${getTypeColor()} p-8 text-center relative
          animate-pulse
        `}>
          <div className="text-6xl mb-4 animate-bounce">
            <Trophy className="inline" size={72} />
          </div>
          <h1 className="text-4xl font-black text-white drop-shadow-lg">
            {getTypeLabel()}
          </h1>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          
          {/* Prize Amount - Large Display */}
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">Monto a Cobrar</p>
            <div className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-6 rounded-xl text-5xl font-bold shadow-lg">
              ${amount.toFixed(2)}
            </div>
          </div>

          {/* Details */}
          <div className="bg-slate-950 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-slate-400">Bolilla Ganadora:</p>
              <p className="text-2xl font-bold text-cyan-400">{boleaNumber}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-slate-400">Tipo de Premio:</p>
              <p className="text-white font-semibold">{getTypeLabel()}</p>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-700">
              <p className="text-slate-400">Fecha/Hora:</p>
              <p className="text-white">{new Date().toLocaleString('es-AR')}</p>
            </div>
          </div>

          {/* Claim Form */}
          {!claimStatus && (
            <form onSubmit={handleSubmitClaim} className="space-y-4 pt-4 border-t border-slate-700">
              <p className="text-slate-300 font-semibold">
                Completa tus datos para recibir el premio:
              </p>

              {/* CBU/Alias Input */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  CBU o Alias (Ej: alias@banco)
                </label>
                <input
                  type="text"
                  name="cbu_alias"
                  value={formData.cbu_alias}
                  onChange={handleInputChange}
                  placeholder="ejemplo@itau"
                  className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-lg text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none transition-colors"
                  disabled={isLoading}
                />
                <p className="text-slate-500 text-xs mt-1">
                  Tu CBU de transferencia o alias en tu banco
                </p>
              </div>

              {/* WhatsApp Input */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  WhatsApp (con código de país)
                </label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  placeholder="+54 9 11 2345-6789"
                  className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-lg text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none transition-colors"
                  disabled={isLoading}
                />
                <p className="text-slate-500 text-xs mt-1">
                  Te contactaremos por este número para confirmar la transferencia
                </p>
              </div>

              {/* Important Note */}
              <div className="bg-yellow-950 border-2 border-yellow-600 rounded-lg p-3">
                <p className="text-yellow-300 text-sm">
                  ⚠️ <strong>Importante:</strong> Verificaremos tus datos. Los premios son procesados dentro de 24-48 horas.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`
                  w-full py-4 px-6 rounded-lg font-bold text-lg transition-all
                  ${isLoading 
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/50'
                  }
                `}
              >
                {isLoading ? '⏳ Procesando...' : '✅ Reclamar Premio'}
              </button>
            </form>
          )}

          {/* Claim Status */}
          {claimStatus && (
            <div className={`
              rounded-lg p-4 flex items-start gap-3
              ${claimStatus.type === 'success' 
                ? 'bg-green-950 border-2 border-green-600' 
                : 'bg-red-950 border-2 border-red-600'
              }
            `}>
              <CheckCircle 
                size={24} 
                className={claimStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}
              />
              <p className={claimStatus.type === 'success' ? 'text-green-300' : 'text-red-300'}>
                {claimStatus.message}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-950 border-t border-slate-700 px-8 py-4 text-center text-slate-400 text-sm">
          <p>🎉 ¡Felicidades por tu premio! Gracias por jugar en 24 Kilates 🎉</p>
        </div>
      </div>
    </div>
  );
}
