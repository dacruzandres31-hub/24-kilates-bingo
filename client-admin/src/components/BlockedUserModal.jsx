import { createPortal } from 'react-dom';
import { ShieldAlert } from 'lucide-react';

export default function BlockedUserModal({ isOpen, role, onClose }) {
  if (!isOpen) return null;

  const getMessage = () => {
    if (role === 'jugador') {
      return {
        title: 'Tu Usuario se encuentra bloqueado',
        message: 'Ponete en contacto con tu agente',
        icon: '🚫',
        color: 'from-red-600 to-rose-600'
      };
    } else if (role === 'agente') {
      return {
        title: 'Tu Usuario se encuentra bloqueado',
        message: 'Ponete en contacto con tu superior',
        icon: '🚫',
        color: 'from-orange-600 to-red-600'
      };
    }
    return {
      title: 'Usuario bloqueado',
      message: 'Contacte al administrador',
      icon: '🚫',
      color: 'from-red-600 to-rose-600'
    };
  };

  const { title, message, icon, color } = getMessage();

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-red-500/50 w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className={`bg-gradient-to-r ${color} text-white px-6 py-6 rounded-t-2xl text-center`}>
          <div className="text-6xl mb-3">{icon}</div>
          <h3 className="text-2xl font-bold">{title}</h3>
        </div>

        {/* Contenido */}
        <div className="p-8 text-center">
          <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-6 mb-6">
            <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <p className="text-xl text-white font-semibold mb-2">
              Acceso Denegado
            </p>
            <p className="text-gray-300 text-lg">
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all text-lg"
          >
            ENTENDIDO
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
}
