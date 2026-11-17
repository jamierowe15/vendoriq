import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function VendorDetail({ perms }) {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => api(`/api/vendors/${id}`).then(setVendor).catch(e => setError(e.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function flag() {
    const reason = window.prompt('Reason for review (at least 5 characters):');
    if (!reason) return;
    try {
      await api(`/api/vendors/${id}/flag`, { method: 'POST', body: JSON.stringify({ reason }) });
      setMessage('Vendor flagged for review.');
      load();
    } catch (e) { setError(e.message); }
  }

  async function offboard() {
    if (!window.confirm(`Offboard ${vendor.Name}? The record is kept for audit.`)) return;
    try {
      await api(`/api/vendors/${id}`, { method: 'DELETE' });
      setMessage('Vendor offboarded.');
      load();
    } catch (e) { setError(e.message); }
  }

  if (error && !vendor) return <p className="error">{error}</p>;
  if (!vendor) return <p>Loading…</p>;

  return (
    <section>
      <p><Link to="/">← All vendors</Link></p>
      <h2>{vendor.Name}</h2>
      <p>{vendor.Category} · {vendor.Country} · <span className={`badge status-${vendor.Status.replace(' ', '-').toLowerCase()}`}>{vendor.Status}</span></p>
      {vendor.ContactEmail && <p>Contact: {vendor.ContactEmail}</p>}
      {vendor.risk && (
        <p>Risk: <strong className={`risk-${vendor.risk.RiskLevel.toLowerCase()}`}>{vendor.risk.RiskLevel} ({vendor.risk.Score})</strong> — {vendor.risk.Notes}</p>
      )}

      {(perms.canEdit || perms.isAdmin) && vendor.Status !== 'Offboarded' && (
        <div className="actions">
          {perms.canEdit && <Link className="button" to={`/vendors/${id}/edit`}>Edit</Link>}
          {perms.canEdit && vendor.Status !== 'Under Review' && <button onClick={flag}>Flag for review</button>}
          {perms.isAdmin && <button className="danger" onClick={offboard}>Offboard</button>}
        </div>
      )}
      {message && <p className="ok">{message}</p>}
      {error && <p className="error">{error}</p>}

      <h3>Contracts</h3>
      {vendor.contracts.length ? (
        <table>
          <thead><tr><th>Title</th><th>Value (CAD)</th><th>Ends</th><th>Status</th></tr></thead>
          <tbody>
            {vendor.contracts.map(c => (
              <tr key={c.ContractId}>
                <td>{c.Title}</td>
                <td>${Number(c.ValueCAD).toLocaleString('en-CA')}</td>
                <td>{c.EndDate.slice(0, 10)}</td>
                <td>{c.Status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p>No contracts on file.</p>}
    </section>
  );
}
