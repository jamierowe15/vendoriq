import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function VendorDetail() {
  const { id } = useParams();                   // the :id part of /vendors/:id
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/vendors/${id}`).then(setVendor).catch(e => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!vendor) return <p>Loading…</p>;

  return (
    <section>
      <h2>{vendor.Name}</h2>
      <p>{vendor.Category} · {vendor.Country} · {vendor.Status}</p>
      {vendor.risk && (
        <p>
          Risk: <strong className={`risk-${vendor.risk.RiskLevel.toLowerCase()}`}>{vendor.risk.RiskLevel}</strong>
          {' '}({vendor.risk.Score}) — {vendor.risk.Notes}
        </p>
      )}
      <h3>Contracts</h3>
      {vendor.contracts.length === 0 ? <p>No contracts on file.</p> : (
        <ul>
          {vendor.contracts.map(c => (
            <li key={c.ContractId}>
              {c.Title} — ${Number(c.ValueCAD).toLocaleString()} CAD, ends {c.EndDate.slice(0, 10)} ({c.Status})
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

