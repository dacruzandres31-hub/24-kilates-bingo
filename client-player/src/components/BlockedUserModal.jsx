import { createPortal } from 'react-dom';
import { ShieldAlert } from 'lucide-react';

export default function BlockedUserModal({ isOpen, role, onClose }) {
  if (!isOpen) return null;

  const getMessage = () => {
    if (role === 'jugador') {
      return {
        title: 'Tu Usuario se encuentra bloqueado',
        message: 'Ponete en contacto con tu agente para más información.'
      };
    } else if (role === 'agente') {
      return {
        title: 'Tu Usuario se encuentra bloqueado',
        message: 'Ponete en contacto con tu superior para más información.'
      };
    }
    return {
      title: 'Usuario Bloqueado',
      message: 'Contacta al administrador para más información.'
    };
  };

  const { title, message } = getMessage();

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div 
        style={{
          background: 'linear-gradient(135deg, #1f2937 0%, #374151 50%, #1f2937 100%)',
          borderRadius: '1rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          maxWidth: '28rem',
          width: '100%',
          border: '2px solid rgba(239, 68, 68, 0.5)',
          animation: 'fadeIn 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div 
          style={{
            background: 'linear-gradient(90deg, #dc2626 0%, #e11d48 100%)',
            color: 'white',
            padding: '1.5rem',
            borderTopLeftRadius: '1rem',
            borderTopRightRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <ShieldAlert style={{ width: '2rem', height: '2rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{title}</h2>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div 
              style={{
                width: '4rem',
                height: '4rem',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <span style={{ fontSize: '2.5rem' }}>🔒</span>
            </div>
            <p style={{ color: '#d1d5db', fontSize: '1.125rem', lineHeight: '1.75', margin: 0 }}>
              {message}
            </p>
          </div>

          {/* Footer con botón */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)',
                color: 'white',
                fontWeight: 'bold',
                padding: '0.75rem 2rem',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.background = 'linear-gradient(90deg, #1d4ed8 0%, #4338ca 100%)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.background = 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)';
              }}
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
