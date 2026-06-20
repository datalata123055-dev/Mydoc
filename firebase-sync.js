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
const NUMBER_FIELDS = {
  quotations: 'quotationNumber',
  invoices: 'invoiceNumber',
  warrantyCards: 'serialNo'
};
let _firestore = null;
let _auth = null;
let _syncing = false;
let _subscriptionCollections = [];
let _subscriptionHandler = null;
let _syncedRecordHandler = null;
const _listeners = {};

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
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
    if (!window.firebase) throw new Error('Firebase SDK load nahi hua');
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _auth = firebase.auth();
    if (!_auth.currentUser) {
      try { await _auth.signInAnonymously(); }
      catch (authError) { console.warn('[Firebase] Anonymous auth failed:', authError.message); }
    }
    _firestore = firebase.firestore();
    console.log('[Firebase] ✅ Connected to Firestore');
    return _firestore;
  } catch (e) {
    console.error('[Firebase] Init failed:', e);
    return null;
  }
}

// --- Single operation sync ---

async function prepareOperation(op, db) {
  if (op.type !== 'upsert' || !op.data) return op;
  const data = cleanForFirestore(op.data);
  const field = NUMBER_FIELDS[op.collection];
  if (field && String(data[field] || '').includes('-OFF-')) {
    const officialNumber = await reserveNumberWithDb(db, op.collection);
    if (officialNumber) data[field] = officialNumber;
  }
  return { ...op, data };
}

async function runOperation(op, db) {
  const ref = db.collection(op.collection).doc(op.id);
  if (op.type === 'upsert') {
    await ref.set(cleanForFirestore(op.data), { merge: true });
    notifySyncedRecord(op.collection, op.id, op.data);
  } else if (op.type === 'delete') {
    await ref.delete();
  }
}

function notifySyncedRecord(collection, id, data) {
  if (typeof _syncedRecordHandler !== 'function' || !data) return;
  try { _syncedRecordHandler(collection, { ...data, id }); }
  catch (error) { console.warn('[Firebase] Synced record handler failed:', error); }
}

function cleanForFirestore(value) {
  if (Array.isArray(value)) return value.map(cleanForFirestore).filter(item => item !== undefined);
  if (value && typeof value === 'object') {
    const cleaned = {};
    Object.keys(value).forEach(key => {
      const next = cleanForFirestore(value[key]);
      if (next !== undefined) cleaned[key] = next;
    });
    return cleaned;
  }
  return value === undefined ? undefined : value;
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
      let prepared = op;
      try {
        prepared = await prepareOperation(op, db);
        await runOperation(prepared, db);
        synced++;
      } catch (e) {
        console.warn('[Firebase] Operation failed, retrying later:', e);
        failed.push(prepared);
      }
    }

    setQueue(failed);

    updatePendingBadge();
    if (synced > 0) {
      console.log(`[Firebase] ✅ Synced ${synced} record(s) to Firestore`);
      // App ka toast function use karo agar available ho
      if (typeof toast === 'function') {
        toast(`☁️ ${synced} record${synced > 1 ? 's' : ''} Firestore mein sync ho gaya!`);
      }
    }
  } catch (e) {
    console.error('[Firebase] Sync error:', e);
    updatePendingBadge();
  }
  _syncing = false;
}

// --- Save / Delete (app.js se call hota hai) ---

async function saveToFirebase(collection, id, data) {
  const op = { type: 'upsert', collection, id, data: cleanForFirestore(data) };
  if (navigator.onLine) {
    try {
      const db = await initFirebase();
      if (db) {
        const prepared = await prepareOperation(op, db);
        await runOperation(prepared, db);
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

// --- Live shared Firestore records ---

function pendingUpserts(collection) {
  return getQueue()
    .filter(op => op.type === 'upsert' && op.collection === collection && op.data)
    .map(op => op.data);
}

async function subscribeCollections(collections, onData) {
  _subscriptionCollections = collections;
  _subscriptionHandler = onData;
  const db = await initFirebase();
  if (!db) return false;

  collections.forEach(collection => {
    if (_listeners[collection]) _listeners[collection]();
    _listeners[collection] = db.collection(collection)
      .orderBy('createdAt', 'desc')
      .limit(300)
      .onSnapshot(snapshot => {
        const rows = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        onData(collection, rows);
      }, error => {
        console.warn(`[Firebase] Listener failed for ${collection}:`, error);
      });
  });
  return true;
}

function formatReservedNumber(collection, sequence, year) {
  if (collection === 'quotations') return `NTHS-${year}-${String(sequence).padStart(4, '0')}`;
  if (collection === 'invoices') return `${year}-${String(year + 1).slice(2)}/${String(sequence).padStart(3, '0')}`;
  if (collection === 'warrantyCards') return `WC-${year}-${String(sequence).padStart(4, '0')}`;
  return String(sequence);
}

async function reserveNumber(collection) {
  const db = await initFirebase();
  if (!db) return null;
  return reserveNumberWithDb(db, collection);
}

async function reserveNumberWithDb(db, collection) {
  const year = new Date().getFullYear();
  const counterId = `${collection}-${year}`;
  const counterRef = db.collection('documentCounters').doc(counterId);
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(counterRef);
    const current = snapshot.exists ? Number(snapshot.data().next || 1) : 1;
    const sequence = current > 0 ? current : 1;
    transaction.set(counterRef, {
      collection,
      year,
      next: sequence + 1,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return formatReservedNumber(collection, sequence, year);
  });
}

function configure(options) {
  if (options && typeof options.onSyncedRecord === 'function') {
    _syncedRecordHandler = options.onSyncedRecord;
  }
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
  if (_subscriptionCollections.length && _subscriptionHandler) {
    setTimeout(() => subscribeCollections(_subscriptionCollections, _subscriptionHandler), 2200);
  }
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
  configure,
  subscribeCollections,
  reserveNumber,
  getPendingUpserts: pendingUpserts,
  syncNow:         syncPendingQueue,
  getPendingCount: () => getQueue().length,
};
