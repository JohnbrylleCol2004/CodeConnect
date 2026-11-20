import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

function getWasteBadge(status) {
  const s = (status || '').toUpperCase();
  const styles = {
    NOT_WASTED: { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
    DISCOUNTED: { bg: '#cce5ff', color: '#004085', border: '#b8daff' },
    REMOVED: { bg: '#fff3cd', color: '#856404', border: '#ffeeba' },
    WASTED: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
  };
  const conf = styles[s] || { bg: '#e2e3e5', color: '#383d41', border: '#d6d8db' };
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: conf.bg,
        color: conf.color,
        border: `1px solid ${conf.border}`,
      }}
    >
      {s || 'UNKNOWN'}
    </span>
  );
}

export default function WasteHistoryPage() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchWasteData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/reports/waste?limit=100';
      if (from) url += `&from=${from}`;
      if (to) url += `&to=${to}`;
      const res = await api.get(url);
      setRecords(res.data?.records || []);
      setSummary(res.data?.summary || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load waste history');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchWasteData();
  }, [fetchWasteData]);

  // Compute total value lost from WASTED status
  const totalWastedCost = summary
    .filter((s) => s.waste_status === 'WASTED')
    .reduce((acc, curr) => acc + (parseFloat(curr.total_cost_value) || 0), 0);

  const totalDiscountedCost = summary
    .filter((s) => s.waste_status === 'DISCOUNTED')
    .reduce((acc, curr) => acc + (parseFloat(curr.total_cost_value) || 0), 0);

  const totalWastedUnits = summary
    .filter((s) => s.waste_status === 'WASTED')
    .reduce((acc, curr) => acc + (parseInt(curr.total_qty, 10) || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a5c38', margin: 0 }}>
            Waste History & Records
          </h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
            Traceable log of all actions taken on expired or near-expiry inventory.
          </p>
        </div>
        <button
          onClick={fetchWasteData}
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

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Total Waste Actions</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#333' }}>{total}</div>
        </div>
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', color: '#dc3545', marginBottom: '4px' }}>Total Units Wasted</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#dc3545' }}>{totalWastedUnits}</div>
        </div>
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', color: '#721c24', marginBottom: '4px' }}>Value Lost to Waste</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#721c24' }}>
            ₱{totalWastedCost.toFixed(2)}
          </div>
        </div>
        <div style={{ background: 'white', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', color: '#004085', marginBottom: '4px' }}>Discounted Inventory Value</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#004085' }}>
            ₱{totalDiscountedCost.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#555' }}>From:</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: '#555' }}>To:</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
            />
          </div>
          {(from || to) && (
            <button
              onClick={() => { setFrom(''); setTo(''); }}
              style={{ padding: '6px 12px', background: '#e2e3e5', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
            >
              Clear Filter
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Loading waste history...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#888' }}>No waste records found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', background: '#f9f9f9', color: '#555' }}>
                  <th style={{ padding: '10px 12px' }}>Date & Time</th>
                  <th style={{ padding: '10px 12px' }}>Product</th>
                  <th style={{ padding: '10px 12px' }}>Batch</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Quantity</th>
                  <th style={{ padding: '10px 12px' }}>Cost Loss (₱)</th>
                  <th style={{ padding: '10px 12px' }}>Reason / Notes</th>
                  <th style={{ padding: '10px 12px' }}>Authorized By</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const costLoss = (parseFloat(r.cost_price) || 0) * (parseInt(r.quantity, 10) || 0);
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#666' }}>
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '500' }}>{r.product_name}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{r.batch_number}</td>
                      <td style={{ padding: '10px 12px' }}>{getWasteBadge(r.waste_status)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{r.quantity}</td>
                      <td style={{ padding: '10px 12px', color: r.waste_status === 'WASTED' ? '#dc3545' : '#333' }}>
                        ₱{costLoss.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#555' }}>{r.notes || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#333' }}>{r.manager_name || 'System/Manager'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
