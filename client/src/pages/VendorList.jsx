import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function VendorList() {
  const [vendors, setVendors] = useState([]);   // the rows shown in the table
  const [search, setSearch] = useState('');     // what's typed in the search box
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Re-fetch every time the search text changes
  useEffect(() => {
    setLoading(true);
    setError('');
    api(`/api/vendors?search=${encodeURIComponent(search)}`)
      .then(setVendors)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <section>
      <input
        placeholder="Search vendors by name"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      {loading ? <p>Loading…</p> : (
        <table>
          <thead>
            <tr><th>Name</th><th>Category</th><th>Status</th><th>Risk</th></tr>
          </thead>
          <tbody>
            {vendors.map(v => (
              <tr key={v.VendorId}>
                <td><Link to={`/vendors/${v.VendorId}`}>{v.Name}</Link></td>
                <td>{v.Category}</td>
                <td>{v.Status}</td>
                <td className={`risk-${(v.RiskLevel || '').toLowerCase()}`}>
                  {v.RiskLevel ?? '—'} {v.RiskScore ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}


