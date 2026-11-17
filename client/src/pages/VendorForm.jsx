// One form for both "Add vendor" (/vendors/new) and "Edit vendor" (/vendors/:id/edit).
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';

const EMPTY = { name: '', category: '', country: 'Canada', contactEmail: '', status: 'Active' };

export default function VendorForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!editing) { setForm(EMPTY); return; }
    api(`/api/vendors/${id}`)
      .then(v => setForm({ name: v.Name, category: v.Category, country: v.Country, contactEmail: v.ContactEmail || '', status: v.Status }))
      .catch(e => setError(e.message));
  }, [id, editing]);

  const update = e => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { ...form, contactEmail: form.contactEmail || undefined };
      const saved = await api(editing ? `/api/vendors/${id}` : '/api/vendors', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });
      navigate(`/vendors/${saved.VendorId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2>{editing ? 'Edit vendor' : 'Add vendor'}</h2>
      <form className="form" onSubmit={submit}>
        <label>Vendor name<input name="name" value={form.name} onChange={update} required /></label>
        <label>Category<input name="category" value={form.category} onChange={update} required /></label>
        <label>Country<input name="country" value={form.country} onChange={update} required /></label>
        <label>Contact email<input name="contactEmail" type="email" value={form.contactEmail} onChange={update} /></label>
        <label>Status
          <select name="status" value={form.status} onChange={update}>
            <option>Active</option><option>Under Review</option><option>Offboarded</option>
          </select>
        </label>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add vendor'}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
}
