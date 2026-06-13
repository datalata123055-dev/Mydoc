// Firebase Sync Module
// Handles offline queue and syncs data to Firestore

(function() {
  'use strict';

  // Firebase config
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyC0s6Z1Q5F2H8K3L9M0N1O2P3Q4R5S6T7U",
    authDomain: "newtechhomesolutions-b6ab6.firebaseapp.com",
    projectId: "newtechhomesolutions-b6ab6",
    storageBucket: "newtechhomesolutions-b6ab6.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
  };

  // Initialize Firebase (inject this in your HTML if not already done)
  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }

  // Offline queue storage key
  const QUEUE_KEY = 'firebaseSync_queue';
  const SYNCED_KEY = 'firebaseSync_synced';

  // Initialize sync module
  window.firebaseSync = {
    // Save record to queue
    save: async function(collection, docId, data) {
      try {
        const queue = getQueue();
        const timestamp = new Date().toISOString();
        
        queue.push({
          operation: 'set',
          collection,
          docId,
          data: { ...data, syncedAt: timestamp },
          timestamp
        });
        
        saveQueue(queue);
        
        // Try to sync immediately if online
        if (navigator.onLine) {
          await syncQueue();
        }
      } catch (error) {
        console.error('[Firebase Sync] Save error:', error);
      }
    },

    // Delete record from queue
    delete: async function(collection, docId) {
      try {
        const queue = getQueue();
        const timestamp = new Date().toISOString();
        
        queue.push({
          operation: 'delete',
          collection,
          docId,
          timestamp
        });
        
        saveQueue(queue);
        
        // Try to sync immediately if online
        if (navigator.onLine) {
          await syncQueue();
        }
      } catch (error) {
        console.error('[Firebase Sync] Delete error:', error);
      }
    },

    // Manual sync trigger
    sync: async function() {
      try {
        await syncQueue();
      } catch (error) {
        console.error('[Firebase Sync] Sync error:', error);
        throw error;
      }
    },

    // Get queue status
    getStatus: function() {
      const queue = getQueue();
      return {
        pendingCount: queue.length,
        isOnline: navigator.onLine,
        queue: queue
      };
    },

    // Clear queue
    clearQueue: function() {
      localStorage.removeItem(QUEUE_KEY);
    }
  };

  // Helper functions
  function getQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('[Firebase Sync] Failed to parse queue:', error);
      return [];
    }
  }

  function saveQueue(queue) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.warn('[Firebase Sync] Failed to save queue:', error);
    }
  }

  async function syncQueue() {
    if (!navigator.onLine) {
      console.log('[Firebase Sync] Offline - queue will sync when online');
      return;
    }

    const queue = getQueue();
    if (queue.length === 0) return;

    try {
      const db = firebase.firestore();
      let successCount = 0;
      const failedItems = [];

      for (const item of queue) {
        try {
          if (item.operation === 'set') {
            await db.collection(item.collection).doc(item.docId).set(item.data, { merge: true });
            successCount++;
          } else if (item.operation === 'delete') {
            await db.collection(item.collection).doc(item.docId).delete();
            successCount++;
          }
        } catch (error) {
          console.error(`[Firebase Sync] Failed to sync ${item.operation}:`, error);
          failedItems.push(item);
        }
      }

      // Keep only failed items in queue
      if (failedItems.length > 0) {
        saveQueue(failedItems);
        console.warn(`[Firebase Sync] Synced ${successCount}/${queue.length} items. ${failedItems.length} failed.`);
      } else {
        saveQueue([]);
        console.log(`[Firebase Sync] All ${successCount} items synced successfully!`);
      }
    } catch (error) {
      console.error('[Firebase Sync] Sync operation failed:', error);
    }
  }

  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('[Firebase Sync] Back online - syncing queue...');
    syncQueue();
  });

  window.addEventListener('offline', () => {
    console.log('[Firebase Sync] Went offline - queue paused');
  });

  // Initial sync on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (navigator.onLine) syncQueue();
    });
  } else {
    if (navigator.onLine) syncQueue();
  }
})();
