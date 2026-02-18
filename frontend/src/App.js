import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AlertsPage from './pages/AlertsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPanel from './pages/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import Breadcrumbs from './components/Breadcrumbs';
import LandingPage from './pages/LandingPage';
import KpiDetail from './pages/KpiDetail';
import ProductsPage from './pages/ProductsPage';
import ProductDetail from './pages/ProductDetail';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    const onAuth = () => setIsAuthenticated(!!localStorage.getItem('token'));
    window.addEventListener('authChanged', onAuth);
    return () => window.removeEventListener('authChanged', onAuth);
  }, []);

  // simple placeholder: alertsCount could be fetched from API later
  useEffect(() => {
    setAlertsCount(0);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      {!isAuthenticated ? (
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      ) : (
        <div className="min-h-screen bg-gray-100">
          <nav className="bg-white shadow p-4 mb-2">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <NavLink to="/" className={({ isActive }) => isActive ? 'font-bold text-lg' : 'text-lg'}>Dashboard</NavLink>
                <NavLink to="/reports" className={({ isActive }) => isActive ? 'text-blue-600' : ''}>Reports</NavLink>
                <NavLink to="/products" className={({ isActive }) => isActive ? 'text-blue-600' : ''}>Products</NavLink>
                <NavLink to="/settings" className={({ isActive }) => isActive ? 'text-blue-600' : ''}>Settings</NavLink>
                {JSON.parse(localStorage.getItem('user') || 'null')?.isAdmin && (
                  <NavLink to="/admin" className={({ isActive }) => isActive ? 'text-blue-600' : ''}>Admin</NavLink>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <div className="hidden sm:block">
                  <NavLink to="/alerts" className={({ isActive }) => isActive ? 'relative text-blue-600' : 'relative'}>
                    Alerts
                    {alertsCount > 0 && (
                      <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, padding: '2px 6px', fontSize: 12, position: 'absolute', top: -8, right: -18 }}>{alertsCount}</span>
                    )}
                  </NavLink>
                </div>

                <div className="sm:hidden">
                  <button onClick={() => setMenuOpen(!menuOpen)} className="btn-secondary">Menu</button>
                </div>

                <div className="hidden sm:block">
                  {isAuthenticated ? (
                    <button onClick={logout} className="btn-secondary">Logout</button>
                  ) : (
                    <NavLink to="/login" className={({ isActive }) => isActive ? 'text-blue-600' : ''}>Login</NavLink>
                  )}
                </div>
              </div>
            </div>

            {menuOpen && (
              <div className="sm:hidden p-4">
                <NavLink to="/alerts">Alerts {alertsCount > 0 && (<span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, padding: '2px 6px', fontSize: 12 }}>{alertsCount}</span>)}</NavLink>
                <div style={{ marginTop: 8 }}>
                  {isAuthenticated ? (
                    <button onClick={logout} className="btn-secondary">Logout</button>
                  ) : (
                    <NavLink to="/login">Login</NavLink>
                  )}
                </div>
              </div>
            )}
          </nav>

          <Breadcrumbs />

          <main className="container mx-auto p-4">
            <Routes>
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/kpi/:id" element={<ProtectedRoute><KpiDetail /></ProtectedRoute>} />
              <Route path="/kpi/:id/projection" element={<ProtectedRoute><KpiDetail /></ProtectedRoute>} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/product/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminPanel /></ProtectedRoute>} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;