import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import RidersPage from './pages/RidersPage';
import AdminsPage from './pages/AdminsPage';
import PricingPage from './pages/PricingPage';
import OffersPage from './pages/OffersPage';
import DisputesPage from './pages/DisputesPage';
import PaymentsPage from './pages/PaymentsPage';
import TrackingPage from './pages/TrackingPage';
import WithdrawalsPage from './pages/WithdrawalsPage';
import EarningsPage from './pages/EarningsPage';
import SecurityDepositsPage from './pages/SecurityDepositsPage';
import HandlingChargePage from './pages/HandlingChargePage';
import ServiceAreaPage from './pages/ServiceAreaPage';
import ProfilePage from './pages/ProfilePage';
import UsersPage from './pages/UsersPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="loader" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="loader" /></div>;
  return user ? <Navigate to="/" replace /> : children;
}

function AppWithNotifications() {
  const { user, accessToken } = useAuth();
  // accessToken comes from AuthContext state — it updates whenever the HTTP
  // interceptor refreshes it (via the 'tokenRefreshed' window event).
  // This causes NotificationProvider to reconnect the socket with a fresh token,
  // fixing the "Invalid token" socket error that happened when the 1h JWT expired.
  return (
    <NotificationProvider accessToken={user ? accessToken : null}>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="orders"   element={<OrdersPage />} />
          <Route path="riders"   element={<RidersPage />} />
          <Route path="admins"   element={<AdminsPage />} />
          <Route path="users"    element={<UsersPage />} />
          <Route path="pricing"  element={<PricingPage />} />
          <Route path="offers"   element={<OffersPage />} />
          <Route path="disputes" element={<DisputesPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="tracking"     element={<TrackingPage />} />
          <Route path="withdrawals" element={<WithdrawalsPage />} />
          <Route path="earnings"     element={<EarningsPage />} />
          <Route path="security-deposits" element={<SecurityDepositsPage />} />
          <Route path="handling-charges"  element={<HandlingChargePage />} />
          <Route path="service-areas"     element={<ServiceAreaPage />} />
          <Route path="profile"           element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#131929',
              color: '#f0f4ff',
              border: '1px solid rgba(255,255,255,0.07)',
              fontFamily: "'Inter', sans-serif",
              fontSize: '13.5px',
            },
            success: { iconTheme: { primary: '#36d399', secondary: '#05080f' } },
            error:   { iconTheme: { primary: '#ff4d6d', secondary: '#05080f' } },
          }}
        />
        <AppWithNotifications />
      </BrowserRouter>
    </AuthProvider>
  );
}