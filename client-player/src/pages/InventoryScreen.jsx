import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/InventoryScreen.css';

export default function InventoryScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [equipped, setEquipped] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('avatar_frame');
  const [message, setMessage] = useState('');

  const tabs = [
    { id: 'avatar_frame', label: '👤 Marcos Avatar', icon: '🖼️' },
    { id: 'card_skin', label: '🎴 Skins Carton', icon: '✨' },
    { id: 'chat_effect', label: '💬 Efectos Chat', icon: '🌈' },
    { id: 'badge', label: '🏅 Insignias', icon: '⭐' }
  ];

  // Cargar inventario al montar
  useEffect(() => {
    loadInventory();
    loadEquipped();
  }, [user?.id]);

  const loadInventory = async () => {
    try {
      const response = await fetch('/api/inventory', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('No se cargó inventario');
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      setMessage('❌ Error al cargar inventario');
    }
  };

  const loadEquipped = async () => {
    try {
      const response = await fetch('/api/inventory/equipped', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('No se cargó equipado');
      const data = await response.json();
      setEquipped(data.equipped || {});
    } catch (error) {
      console.error('Error loading equipped:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEquip = async (itemId, type) => {
    try {
      const response = await fetch(`/api/inventory/equip/${itemId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('No se equipó');
      
      const data = await response.json();
      setEquipped(prev => ({
        ...prev,
        [type]: {
          id: data.item.id,
          name: data.item.name
        }
      }));
      setMessage(`✅ ${data.item.name} equipado`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error equipping:', error);
      setMessage('❌ Error al equipar');
    }
  };

  const handleUnequip = async (type) => {
    try {
      const response = await fetch(`/api/inventory/unequip/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('No se desequipó');
      
      setEquipped(prev => ({
        ...prev,
        [type]: null
      }));
      setMessage('✅ Desequipado');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error unequipping:', error);
      setMessage('❌ Error al desequipar');
    }
  };

  const getRarityColor = (rarity) => {
    const colors = {
      'common': '#8B8B8B',
      'rare': '#3B82F6',
      'legendary': '#F59E0B'
    };
    return colors[rarity] || '#6B7280';
  };

  const filteredItems = items.filter(item => item.type === activeTab);
  const currentTab = tabs.find(t => t.id === activeTab);

  if (loading) {
    return (
      <div className="inventory-container loading">
        <div className="spinner"></div>
        <p>Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <button className="back-btn" onClick={() => navigate('/lobby')}>
          ← Volver
        </button>
        <h1>🎁 Mi Inventario</h1>
        <div className="header-stats">
          <span>📦 Total: {items.length} ítems</span>
        </div>
      </div>

      {message && (
        <div className="message-banner" style={{
          backgroundColor: message.includes('✅') ? '#10B981' : '#EF4444'
        }}>
          {message}
        </div>
      )}

      <div className="tabs-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="items-grid">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>😢 No tienes {currentTab?.label.toLowerCase()}</p>
            <p className="hint">Gana premios jugando en Sala Starter</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isEquipped = equipped[activeTab]?.id === item.id;
            return (
              <div
                key={item.id}
                className={`item-card ${isEquipped ? 'equipped' : ''}`}
                style={{
                  borderColor: getRarityColor(item.rarity),
                  backgroundColor: `${getRarityColor(item.rarity)}15`
                }}
              >
                {/* Preview */}
                <div className="item-preview">
                  {item.asset_url && (
                    <div
                      className="preview-content"
                      style={{
                        backgroundImage: `url(${item.asset_url})`,
                        backgroundColor: item.color_hex || '#E5E7EB'
                      }}
                    >
                      {item.animation_class && (
                        <div className={`animation-preview ${item.animation_class}`}></div>
                      )}
                    </div>
                  )}
                  {isEquipped && <div className="equipped-badge">✓ EQUIPADO</div>}
                </div>

                {/* Info */}
                <div className="item-info">
                  <h3>{item.name}</h3>
                  <p className="description">{item.description}</p>
                  <div className="rarity-badge" style={{ color: getRarityColor(item.rarity) }}>
                    {item.rarity?.toUpperCase()}
                  </div>
                </div>

                {/* Actions */}
                <div className="item-actions">
                  {isEquipped ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleUnequip(activeTab)}
                    >
                      Desequipar
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleEquip(item.id, activeTab)}
                    >
                      Equipar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Panel */}
      <div className="info-panel">
        <h3>💡 ¿Cómo funcionan los cosméticos?</h3>
        <ul>
          <li>🖼️ <strong>Marcos Avatar:</strong> Decora tu perfil en la sala</li>
          <li>🎴 <strong>Skins Cartón:</strong> Cambia el diseño de tus cartones</li>
          <li>💬 <strong>Efectos Chat:</strong> Personaliza tus mensajes</li>
          <li>🏅 <strong>Insignias:</strong> Muestra tus logros</li>
        </ul>
        <p className="note">
          Los cosméticos se obtienen ganando en <strong>Sala Starter</strong> a las 19:00 hs
        </p>
      </div>
    </div>
  );
}
