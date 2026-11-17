import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function VendorList() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait 300 ms after typing stops, so we don't call the API on every key press
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      api(`/api/vendors?search=${encodeURIComponent(search)}`)
        .then(setVendors)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <section>
      <h2>Vendors</h2>
      <input className="search" placeholder="Search vendors" value={search} onChange={e => setSearch(e.target.value)} />
      {error && <p className="error">{error}</p>}
      {loading ? <p>Loading…</p> : (
        <table>
          <thead><tr><th>Name</th><th>Category</th><th>Country</th><th>Status</th><th>Risk</th></tr></thead>
          <tbody>
            {vendors.map(v => (
              <tr key={v.VendorId}>
                <td><Link to={`/vendors/${v.VendorId}`}>{v.Name}</Link></td>
                <td>{v.Category}</td>
                <td>{v.Country}</td>
                <td><span className={`badge status-${v.Status.replace(' ', '-').toLowerCase()}`}>{v.Status}</span></td>
                <td className={`risk-${(v.RiskLevel || '').toLowerCase()}`}>{v.RiskLevel ?? '—'} {v.RiskScore ?? ''}</td>
              </tr>
            ))}
            {!vendors.length && <tr><td colSpan="5">No vendors match.</td></tr>}
          </tbody>
        </table>
      )}
    </section>
  );
}
