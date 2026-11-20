import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const DARK_GREEN = '#1a5c38';

const wasteStatusColor = {
  NOT_WASTED: { background: '#d4edda', color: '#155724' },
  DISCOUNTED:  { background: '#fff3cd', color: '#856404' },
  REMOVED:     { background: '#ffe0b2', color: '#6d3800' },
  WASTED:      { background: '#f8d7da', color: '#721c24' },
};

const riskColors = {
  LOW:     { background: '#d4edda', color: '#155724' },
  MEDIUM:  { background: '#fff3cd', color: '#856404' },
  HIGH:    { background: '#ffe0b2', color: '#6d3800' },
  EXPIRED: { background: '#f8d7da', color: '#721c24' },
};

function StatCard({ label, value, bg }) {
  return (
    <div style={{
      flex: 1, minWidth: 140, background: bg || '#f4f6f9',
      borderRadius: 8, padding: '18px 24px', textAlign: 'center',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: DARK_GREEN }}>{value}</div>
      <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── WASTE REPORT TAB ────────────────────────────────────────────────────────

function WasteReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports/waste');
      setData(Array.isArray(res.data) ? res.data : (res.data?.records || []));
    } catch (e) {
      setError('Failed to load waste report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const totalWasted    = data.filter(r => r.waste_status === 'WASTED').reduce((s, r) => s + (r.quantity || 0), 0);
  const totalDiscounted = data.filter(r => r.waste_status === 'DISCOUNTED').reduce((s, r) => s + (r.quantity || 0), 0);
  const totalRemoved   = data.filter(r => r.waste_status === 'REMOVED').reduce((s, r) => s + (r.quantity || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: DARK_GREEN, margin: 0 }}>Waste Report</h2>
        <button onClick={fetchData} style={{
          background: DARK_GREEN, color: '#fff', border: 'none',
          borderRadius: 6, padding: '8px 18px', fontSize: 14, cursor: 'pointer',
        }}>↻ Refresh</button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total Wasted Qty" value={totalWasted} bg="#fde8ea" />
        <StatCard label="Total Discounted Qty" value={totalDiscounted} bg="#fff9e6" />
        <StatCard label="Total Removed Qty" value={totalRemoved} bg="#fff0e0" />
      </div>

      {loading && <p style={{ color: '#888' }}>Loading…</p>}
      {error   && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && data.length === 0 && (
        <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>No waste records found.</p>
      )}

      {!loading && data.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: DARK_GREEN, color: '#fff' }}>
                {['Product ID', 'Batch ID', 'Waste Status', 'Quantity', 'Notes', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const sc = wasteStatusColor[row.waste_status] || {};
                const bg = i % 2 === 0 ? '#f9f9f9' : '#fff';
                return (
                  <tr key={row.id ?? i} style={{ background: bg }}>
                    <td style={{ padding: '8px 12px' }}>{row.product_id ?? '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{row.batch_id ?? '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        ...sc, padding: '2px 10px', borderRadius: 12,
                        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {row.waste_status ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>{row.quantity ?? '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{row.notes ?? '—'}</td>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── EXPIRY TRENDS TAB ───────────────────────────────────────────────────────

function ExpiryTrends() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [fetchedAt, setFetchedAt] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports/expiry-trends');
      setData(res.data);
      setFetchedAt(new Date());
    } catch (e) {
      setError('Failed to load expiry trends.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Derive columns from first item when data is an array
  const isArray = Array.isArray(data);
  const columns  = isArray && data.length > 0 ? Object.keys(data[0]) : [];

  // Risk distribution
  const riskDist = isArray
    ? data.reduce((acc, r) => {
        if (r.risk_level) acc[r.risk_level] = (acc[r.risk_level] || 0) + 1;
        return acc;
      }, {})
    : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: DARK_GREEN, margin: 0 }}>Expiry Trends</h2>
        <button onClick={fetchData} style={{
          background: DARK_GREEN, color: '#fff', border: 'none',
          borderRadius: 6, padding: '8px 18px', fontSize: 14, cursor: 'pointer',
        }}>↻ Refresh</button>
      </div>

      {fetchedAt && (
        <p style={{ color: '#555', fontSize: 13, marginBottom: 16 }}>
          Expiry Trends as of {fetchedAt.toLocaleString()}
        </p>
      )}

      {loading && <p style={{ color: '#888' }}>Loading…</p>}
      {error   && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && data !== null && (
        <>
          {/* Risk distribution badges */}
          {riskDist && Object.keys(riskDist).length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              {Object.entries(riskDist).map(([level, count]) => {
                const c = riskColors[level] || { background: '#e9ecef', color: '#333' };
                return (
                  <div key={level} style={{
                    ...c, borderRadius: 8, padding: '8px 16px',
                    fontWeight: 600, fontSize: 13,
                  }}>
                    {level}: {count}
                  </div>
                );
              })}
            </div>
          )}

          {isArray ? (
            data.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>No expiry trend data found.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: DARK_GREEN, color: '#fff' }}>
                      {columns.map(col => (
                        <th key={col} style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                          {col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => {
                      const bg = i % 2 === 0 ? '#f9f9f9' : '#fff';
                      return (
                        <tr key={i} style={{ background: bg }}>
                          {columns.map(col => {
                            if (col === 'risk_level') {
                              const c = riskColors[row[col]] || {};
                              return (
                                <td key={col} style={{ padding: '8px 12px' }}>
                                  <span style={{ ...c, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                                    {row[col] ?? '—'}
                                  </span>
                                </td>
                              );
                            }
                            const val = row[col];
                            const display = val === null || val === undefined
                              ? '—'
                              : typeof val === 'object'
                                ? JSON.stringify(val)
                                : String(val);
                            return <td key={col} style={{ padding: '8px 12px' }}>{display}</td>;
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Non-array response: render as key-value pairs */
            <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 20 }}>
              <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('waste');

  const tabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      style={{
        padding: '10px 28px',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
        border: `2px solid ${DARK_GREEN}`,
        borderRadius: '6px 6px 0 0',
        background: activeTab === id ? DARK_GREEN : '#fff',
        color: activeTab === id ? '#fff' : DARK_GREEN,
        marginRight: 4,
        outline: 'none',
        transition: 'background 0.15s',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ color: DARK_GREEN, marginBottom: 20 }}>Reports</h1>

      {/* Tab buttons */}
      <div style={{ borderBottom: `2px solid ${DARK_GREEN}`, marginBottom: 0 }}>
        {tabBtn('waste', 'Waste Report')}
        {tabBtn('expiry', 'Expiry Trends')}
      </div>

      {/* Tab content */}
      <div style={{
        background: '#fff', border: `1px solid #ddd`, borderTop: 'none',
        borderRadius: '0 6px 6px 6px', padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        {activeTab === 'waste'  && <WasteReport />}
        {activeTab === 'expiry' && <ExpiryTrends />}
      </div>
    </div>
  );
}
