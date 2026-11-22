import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import { ShopProvider } from './context/ShopContext';
import './index.css';

// Guard: If a cached service worker or router served the SPA shell on /pay, redirect to the standalone static payment page immediately
if (
  typeof window !== 'undefined' &&
  (window.location.pathname === '/pay' || window.location.pathname.startsWith('/pay/')) &&
  !window.location.pathname.endsWith('/index.html')
) {
  window.location.replace(`/pay/index.html${window.location.search}`);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <ShopProvider>
        <App />
      </ShopProvider>
    </I18nProvider>
  </React.StrictMode>
);
