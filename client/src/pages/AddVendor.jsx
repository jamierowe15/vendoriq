import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function AddVendor() {
  const [form, setForm] = useState({ name: '', category: '', country: 'Canada', contactEmail: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // One handler for every input: uses the input's "name" to know which field to update
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();                          // stop the browser reloading the page
    setError('');
    try {
      const body = { ...form, contactEmail: form.contactEmail || undefined };
      const created = await api('/api/vendors', { method: 'POST', body: JSON.stringify(body) });
      navigate(`/vendors/${created.VendorId}`);  // go to the new vendor's page
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Add vendor</h2>
      <input name="name" placeholder="Vendor name" value={form.name} onChange={update} required />
      <input name="category" placeholder="Category" value={form.category} onChange={update} required />
      <input name="country" placeholder="Country" value={form.country} onChange={update} required />
      <input name="contactEmail" type="email" placeholder="Contact email (optional)" value={form.contactEmail} onChange={update} />
      <button type="submit">Add vendor</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

