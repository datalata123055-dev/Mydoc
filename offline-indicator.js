// Offline Indicator - Shows connectivity status at top of page
(function() {
  const createOfflineIndicator = () => {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      padding: 12px 16px;
      background: #b91c1c;
      color: white;
      text-align: center;
      font-weight: 700;
      font-size: 14px;
      display: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      animation: slideDown 0.3s ease-out;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(-100%);
          opacity: 0;
        }
      }
      
      body.offline #offline-indicator {
        display: block;
      }
      
      .offline-hiding #offline-indicator {
        animation: slideUp 0.3s ease-out;
      }
      
      .topbar.with-offline-indicator {
        padding-top: 70px;
      }
    `;
    
    document.head.appendChild(style);
    indicator.innerHTML = '📡 You are offline - Your data is saved locally and will sync when online';
    document.body.insertBefore(indicator, document.body.firstChild);
    
    return indicator;
  };

  const indicator = createOfflineIndicator();
  const topbar = document.querySelector('.topbar');

  const updateOfflineStatus = () => {
    const isOnline = navigator.onLine;
    
    if (isOnline) {
      document.body.classList.remove('offline');
      document.body.classList.add('offline-hiding');
      if (topbar) topbar.classList.remove('with-offline-indicator');
      
      setTimeout(() => {
        document.body.classList.remove('offline-hiding');
      }, 300);
    } else {
      document.body.classList.add('offline');
      if (topbar) topbar.classList.add('with-offline-indicator');
    }
  };

  window.addEventListener('online', updateOfflineStatus);
  window.addEventListener('offline', updateOfflineStatus);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateOfflineStatus);
  } else {
    updateOfflineStatus();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration);
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] App update available');
              const updateNotification = document.createElement('div');
              updateNotification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                z-index: 9999;
                text-align: center;
              `;
              updateNotification.innerHTML = `
                <p style="margin: 0 0 15px; font-weight: bold;">App Update Available</p>
                <button onclick="window.location.reload()" style="padding: 8px 16px; background: #1e3a8a; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Refresh App</button>
              `;
              document.body.appendChild(updateNotification);
            }
          });
        });
      })\n      .catch((error) => {\n        console.error('[PWA] Service Worker registration failed:', error);\n      });\n  }\n})();
