import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AppProviders } from './contexts';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);

// Register Service Worker for PWA functionality (only in production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✓ Service Worker registered:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch(err => {
        console.log('✗ Service Worker registration failed:', err);
      });
  });
} else if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  // Unregister service worker in development
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('🔧 Service Worker unregistered for development');
    });
  });
}

// iOS standalone mode detection and handling
const isPWA = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

if (isPWA) {
  // Running as PWA - add custom status bar handling
  document.documentElement.classList.add('pwa-mode');
  document.body.classList.add('pwa-mode');
  
  // Add meta tag to identify PWA mode
  const meta = document.createElement('meta');
  meta.name = 'pwa-mode';
  meta.content = 'true';
  document.head.appendChild(meta);
  
  // Prevent default scrolling behavior on root
  document.addEventListener('touchmove', (e) => {
    if (e.target === document.body) {
      e.preventDefault();
    }
  }, { passive: false });
  
  console.log('🎯 Running in PWA mode!');
} else {
  console.log('🌐 Running in browser mode');
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
