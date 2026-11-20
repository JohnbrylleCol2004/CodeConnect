import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/');
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to backend server. Please verify the backend is running on http://localhost:5000.');
      } else {
        setError(
          err.response?.data?.message ||
          err.response?.data?.error ||
          'Login failed. Please check your credentials.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a5c38',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '800',
            color: '#1a5c38',
            letterSpacing: '-0.5px',
            marginBottom: '6px',
          }}>
            🌿 FreshFlow POS
          </div>
          <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
            Point of Sale System
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#444',
              marginBottom: '6px',
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="Enter your username"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #ccc',
                borderRadius: '7px',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#1a5c38')}
              onBlur={(e) => (e.target.style.borderColor = '#ccc')}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#444',
              marginBottom: '6px',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1.5px solid #ccc',
                borderRadius: '7px',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#1a5c38')}
              onBlur={(e) => (e.target.style.borderColor = '#ccc')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#4a8c5c' : '#1a5c38',
              color: '#fff',
              border: 'none',
              borderRadius: '7px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              letterSpacing: '0.3px',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {error && (
            <div style={{
              marginTop: '14px',
              color: '#c0392b',
              fontSize: '13px',
              textAlign: 'center',
              background: '#fdf0ee',
              border: '1px solid #f5c6c0',
              borderRadius: '6px',
              padding: '8px 12px',
            }}>
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
