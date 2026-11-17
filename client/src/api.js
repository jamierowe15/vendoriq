// One place for every API call: adds the sign-in token (or demo header) and handles errors.
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalInstance, apiRequest } from './authConfig.js';

const BASE = import.meta.env.VITE_API_URL || '';

// Public read-only demo (bonus feature)
export const isDemo = () => {
  try { return sessionStorage.getItem('vendoriq-demo') === '1'; } catch { return false; }
};
export const startDemo = () => { sessionStorage.setItem('vendoriq-demo', '1'); window.location.assign('/'); };
export const endDemo = () => { sessionStorage.removeItem('vendoriq-demo'); window.location.assign('/'); };

async function getToken() {
  const account = msalInstance.getActiveAccount();
  if (!account) return null;
  try {
    const { accessToken } = await msalInstance.acquireTokenSilent({ ...apiRequest, account });
    return accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) await msalInstance.acquireTokenRedirect(apiRequest);
    throw err;
  }
}

export async function api(path, options = {}) {
  const demo = isDemo();
  const token = demo ? null : await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(demo ? { 'X-Demo-Mode': '1' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = data.details ? ': ' + Object.entries(data.details).map(([k, v]) => `${k} ${v.join(', ')}`).join('; ') : '';
    throw new Error((data.error || `Request failed (${res.status})`) + details);
  }
  return data;
}
