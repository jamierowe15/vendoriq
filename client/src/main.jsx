import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './authConfig.js';
import App from './App.jsx';
import './index.css';

// MSAL must finish initializing (and handle any sign-in redirect) before the app renders.
msalInstance.initialize().then(() => {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length && !msalInstance.getActiveAccount()) msalInstance.setActiveAccount(accounts[0]);
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter><App /></BrowserRouter>
      </MsalProvider>
    </React.StrictMode>
  );
});
