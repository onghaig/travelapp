import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Confirmation from './pages/Confirmation';
import MyTrip from './pages/MyTrip';
import { getToken } from './lib/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber rounded-full border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={isAuthenticated ? <Chat onAuthChange={setIsAuthenticated} isAuthenticated={isAuthenticated} /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" /> : <Login onAuthChange={setIsAuthenticated} />}
        />
        <Route
          path="/dashboard/:tripId"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/" />}
        />
        <Route
          path="/confirmation/:tripId"
          element={isAuthenticated ? <Confirmation /> : <Navigate to="/" />}
        />
        <Route
          path="/my-trip/:tripId"
          element={isAuthenticated ? <MyTrip /> : <Navigate to="/" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
