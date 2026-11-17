// Microsoft Entra ID sign-in settings (MSAL). Values come from .env.local / .env.production.
import { PublicClientApplication, EventType } from '@azure/msal-browser';

const tenantId = import.meta.env.VITE_TENANT_ID;
const spaClientId = import.meta.env.VITE_SPA_CLIENT_ID;
const apiClientId = import.meta.env.VITE_API_CLIENT_ID;

export const authConfigured = Boolean(tenantId && spaClientId && apiClientId);

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: spaClientId || '00000000-0000-0000-0000-000000000000',
    authority: `https://login.microsoftonline.com/${tenantId || 'common'}`,
    redirectUri: window.location.origin
  },
  cache: { cacheLocation: 'sessionStorage' } // cleared when the tab closes
});

// Ask for the API's scope, so the access token is issued for our API.
export const apiRequest = { scopes: [`api://${apiClientId}/access_as_user`] };

msalInstance.addEventCallback(event => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
    msalInstance.setActiveAccount(event.payload.account);
  }
});

export const ROLES = {
  ADMIN: 'Procurement.Admin',
  ANALYST: 'Procurement.Analyst',
  VIEWER: 'Procurement.Viewer'
};
