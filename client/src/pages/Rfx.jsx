// Sourcing events (RFx): list events, compare ranked bids, and (Admin only) award.
import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Rfx({ perms }) {
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [error, setError] = useState('');

  const loadEvents = () => api('/api/rfx').then(setEvents).catch(e => setError(e.message));
  useEffect(() => { loadEvents(); }, []);

  async function open(evt) {
    setSelected(evt);
    setRanking(null);
    setError('');
    try { setRanking(await api(`/api/rfx/${evt.RfxId}/bids`)); }
    catch (e) { setError(e.message); }
  }

  async function award(bid) {
    if (!window.confirm(`Award "${selected.Title}" to ${bid.VendorName}?`)) return;
    try {
      const updated = await api(`/api/rfx/${selected.RfxId}/award`, { method: 'POST', body: JSON.stringify({ vendorId: bid.VendorId }) });
      setSelected({ ...selected, ...updated, AwardedVendorName: bid.VendorName });
      loadEvents();
    } catch (e) { setError(e.message); }
  }

  return (
    <section>
      <h2>Sourcing events (RFx)</h2>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Title</th><th>Category</th><th>Due</th><th>Status</th><th>Bids</th></tr></thead>
        <tbody>
          {events.map(e => (
            <tr key={e.RfxId} className={selected?.RfxId === e.RfxId ? 'selected' : ''}>
              <td><button className="link" onClick={() => open(e)}>{e.Title}</button></td>
              <td>{e.Category}</td>
              <td>{e.DueDate.slice(0, 10)}</td>
              <td>{e.Status}{e.AwardedVendorName ? ` → ${e.AwardedVendorName}` : ''}</td>
              <td>{e.BidCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && ranking && (
        <>
          <h3>Bids for "{selected.Title}"</h3>
          <p className="muted">Score = {ranking.weights.price * 100}% price + {ranking.weights.risk * 100}% vendor risk (higher is better).</p>
          <table>
            <thead><tr><th>Rank</th><th>Vendor</th><th>Price (CAD)</th><th>Delivery</th><th>Risk</th><th>Score</th>{perms.isAdmin && <th></th>}</tr></thead>
            <tbody>
              {ranking.bids.map((b, i) => (
                <tr key={b.BidId}>
                  <td>{i + 1}</td>
                  <td>{b.VendorName}</td>
                  <td>${Number(b.PriceCAD).toLocaleString('en-CA')}</td>
                  <td>{b.DeliveryWeeks} weeks</td>
                  <td className={`risk-${(b.RiskLevel || '').toLowerCase()}`}>{b.RiskLevel ?? '—'} {b.RiskScore ?? ''}</td>
                  <td><strong>{b.totalScore}</strong></td>
                  {perms.isAdmin && (
                    <td>{selected.Status !== 'Awarded' && <button onClick={() => award(b)}>Award</button>}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
