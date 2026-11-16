import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import './styles/global.css';
import './styles/navbar.css';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/attendance.css';

// Register Service Worker for Progressive Web App capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        console.log('Attendance Tracker ServiceWorker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('ServiceWorker registration failed:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
