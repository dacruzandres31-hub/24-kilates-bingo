// ============================================
// COMPONENTE: FORMULARIO DE PAGO PARA GANADORES
// ============================================
// Ubicación sugerida: client-player/src/components/PaymentFormModal.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Modal que aparece al ganador AL FINALIZAR el sorteo
 * para completar sus datos bancarios y cobrar el premio
 */
const PaymentFormModal = ({ 
  isOpen, 
  onClose, 
  gameSessionId, 
  prizes, 
  totalAmount 
}) => {
  const [formData, setFormData] = useState({
    cbu: '',
    bankAccountHolder: '',
    bankName: '',
    accountType: 'savings',
    whatsapp: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Validación de CBU (22 dígitos)
  const validateCBU = (cbu) => {
    return /^\d{22}$/.test(cbu);
  };

  // Validación de WhatsApp (10-20 dígitos)
  const validateWhatsApp = (phone) => {
    return /^[+]?\d{10,20}$/.test(phone);
  };

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Formateo especial para CBU (solo números)
    if (name === 'cbu') {
      const numericValue = value.replace(/\D/g, '').slice(0, 22);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
      
      // Validación en tiempo real
      if (numericValue.length === 22) {
        setErrors(prev => ({ ...prev, cbu: null }));
      } else if (numericValue.length > 0) {
        setErrors(prev => ({ ...prev, cbu: `Faltan ${22 - numericValue.length} dígitos` }));
      }
      return;
    }

    // Formateo especial para WhatsApp
    if (name === 'whatsapp') {
      let formattedValue = value.replace(/[^\d+]/g, '');
      if (!formattedValue.startsWith('+')) {
        formattedValue = '+' + formattedValue;
      }
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Validar formulario completo
  const validateForm = () => {
    const newErrors = {};

    if (!validateCBU(formData.cbu)) {
      newErrors.cbu = 'El CBU debe tener exactamente 22 dígitos';
    }

    if (!formData.bankAccountHolder || formData.bankAccountHolder.length < 5) {
      newErrors.bankAccountHolder = 'Ingresa el nombre completo del titular';
    }

    if (!validateWhatsApp(formData.whatsapp)) {
      newErrors.whatsapp = 'Formato inválido. Ej: +5491123456789';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Enviar datos por cada premio
      const promises = prizes.map(prize => 
        axios.post('/api/winners-payment/submit', {
          gameSessionId,
          prizeType: prize.type,
          prizeAmount: prize.amount,
          ...formData
        })
      );

      await Promise.all(promises);

      setSubmitSuccess(true);
      
      // Cerrar automáticamente después de 3 segundos
      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Error enviando datos de pago:', error);
      setErrors({ 
        submit: error.response?.data?.message || 'Error al enviar los datos. Intenta nuevamente.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // No renderizar si no está abierto
  if (!isOpen) return null;

  // Pantalla de éxito
  if (submitSuccess) {
    return (
      <div className="modal-overlay">
        <div className="modal-content success">
          <div className="success-icon">✓</div>
          <h2>¡Datos recibidos!</h2>
          <p>Procesaremos tu pago y enviaremos el comprobante por WhatsApp.</p>
          <p className="muted">Esta ventana se cerrará automáticamente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="modal-content payment-form">
        <div className="modal-header">
          <h2>💰 Completa tus datos para cobrar</h2>
          <p className="subtitle">Transferiremos tu premio a tu cuenta bancaria</p>
        </div>

        <div className="prizes-summary">
          <h3>Tus premios ganados:</h3>
          {prizes.map((prize, index) => (
            <div key={index} className="prize-item">
              <span className="prize-type">
                {prize.type === 'linea' ? '📏 Línea' : '🎯 Bingo'}
              </span>
              <span className="prize-amount">${prize.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="prize-total">
            <span>Total:</span>
            <span className="total-amount">${totalAmount.toLocaleString()}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="payment-form-fields">
          {/* CBU */}
          <div className="form-group">
            <label htmlFor="cbu">
              CBU <span className="required">*</span>
            </label>
            <input
              type="text"
              id="cbu"
              name="cbu"
              value={formData.cbu}
              onChange={handleChange}
              placeholder="Ingresa tu CBU (22 dígitos)"
              maxLength="22"
              className={errors.cbu ? 'error' : ''}
            />
            <small className="help-text">
              {formData.cbu.length}/22 dígitos
            </small>
            {errors.cbu && <span className="error-message">{errors.cbu}</span>}
          </div>

          {/* Titular */}
          <div className="form-group">
            <label htmlFor="bankAccountHolder">
              Titular de la cuenta <span className="required">*</span>
            </label>
            <input
              type="text"
              id="bankAccountHolder"
              name="bankAccountHolder"
              value={formData.bankAccountHolder}
              onChange={handleChange}
              placeholder="Nombre completo como figura en tu cuenta"
              className={errors.bankAccountHolder ? 'error' : ''}
            />
            {errors.bankAccountHolder && (
              <span className="error-message">{errors.bankAccountHolder}</span>
            )}
          </div>

          {/* Banco */}
          <div className="form-group">
            <label htmlFor="bankName">
              Banco
            </label>
            <input
              type="text"
              id="bankName"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              placeholder="Ej: Banco Galicia, BBVA, Santander..."
            />
          </div>

          {/* Tipo de cuenta */}
          <div className="form-group">
            <label>
              Tipo de cuenta <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="accountType"
                  value="savings"
                  checked={formData.accountType === 'savings'}
                  onChange={handleChange}
                />
                <span>Caja de Ahorro</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="accountType"
                  value="checking"
                  checked={formData.accountType === 'checking'}
                  onChange={handleChange}
                />
                <span>Cuenta Corriente</span>
              </label>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="form-group">
            <label htmlFor="whatsapp">
              WhatsApp <span className="required">*</span>
            </label>
            <input
              type="text"
              id="whatsapp"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="+54 9 11 1234-5678"
              className={errors.whatsapp ? 'error' : ''}
            />
            <small className="help-text">
              Te enviaremos el comprobante de pago por WhatsApp
            </small>
            {errors.whatsapp && (
              <span className="error-message">{errors.whatsapp}</span>
            )}
          </div>

          {/* Error general */}
          {errors.submit && (
            <div className="error-banner">
              {errors.submit}
            </div>
          )}

          {/* Botones */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !formData.cbu || !formData.bankAccountHolder || !formData.whatsapp}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar datos'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (window.confirm('Debes completar tus datos para recibir el premio. ¿Seguro que quieres cerrar?')) {
                  onClose();
                }
              }}
              disabled={isSubmitting}
            >
              Completar más tarde
            </button>
          </div>
        </form>

        <div className="form-footer">
          <p className="info-text">
            🔒 Tus datos están protegidos y solo serán usados para transferir tu premio.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFormModal;

/**
 * ESTILOS CSS SUGERIDOS (payment-form.css)
 */
const styles = `
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-content.payment-form {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  padding: 30px;
  color: white;
}

.modal-header h2 {
  color: #ffd700;
  margin-bottom: 10px;
  font-size: 24px;
}

.prizes-summary {
  background: rgba(255, 215, 0, 0.1);
  border: 2px solid #ffd700;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
}

.prize-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 215, 0, 0.2);
}

.prize-total {
  display: flex;
  justify-content: space-between;
  padding-top: 15px;
  margin-top: 10px;
  border-top: 2px solid #ffd700;
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #ffffff;
}

.required {
  color: #ff6b6b;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #333;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #ffd700;
}

.form-group input.error {
  border-color: #ff6b6b;
}

.error-message {
  color: #ff6b6b;
  font-size: 14px;
  display: block;
  margin-top: 5px;
}

.help-text {
  color: #999;
  font-size: 13px;
  display: block;
  margin-top: 5px;
}

.radio-group {
  display: flex;
  gap: 20px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

.btn {
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #1a1a2e;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 2px solid #333;
}

.modal-content.success {
  text-align: center;
  padding: 50px;
}

.success-icon {
  font-size: 80px;
  color: #4caf50;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .modal-content.payment-form {
    padding: 20px;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
`;
