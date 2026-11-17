import { useEffect, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { apiRequest, authConfigured, ROLES } from './authConfig.js';
import { api, isDemo, startDemo, endDemo } from './api.js';
import VendorList from './pages/VendorList.jsx';
import VendorDetail from './pages/VendorDetail.jsx';
import VendorForm from './pages/VendorForm.jsx';
import Rfx from './pages/Rfx.jsx';
import Assistant from './pages/Assistant.jsx';

export default function App() {
  const { instance, accounts } = useMsal();
  const demo = isDemo();
  const signedIn = accounts.length > 0 || demo;
  const [me, setMe] = useState(null);
  const [meError, setMeError] = useState('');

  useEffect(() => {
    if (!signedIn) return;
    api('/api/me').then(setMe).catch(e => setMeError(e.message));
  }, [signedIn]);

  // Hiding buttons is only for user experience. The API enforces every rule.
  const roles = me?.roles || [];
  const canEdit = roles.includes(ROLES.ADMIN) || roles.includes(ROLES.ANALYST);
  const isAdmin = roles.includes(ROLES.ADMIN);
  const perms = { canEdit, isAdmin };

  if (!signedIn) {
    return (
      <div className="container landing">
        <h1>VendorIQ</h1>
        <p>AI-assisted third-party risk and contract management.</p>
        {authConfigured ? (
          <button onClick={() => instance.loginRedirect(apiRequest)}>Sign in with Microsoft</button>
        ) : (
          <p className="error">Sign-in isn't configured yet: fill in client/.env.local (see the lab, Part 4).</p>
        )}
        <button className="secondary" onClick={startDemo}>Try the demo (read-only)</button>
      </div>
    );
  }

  return (
    <div className="container">
      {demo && (
        <div className="demo-banner">
          Demo mode: read-only sample data. Writes are blocked by role-based access control.
          <button onClick={endDemo}>Exit demo</button>
        </div>
      )}
      <header>
        <h1>VendorIQ</h1>
        <nav>
          <NavLink to="/" end>Vendors</NavLink>
          <NavLink to="/rfx">RFx</NavLink>
          <NavLink to="/assistant">Assistant</NavLink>
          {canEdit && <NavLink to="/vendors/new">Add vendor</NavLink>}
        </nav>
        <div className="user">
          {me ? <>{me.name} <span className="role">{roles.map(r => r.replace('Procurement.', '')).join(', ') || 'no role'}</span></> : meError ? <span className="error">{meError}</span> : '…'}
          {!demo && <button className="secondary" onClick={() => instance.logoutRedirect()}>Sign out</button>}
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<VendorList />} />
          <Route path="/vendors/:id" element={<VendorDetail perms={perms} />} />
          {canEdit && <Route path="/vendors/new" element={<VendorForm />} />}
          {canEdit && <Route path="/vendors/:id/edit" element={<VendorForm />} />}
          <Route path="/rfx" element={<Rfx perms={perms} />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
