// ============================================
// UTILIDAD: MATEMÁTICAS FINANCIERAS PRECISAS
// ============================================
// ⚠️ IMPORTANTE: Este módulo maneja DINERO REAL
// No usar matemáticas nativas de JavaScript (0.1 + 0.2 = 0.300000004)
// Usar decimal.js para precisión exacta

const Decimal = require('decimal.js');

// Configuración global para operaciones financieras
Decimal.set({
  precision: 20,           // 20 dígitos de precisión
  rounding: Decimal.ROUND_HALF_UP,  // Redondeo bancario estándar
  toExpNeg: -7,
  toExpPos: 21
});

class MoneyMath {
  
  // ============================================
  // CREAR INSTANCIA DE DECIMAL
  // ============================================
  static decimal(value) {
    return new Decimal(value || 0);
  }

  // ============================================
  // SUMAR (Evita 0.1 + 0.2 = 0.300000004)
  // ============================================
  static add(...values) {
    return values.reduce(
      (acc, val) => acc.plus(val || 0),
      new Decimal(0)
    );
  }

  // ============================================
  // RESTAR
  // ============================================
  static subtract(a, b) {
    return new Decimal(a || 0).minus(b || 0);
  }

  // ============================================
  // MULTIPLICAR
  // ============================================
  static multiply(a, b) {
    return new Decimal(a || 0).times(b || 0);
  }

  // ============================================
  // DIVIDIR (con validación de división por cero)
  // ============================================
  static divide(a, b) {
    if (parseFloat(b) === 0) {
      throw new Error('División por cero no permitida');
    }
    return new Decimal(a || 0).dividedBy(b);
  }

  // ============================================
  // PORCENTAJE (ej: 15% de 1000 = 150)
  // ============================================
  static percentage(amount, percent) {
    return new Decimal(amount || 0)
      .times(percent || 0)
      .dividedBy(100);
  }

  // ============================================
  // REDONDEAR A 2 DECIMALES (para mostrar en UI)
  // ============================================
  static round(value, decimals = 2) {
    return new Decimal(value || 0)
      .toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
  }

  // ============================================
  // CONVERTIR A NÚMERO (para guardar en BD)
  // ============================================
  static toNumber(decimalValue) {
    if (decimalValue instanceof Decimal) {
      return parseFloat(decimalValue.toFixed(2));
    }
    return parseFloat(new Decimal(decimalValue || 0).toFixed(2));
  }

  // ============================================
  // CONVERTIR A STRING (para mostrar en UI)
  // ============================================
  static toString(value, decimals = 2) {
    return new Decimal(value || 0)
      .toFixed(decimals);
  }

  // ============================================
  // FORMATEAR COMO DINERO (con separadores)
  // ============================================
  static format(value, currency = '$', decimals = 2) {
    const rounded = this.round(value, decimals);
    const parts = rounded.toFixed(decimals).split('.');
    
    // Agregar separadores de miles
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${currency} ${parts.join(',')}`;
  }

  // ============================================
  // COMPARACIONES SEGURAS
  // ============================================
  static isGreaterThan(a, b) {
    return new Decimal(a || 0).greaterThan(b || 0);
  }

  static isLessThan(a, b) {
    return new Decimal(a || 0).lessThan(b || 0);
  }

  static isEqual(a, b, tolerance = 0.01) {
    const diff = new Decimal(a || 0).minus(b || 0).abs();
    return diff.lessThanOrEqualTo(tolerance);
  }

  static isGreaterThanOrEqual(a, b) {
    return new Decimal(a || 0).greaterThanOrEqualTo(b || 0);
  }

  static isLessThanOrEqual(a, b) {
    return new Decimal(a || 0).lessThanOrEqualTo(b || 0);
  }

  // ============================================
  // VALIDAR QUE SEA NÚMERO VÁLIDO
  // ============================================
  static isValid(value) {
    try {
      const d = new Decimal(value);
      return d.isFinite() && !d.isNaN();
    } catch {
      return false;
    }
  }

  // ============================================
  // DISTRIBUIR COMISIONES (evita pérdida por redondeo)
  // ============================================
  static distributeCommission(totalAmount, numberOfRecipients) {
    if (numberOfRecipients <= 0) {
      throw new Error('El número de destinatarios debe ser mayor a 0');
    }

    const total = new Decimal(totalAmount || 0);
    const perRecipient = total.dividedBy(numberOfRecipients);
    
    // Redondear cada porción
    const rounded = perRecipient.toDecimalPlaces(2, Decimal.ROUND_DOWN);
    const distributed = rounded.times(numberOfRecipients);
    
    // Calcular diferencia por redondeo
    const remainder = total.minus(distributed);
    
    return {
      perRecipient: this.toNumber(rounded),
      totalDistributed: this.toNumber(distributed),
      remainder: this.toNumber(remainder),
      recipients: numberOfRecipients
    };
  }

  // ============================================
  // CALCULAR SPLIT CON PORCENTAJES
  // ============================================
  static splitByPercentages(totalAmount, percentages) {
    // percentages = { casa: 50, cajeros: 15, jugadores: 35 }
    const total = new Decimal(totalAmount || 0);
    const result = {};
    let distributed = new Decimal(0);

    // Calcular cada porción
    for (const [key, percent] of Object.entries(percentages)) {
      const amount = this.percentage(total, percent);
      result[key] = this.toNumber(amount);
      distributed = distributed.plus(amount);
    }

    // Verificar que sume 100%
    const totalPercent = Object.values(percentages).reduce((a, b) => a + b, 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      throw new Error(`Los porcentajes deben sumar 100% (actual: ${totalPercent}%)`);
    }

    // Ajustar diferencia por redondeo a la casa
    const difference = total.minus(distributed);
    if (result.casa !== undefined && !difference.isZero()) {
      result.casa = this.toNumber(new Decimal(result.casa).plus(difference));
    }

    result.total = this.toNumber(total);
    result.distributed = this.toNumber(distributed);

    return result;
  }

  // ============================================
  // VALIDAR TRANSACCIÓN (antes de guardar en BD)
  // ============================================
  static validateTransaction(amounts) {
    // amounts = { entrada: 1000, salidas: [500, 300, 200] }
    const entrada = new Decimal(amounts.entrada || 0);
    const salidasSum = amounts.salidas.reduce(
      (acc, val) => acc.plus(val || 0),
      new Decimal(0)
    );

    const difference = entrada.minus(salidasSum).abs();
    const isValid = difference.lessThanOrEqualTo(0.01); // Tolerancia de 1 centavo

    return {
      isValid,
      entrada: this.toNumber(entrada),
      salidas: this.toNumber(salidasSum),
      difference: this.toNumber(difference),
      message: isValid 
        ? 'Transacción balanceada correctamente' 
        : `Diferencia de ${this.format(difference)} detectada`
    };
  }
}

module.exports = MoneyMath;
