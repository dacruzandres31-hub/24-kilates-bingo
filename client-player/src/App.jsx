import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPlayer from './pages/LoginPlayer';
import RegisterPlayer from './pages/RegisterPlayer';
import CasinoLobby from './components/CasinoLobby';
import StarterRoom from './components/StarterRoom';
import BronzeRoom from './components/BronzeRoom';
import SilverRoom from './components/SilverRoom';
import GoldRoom from './components/GoldRoom';
import StreakModal from './components/Gamification/StreakModal';
import MembershipPage from './pages/MembershipPage';
import { AuthProvider, useAuth } from './context/AuthContext';

const AppRoutes = () => {
  const { isAuthenticated, user, logout, gamificationData, setGamificationData } = useAuth();
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakData, setStreakData] = useState(null);

  // Watch for gamification data updates (e.g. from login)
  useEffect(() => {
    if (gamificationData && gamificationData.streak && !gamificationData.streak.error) {
      setStreakData(gamificationData.streak);
      setShowStreakModal(true);
      // Clear it from context so it doesn't pop up again on refresh unless intended (though context resets on refresh)
      setGamificationData(null);
    }
  }, [gamificationData, setGamificationData]);

  if (isAuthenticated === null) return null; // Should be handled by loading in AuthProvider

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPlayer /> : <Navigate to="/" />}
        />
        <Route
          path="/register"
          element={!isAuthenticated ? <RegisterPlayer /> : <Navigate to="/" />}
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={isAuthenticated ? <CasinoLobby /> : <Navigate to="/login" />}
        />
        <Route
          path="/sala/starter/:sessionId?"
          element={isAuthenticated ? <StarterRoom /> : <Navigate to="/login" />}
        />
        <Route
          path="/sala/bronce/:sessionId?"
          element={isAuthenticated ? <BronzeRoom /> : <Navigate to="/login" />}
        />
        <Route
          path="/sala/plata/:sessionId?"
          element={isAuthenticated ? <SilverRoom /> : <Navigate to="/login" />}
        />
        <Route
          path="/sala/oro/:sessionId?"
          element={isAuthenticated ? <GoldRoom /> : <Navigate to="/login" />}
        />
        <Route
          path="/membresia"
          element={isAuthenticated ? <MembershipPage /> : <Navigate to="/login" />}
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
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
