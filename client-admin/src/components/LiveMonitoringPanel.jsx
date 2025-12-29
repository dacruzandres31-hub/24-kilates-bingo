import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Play, Users, Trophy, Clock, History, Search } from 'lucide-react';

export default function LiveMonitoringPanel({ userRole }) {
  const [activeSessions, setActiveSessions] = useState([]);
  const [liveDataByRoom, setLiveDataByRoom] = useState({});
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getToken = useCallback(() => localStorage.getItem('adminToken'), []);

  useEffect(() => {
    fetchInitialData();
    const activeInterval = setInterval(fetchActiveSessions, 10000); // 10s para ver si hay nuevas sesiones
    const liveInterval = setInterval(fetchAllLiveData, 4000); // 4s para actualizar datos en vivo
    return () => {
      clearInterval(activeInterval);
      clearInterval(liveInterval);
    };
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchActiveSessions(),
      fetchRecentSessions()
    ]);
    setLoading(false);
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await axios.get('/api/admin/sessions/active', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      // Tomamos tanto 'active' como 'playing'
      const playing = response.data.rooms?.map(r => r.currentSession).filter(s => s && ['active', 'playing'].includes(s.status)) || [];
      setActiveSessions(playing);
    } catch (err) {
      console.error('Error fetching active sessions:', err);
    }
  };

  const fetchRecentSessions = async () => {
    try {
      const response = await axios.get('/api/admin/sessions/recent?limit=10', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setRecentSessions(response.data.sessions || []);
    } catch (err) {
      console.error('Error fetching recent sessions:', err);
    }
  };

  const fetchAllLiveData = async () => {
    if (activeSessions.length === 0) return;

    try {
      const livePromises = activeSessions.map(session =>
        axios.get(`/api/admin/sessions/${session.id}/live`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        }).then(res => ({ room: session.room, data: res.data }))
          .catch(e => {
            console.error(`Error fetching live data for ${session.room}:`, e);
            return null;
          })
      );

      const results = await Promise.all(livePromises);
      const newLiveData = { ...liveDataByRoom };

      results.forEach(res => {
        if (res) {
          newLiveData[res.room] = res.data;
        }
      });

      setLiveDataByRoom(newLiveData);
    } catch (err) {
      console.error('Error in fetchAllLiveData:', err);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getRoomIcon = (room) => {
    const icons = { bronce: '🥉', plata: '🥈', oro: '🥇', starter: '🎁' };
    return icons[room] || '🎲';
  };

  const RenderQuadrant = ({ roomName }) => {
    const liveSession = activeSessions.find(s => s.room === roomName);
    const data = liveDataByRoom[roomName];

    if (!liveSession) {
      return (
        <div className="bg-gray-900/40 rounded-2xl border border-gray-800 p-6 flex flex-col items-center justify-center min-h-[300px] text-center border-dashed">
          <div className="text-4xl opacity-20 mb-3">{getRoomIcon(roomName)}</div>
          <h4 className="text-gray-500 font-bold uppercase tracking-widest text-sm">Sala {roomName}</h4>
          <p className="text-gray-600 text-xs mt-2 italic font-medium">Sin sesión activa</p>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 p-5 shadow-xl flex flex-col h-full relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <span className="text-7xl">{getRoomIcon(roomName)}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getRoomIcon(roomName)}</span>
              <h4 className="text-xl font-black text-white capitalize tracking-tight">Sala {roomName}</h4>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-black/40 text-gray-400 px-2 py-0.5 rounded text-[10px] font-mono border border-white/5">
                ID: {liveSession.id}
              </span>
              <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-green-500/20">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                En Vivo
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-purple-900/30 px-3 py-1 rounded-lg border border-purple-500/20">
              <p className="text-[10px] text-purple-300 uppercase font-black tracking-widest leading-none mb-1">Cartones</p>
              <p className="text-xl font-black text-white leading-none">{liveSession.total_cards_validated || 0}</p>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-black/30 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Jugadores</span>
            </div>
            <p className="text-lg font-bold text-white">{data?.stats?.unique_players || 0}</p>
          </div>
          <div className="bg-black/30 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <Trophy className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Bolas</span>
            </div>
            <p className="text-lg font-bold text-white">{data?.stats?.total_balls || 0}/90</p>
          </div>
        </div>

        {/* Real-time Content Area: Balls & Winners */}
        <div className="flex-1 grid grid-cols-1 gap-4 overflow-hidden">
          {/* Recent Balls */}
          <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex flex-col">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Secuencia de Bolas
            </p>
            <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-[80px] custom-scrollbar">
              {data?.balls?.slice(-15).map((num, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${i === data.balls.slice(-15).length - 1
                      ? 'bg-yellow-500 text-black scale-110 shadow-lg shadow-yellow-500/40 animate-bounce'
                      : 'bg-gray-700 text-gray-300'}`}
                >
                  {num}
                </div>
              ))}
              {(!data?.balls || data.balls.length === 0) && (
                <span className="text-[10px] text-gray-600 italic">Esperando inicio...</span>
              )}
            </div>
          </div>

          {/* Winners List */}
          <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex flex-col">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2 flex items-center gap-1">
              <Trophy className="w-3 h-3" /> Ganadores de Línea / Bingo
            </p>
            <div className="space-y-1.5 overflow-y-auto max-h-[100px] custom-scrollbar">
              {data?.winners?.slice(0, 3).map((w, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{w.prize_type === 'linea' ? '📏' : '🎯'}</span>
                    <div className="leading-tight">
                      <p className="text-[11px] font-bold text-white truncate max-w-[80px]">{w.username}</p>
                      <p className="text-[9px] text-gray-500 uppercase">{w.prize_type} - B#{w.ball_number}</p>
                    </div>
                  </div>
                  <p className="text-[11px] font-black text-green-400">
                    {roomName === 'starter' ? 'TICKET' : formatMoney(w.prize_amount)}
                  </p>
                </div>
              ))}
              {(!data?.winners || data.winners.length === 0) && (
                <span className="text-[10px] text-gray-600 italic">Sin ganadores aún</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-500">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Play className="w-8 h-8 text-blue-400 fill-blue-400" />
            </div>
            MONITOREO MULTI-SALA
          </h2>
          <p className="text-gray-400 text-sm mt-1 ml-1">Supervisión en tiempo real de todas las mesas de juego</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchInitialData}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl border border-gray-700 transition-all flex items-center gap-2 text-sm font-bold uppercase tracking-widest"
          >
            <History className="w-4 h-4" /> Refrescar
          </button>
        </div>
      </div>

      {/* 4 Quadrants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RenderQuadrant roomName="starter" />
        <RenderQuadrant roomName="bronce" />
        <RenderQuadrant roomName="plata" />
        <RenderQuadrant roomName="oro" />
      </div>

      {/* Archive Section */}
      <div className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-1.5 bg-purple-500/20 rounded-lg">
            <History className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-xl font-black text-white tracking-widest uppercase">Archivo de Sesiones</h3>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-black/30">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sala</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sesión ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Cartones</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentSessions.map((session, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getRoomIcon(session.room)}</span>
                      <span className="text-sm font-bold text-white capitalize">{session.room}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-400 group-hover:text-purple-400 transition-colors">#{session.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-300 font-medium">
                        {new Date(session.start_time).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">
                        {new Date(session.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-purple-500/10 text-purple-300 px-3 py-1 rounded-full text-xs font-black">
                      {session.total_cards_validated || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5 bg-gray-500/10 text-gray-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-500/20">
                      <CheckCircle className="w-3 h-3" /> Archivado
                    </div>
                  </td>
                </tr>
              ))}
              {recentSessions.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">No hay sesiones en el archivo histórico</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}

function CheckCircle(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
