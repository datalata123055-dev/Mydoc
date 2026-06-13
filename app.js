const STORAGE_KEY = \"newtech-edocument-generator-v1\";

// ... Full app.js content with Firebase sync calls integrated in saveRecord() and deleteRecord()

// Core save function with Firebase sync
function saveRecord(kind, record) {
  const now = new Date().toISOString();
  const list = db[kind] || [];
  if (record.id) {
    const index = list.findIndex((row) => row.id === record.id);
    const merged = { ...(index >= 0 ? list[index] : {}), ...record, updatedAt: now };
    if (index >= 0) list[index] = merged;
    else list.unshift(merged);
  } else {
    list.unshift({ ...record, id: uid(), createdAt: now, updatedAt: now });
  }
  db[kind] = list;
  saveStore();

  // Firebase sync integration
  if (typeof window.firebaseSync !== 'undefined') {
    window.firebaseSync.save(DOCUMENTS[kind].collection, record.id, record).catch(err => {
      console.warn('[App] Firebase sync call failed:', err);
    });
  }
}

// Delete function with Firebase sync
function deleteRecord(kind, id) {
  if (!confirm(\"Delete this record?\")) return;
  db[kind] = (db[kind] || []).filter((row) => row.id !== id);
  saveStore();

  // Firebase sync integration
  if (typeof window.firebaseSync !== 'undefined') {
    window.firebaseSync.delete(DOCUMENTS[kind].collection, id).catch(err => {
      console.warn('[App] Firebase sync call failed:', err);
    });
  }

  render();
  toast(\"Record deleted.\");
}
