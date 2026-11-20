import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

const sidebarStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '220px',
  height: '100vh',
  background: '#1a5c38',
  color: 'white',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 100,
  overflowY: 'auto',
};

const sidebarTitleStyle = {
  fontWeight: 'bold',
  fontSize: '18px',
  marginBottom: '24px',
  paddingBottom: '16px',
  borderBottom: '1px solid rgba(255,255,255,0.2)',
};

const navLinkStyle = {
  display: 'block',
  color: 'white',
  padding: '10px 15px',
  borderRadius: '6px',
  marginBottom: '4px',
  fontSize: '14px',
  transition: 'background 0.15s',
};

const headerStyle = {
  position: 'fixed',
  top: 0,
  left: '220px',
  right: 0,
  height: '60px',
  background: '#1a5c38',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  zIndex: 99,
};

const contentStyle = {
  marginLeft: '220px',
  paddingTop: '60px',
  minHeight: '100vh',
  background: '#f4f6f9',
};

const contentInnerStyle = {
  padding: '24px',
  minHeight: 'calc(100vh - 60px)',
};

const logoutBtnStyle = {
  color: 'white',
  background: 'transparent',
  border: 'none',
  fontSize: '14px',
  cursor: 'pointer',
  padding: '4px 8px',
};

function NavLink({ to, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      style={{
        ...navLinkStyle,
        background: hovered ? 'rgba(255,255,255,0.15)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </Link>
  );
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const user = getUser();
  const isManager = user && user.role === 'manager';
  const username = user ? user.username : '';

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore logout errors
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  return (
    <>
      {/* Sidebar */}
      <nav style={sidebarStyle}>
        <div style={sidebarTitleStyle}>FreshFlow POS</div>
        <NavLink to="/checkout">🛒 Checkout</NavLink>
        {isManager && (
          <>
            <NavLink to="/dashboard">📊 Dashboard</NavLink>
            <NavLink to="/products">📦 Products</NavLink>
            <NavLink to="/batches">🗃️ Batches</NavLink>
            <NavLink to="/expiry-risks">⏰ Expiry Risks</NavLink>
            <NavLink to="/alerts">🔔 Alerts</NavLink>
            <NavLink to="/waste-history">🗑️ Waste History</NavLink>
            <NavLink to="/reports">📈 Reports</NavLink>
            <NavLink to="/audit-logs">📋 Audit Logs</NavLink>
          </>
        )}
      </nav>

      {/* Top Header */}
      <header style={headerStyle}>
        <span style={{ fontWeight: 'bold', fontSize: '18px' }}>FreshFlow POS</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>👤 {username} |</span>
          <button style={logoutBtnStyle} onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* Main Content */}
      <main style={contentStyle}>
        <div style={contentInnerStyle}>
          {children}
        </div>
      </main>
    </>
  );
}
