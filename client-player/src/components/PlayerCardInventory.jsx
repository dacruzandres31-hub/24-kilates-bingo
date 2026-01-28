import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  PlayCircle,
  Eye,
  Gift
} from 'lucide-react';

/**
 * Componente para que los jugadores vean su inventario de cartones
 * y validen cartones antes de entrar a una sala de juego
 */
export default function PlayerCardInventory({ 
  onCardsValidated, // Callback cuando se validan cartones exitosamente
  showValidation = false, // Si mostrar el botón de validación
  sessionId = null, // ID de sesión para validar
  room = 'bronce' // Sala actual
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [inventory, setInventory] = useState([]);
  const [validatedCards, setValidatedCards] = useState([]);
  const [cardsToValidate, setCardsToValidate] = useState(1);
  const [activeTab, setActiveTab] = useState('inventory'); // inventory, validated

  useEffect(() => {
    fetchMyInventory();
    if (sessionId) {
      fetchValidatedCards();
    }
  }, [sessionId]);

  const getToken = () => localStorage.getItem('playerToken') || localStorage.getItem('token');

  // ==================== INVENTARIO ====================
  const fetchMyInventory = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/game/my-inventory', {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setInventory(response.data.inventories || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setMessage({
        type: 'error',
        text: `Error al cargar inventario: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== CARTONES VALIDADOS ====================
  const fetchValidatedCards = async () => {
    if (!sessionId) return;

    try {
      const response = await axios.get(`/api/game/my-validated-cards/${sessionId}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setValidatedCards(response.data.cards || []);
    } catch (error) {
      console.error('Error fetching validated cards:', error);
    }
  };

  // ==================== VALIDAR CARTONES ====================
  const handleValidateCards = async () => {
    if (!sessionId) {
      setMessage({ type: 'error', text: 'No hay sesión activa' });
      return;
    }

    if (cardsToValidate < 1 || cardsToValidate > 20) {
      setMessage({ type: 'error', text: 'Debes validar entre 1 y 20 cartones' });
      return;
    }

    const currentRoomInventory = inventory.find(inv => inv.room === room);
    if (!currentRoomInventory || currentRoomInventory.total_cards < cardsToValidate) {
      setMessage({ 
        type: 'error', 
        text: `No tienes suficientes cartones. Disponibles: ${currentRoomInventory?.total_cards || 0}` 
      });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(
        '/api/game/validate-cards',
        {
          gameSessionId: sessionId,
          room: room,
          quantity: cardsToValidate
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      setMessage({
        type: 'success',
        text: `✅ ${response.data.validatedCount} cartones validados exitosamente!`
      });

      // Actualizar inventario y cartones validados
      await fetchMyInventory();
      await fetchValidatedCards();

      // Callback para actualizar UI padre
      if (onCardsValidated) {
        onCardsValidated(response.data.cards);
      }

      // Limpiar cantidad
      setCardsToValidate(1);
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Error: ${error.response?.data?.error || error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // ==================== UTILIDADES ====================
  const getTotalCards = () => {
    return inventory.reduce((sum, inv) => sum + inv.total_cards, 0);
  };

  const getCardsForRoom = (targetRoom) => {
    const inv = inventory.find(i => i.room === targetRoom);
    return inv?.total_cards || 0;
  };

  // ==================== RENDER ====================
  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-lg p-4 border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Mis Cartones</h3>
              <p className="text-xs text-gray-300">Total disponible: {getTotalCards()}</p>
            </div>
          </div>
          <button
            onClick={fetchMyInventory}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {message.text && (
        <div className={`p-3 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-900/20 border-green-500/50 text-green-300'
            : 'bg-red-900/20 border-red-500/50 text-red-300'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <p>{message.text}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      {sessionId && (
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Package className="w-4 h-4" />
            Inventario
          </button>
          <button
            onClick={() => setActiveTab('validated')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'validated'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            Validados ({validatedCards.length})
          </button>
        </div>
      )}

      {/* Contenido */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Inventario por sala */}
          <div className="grid grid-cols-3 gap-3">
            {['bronce', 'plata', 'oro'].map((targetRoom) => {
              const available = getCardsForRoom(targetRoom);
              const isCurrentRoom = targetRoom === room;
              return (
                <div
                  key={targetRoom}
                  className={`rounded-lg p-3 border ${
                    isCurrentRoom
                      ? 'bg-blue-900/30 border-blue-500/50'
                      : 'bg-gray-800/50 border-gray-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">
                      {targetRoom === 'bronce' ? '🥉' : targetRoom === 'plata' ? '🥈' : '🥇'}{' '}
                      {targetRoom.toUpperCase()}
                    </div>
                    <div className={`text-2xl font-bold ${
                      available > 0 ? 'text-white' : 'text-gray-600'
                    }`}>
                      {available}
                    </div>
                    {isCurrentRoom && (
                      <div className="text-xs text-blue-400 mt-1">
                        Sala actual
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Validación de cartones */}
          {showValidation && sessionId && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-green-400" />
                Validar Cartones para Jugar
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">
                    Cantidad de cartones (máx. 20)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={cardsToValidate}
                    onChange={(e) => setCardsToValidate(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Disponibles en {room}: {getCardsForRoom(room)}
                  </p>
                </div>

                <button
                  onClick={handleValidateCards}
                  disabled={loading || getCardsForRoom(room) < cardsToValidate}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Validar y Jugar
                    </>
                  )}
                </button>
              </div>

              {/* Info sobre límite de regalo */}
              <div className="mt-3 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Gift className="w-4 h-4 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-purple-300 font-semibold">
                      Máximo 10% de cartones regalo
                    </p>
                    <p className="text-xs text-purple-200 mt-1">
                      Los cartones normales y regalo se mezclan automáticamente
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sin cartones */}
          {inventory.length === 0 && !loading && (
            <div className="bg-gray-800/50 rounded-lg p-6 text-center border border-gray-700">
              <Package className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">No tienes cartones en inventario</p>
              <p className="text-sm text-gray-500">
                Contacta con tu administrador para obtener cartones
              </p>
            </div>
          )}
        </div>
      )}

      {/* Cartones validados */}
      {activeTab === 'validated' && (
        <div className="space-y-3">
          {validatedCards.length === 0 ? (
            <div className="bg-gray-800/50 rounded-lg p-6 text-center border border-gray-700">
              <Eye className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No has validado cartones aún</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
              {validatedCards.map((card, idx) => (
                <div
                  key={card.id}
                  className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono text-gray-400">
                        {card.serial}
                      </div>
                      <div className="text-sm text-white mt-1">
                        Cartón #{idx + 1}
                      </div>
                    </div>
                    <div className="text-right">
                      {card.contributed_amount > 0 ? (
                        <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded-full">
                          💰 Normal
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded-full">
                          🎁 Regalo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {validatedCards.length > 0 && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
              <p className="text-sm text-green-300 text-center">
                ✅ {validatedCards.length} cartones listos para jugar
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
