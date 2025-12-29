import React from 'react';
import { createPortal } from 'react-dom';

const BlockedUserWarningModal = ({ isOpen, onClose, usuario }) => {
    if (!isOpen) return null;

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
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)'
            }}
            onClick={onClose}
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
                onClick={(e) => e.stopPropagation()}
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
                    <span style={{ fontSize: '2rem' }}>🔒</span>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Usuario Bloqueado</h2>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '0.5rem',
                            padding: '1rem'
                        }}>
                            <p style={{ color: '#d1d5db', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                                <strong style={{ color: '#f87171' }}>Usuario:</strong>
                            </p>
                            <p style={{ color: '#fff', fontSize: '1.125rem', fontWeight: 'bold', margin: 0 }}>
                                {usuario?.username}
                            </p>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            backgroundColor: 'rgba(251, 146, 60, 0.1)',
                            border: '1px solid rgba(251, 146, 60, 0.3)',
                            borderRadius: '0.5rem',
                            padding: '1rem'
                        }}>
                            <span style={{ fontSize: '2.5rem' }}>⚠️</span>
                            <p style={{ color: '#d1d5db', fontSize: '1rem', lineHeight: '1.5', margin: 0 }}>
                                Este usuario se encuentra <strong style={{ color: '#f87171' }}>bloqueado</strong> y no puede recibir recursos.
                            </p>
                        </div>
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
        </div>,
        document.body
    );
};

export default BlockedUserWarningModal;
