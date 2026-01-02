import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import LoginPlayer from './pages/LoginPlayer';
import RegisterPlayer from './pages/RegisterPlayer';
import CasinoLobby from './components/CasinoLobby';
import StarterRoom from './components/StarterRoom';
import BronzeRoom from './components/BronzeRoom';
import SilverRoom from './components/SilverRoom';
import GoldRoom from './components/GoldRoom';
import StreakModal from './components/Gamification/StreakModal';
import MembershipPage from './pages/MembershipPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakData, setStreakData] = useState(null);

  // Safety check for parsing user data
  const parseUserData = (data) => {
    try {
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error parsing user data:', e);
      localStorage.removeItem('playerUser');
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('playerToken');
    const savedUser = localStorage.getItem('playerUser');

    if (token && savedUser) {
      const parsedUser = parseUserData(savedUser);
      if (parsedUser) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(parsedUser);
        setIsAuthenticated(true);
      }
    }

    setLoading(false);
  }, []);

  const handleLogin = (token, userData, gamificationData) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    setIsAuthenticated(true);

    if (gamificationData && gamificationData.streak && !gamificationData.streak.error) {
      setStreakData(gamificationData.streak);
      setShowStreakModal(true);
    }
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

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPlayer onLogin={handleLogin} /> : <Navigate to="/" />}
        />
        <Route
          path="/register"
          element={!isAuthenticated ? <RegisterPlayer /> : <Navigate to="/" />}
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={isAuthenticated ? <CasinoLobby user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route
          path="/sala/starter/:sessionId?"
          element={isAuthenticated ? <StarterRoom user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route
          path="/sala/bronce/:sessionId?"
          element={isAuthenticated ? <BronzeRoom user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route
          path="/sala/plata/:sessionId?"
          element={isAuthenticated ? <SilverRoom user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route
          path="/sala/oro/:sessionId?"
          element={isAuthenticated ? <GoldRoom user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route
          path="/membresia"
          element={isAuthenticated ? <MembershipPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>

      {showStreakModal && streakData && (
        <StreakModal
          streak={streakData.streak}
          onClose={() => setShowStreakModal(false)}
        />
      )}
    </Router>
  );
}

export default App;
