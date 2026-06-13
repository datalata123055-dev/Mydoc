// ============================================================
//  firebase-sync.js — Offline Draft → Firebase Firestore Sync
//  Jab offline ho: localStorage queue mein save karo
//  Jab online aao: automatically Firestore mein sync ho jaye
// ============================================================

// ⚠️  STEP 1: Apna Firebase config yahan paste karo
//    Firebase Console → Project Settings → Your apps → SDK setup
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyATvwM_0B9ibtD9MniIoiNuiirnC0mb2AY",
  authDomain:        "newtechhomesolutions-b6ab6.firebaseapp.com",
  projectId:         "newtechhomesolutions-b6ab6",
  storageBucket:     "newtechhomesolutions-b6ab6.firebasestorage.app",
  messagingSenderId: "1015056454392",
  appId:             "1:1015056454392:web:69f04fb83c80cf8507e10d",
  measurementId:     "G-2J98330E56"
};

// ⚠️  STEP 2: Firebase Console → Firestore → Rules mein ye rules lagao:
//
//  rules_version = '2';
//  service cloud.firestore {
//    match /databases/{database}/documents {
//      match /{document=**} {
//        allow read, write: if true;
//      }
//    }
//  }
//
//  (Baad mein authentication add karna safer hoga)

// ============================================================

const SYNC_QUEUE_KEY = 'newtech-sync-queue-v1';
let _firestore = null;
let _syncing = false;

// --- Queue helpers ---

function getQueue() {
  try { return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]'); }
  catch { return []; }
}

function setQueue(queue) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (error) {
    console.warn('[Firebase] Queue could not be stored locally:', error);
    return false;
  }
}

function addToQueue(operation) {
  const queue = getQueue();
  // Same id + collection ka duplicate replace karo
  const idx = queue.findIndex(
    op => op.id === operation.id && op.collection === operation.collection
  );
  if (idx >= 0) queue[idx] = operation;
  else queue.push(operation);
  if (!setQueue(queue)) return false;
  console.log(`[Firebase] Queued (${queue.length} pending):`, operation.type, operation.collection, operation.id);
  return true;
}

// --- Firebase loader (sirf online hone pe load hoga) ---

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function initFirebase() {
  if (_firestore) return _firestore;
  if (!navigator.onLine) return null;
  try {
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
    if (!window.firebase) throw new Error('Firebase SDK load nahi hua');
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _firestore = firebase.firestore();
    console.log('[Firebase] ✅ Connected to Firestore');
    return _firestore;
  } catch (e) {
    console.error('[Firebase] Init failed:', e);
    return null;
  }
}

// --- Single operation sync ---

async function runOperation(op, db) {
  const ref = db.collection(op.collection).doc(op.id);
  if (op.type === 'upsert') {
    await ref.set(op.data, { merge: true });
  } else if (op.type === 'delete') {
    await ref.delete();
  }
}

// --- Sync pending queue ---

async function syncPendingQueue() {
  if (_syncing) return;
  const queue = getQueue();
  if (queue.length === 0) return;

  _syncing = true;
  try {
    const db = await initFirebase();
    if (!db) { _syncing = false; return; }

    const failed = [];
    let synced = 0;

    for (const op of queue) {
      try {
        await runOperation(op, db);
        synced++;
      } catch (e) {
        console.warn('[Firebase] Operation failed, retrying later:', e);
        failed.push(op);
      }
    }

    setQueue(failed);

    if (synced > 0) {
      console.log(`[Firebase] ✅ Synced ${synced} record(s) to Firestore`);
      // App ka toast function use karo agar available ho
      if (typeof toast === 'function') {
        toast(`☁️ ${synced} record${synced > 1 ? 's' : ''} Firestore mein sync ho gaya!`);
      }
      // Pending count badge update karo
      updatePendingBadge();
    }
  } catch (e) {
    console.error('[Firebase] Sync error:', e);
  }
  _syncing = false;
}

// --- Save / Delete (app.js se call hota hai) ---

async function saveToFirebase(collection, id, data) {
  const op = { type: 'upsert', collection, id, data };
  if (navigator.onLine) {
    try {
      const db = await initFirebase();
      if (db) {
        await runOperation(op, db);
        console.log('[Firebase] ✅ Saved to Firestore:', collection, id);
        updatePendingBadge();
        return;
      }
    } catch (e) {
      console.warn('[Firebase] Save failed, queuing:', e);
    }
  }
  addToQueue(op);
  updatePendingBadge();
}

async function deleteFromFirebase(collection, id) {
  const op = { type: 'delete', collection, id };
  if (navigator.onLine) {
    try {
      const db = await initFirebase();
      if (db) {
        await runOperation(op, db);
        console.log('[Firebase] ✅ Deleted from Firestore:', collection, id);
        return;
      }
    } catch (e) {
      console.warn('[Firebase] Delete failed, queuing:', e);
    }
  }
  addToQueue(op);
  updatePendingBadge();
}

// --- Pending badge (offline indicator ke saath) ---

function updatePendingBadge() {
  const count = getQueue().length;
  let badge = document.getElementById('firebase-pending-badge');
  if (count === 0) {
    if (badge) badge.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'firebase-pending-badge';
    badge.style.cssText = `
      position: fixed; bottom: 16px; right: 16px;
      background: #d97706; color: white;
      padding: 8px 14px; border-radius: 20px;
      font-size: 13px; font-weight: 700;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 999; cursor: default;
    `;
    document.body.appendChild(badge);
  }
  badge.textContent = `⏳ ${count} record${count > 1 ? 's' : ''} sync pending`;
}

// --- Auto sync jab online aao ---

window.addEventListener('online', () => {
  console.log('[Firebase] Online! Syncing pending queue...');
  setTimeout(syncPendingQueue, 1500); // connection stable hone ka intezaar
});

// Page load pe bhi try karo (agar pehle se online ho)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    updatePendingBadge();
    if (navigator.onLine) setTimeout(syncPendingQueue, 2000);
  });
} else {
  updatePendingBadge();
  if (navigator.onLine) setTimeout(syncPendingQueue, 2000);
}

// --- Global expose ---

window.firebaseSync = {
  save:            saveToFirebase,
  delete:          deleteFromFirebase,
  syncNow:         syncPendingQueue,
  getPendingCount: () => getQueue().length,
};
