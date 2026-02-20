import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="loader" ></div></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="loader" ></div></div>;
  return user ? <Navigate to="/" replace /> : children;
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
            error: { iconTheme: { primary: '#ff4d6d', secondary: '#05080f' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage></LoginPage></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout></Layout></ProtectedRoute>}>
            <Route index element={<DashboardPage></DashboardPage>} ></Route>
            <Route path="orders" element={<OrdersPage></OrdersPage>} ></Route>
            <Route path="riders" element={<RidersPage></RidersPage>} ></Route>
            <Route path="admins" element={<AdminsPage></AdminsPage>} ></Route>
            <Route path="pricing" element={<PricingPage></PricingPage>} ></Route>
            <Route path="offers" element={<OffersPage></OffersPage>} ></Route>
            <Route path="disputes" element={<DisputesPage></DisputesPage>} ></Route>
            <Route path="payments" element={<PaymentsPage></PaymentsPage>} ></Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace></Navigate>} ></Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
