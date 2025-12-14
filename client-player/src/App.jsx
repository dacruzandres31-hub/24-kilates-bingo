import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import LoginPlayer from './pages/LoginPlayer';
import CasinoLobby from './components/CasinoLobby';
import StarterRoom from './components/StarterRoom';
import BronzeRoom from './components/BronzeRoom';
import SilverRoom from './components/SilverRoom';
import GoldRoom from './components/GoldRoom';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay token guardado
    const token = localStorage.getItem('playerToken');
    const savedUser = localStorage.getItem('playerUser');

    if (token && savedUser) {
      // Configurar axios con el token
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    // Configurar axios con el token
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('playerToken');
    localStorage.removeItem('playerUser');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPlayer onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<CasinoLobby user={user} onLogout={handleLogout} />} />
        <Route path="/sala/starter" element={<StarterRoom user={user} onLogout={handleLogout} />} />
        <Route path="/sala/bronce" element={<BronzeRoom user={user} onLogout={handleLogout} />} />
        <Route path="/sala/plata" element={<SilverRoom user={user} onLogout={handleLogout} />} />
        <Route path="/sala/oro" element={<GoldRoom user={user} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
