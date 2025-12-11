import { useState } from 'react';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function EstadisticasGenerales({ financialData }) {
  const [newUserName, setNewUserName] = useState('');
  const [newUserType, setNewUserType] = useState('jugador');

  // Datos para gráfica mensual (simulados - deberían venir del backend)
  const dataNetwinMensual = [
    { fecha: 'Nov-22', ganancia: 35000000, gasto: 25000000 },
    { fecha: 'Dec-22', ganancia: 38000000, gasto: 22000000 },
    { fecha: 'Jan-23', ganancia: 42000000, gasto: 28000000 },
    { fecha: 'Feb-23', ganancia: 39000000, gasto: 26000000 },
    { fecha: 'Mar-23', ganancia: 45000000, gasto: 30000000 },
    { fecha: 'Apr-23', ganancia: 43000000, gasto: 27000000 },
    { fecha: 'May-23', ganancia: 48000000, gasto: 32000000 },
    { fecha: 'Jun-23', ganancia: 46000000, gasto: 29000000 },
    { fecha: 'Jul-23', ganancia: 41000000, gasto: 31000000 },
    { fecha: 'Aug-23', ganancia: 44000000, gasto: 28000000 },
    { fecha: 'Sep-23', ganancia: 47000000, gasto: 33000000 },
    { fecha: 'Oct-23', ganancia: 38000000, gasto: 26000000 }
  ];

  // Datos para gráfica diaria
  const dataNetwinDiario = [
    { hora: '01', ganancia: 300000, gasto: 200000 },
    { hora: '02', ganancia: 450000, gasto: 300000 },
    { hora: '03', ganancia: 650000, gasto: 400000 },
    { hora: '04', ganancia: 520000, gasto: 350000 },
    { hora: '05', ganancia: 480000, gasto: 320000 },
    { hora: '06', ganancia: 580000, gasto: 380000 },
    { hora: '07', ganancia: 720000, gasto: 450000 },
    { hora: '08', ganancia: 1050000, gasto: 650000 },
    { hora: '09', ganancia: 890000, gasto: 550000 },
    { hora: '10', ganancia: 780000, gasto: 480000 },
    { hora: '11', ganancia: 620000, gasto: 420000 }
  ];

  // Datos para Top Agentes
  const dataTopAgentes = [
    { name: 'nahuapanel', value: 45, color: '#ec4899' },
    { name: 'gisellapanel', value: 35, color: '#3b82f6' },
    { name: 'silvanapanel', value: 12, color: '#f59e0b' },
    { name: 'abiganel', value: 5, color: '#10b981' },
    { name: 'gringapanel', value: 3, color: '#8b5cf6' }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    
    // TODO: Implementar creación de usuario
    alert(`Crear usuario: ${newUserName} como ${newUserType}`);
    setNewUserName('');
  };

  const gananciaActual = financialData?.today?.sales || 4331434.85;
  const gananciaAnterior = 18561624.05;
  const porcentajeCambio = ((gananciaActual - gananciaAnterior) / gananciaAnterior * 100).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Primera fila: Carga Rápida, Ganancia Neta, Netwin Mensual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carga Rápida */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-center py-3 rounded-xl mb-6">
            <h3 className="text-xl font-bold">Carga rápida</h3>
          </div>

          <div className="space-y-4">
            <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-lg">
              <span>👤</span>
              <span>NUEVO JUGADOR</span>
            </button>

            <button className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-lg">
              <span>🏢</span>
              <span>NUEVO AGENTE</span>
            </button>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nombre de Usuario"
                  className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="button"
                  className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl flex items-center justify-center text-2xl transition-all transform hover:scale-110 shadow-lg"
                >
                  +
                </button>
                <button
                  type="button"
                  className="w-10 h-10 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl flex items-center justify-center text-2xl transition-all transform hover:scale-110 shadow-lg"
                >
                  -
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Ganancia Neta */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-center py-3 rounded-xl mb-6">
            <h3 className="text-xl font-bold">Ganancia neta</h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Mes actual:</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(gananciaActual)}</p>
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-1">Mes anterior:</p>
              <p className="text-xl text-gray-300">{formatCurrency(gananciaAnterior)}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold px-4 py-2 rounded-xl shadow-lg ${
                parseFloat(porcentajeCambio) < 0 
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white' 
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
              }`}>
                {porcentajeCambio}%
              </span>
              <button className="text-gray-400 hover:text-indigo-400 text-2xl transition-colors">
                👁️‍🗨️
              </button>
            </div>
          </div>
        </div>

        {/* Netwin Mensual */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-center py-3 rounded-xl mb-6">
            <h3 className="text-xl font-bold">Netwin Mensual</h3>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dataNetwinMensual}>
              <defs>
                <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fca5a5" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#fca5a5" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="fecha" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Area type="monotone" dataKey="ganancia" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGanancia)" />
              <Area type="monotone" dataKey="gasto" stroke="#ef4444" fillOpacity={1} fill="url(#colorGasto)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segunda fila: Netwin Diario y Top Agentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Netwin Diario */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-center py-3 rounded-xl mb-6">
            <h3 className="text-xl font-bold">Netwin Diario</h3>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dataNetwinDiario}>
              <defs>
                <linearGradient id="colorGananciaDiaria" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorGastoDiario" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fca5a5" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#fca5a5" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hora" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Area type="monotone" dataKey="ganancia" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGananciaDiaria)" />
              <Area type="monotone" dataKey="gasto" stroke="#ef4444" fillOpacity={1} fill="url(#colorGastoDiario)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Agentes del Mes */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-center py-3 rounded-xl mb-6">
            <h3 className="text-xl font-bold">Top Agentes del mes</h3>
          </div>

          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dataTopAgentes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {dataTopAgentes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Leyenda personalizada */}
          <div className="mt-4 space-y-2">
            {dataTopAgentes.map((agente, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-900/30 rounded-lg hover:bg-gray-900/50 transition-colors">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded shadow-lg"
                    style={{ backgroundColor: agente.color }}
                  ></div>
                  <span className="text-sm text-gray-300">{agente.name}</span>
                </div>
                <span className="text-sm font-semibold text-white">{agente.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
