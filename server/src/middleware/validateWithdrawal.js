// Middleware para validar retiros
const validateWithdrawal = (req, res, next) => {
  const { amount } = req.body;
  
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Monto inválido' });
  }
  
  if (amount > 10000) {
    return res.status(400).json({ error: 'Monto máximo de retiro: $10,000' });
  }
  
  next();
};

module.exports = validateWithdrawal;
