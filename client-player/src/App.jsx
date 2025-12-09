import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CasinoLobby from './components/CasinoLobby';
import StarterRoom from './components/StarterRoom';
import BronzeRoom from './components/BronzeRoom';
import SilverRoom from './components/SilverRoom';
import GoldRoom from './components/GoldRoom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CasinoLobby />} />
        <Route path="/sala/starter" element={<StarterRoom />} />
        <Route path="/sala/bronce" element={<BronzeRoom />} />
        <Route path="/sala/plata" element={<SilverRoom />} />
        <Route path="/sala/oro" element={<GoldRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
