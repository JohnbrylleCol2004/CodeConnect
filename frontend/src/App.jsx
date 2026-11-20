import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import CheckoutPage from './pages/CheckoutPage';
import ReceiptPage from './pages/ReceiptPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import BatchesPage from './pages/BatchesPage';
import ExpiryRisksPage from './pages/ExpiryRisksPage';
import AlertsPage from './pages/AlertsPage';
import WasteHistoryPage from './pages/WasteHistoryPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function ManagerRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  const user = getUser();
  if (!user || user.role !== 'manager') return <Navigate to="/checkout" replace />;
  return children;
}

function RootRedirect() {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  const user = getUser();
  if (user && user.role === 'manager') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/checkout" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="/checkout" element={<ProtectedRoute><Layout><CheckoutPage /></Layout></ProtectedRoute>} />
        <Route path="/receipt/:saleId" element={<ProtectedRoute><Layout><ReceiptPage /></Layout></ProtectedRoute>} />
        <Route path="/dashboard" element={<ManagerRoute><Layout><DashboardPage /></Layout></ManagerRoute>} />
        <Route path="/products" element={<ManagerRoute><Layout><ProductsPage /></Layout></ManagerRoute>} />
        <Route path="/batches" element={<ManagerRoute><Layout><BatchesPage /></Layout></ManagerRoute>} />
        <Route path="/expiry-risks" element={<ManagerRoute><Layout><ExpiryRisksPage /></Layout></ManagerRoute>} />
        <Route path="/alerts" element={<ManagerRoute><Layout><AlertsPage /></Layout></ManagerRoute>} />
        <Route path="/waste-history" element={<ManagerRoute><Layout><WasteHistoryPage /></Layout></ManagerRoute>} />
        <Route path="/reports" element={<ManagerRoute><Layout><ReportsPage /></Layout></ManagerRoute>} />
        <Route path="/audit-logs" element={<ManagerRoute><Layout><AuditLogsPage /></Layout></ManagerRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
