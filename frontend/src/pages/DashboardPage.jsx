import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingAlerts: 0,
    highRiskItems: 0,
    todaySales: null,
  });

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [productsRes, alertsRes, risksRes, wasteRes] = await Promise.allSettled([
        api.get('/products'),
        api.get('/alerts'),
        api.get('/expiry/risks'),
        api.get('/reports/waste'),
      ]);

      const totalProducts =
        productsRes.status === 'fulfilled'
          ? Array.isArray(productsRes.value.data)
            ? productsRes.value.data.length
            : productsRes.value.data?.total ?? 0
          : 0;

      const pendingAlerts =
        alertsRes.status === 'fulfilled'
          ? (() => {
              const data = alertsRes.value.data;
              const list = Array.isArray(data) ? data : (data?.alerts || []);
              return list.filter((a) => a.status === 'PENDING').length;
            })()
          : 0;

      const highRiskItems =
        risksRes.status === 'fulfilled'
          ? (() => {
              const data = risksRes.value.data;
              const list = Array.isArray(data) ? data : (data?.risks || []);
              return list.filter(
                (r) => r.risk_level === 'HIGH' || r.risk_level === 'EXPIRED'
              ).length;
            })()
          : 0;

      const todaySales =
        wasteRes.status === 'fulfilled'
          ? (() => {
              const data = wasteRes.value.data;
              return data?.today_total ?? data?.total_amount ?? data?.sales_count ?? null;
            })()
          : null;

      setStats({ totalProducts, pendingAlerts, highRiskItems, todaySales });
      setLoading(false);
    }
    fetchAll();
  }, []);

  const cards = [
    {
      label: 'Total Products',
      value: stats.totalProducts,
      borderColor: '#1565c0',
      bg: '#e3f2fd',
      icon: '📦',
      iconColor: '#1565c0',
    },
    {
      label: 'Pending Alerts',
      value: stats.pendingAlerts,
      borderColor: '#e65100',
      bg: '#fff3e0',
      icon: '🔔',
      iconColor: '#e65100',
    },
    {
      label: 'High Risk Items',
      value: stats.highRiskItems,
      borderColor: '#c62828',
      bg: '#fce4ec',
      icon: '⚠️',
      iconColor: '#c62828',
    },
    {
      label: "Today's Sales",
      value:
        stats.todaySales !== null
          ? typeof stats.todaySales === 'number' && stats.todaySales > 100
            ? `$${stats.todaySales.toFixed(2)}`
            : stats.todaySales
          : '—',
      borderColor: '#2e7d32',
      bg: '#e8f5e9',
      icon: '💰',
      iconColor: '#2e7d32',
    },
  ];

  const styles = {
    page: { padding: '32px', maxWidth: '1200px', margin: '0 auto' },
    heading: { fontSize: '24px', fontWeight: '700', color: '#1a5c38', marginBottom: '8px' },
    sub: { color: '#666', marginBottom: '32px', fontSize: '14px' },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '20px',
      marginBottom: '40px',
    },
    card: (borderColor) => ({
      background: '#fff',
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }),
    cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardNumber: { fontSize: '36px', fontWeight: '800', color: '#222', lineHeight: 1 },
    cardLabel: { fontSize: '13px', color: '#666', fontWeight: '500', marginTop: '4px' },
    cardIcon: (iconColor) => ({ fontSize: '28px', color: iconColor }),
    skeleton: {
      height: '36px',
      background: 'linear-gradient(90deg, #eee 25%, #ddd 50%, #eee 75%)',
      backgroundSize: '200% 100%',
      borderRadius: '4px',
      animation: 'shimmer 1.2s infinite',
      width: '60px',
    },
    section: { marginBottom: '32px' },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '16px',
      paddingBottom: '8px',
      borderBottom: '2px solid #e0e0e0',
    },
    actionsRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
    actionBtn: (color, bg) => ({
      display: 'inline-block',
      padding: '10px 20px',
      background: bg,
      color: color,
      border: `1px solid ${color}`,
      borderRadius: '6px',
      fontWeight: '600',
      fontSize: '14px',
      textDecoration: 'none',
      transition: 'opacity 0.2s',
      cursor: 'pointer',
    }),
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Manager Dashboard</h1>
      <p style={styles.sub}>Overview of your FreshFlow POS store performance</p>

      <div style={styles.grid}>
        {cards.map((card) => (
          <div key={card.label} style={styles.card(card.borderColor)}>
            <div style={styles.cardTop}>
              <div>
                {loading ? (
                  <div style={styles.skeleton} />
                ) : (
                  <div style={styles.cardNumber}>{card.value}</div>
                )}
                <div style={styles.cardLabel}>{card.label}</div>
              </div>
              <span style={styles.cardIcon(card.iconColor)}>{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Quick Actions</div>
        <div style={styles.actionsRow}>
          <Link to="/expiry-risks" style={styles.actionBtn('#c62828', '#fce4ec')}>
            ⚠️ View Expiry Risks
          </Link>
          <Link to="/alerts" style={styles.actionBtn('#e65100', '#fff3e0')}>
            🔔 Manage Alerts
          </Link>
          <Link to="/reports" style={styles.actionBtn('#1565c0', '#e3f2fd')}>
            📊 View Reports
          </Link>
        </div>
      </div>
    </div>
  );
}
