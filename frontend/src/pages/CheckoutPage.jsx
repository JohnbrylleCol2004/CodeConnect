import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

const PAYMENT_METHODS = ['CASH', 'CARD', 'EWALLET'];

export default function CheckoutPage() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const [banner, setBanner] = useState(null); // { type: 'success'|'error'|'pending', message, saleId? }
  const [processing, setProcessing] = useState(false);
  const [qrPayment, setQrPayment] = useState(null);

  const searchTimeout = useRef(null);

  useEffect(() => {
    const saleId = sessionStorage.getItem('pendingQrSaleId');
    if (saleId) setQrPayment({ saleId });
  }, []);

  useEffect(() => {
    if (!qrPayment?.saleId) return;
    let active = true;
    const checkStatus = async () => {
      try {
        const res = await api.get(`/sales/qrph/${qrPayment.saleId}/status`);
        if (!active) return;
        if (res.data.paymentStatus === 'SUCCESS') {
          sessionStorage.removeItem('pendingQrSaleId');
          setCart([]);
          setQrPayment(null);
          navigate(`/receipt/${qrPayment.saleId}`);
        } else if (res.data.paymentStatus === 'REJECTED') {
          sessionStorage.removeItem('pendingQrSaleId');
          setQrPayment(null);
          setBanner({ type: 'error', message: 'QR payment expired or failed. Start a new checkout.' });
        } else {
          setQrPayment(prev => ({ ...prev, image: res.data.qrImage || prev.image, amount: res.data.amount, testUrl: res.data.testUrl || prev.testUrl }));
        }
      } catch (err) {
        if (active) setBanner({ type: 'pending', message: err.response?.data?.error || 'Could not verify payment. Retrying…' });
      }
    };
    checkStatus();
    const timer = setInterval(checkStatus, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [qrPayment?.saleId, navigate]);

  // ── Product Search ──────────────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/products', { params: { search: q } });
        setSearchResults(res.data.products || res.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  // ── Add to Cart ─────────────────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
            : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          unit_price: parseFloat(product.price ?? product.unit_price ?? 0),
          quantity: 1,
          subtotal: parseFloat(product.price ?? product.unit_price ?? 0),
        },
      ];
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  // ── Qty Change ──────────────────────────────────────────────────────────────
  const handleQtyChange = (product_id, qty) => {
    const q = Math.max(1, parseInt(qty) || 1);
    setCart((prev) =>
      prev.map((i) =>
        i.product_id === product_id
          ? { ...i, quantity: q, subtotal: q * i.unit_price }
          : i
      )
    );
  };

  // ── Remove ──────────────────────────────────────────────────────────────────
  const removeFromCart = (product_id) =>
    setCart((prev) => prev.filter((i) => i.product_id !== product_id));

  // ── Cart Total ──────────────────────────────────────────────────────────────
  const cartTotal = cart.reduce((sum, i) => sum + i.subtotal, 0);

  // ── Checkout ────────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0 || qrPayment) return;
    setBanner(null);
    setProcessing(true);

    const user = getUser();
    const saleId = crypto.randomUUID();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), paymentMethod === 'EWALLET' ? 35000 : 10000);

    try {
      const res = await api.post(
        paymentMethod === 'EWALLET' ? '/sales/qrph' : '/sales/checkout',
        {
          saleId,
          cashierId: user?.id,
          items: cart.map(({ product_id, quantity, unit_price }) => ({
            product_id,
            quantity,
            unit_price,
          })),
          paymentMethod,
          totalAmount: cartTotal,
        },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (paymentMethod === 'EWALLET') {
        sessionStorage.setItem('pendingQrSaleId', saleId);
        setQrPayment({ saleId, image: res.data.qrImage, amount: res.data.amount, testUrl: res.data.testUrl });
        setBanner({ type: 'pending', message: 'Ask the customer to scan the QR code. Waiting for payment confirmation.' });
      } else if (res.data.sale?.payment_status === 'SUCCESS') {
        setCart([]);
        navigate(`/receipt/${saleId}`);
      } else {
        setBanner({ type: 'pending', message: 'Checkout is pending. Do not process the cart again until its status is resolved.' });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        setBanner({ type: 'error', message: paymentMethod === 'EWALLET' ? 'QR request timed out. Check PayMongo before starting another payment.' : 'Request timed out. Please try again.' });
      } else {
        setBanner({
          type: 'error',
          message:
            err.response?.data?.message ||
            err.response?.data?.error ||
            'Checkout failed. Please try again.',
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const s = {
    page: { maxWidth: '900px', margin: '0 auto', padding: '24px' },
    h1: { fontSize: '24px', fontWeight: '700', color: '#1a5c38', marginBottom: '20px' },
    card: {
      background: '#fff',
      borderRadius: '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      padding: '20px',
      marginBottom: '20px',
    },
    sectionTitle: { fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '12px' },
    searchInput: {
      width: '100%',
      padding: '10px 14px',
      border: '1.5px solid #ccc',
      borderRadius: '7px',
      fontSize: '15px',
      boxSizing: 'border-box',
      outline: 'none',
    },
    resultItem: {
      padding: '10px 14px',
      cursor: 'pointer',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'background 0.15s',
    },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    th: {
      background: '#f4f6f9',
      padding: '10px 12px',
      textAlign: 'left',
      fontWeight: '600',
      color: '#555',
      borderBottom: '2px solid #e0e0e0',
    },
    td: { padding: '10px 12px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
    qtyInput: {
      width: '60px',
      padding: '4px 8px',
      border: '1px solid #ccc',
      borderRadius: '5px',
      textAlign: 'center',
      fontSize: '14px',
    },
    removeBtn: {
      background: '#fee2e2',
      color: '#c0392b',
      border: 'none',
      borderRadius: '5px',
      padding: '4px 10px',
      fontSize: '13px',
      cursor: 'pointer',
    },
    totalRow: {
      textAlign: 'right',
      marginTop: '12px',
      fontSize: '18px',
      fontWeight: '700',
      color: '#1a5c38',
    },
    pmBtn: (active) => ({
      padding: '9px 20px',
      marginRight: '10px',
      border: `2px solid ${active ? '#1a5c38' : '#ccc'}`,
      borderRadius: '7px',
      background: active ? '#1a5c38' : '#fff',
      color: active ? '#fff' : '#555',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.15s',
    }),
    checkoutBtn: {
      marginTop: '16px',
      padding: '13px 28px',
      background: cart.length === 0 || processing || qrPayment ? '#aaa' : '#1a5c38',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '700',
      cursor: cart.length === 0 || processing || qrPayment ? 'not-allowed' : 'pointer',
      width: '100%',
    },
    successBanner: {
      background: '#d4edda',
      border: '1px solid #c3e6cb',
      color: '#155724',
      padding: '14px 18px',
      borderRadius: '8px',
      marginBottom: '18px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    errorBanner: {
      background: '#f8d7da',
      border: '1px solid #f5c6cb',
      color: '#721c24',
      padding: '14px 18px',
      borderRadius: '8px',
      marginBottom: '18px',
      fontWeight: '600',
    },
    pendingBanner: {
      background: '#fff3cd',
      border: '1px solid #ffeeba',
      color: '#856404',
      padding: '14px 18px',
      borderRadius: '8px',
      marginBottom: '18px',
      fontWeight: '600',
    },
    receiptLink: {
      color: '#1a5c38',
      textDecoration: 'underline',
      fontWeight: '700',
      marginLeft: '6px',
    },
  };

  return (
    <div style={s.page}>
      <h1 style={s.h1}>🛒 Checkout</h1>

      {/* Banners */}
      {banner?.type === 'success' && (
        <div style={s.successBanner}>
          ✅ Sale completed! Receipt:
          <Link to={`/receipt/${banner.saleId}`} style={s.receiptLink}>
            View Receipt
          </Link>
        </div>
      )}
      {banner?.type === 'error' && (
        <div style={s.errorBanner}>❌ {banner.message}</div>
      )}
      {banner?.type === 'pending' && (
        <div style={s.pendingBanner}>⏳ {banner.message}</div>
      )}
      {qrPayment && (
        <div style={{ ...s.card, textAlign: 'center' }}>
          <h2 style={{ color: '#1a5c38' }}>Scan to pay with QR Ph</h2>
          {qrPayment.image ? (
            <img src={qrPayment.image.startsWith('data:') ? qrPayment.image : `data:image/png;base64,${qrPayment.image}`} alt="PayMongo QR Ph payment code" style={{ width: 260, maxWidth: '100%' }} />
          ) : <p>Loading QR code…</p>}
          <p>₱{Number(qrPayment.amount ?? cartTotal).toFixed(2)} · Waiting for payment confirmation</p>
          {qrPayment.testUrl && <p><a href={qrPayment.testUrl} target="_blank" rel="noreferrer" style={{ color: '#1a5c38', textDecoration: 'underline' }}>Simulate payment in PayMongo test mode</a></p>}
          <p style={{ color: '#666', fontSize: 13 }}>The QR code expires after about 30 minutes. Keep this page open until payment is confirmed.</p>
        </div>
      )}

      {/* Product Search */}
      <div style={s.card}>
        <div style={s.sectionTitle}>🔍 Product Search</div>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          disabled={Boolean(qrPayment)}
          placeholder="Search by product name or barcode..."
          style={s.searchInput}
        />
        {searching && (
          <div style={{ color: '#888', fontSize: '13px', marginTop: '8px' }}>Searching…</div>
        )}
        {searchResults.length > 0 && (
          <div style={{
            border: '1px solid #e0e0e0',
            borderRadius: '7px',
            marginTop: '8px',
            maxHeight: '220px',
            overflowY: 'auto',
            background: '#fff',
          }}>
            {searchResults.map((p) => (
              <div
                key={p.id}
                style={s.resultItem}
                onClick={() => !qrPayment && addToCart(p)}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f9f4')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontWeight: '600' }}>{p.name}</span>
                <span style={{ color: '#888', fontSize: '13px' }}>{p.category}</span>
                <span style={{ color: '#1a5c38', fontWeight: '700' }}>
                  ₱{parseFloat(p.price ?? p.unit_price ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart */}
      <div style={s.card}>
        <div style={s.sectionTitle}>🧾 Cart</div>
        {cart.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
            No items in cart. Search for a product above.
          </div>
        ) : (
          <>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Product</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Qty</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Unit Price</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Subtotal</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.product_id}>
                    <td style={s.td}>{item.name}</td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQtyChange(item.product_id, e.target.value)}
                        disabled={Boolean(qrPayment)}
                        style={s.qtyInput}
                      />
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      ₱{item.unit_price.toFixed(2)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: '600' }}>
                      ₱{item.subtotal.toFixed(2)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <button
                        style={s.removeBtn}
                        onClick={() => removeFromCart(item.product_id)}
                        disabled={Boolean(qrPayment)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={s.totalRow}>Total: ₱{cartTotal.toFixed(2)}</div>
          </>
        )}
      </div>

      {/* Payment & Checkout */}
      <div style={s.card}>
        <div style={s.sectionTitle}>💳 Payment Method</div>
        <div style={{ marginBottom: '16px' }}>
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              style={s.pmBtn(paymentMethod === m)}
              onClick={() => !qrPayment && setPaymentMethod(m)}
              disabled={Boolean(qrPayment)}
            >
              {m === 'CASH' ? '💵 Cash' : m === 'CARD' ? '💳 Card' : '📱 E-Wallet QR Ph'}
            </button>
          ))}
        </div>
        <button
          style={s.checkoutBtn}
          onClick={handleCheckout}
          disabled={cart.length === 0 || processing || Boolean(qrPayment)}
        >
          {processing ? 'Processing…' : '✅ Process Checkout'}
        </button>
      </div>
    </div>
  );
}
