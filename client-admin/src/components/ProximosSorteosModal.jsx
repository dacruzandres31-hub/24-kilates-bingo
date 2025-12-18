import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, X } from 'lucide-react';

export default function ProximosSorteosModal({ room, onClose }) {
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (room) {
      fetchNextDraws();
    }
  }, [room]);

  const getToken = () => localStorage.getItem('adminToken');

  const fetchNextDraws = async () => {
    try {
      const response = await axios.get(`/api/admin/schedules/${room}/next?limit=10`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setDraws(response.data.nextDraws);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching next draws:', error);
      setLoading(false);
    }
  };

  const getRoomIcon = (room) => {
    const icons = {
      starter: '🎁',
      bronce: '🥉',
      plata: '🥈',
      oro: '🥇'
    };
    return icons[room] || '🎲';
  };

  const getRoomColor = (room) => {
    const colors = {
      starter: 'from-purple-900/40 to-purple-800/20 border-purple-500/30',
      bronce: 'from-orange-900/40 to-orange-800/20 border-orange-500/30',
      plata: 'from-gray-600/40 to-gray-700/20 border-gray-400/30',
      oro: 'from-yellow-600/40 to-yellow-700/20 border-yellow-400/30'
    };
    return colors[room] || 'from-gray-800 to-gray-900 border-gray-700';
  };

  const getDaysUntilText = (daysUntil) => {
    if (daysUntil === 0) return 'Hoy';
    if (daysUntil === 1) return 'Mañana';
    return `En ${daysUntil} días`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`bg-gradient-to-br ${getRoomColor(room)} rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden border`}>
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getRoomIcon(room)}</span>
              <div>
                <h2 className="text-2xl font-bold text-white capitalize">
                  Próximos Sorteos - Sala {room}
                </h2>
                <p className="text-sm text-gray-400">
                  Horarios programados para esta sala
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-400">Cargando próximos sorteos...</div>
            </div>
          ) : draws.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No hay sorteos programados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {draws.map((draw, index) => (
                <div
                  key={index}
                  className={`bg-black/20 rounded-lg p-4 flex items-center justify-between hover:bg-black/30 transition-colors ${
                    draw.days_until === 0 ? 'ring-2 ring-green-500/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                      draw.days_until === 0 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-white">
                        {draw.display_text}
                      </div>
                      <div className="text-sm text-gray-400">
                        {getDaysUntilText(draw.days_until)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-5 h-5" />
                    <span className="font-mono text-lg">
                      {draw.hour.substring(0, 5)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
