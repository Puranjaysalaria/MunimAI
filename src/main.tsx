import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import { ShopProvider } from './context/ShopContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <ShopProvider>
        <App />
      </ShopProvider>
    </I18nProvider>
  </React.StrictMode>
);
