import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/audit-logs?page=${page}&limit=50`;
      if (action) url += `&action=${encodeURIComponent(action)}`;
      if (result) url += `&result=${encodeURIComponent(result)}`;
      const res = await api.get(url);
      setLogs(res.data?.logs || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [action, result, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a5c38', margin: 0 }}>
            Security & Audit Logs
          </h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
            Immutable audit trail of sales, inventory deductions, approvals, and access events (ISO/IEC 25010 & NIST compliance).
          </p>
        </div>
        <button
          onClick={fetchLogs}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1a5c38',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter and Content Card */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>
              Action Filter
            </label>
            <input
              type="text"
              placeholder="e.g. CHECKOUT, LOGIN"
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>
              Result
            </label>
            <select
              value={result}
              onChange={(e) => { setResult(e.target.value); setPage(1); }}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
            >
              <option value="">All Results</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILURE">FAILURE</option>
            </select>
          </div>

          {(action || result) && (
            <div style={{ alignSelf: 'flex-end' }}>
              <button
                onClick={() => { setAction(''); setResult(''); setPage(1); }}
                style={{ padding: '7px 14px', background: '#e2e3e5', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
              >
                Clear Filters
              </button>
            </div>
          )}

          <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', fontSize: '13px', color: '#666' }}>
            Total Logged Events: <strong>{total}</strong>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#888' }}>No audit logs found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', background: '#f9f9f9', color: '#555' }}>
                  <th style={{ padding: '10px 12px' }}>Timestamp</th>
                  <th style={{ padding: '10px 12px' }}>User</th>
                  <th style={{ padding: '10px 12px' }}>Role</th>
                  <th style={{ padding: '10px 12px' }}>Action</th>
                  <th style={{ padding: '10px 12px' }}>Target Table</th>
                  <th style={{ padding: '10px 12px' }}>Record ID</th>
                  <th style={{ padding: '10px 12px' }}>Result</th>
                  <th style={{ padding: '10px 12px' }}>Details / Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#666' }}>
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: '500' }}>{l.username || `User #${l.user_id || 'Sys'}`}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', background: '#eef2f5', padding: '2px 6px', borderRadius: '4px' }}>
                        {l.role || 'system'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: '600', color: '#1a5c38' }}>
                      {l.action}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#666' }}>{l.affected_table || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#666' }}>{l.affected_id || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: l.result === 'SUCCESS' ? '#d4edda' : '#f8d7da',
                          color: l.result === 'SUCCESS' ? '#155724' : '#721c24',
                        }}
                      >
                        {l.result}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: l.error_info ? '#dc3545' : '#888', maxWidth: '300px', wordBreak: 'break-word' }}>
                      {l.error_info || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
