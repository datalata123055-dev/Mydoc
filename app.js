const STORAGE_KEY = "newtech-edocument-generator-v1";
const NUMBER_COUNTER_KEY = "newtech-edocument-number-counters-v1";
const DEVICE_ID_KEY = "newtech-edocument-device-id-v1";
const SITE_NUMBER_CODE = "MDOC";

const COMPANY_PROFILE = {
  name: "NewTech Home Solutions",
  tagline: "Supreme Insect Protection Systems",
  logo: "assets/logo.png",
  stamp: "assets/company-stamp.png",
  address: "E-386 Vashist Farm, Hari Nagar Part 2, Badarpur, New Delhi - 110044, Near Earth Nursery",
  officeAddress: "E-386 Vashist Farm, Hari Nagar Part 2, Badarpur, New Delhi - 110044, Near Earth Nursery",
  email: "homesolutionsnewtech@gmail.com",
  website: "https://newtechhomesolutions.in",
  contacts: ["+91 9315739299", "+91 9354831931"],
  gstNumber: "07AATFN5177C1ZY",
  bankDetails: {
    accountName: "NewTech Home Solutions",
    bankName: "AXIS BANK",
    accountNo: "922020011452055",
    ifsc: "UTIB0000552"
  },
  quotationTerms: [
    "Minimum Chargeable area is 1.02 square meter or 11 Sq.Ft. for all products.",
    "50% advance to be paid along with order, balance after installation.",
    "Cheques & NEFT to be issued in favor of NewTech Home Solutions.",
    "Bank Details - AXIS BANK (IFSC - UTIB0000552) A/c No. 922020011452055",
    "Products once produced will neither be cancelled or exchanged or rectified.",
    "Calculation of Area of all products will be in SLAB of 6\" for both Width & Height.",
    "Warranty for the period of 5 Years for Manufacturing defect except Net, from date of delivery.",
    "5 Years Guarantee of Mesh for Natural climate wear-tear only.",
    "All disputes subject to Delhi Jurisdiction."
  ],
  invoiceTerms: [
    "Cheques & NEFT to be issued in favor of NewTech Home Solutions.",
    "Products once produced will neither be cancelled or exchanged or rectified.",
    "Bank Details - AXIS BANK (IFSC - UTIB0000552) A/c No. 922020011452055",
    "Warranty for the period of 5 years for Manufacturing defect except Net, (For Pleated Mesh Only).",
    "Nominal amount of Rs. 500/- would be charged as technician visit, during warranty period.",
    "24% interest would be charged extra for delay payment.",
    "All disputes subject to Delhi Jurisdiction."
  ],
  warrantyTerms: [
    "Warranty Card covers only the actual user.",
    "Warranty Card is valid for a period of 60 months from the date of installation.",
    "Guarantee of Mesh/Honeycomb for a period of 60 months for natural climate wear tear only.",
    "Warranty Card will be issued only after clearance of total payments.",
    "Warranty Card must be signed and stamped with company seal.",
    "NewTech Home Solutions will replace all spare parts and malfunctioning due to manufacturing defects.",
    "Replacement for malfunction due to faulty usage would be chargeable as per their value.",
    "Nominal Amount of Rs.500/- would be chargeable as service charge for technician visit.",
    "Cut and damage to Mesh/Honeycomb is not covered under warranty.",
    "Original warranty card (soft copy) has to be produced to avail warranty.",
    "All disputes are subject to Delhi Jurisdiction."
  ]
};

const DOCUMENTS = {
  quotations: {
    singular: "Quotation",
    plural: "Quotations",
    numberField: "quotationNumber",
    dateField: "quotationDate",
    statuses: ["draft", "sent", "approved", "converted", "cancelled"],
    collection: "quotations"
  },
  invoices: {
    singular: "Tax Invoice",
    plural: "Tax Invoices",
    numberField: "invoiceNumber",
    dateField: "invoiceDate",
    statuses: ["draft", "paid", "cancelled"],
    collection: "invoices"
  },
  warrantyCards: {
    singular: "Warranty Card",
    plural: "Warranty Cards",
    numberField: "serialNo",
    dateField: "installationDate",
    statuses: ["active", "expired", "cancelled"],
    collection: "warrantyCards"
  }
};

const PRODUCT_CATEGORIES = [
  "Roller Blinds",
  "Zebra Blinds",
  "Wooden Blinds",
  "Printed Blinds",
  "Polyester Pleated Mesh",
  "SS304 Pleated Mesh",
  "Honeycomb Blackout",
  "2 in 1 Pleated Mesh + Honeycomb",
  "PVC Partition",
  "Crystal Partition Door",
  "Security Mesh",
  "Invisible Grill",
  "Anti Bird Net",
  "Other Interior Work"
];

const UNITS = ["Sq Ft", "Sq Meter", "CM", "MM"];
const TAX_OPTIONS = [
  { label: "No Tax", value: 0 },
  { label: "GST 5%", value: 5 },
  { label: "GST 12%", value: 12 },
  { label: "GST 18%", value: 18 },
  { label: "Custom Tax", value: "custom" }
];

let state = {
  tab: "quotations",
  mode: "list",
  editingId: null,
  query: "",
  filter: "",
  pendingDelete: null
};

let db = loadStore();
let logoDataUrlPromise = null;
let stampDataUrlPromise = null;
let storageErrorShown = false;

const contentEl = document.getElementById("content");
const pageTitleEl = document.getElementById("pageTitle");
const newBtn = document.getElementById("newBtn");
const backBtn = document.getElementById("backBtn");

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.tab = btn.dataset.tab;
    state.mode = "list";
    state.editingId = null;
    state.query = "";
    state.filter = "";
    render();
  });
});

newBtn.addEventListener("click", () => openEditor(state.tab));
backBtn.addEventListener("click", () => {
  state.mode = "list";
  state.editingId = null;
  render();
});
render();
startSharedDocumentSync();

function loadStore() {
  const empty = { quotations: [], invoices: [], warrantyCards: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      quotations: Array.isArray(parsed.quotations) ? parsed.quotations : [],
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      warrantyCards: Array.isArray(parsed.warrantyCards) ? parsed.warrantyCards : []
    };
  } catch (error) {
    console.warn("Unable to load saved eDocument data", error);
    return empty;
  }
}

function saveStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    storageErrorShown = false;
    return true;
  } catch (error) {
    console.error("Unable to save eDocument data locally", error);
    if (!storageErrorShown) {
      storageErrorShown = true;
      toast("This iPad could not save locally. Free some storage and try again.", 5000);
    }
    return false;
  }
}

function startSharedDocumentSync() {
  if (!window.firebaseSync || typeof window.firebaseSync.subscribeCollections !== "function") return;
  if (typeof window.firebaseSync.configure === "function") {
    window.firebaseSync.configure({ onSyncedRecord: applySyncedRecord });
  }
  window.firebaseSync.subscribeCollections(Object.keys(DOCUMENTS), applyRemoteRecords);
}

function applySyncedRecord(kind, record) {
  if (!DOCUMENTS[kind] || !record || !record.id) return;
  const list = db[kind] || [];
  const index = list.findIndex((row) => row.id === record.id);
  if (index >= 0) list[index] = { ...list[index], ...record };
  else list.unshift(record);
  db[kind] = list;
  saveStore();
  if (state.tab === kind && state.mode === "list") renderList();
}

function applyRemoteRecords(kind, rows) {
  if (!DOCUMENTS[kind]) return;
  const byId = new Map((rows || []).map((row) => [row.id, row]));
  const pending = window.firebaseSync && typeof window.firebaseSync.getPendingUpserts === "function"
    ? window.firebaseSync.getPendingUpserts(kind)
    : [];
  pending.forEach((row) => {
    if (row && row.id) byId.set(row.id, row);
  });
  db[kind] = [...byId.values()];
  saveStore();
  if (state.tab === kind && state.mode === "list") renderList();
}

function render() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === state.tab);
  });

  const meta = DOCUMENTS[state.tab];
  pageTitleEl.textContent = meta.plural;
  newBtn.textContent = "New " + meta.singular;
  backBtn.hidden = state.mode === "list";
  newBtn.hidden = state.mode !== "list";

  if (state.mode === "editor") {
    renderEditor(state.tab, state.editingId);
  } else {
    renderList();
  }
}

function renderList() {
  const meta = DOCUMENTS[state.tab];
  const rows = filteredRows(state.tab);
  contentEl.innerHTML = `
    ${kpiHtml(state.tab, rows)}
    <section class="panel">
      <div class="panel-head">
        <h2>${escapeHtml(meta.plural)}</h2>
        <div class="filters">
          <input id="searchInput" type="search" placeholder="Search ${escapeAttr(meta.plural.toLowerCase())}" value="${escapeAttr(state.query)}" />
          <select id="statusFilter">
            <option value="">All statuses</option>
            ${meta.statuses.map((status) => `<option value="${status}" ${state.filter === status ? "selected" : ""}>${capitalize(status)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="table-wrap">
        ${tableHtml(state.tab, rows)}
      </div>
    </section>
  `;

  document.getElementById("searchInput").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderList();
  });
  document.getElementById("statusFilter").addEventListener("change", (event) => {
    state.filter = event.target.value;
    renderList();
  });
}

function filteredRows(kind) {
  const query = state.query.trim().toLowerCase();
  return [...(db[kind] || [])]
    .filter((row) => !state.filter || (row.status || defaultStatus(kind)) === state.filter)
    .filter((row) => {
      if (!query) return true;
      return JSON.stringify(row).toLowerCase().includes(query);
    })
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

function kpiHtml(kind, rows) {
  if (kind === "warrantyCards") {
    const active = rows.filter((row) => (row.status || "active") === "active").length;
    const expired = rows.filter((row) => row.status === "expired").length;
    return `
      <div class="kpis">
        ${kpi("Total Cards", rows.length)}
        ${kpi("Active", active)}
        ${kpi("Expired", expired)}
        ${kpi("Saved Locally", (db.warrantyCards || []).length)}
      </div>
    `;
  }

  const total = rows.reduce((sum, row) => sum + num(row.total), 0);
  const drafts = rows.filter((row) => (row.status || "draft") === "draft").length;
  const completed = kind === "invoices"
    ? rows.filter((row) => row.status === "paid").length
    : rows.filter((row) => row.status === "approved").length;
  return `
    <div class="kpis">
      ${kpi("Total Value", currency(total))}
      ${kpi("Drafts", drafts)}
      ${kpi(kind === "invoices" ? "Paid" : "Approved", completed)}
      ${kpi("Records", rows.length)}
    </div>
  `;
}

function kpi(label, value) {
  return `<div class="kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function tableHtml(kind, rows) {
  if (kind === "warrantyCards") {
    return `
      <table>
        <thead>
          <tr><th>Serial No.</th><th>Customer</th><th>Product</th><th>Installation Date</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td><strong>${escapeHtml(row.serialNo || "")}</strong></td>
              <td>${customerCell(row)}</td>
              <td>${escapeHtml(row.productPurchased || "")}</td>
              <td>${escapeHtml(row.installationDate || "")}</td>
              <td>${statusBadge(row.status || "active")}</td>
              <td>${actionsHtml(kind, row.id)}</td>
            </tr>
          `).join("") || `<tr><td colspan="6" class="empty">No warranty cards yet.</td></tr>`}
        </tbody>
      </table>
    `;
  }

  const meta = DOCUMENTS[kind];
  return `
    <table>
      <thead>
        <tr><th>${escapeHtml(meta.singular)}</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td><strong>${escapeHtml(row[meta.numberField] || "")}</strong></td>
            <td>${customerCell(row)}</td>
            <td>${escapeHtml(row[meta.dateField] || "")}</td>
            <td>${(row.products || []).length}</td>
            <td><strong>${currency(row.total)}</strong></td>
            <td>${statusBadge(row.status || "draft")}</td>
            <td>${actionsHtml(kind, row.id)}</td>
          </tr>
        `).join("") || `<tr><td colspan="7" class="empty">No ${escapeHtml(meta.plural.toLowerCase())} yet.</td></tr>`}
      </tbody>
    </table>
  `;
}

function customerCell(row) {
  const details = row.customerDetails || {};
  const name = details.name || row.customerName || "";
  const phone = details.phone || row.phone || "";
  return `${escapeHtml(name)}${phone ? `<br><span class="muted">${escapeHtml(phone)}</span>` : ""}`;
}

function actionsHtml(kind, id) {
  const pending = state.pendingDelete === `${kind}:${id}`;
  return `
    <div class="row-actions">
      <button class="btn btn-secondary" type="button" onclick="openEditor('${kind}', '${id}')">Edit</button>
      <button class="btn btn-secondary" type="button" onclick="duplicateRecord('${kind}', '${id}')">Duplicate</button>
      <button class="btn btn-secondary" type="button" onclick="downloadRecordPdf('${kind}', '${id}')">PDF</button>
      <button class="btn btn-secondary" type="button" onclick="printRecordPdf('${kind}', '${id}')">Print</button>
      ${pending
        ? `<button class="btn btn-danger" type="button" onclick="confirmDeleteRecord('${kind}', '${id}')">OK Delete</button><button class="btn btn-secondary" type="button" onclick="cancelDeleteRecord()">Cancel</button>`
        : `<button class="btn btn-danger" type="button" onclick="beginDeleteRecord('${kind}', '${id}')">Delete</button>`}
    </div>
  `;
}

function statusBadge(status) {
  return `<span class="badge ${escapeAttr(status)}">${escapeHtml(capitalize(status))}</span>`;
}

function openEditor(kind, id = null) {
  state.tab = kind;
  state.mode = "editor";
  state.editingId = id;
  render();
}

function renderEditor(kind, id) {
  if (kind === "warrantyCards") {
    renderWarrantyEditor(id);
    return;
  }
  renderCommercialEditor(kind, id);
}

function renderCommercialEditor(kind, id) {
  const meta = DOCUMENTS[kind];
  const existing = id ? (db[kind] || []).find((row) => row.id === id) : null;
  const record = normalizeCommercialRecord(kind, existing || defaultCommercialRecord(kind));
  const products = record.products.length ? record.products : [emptyProduct()];
  const isInvoice = kind === "invoices";

  contentEl.innerHTML = `
    <form id="documentForm" class="editor" data-kind="${kind}" data-id="${escapeAttr(id || "")}">
      <section class="section">
        <h2>${id ? "Edit" : "Create"} ${escapeHtml(meta.singular)}</h2>
        <div class="form-grid">
          <div class="field"><label>${escapeHtml(meta.singular)} Number</label><input name="docNumber" value="${escapeAttr(record[meta.numberField])}" readonly></div>
          <div class="field"><label>Date</label><input name="docDate" type="date" value="${escapeAttr(record[meta.dateField] || todayISO())}"></div>
          <div class="field"><label>Customer Name</label><input name="customerName" value="${escapeAttr(record.customerDetails.name)}" required></div>
          <div class="field"><label>Phone Number</label><input name="phone" value="${escapeAttr(record.customerDetails.phone)}"></div>
          <div class="field"><label>Email</label><input name="email" type="email" value="${escapeAttr(record.customerDetails.email)}"></div>
          <div class="field"><label>GST Number</label><input name="gstNo" value="${escapeAttr(record.customerDetails.gstNo || "")}"></div>
          <div class="field"><label>City</label><input name="city" value="${escapeAttr(record.customerDetails.city)}"></div>
          <div class="field"><label>State</label><input name="state" value="${escapeAttr(record.customerDetails.state)}"></div>
          <div class="field"><label>Country</label><input name="country" value="${escapeAttr(record.customerDetails.country || "India")}"></div>
          ${isInvoice
            ? `<div class="field"><label>Reference Quotation</label><input name="referenceNumber" value="${escapeAttr(record.referenceNumber || "")}"></div>`
            : `<div class="field"><label>Installation Timeline</label><input name="installationTime" value="${escapeAttr(record.customerDetails.installationTime || "Within 4 working days")}"></div>`}
          <div class="field full"><label>Installation Address</label><textarea name="address">${escapeHtml(record.customerDetails.installationAddress)}</textarea></div>
          <div class="field full"><label>Notes</label><textarea name="notes">${escapeHtml(record.customerDetails.notes)}</textarea></div>
        </div>
      </section>

      <section class="section">
        <div class="product-head">
          <h2>Product Details</h2>
          <button class="btn btn-secondary" id="addProductBtn" type="button">Add Product</button>
        </div>
        <div class="products" id="productsList">
          ${products.map((product, index) => productRowHtml(product, index)).join("")}
        </div>
      </section>

      <section class="section">
        <h2>GST and Status</h2>
        <div class="form-grid">
          ${isInvoice ? `<div class="field"><label>HSN/SAC Code</label><input name="hsnSac" value="${escapeAttr(record.hsnSac || "7314")}"></div>` : ""}
          <div class="field"><label>Tax/GST</label><select name="taxMode">${TAX_OPTIONS.map((item) => `<option value="${item.value}" ${String(record.taxMode) === String(item.value) ? "selected" : ""}>${item.label}</option>`).join("")}</select></div>
          <div class="field"><label>Custom Tax %</label><input name="customTaxRate" type="number" step="0.01" value="${escapeAttr(record.customTaxRate || 0)}"></div>
          <div class="field"><label>Extra Discount</label><input name="discount" type="number" step="0.01" value="${escapeAttr(record.discount || 0)}"></div>
          <div class="field"><label>Authorized Signatory</label><input name="signatory" value="${escapeAttr(record.signatory || COMPANY_PROFILE.name)}"></div>
          <div class="field"><label>Status</label><select name="status">${meta.statuses.map((status) => `<option value="${status}" ${record.status === status ? "selected" : ""}>${capitalize(status)}</option>`).join("")}</select></div>
        </div>
      </section>

      <div class="summary-bar">
        <div class="totals" id="editorTotals"></div>
        <div class="form-actions">
          <button class="btn btn-secondary" type="button" onclick="saveEditorRecord('draft')">Save Draft</button>
          <button class="btn btn-secondary" type="button" onclick="downloadCurrentPdf()">Download PDF</button>
          <button class="btn btn-navy" type="button" onclick="printCurrentPdf()">Print PDF</button>
          <button class="btn btn-primary" type="button" onclick="saveEditorRecord()">Save</button>
        </div>
      </div>
    </form>
  `;

  bindCommercialEditor();
  refreshCommercialTotals();
}

function bindCommercialEditor() {
  const form = document.getElementById("documentForm");
  form.addEventListener("input", refreshCommercialTotals);
  form.addEventListener("change", refreshCommercialTotals);
  document.getElementById("addProductBtn").addEventListener("click", () => {
    const list = document.getElementById("productsList");
    list.insertAdjacentHTML("beforeend", productRowHtml(emptyProduct(), list.querySelectorAll(".product-card").length));
    refreshCommercialTotals();
  });
}

function productRowHtml(product, index) {
  const calc = calculateItem(product);
  return `
    <article class="product-card" data-product-row>
      <div class="product-head">
        <strong>Product ${index + 1}</strong>
        <button class="btn btn-secondary" type="button" onclick="removeProductRow(this)">Remove</button>
      </div>
      <div class="form-grid">
        <div class="field"><label>Category</label><select data-field="category">${PRODUCT_CATEGORIES.map((cat) => `<option value="${cat}" ${product.category === cat ? "selected" : ""}>${cat}</option>`).join("")}</select></div>
        <div class="field"><label>Product Name</label><input data-field="productName" value="${escapeAttr(product.productName || "")}"></div>
        <div class="field"><label>Width</label><input data-field="width" type="number" step="0.01" value="${escapeAttr(product.width || "")}"></div>
        <div class="field"><label>Height</label><input data-field="height" type="number" step="0.01" value="${escapeAttr(product.height || "")}"></div>
        <div class="field"><label>Unit</label><select data-field="unit">${UNITS.map((unit) => `<option value="${unit}" ${product.unit === unit ? "selected" : ""}>${unit}</option>`).join("")}</select></div>
        <div class="field"><label>Quantity</label><input data-field="quantity" type="number" min="1" step="1" value="${escapeAttr(product.quantity || 1)}"></div>
        <div class="field"><label>Area</label><input data-field="area" value="${areaLabel(calc)}" readonly></div>
        <div class="field"><label>Rate / Sq Ft</label><input data-field="rateSqFt" type="number" step="0.01" value="${escapeAttr(product.rateSqFt || "")}"></div>
        <div class="field"><label>Rate / Sq Meter</label><input data-field="rateSqMeter" type="number" step="0.01" value="${escapeAttr(product.rateSqMeter || "")}"></div>
        <div class="field"><label>Installation Charge</label><input data-field="installationCharge" type="number" step="0.01" value="${escapeAttr(product.installationCharge || "")}"></div>
        <div class="field"><label>Delivery Charge</label><input data-field="deliveryCharge" type="number" step="0.01" value="${escapeAttr(product.deliveryCharge || "")}"></div>
        <div class="field"><label>Discount</label><input data-field="discount" type="number" step="0.01" value="${escapeAttr(product.discount || "")}"></div>
        <div class="field full"><label>Notes</label><textarea data-field="notes">${escapeHtml(product.notes || "")}</textarea></div>
      </div>
    </article>
  `;
}

function removeProductRow(button) {
  const list = document.getElementById("productsList");
  if (list.querySelectorAll(".product-card").length <= 1) {
    toast("At least one product is required.");
    return;
  }
  button.closest("[data-product-row]").remove();
  refreshCommercialTotals();
}

function refreshCommercialTotals() {
  const form = document.getElementById("documentForm");
  if (!form) return;

  document.querySelectorAll("[data-product-row]").forEach((row) => {
    const calc = calculateItem(productFromRow(row));
    const areaInput = row.querySelector('[data-field="area"]');
    if (areaInput) areaInput.value = areaLabel(calc);
  });

  const doc = commercialFromForm();
  const totals = document.getElementById("editorTotals");
  totals.innerHTML = `
    <div class="total-item"><span>Products</span><strong>${currency(doc.productTotal)}</strong></div>
    <div class="total-item"><span>Install + Delivery</span><strong>${currency(doc.installation + doc.delivery)}</strong></div>
    <div class="total-item"><span>Discount</span><strong>${currency(doc.discount)}</strong></div>
    <div class="total-item"><span>Tax (${doc.taxRate}%)</span><strong>${currency(doc.taxAmount)}</strong></div>
    <div class="total-item grand"><span>Total</span><strong>${currency(doc.total)}</strong></div>
  `;

  const customTax = form.elements.customTaxRate;
  customTax.disabled = form.elements.taxMode.value !== "custom";
}

function commercialFromForm() {
  const form = document.getElementById("documentForm");
  const kind = form.dataset.kind;
  const meta = DOCUMENTS[kind];
  const doc = {
    id: form.dataset.id || undefined,
    [meta.numberField]: sanitize(form.elements.docNumber.value),
    [meta.dateField]: form.elements.docDate.value,
    customerDetails: {
      name: sanitize(form.elements.customerName.value),
      phone: sanitize(form.elements.phone.value),
      email: sanitize(form.elements.email.value),
      gstNo: sanitize(form.elements.gstNo.value),
      city: sanitize(form.elements.city.value),
      state: sanitize(form.elements.state.value),
      country: sanitize(form.elements.country.value) || "India",
      installationTime: kind === "quotations" ? sanitize(form.elements.installationTime.value) : "",
      installationAddress: sanitize(form.elements.address.value),
      notes: sanitize(form.elements.notes.value)
    },
    customerName: sanitize(form.elements.customerName.value),
    phone: sanitize(form.elements.phone.value),
    email: sanitize(form.elements.email.value),
    products: [...document.querySelectorAll("[data-product-row]")].map(productFromRow),
    taxMode: form.elements.taxMode.value,
    customTaxRate: num(form.elements.customTaxRate.value),
    discount: num(form.elements.discount.value),
    signatory: sanitize(form.elements.signatory.value),
    status: form.elements.status.value,
    companyProfile: COMPANY_PROFILE
  };

  if (kind === "invoices") {
    doc.hsnSac = sanitize(form.elements.hsnSac.value || "7314");
    doc.referenceNumber = sanitize(form.elements.referenceNumber.value);
  }

  return calculateCommercial(kind, doc);
}

function productFromRow(row) {
  const pick = (field) => row.querySelector(`[data-field="${field}"]`);
  return {
    category: sanitize(pick("category").value),
    productName: sanitize(pick("productName").value),
    width: num(pick("width").value),
    height: num(pick("height").value),
    unit: pick("unit").value || "Sq Ft",
    quantity: Math.max(1, num(pick("quantity").value) || 1),
    rateSqFt: num(pick("rateSqFt").value),
    rateSqMeter: num(pick("rateSqMeter").value),
    installationCharge: num(pick("installationCharge").value),
    deliveryCharge: num(pick("deliveryCharge").value),
    discount: num(pick("discount").value),
    notes: sanitize(pick("notes").value)
  };
}

function calculateCommercial(kind, doc) {
  const products = (doc.products || []).map(calculateItem);
  const productTotal = products.reduce((sum, item) => sum + num(item.productTotal), 0);
  const installation = products.reduce((sum, item) => sum + num(item.installationCharge), 0);
  const delivery = products.reduce((sum, item) => sum + num(item.deliveryCharge), 0);
  const itemDiscount = products.reduce((sum, item) => sum + num(item.discount), 0);
  const subtotal = productTotal + installation + delivery;
  const discount = itemDiscount + num(doc.discount);
  const taxable = Math.max(0, subtotal - discount);
  const taxRate = doc.taxMode === "custom" ? num(doc.customTaxRate) : num(doc.taxMode);
  const taxAmount = taxable * taxRate / 100;
  const total = taxable + taxAmount;
  return {
    ...doc,
    documentType: kind,
    products,
    productTotal,
    installation,
    delivery,
    subtotal,
    discount,
    taxable,
    taxRate,
    taxAmount,
    tax: taxAmount,
    total
  };
}

function calculateItem(item) {
  const width = num(item.width);
  const height = num(item.height);
  const quantity = Math.max(1, num(item.quantity) || 1);
  let areaSqFt = 0;

  if (item.unit === "Sq Meter") areaSqFt = width * height * 10.7639;
  else if (item.unit === "CM") areaSqFt = (width / 30.48) * (height / 30.48);
  else if (item.unit === "MM") areaSqFt = (width / 304.8) * (height / 304.8);
  else areaSqFt = width * height;

  const areaSqMeter = areaSqFt / 10.7639;
  const rate = num(item.rateSqFt) || (num(item.rateSqMeter) / 10.7639);
  const productTotal = areaSqFt * quantity * rate;
  const lineTotal = productTotal + num(item.installationCharge) + num(item.deliveryCharge) - num(item.discount);

  return {
    ...item,
    areaSqFt,
    areaSqMeter,
    productTotal,
    lineTotal
  };
}

function renderWarrantyEditor(id) {
  const existing = id ? (db.warrantyCards || []).find((row) => row.id === id) : null;
  const record = normalizeWarrantyRecord(existing || defaultWarrantyRecord());
  const meta = DOCUMENTS.warrantyCards;

  contentEl.innerHTML = `
    <form id="warrantyForm" class="editor" data-id="${escapeAttr(id || "")}">
      <section class="section">
        <h2>${id ? "Edit" : "Create"} ${escapeHtml(meta.singular)}</h2>
        <div class="form-grid">
          <div class="field"><label>Serial No.</label><input name="serialNo" value="${escapeAttr(record.serialNo)}" readonly></div>
          <div class="field"><label>Installation Date</label><input name="installationDate" type="date" value="${escapeAttr(record.installationDate || todayISO())}"></div>
          <div class="field"><label>Customer Name</label><input name="customerName" value="${escapeAttr(record.customerDetails.name)}" required></div>
          <div class="field"><label>Phone Number</label><input name="phone" value="${escapeAttr(record.customerDetails.phone)}"></div>
          <div class="field"><label>Email</label><input name="email" type="email" value="${escapeAttr(record.customerDetails.email)}"></div>
          <div class="field"><label>City</label><input name="city" value="${escapeAttr(record.customerDetails.city || "")}"></div>
          <div class="field"><label>State</label><input name="state" value="${escapeAttr(record.customerDetails.state || "")}"></div>
          <div class="field"><label>Country</label><input name="country" value="${escapeAttr(record.customerDetails.country || "India")}"></div>
          <div class="field"><label>Product Purchased</label><input name="productPurchased" value="${escapeAttr(record.productPurchased)}"></div>
          <div class="field"><label>Order / Invoice No.</label><input name="invoiceNo" value="${escapeAttr(record.invoiceNo || "")}"></div>
          <div class="field"><label>Installed By</label><input name="installedBy" value="${escapeAttr(record.installedBy)}"></div>
          <div class="field"><label>Status</label><select name="status">${meta.statuses.map((status) => `<option value="${status}" ${record.status === status ? "selected" : ""}>${capitalize(status)}</option>`).join("")}</select></div>
          <div class="field full"><label>Address</label><textarea name="address">${escapeHtml(record.customerDetails.installationAddress)}</textarea></div>
          <div class="field full"><label>Notes</label><textarea name="notes">${escapeHtml(record.notes || "")}</textarea></div>
        </div>
      </section>

      <div class="summary-bar">
        <div class="totals">
          <div class="total-item grand"><span>Serial No.</span><strong>${escapeHtml(record.serialNo)}</strong></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" type="button" onclick="downloadCurrentPdf()">Download PDF</button>
          <button class="btn btn-navy" type="button" onclick="printCurrentPdf()">Print PDF</button>
          <button class="btn btn-primary" type="button" onclick="saveEditorRecord()">Save</button>
        </div>
      </div>
    </form>
  `;
}

function warrantyFromForm() {
  const form = document.getElementById("warrantyForm");
  return {
    id: form.dataset.id || undefined,
    serialNo: sanitize(form.elements.serialNo.value),
    installationDate: form.elements.installationDate.value,
    customerDetails: {
      name: sanitize(form.elements.customerName.value),
      phone: sanitize(form.elements.phone.value),
      email: sanitize(form.elements.email.value),
      city: sanitize(form.elements.city.value),
      state: sanitize(form.elements.state.value),
      country: sanitize(form.elements.country.value) || "India",
      installationAddress: sanitize(form.elements.address.value)
    },
    customerName: sanitize(form.elements.customerName.value),
    phone: sanitize(form.elements.phone.value),
    email: sanitize(form.elements.email.value),
    productPurchased: sanitize(form.elements.productPurchased.value),
    invoiceNo: sanitize(form.elements.invoiceNo.value),
    installedBy: sanitize(form.elements.installedBy.value),
    status: form.elements.status.value,
    notes: sanitize(form.elements.notes.value),
    companyProfile: COMPANY_PROFILE
  };
}

async function saveEditorRecord(forceStatus) {
  const kind = state.tab;
  const record = kind === "warrantyCards" ? warrantyFromForm() : commercialFromForm();
  if (forceStatus) record.status = forceStatus;

  if (!requiredCustomerName(record)) {
    toast("Customer name is required.");
    return;
  }

  await ensureDocumentNumber(kind, record);
  if (!saveRecord(kind, record)) return;
  state.mode = "list";
  state.editingId = null;
  render();
  toast(DOCUMENTS[kind].singular + " saved.");
}

function saveRecord(kind, record) {
  const now = new Date().toISOString();
  const list = db[kind] || [];
  const previousList = list.slice();
  let savedRecord;
  if (record.id) {
    const index = list.findIndex((row) => row.id === record.id);
    savedRecord = { ...(index >= 0 ? list[index] : {}), ...record, updatedAt: now };
    if (index >= 0) list[index] = savedRecord;
    else list.unshift(savedRecord);
  } else {
    savedRecord = { ...record, id: uid(), createdAt: now, updatedAt: now };
    list.unshift(savedRecord);
  }
  db[kind] = list;
  if (!saveStore()) {
    db[kind] = previousList;
    return false;
  }
  // Firebase sync: online hone pe Firestore mein save, offline hone pe queue mein
  if (window.firebaseSync) window.firebaseSync.save(kind, savedRecord.id, savedRecord);
  return true;
}

function beginDeleteRecord(kind, id) {
  state.pendingDelete = `${kind}:${id}`;
  renderList();
  toast("Click OK Delete to confirm.");
}

function cancelDeleteRecord() {
  state.pendingDelete = null;
  renderList();
}

function confirmDeleteRecord(kind, id) {
  state.pendingDelete = null;
  deleteRecord(kind, id);
}

function deleteRecord(kind, id) {
  const previousList = db[kind] || [];
  db[kind] = (db[kind] || []).filter((row) => row.id !== id);
  if (!saveStore()) {
    db[kind] = previousList;
    return;
  }
  render();
  toast("Record deleted.");
  // Firebase sync: delete bhi queue mein ya turant
  if (window.firebaseSync) window.firebaseSync.delete(kind, id);
}

async function duplicateRecord(kind, id) {
  const record = (db[kind] || []).find((row) => row.id === id);
  if (!record) return;
  const copy = structuredCloneSafe(record);
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  applyNewNumber(kind, copy);
  await ensureDocumentNumber(kind, copy);
  copy.status = defaultStatus(kind);
  if (!saveRecord(kind, copy)) return;
  render();
  toast("Record duplicated.");
}

async function downloadRecordPdf(kind, id) {
  const record = (db[kind] || []).find((row) => row.id === id);
  if (!record) return;
  const previewWindow = isAppleTouchDevice() ? preparePdfWindow() : null;
  if (!isPdfReady()) {
    closePdfWindow(previewWindow);
    downloadPrintableHtml(kind, record);
    return;
  }
  await runPdfAction(kind, record, "download", previewWindow);
}

async function printRecordPdf(kind, id) {
  const record = (db[kind] || []).find((row) => row.id === id);
  if (!record) return;
  const previewWindow = preparePdfWindow();
  if (!isPdfReady()) {
    openPrintableDocument(kind, record, previewWindow);
    return;
  }
  await runPdfAction(kind, record, "print", previewWindow);
}

async function downloadCurrentPdf() {
  const kind = state.tab;
  const record = kind === "warrantyCards" ? warrantyFromForm() : commercialFromForm();
  const previewWindow = isAppleTouchDevice() ? preparePdfWindow() : null;
  if (!isPdfReady()) {
    closePdfWindow(previewWindow);
    downloadPrintableHtml(kind, record);
    return;
  }
  await runPdfAction(kind, record, "download", previewWindow);
}

async function printCurrentPdf() {
  const kind = state.tab;
  const record = kind === "warrantyCards" ? warrantyFromForm() : commercialFromForm();
  const previewWindow = preparePdfWindow();
  if (!isPdfReady()) {
    openPrintableDocument(kind, record, previewWindow);
    return;
  }
  await runPdfAction(kind, record, "print", previewWindow);
}

async function buildPdf(kind, record) {
  if (!isPdfReady()) return null;
  if (kind === "warrantyCards") return buildWarrantyPdf(record);
  return buildCommercialPdf(kind, record);
}

function isPdfReady() {
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) return false;
    const testDoc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    return typeof testDoc.autoTable === "function";
  } catch (error) {
    return false;
  }
}

async function runPdfAction(kind, record, action, previewWindow) {
  try {
    const pdf = await buildPdf(kind, record);
    if (!pdf) {
      closePdfWindow(previewWindow);
      return;
    }

    const fileName = pdfFileName(kind, record);
    if (action === "download" && !isAppleTouchDevice()) {
      pdf.save(fileName);
      return;
    }

    if (action === "print" && typeof pdf.autoPrint === "function") {
      pdf.autoPrint();
    }
    openPdfPreview(pdf, previewWindow, fileName);
    toast(action === "print"
      ? "PDF opened for printing."
      : "PDF opened. Use Share to save it on this iPad.");
  } catch (error) {
    closePdfWindow(previewWindow);
    console.error("PDF generation failed", error);
    toast("PDF generation failed: " + (error && error.message ? error.message : "Unknown error"), 5000);
  }
}

function preparePdfWindow() {
  const popup = window.open("", "_blank");
  if (!popup) return null;
  try {
    popup.document.open();
    popup.document.write("<!doctype html><title>Preparing PDF</title><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:32px;color:#172033}p{font-size:18px}</style><p>Preparing PDF...</p>");
    popup.document.close();
  } catch (error) {
    console.warn("Could not prepare PDF window", error);
  }
  return popup;
}

function closePdfWindow(popup) {
  if (!popup || popup.closed) return;
  try {
    popup.close();
  } catch (error) {
    console.warn("Could not close PDF window", error);
  }
}

function openPdfPreview(pdf, popup, fileName) {
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const target = popup && !popup.closed ? popup : window.open("", "_blank");
  if (!target) {
    URL.revokeObjectURL(url);
    pdf.save(fileName);
    return;
  }
  target.location.replace(url);
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

function isAppleTouchDevice() {
  const platform = navigator.platform || "";
  const userAgent = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(userAgent)
    || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function openPrintableDocument(kind, record, existingPopup) {
  const popup = existingPopup || window.open("", "_blank");
  const html = printableHtml(kind, record);
  if (!popup) {
    downloadPrintableHtml(kind, record);
    toast("Printable HTML downloaded. Open it and use Save as PDF.");
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 250);
}

function downloadPrintableHtml(kind, record) {
  const blob = new Blob([printableHtml(kind, record)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFileName(pdfFileName(kind, record).replace(/\.pdf$/i, ".html"));
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast("PDF library unavailable. Printable HTML downloaded.");
}

function printableHtml(kind, sourceRecord) {
  const isWarranty = kind === "warrantyCards";
  const meta = DOCUMENTS[kind];
  const record = isWarranty ? normalizeWarrantyRecord(sourceRecord) : calculateCommercial(kind, sourceRecord);
  const customer = record.customerDetails || {};
  const title = isWarranty ? "WARRANTY CARD" : kind === "invoices" ? "TAX INVOICE" : "QUOTATION";
  const number = record[meta.numberField] || "";
  const date = record[meta.dateField] || "";
  const terms = isWarranty ? COMPANY_PROFILE.warrantyTerms : kind === "invoices" ? COMPANY_PROFILE.invoiceTerms : COMPANY_PROFILE.quotationTerms;

  const productRows = isWarranty ? "" : record.products.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml([item.category, item.productName, item.notes].filter(Boolean).join(" - "))}</td>
      ${kind === "invoices" ? `<td>${escapeHtml(item.hsnSac || record.hsnSac || "7314")}</td>` : ""}
      <td>${escapeHtml(item.quantity || 1)}</td>
      <td>${item.areaSqFt ? item.areaSqFt.toFixed(2) : ""}</td>
      <td>${currency2(num(item.rateSqFt) || (num(item.rateSqMeter) ? num(item.rateSqMeter) / 10.7639 : 0))}</td>
      <td>${currency2(item.productTotal)}</td>
    </tr>
  `).join("");

  const commercialTable = isWarranty ? "" : `
    <table>
      <thead>
        <tr>
          <th>S.No.</th><th>Product Description</th>${kind === "invoices" ? "<th>HSN/SAC</th>" : ""}<th>Qty</th><th>Area</th><th>Rate</th><th>Amount</th>
        </tr>
      </thead>
      <tbody>${productRows}</tbody>
    </table>
    <table class="totals-table">
      <tbody>
        <tr><th>Products Total</th><td>${currency(record.productTotal)}</td></tr>
        <tr><th>Installation + Delivery</th><td>${currency(record.installation + record.delivery)}</td></tr>
        <tr><th>Subtotal</th><td>${currency(record.subtotal)}</td></tr>
        <tr><th>Discount</th><td>-${currency(record.discount)}</td></tr>
        <tr><th>GST @ ${record.taxRate}%</th><td>${currency(record.taxAmount)}</td></tr>
        <tr><th>Total Payable</th><td>${currency(Math.round(record.total))}</td></tr>
      </tbody>
    </table>
    <p><strong>Amount in words:</strong> ${amountInWords(Math.round(record.total))} Rupees Only.</p>
  `;

  const warrantyBody = isWarranty ? `
    <table>
      <tbody>
        <tr><th>Customer's Name</th><td>${escapeHtml(customer.name || record.customerName || "")}</td></tr>
        <tr><th>Address</th><td>${escapeHtml(customer.installationAddress || "")}</td></tr>
        <tr><th>City / State</th><td>${escapeHtml([customer.city, customer.state, customer.country].filter(Boolean).join(", "))}</td></tr>
        <tr><th>Mobile No.</th><td>${escapeHtml(customer.phone || record.phone || "")}</td></tr>
        <tr><th>E-mail</th><td>${escapeHtml(customer.email || record.email || "")}</td></tr>
        <tr><th>Product Purchased</th><td>${escapeHtml(record.productPurchased || "")}</td></tr>
        <tr><th>Order / Invoice No.</th><td>${escapeHtml(record.invoiceNo || record.serialNo || "")}</td></tr>
        <tr><th>Installation Date</th><td>${escapeHtml(record.installationDate || "")}</td></tr>
        <tr><th>Installed By</th><td>${escapeHtml(record.installedBy || "")}</td></tr>
      </tbody>
    </table>
  ` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} ${escapeHtml(number)}</title>
  <style>
    :root{--navy:#1e3a8a;--orange:#f97316;--sky:#eff6ff;--peach:#fff7ed;--line:#bfdbfe;--ink:#0f172a}
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;color:var(--ink);margin:24px;font-size:12px}
    .title-bar{background:var(--navy);color:#fff;text-align:center;padding:9px;font-size:16px;font-weight:700;border-bottom:4px solid var(--orange)}
    .header{text-align:center;border-bottom:3px solid var(--orange);padding:10px 0;margin-bottom:12px}
    .header img{height:58px;max-width:170px;object-fit:contain;float:left}
    .header::after{content:"";display:block;clear:both}
    .company-name{color:var(--navy);font-size:20px;font-weight:700;margin-top:2px}
    .tagline{color:var(--orange);font-weight:700;margin:3px 0 8px}
    .company-details{background:var(--sky);border:1px solid var(--line);padding:7px;border-radius:4px;line-height:1.5}
    h1{font-size:18px;margin:0 0 8px}
    h2{font-size:14px;margin:18px 0 8px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
    .box{border:1px solid var(--line);padding:10px;min-height:82px;background:var(--sky)}
    .box:nth-child(2){background:var(--peach)}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{border:1px solid var(--line);padding:6px;text-align:left;vertical-align:top}
    thead th{font-weight:700;background:var(--navy);color:#fff}
    tbody th{font-weight:700;background:var(--sky)}
    .totals-table{margin-left:auto;width:340px}
    .totals-table tr:last-child th,.totals-table tr:last-child td{background:var(--orange);color:#fff;font-weight:700}
    .terms{background:var(--peach);border:1px solid var(--orange);padding:12px 12px 8px 30px}
    .terms li{margin-bottom:4px}
    .signature{text-align:right;margin-top:36px;min-height:92px}
    .signature .stamp{display:block;width:118px;height:auto;margin:6px 0 0 auto}
    @media print{body{margin:12mm}.no-print{display:none}}
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print / Save as PDF</button>
  <div class="title-bar">${escapeHtml(title)}</div>
  <div class="header">
    <img src="${escapeAttr(COMPANY_PROFILE.logo)}" alt="">
    <div class="company-name">${escapeHtml(COMPANY_PROFILE.name.toUpperCase())}</div>
    <div class="tagline">${escapeHtml(COMPANY_PROFILE.tagline)}</div>
    <div class="company-details">
      Office: ${escapeHtml(COMPANY_PROFILE.officeAddress)}<br>
      Factory: ${escapeHtml(COMPANY_PROFILE.address)}<br>
      ${escapeHtml(COMPANY_PROFILE.email)} | ${escapeHtml(COMPANY_PROFILE.website)}<br>
      ${escapeHtml(COMPANY_PROFILE.contacts.join(", "))} | GST: ${escapeHtml(COMPANY_PROFILE.gstNumber)}
    </div>
  </div>
  <div class="grid">
    <div class="box">
      <strong>To</strong><br>
      ${escapeHtml(customer.name || record.customerName || "")}<br>
      ${escapeHtml(customer.installationAddress || "")}<br>
      ${escapeHtml(customer.phone || record.phone || "")}<br>
      ${escapeHtml(customer.email || record.email || "")}
    </div>
    <div class="box">
      <strong>No.:</strong> ${escapeHtml(number)}<br>
      <strong>Date:</strong> ${escapeHtml(date)}<br>
      ${kind === "quotations" ? `<strong>Installation:</strong> ${escapeHtml(customer.installationTime || "Within 4 working days")}<br>` : ""}
      ${kind === "invoices" ? `<strong>Reference:</strong> ${escapeHtml(record.referenceNumber || "")}<br>` : ""}
      <strong>Status:</strong> ${escapeHtml(capitalize(record.status || defaultStatus(kind)))}
    </div>
  </div>
  ${commercialTable}
  ${warrantyBody}
  <h2>Terms and Conditions</h2>
  <ol class="terms">${terms.map((term) => `<li>${escapeHtml(term)}</li>`).join("")}</ol>
  <div class="signature">
    <strong>For ${escapeHtml(record.signatory || COMPANY_PROFILE.name)}</strong>
    <img class="stamp" src="${escapeAttr(COMPANY_PROFILE.stamp)}" alt="">
    Authorised Signatory
  </div>
</body>
</html>`;
}

const PDF_BRAND = {
  navy: [30, 58, 138],
  orange: [249, 115, 22],
  sky: [239, 246, 255],
  peach: [255, 247, 237],
  line: [191, 219, 254],
  ink: [15, 23, 42],
  muted: [71, 85, 105],
  white: [255, 255, 255]
};

function setPdfColor(doc, type, color) {
  doc[type](color[0], color[1], color[2]);
}

function addPdfNoteBox(doc, label, note, x, y, width) {
  const text = String(note || "").trim();
  if (!text) return y;
  const lines = doc.splitTextToSize(text, width - 18);
  const height = Math.max(10, lines.length * 4 + 7);
  setPdfColor(doc, "setFillColor", PDF_BRAND.peach);
  setPdfColor(doc, "setDrawColor", PDF_BRAND.orange);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setPdfColor(doc, "setTextColor", PDF_BRAND.orange);
  doc.text(label, x + 3, y + 5);
  doc.setFont("helvetica", "normal");
  setPdfColor(doc, "setTextColor", PDF_BRAND.ink);
  doc.text(lines, x + 15, y + 5);
  doc.setTextColor(0, 0, 0);
  return y + height + 5;
}

function withPdfOpacity(doc, opacity, callback) {
  if (doc.setGState && doc.GState) {
    let callbackInvoked = false;
    try {
      doc.setGState(new doc.GState({ opacity }));
      callbackInvoked = true;
      callback();
      doc.setGState(new doc.GState({ opacity: 1 }));
      return;
    } catch (error) {
      console.warn("PDF opacity is unavailable", error);
      try {
        doc.setGState(new doc.GState({ opacity: 1 }));
      } catch (resetError) {
        console.warn("Could not reset PDF opacity", resetError);
      }
    }
    if (callbackInvoked) return;
  }
  callback();
}

async function buildCommercialPdf(kind, sourceRecord) {
  const record = calculateCommercial(kind, sourceRecord);
  return kind === "invoices" ? buildInvoicePdf(record) : buildQuotationPdf(record);
}

async function buildQuotationPdf(record) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  if (typeof doc.autoTable !== "function") {
    toast("PDF table library is still loading. Try again in a moment.");
    return null;
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let y = await pdfHeader(doc, "QUOTATION");
  const customer = record.customerDetails || {};
  const leftWidth = 108;
  const rightWidth = pageWidth - margin * 2 - leftWidth;
  const boxHeight = 32;

  setPdfColor(doc, "setFillColor", PDF_BRAND.sky);
  setPdfColor(doc, "setDrawColor", PDF_BRAND.line);
  doc.rect(margin, y, leftWidth, boxHeight, "FD");
  setPdfColor(doc, "setFillColor", PDF_BRAND.peach);
  doc.rect(margin + leftWidth, y, rightWidth, boxHeight, "FD");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8.5);

  const labelValue = (label, value, labelX, valueX, lineY) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, labelX, lineY);
    doc.setFont("helvetica", "normal");
    doc.text(String(value || ""), valueX, lineY);
  };

  let lineY = y + 5;
  const labelX = margin + 2;
  const valueX = margin + 26;
  labelValue("To.", customer.name || record.customerName, labelX, valueX, lineY);
  lineY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.text("Address :", labelX, lineY);
  doc.setFont("helvetica", "normal");
  const addressLines = doc.splitTextToSize(customer.installationAddress || "", 78);
  doc.text(addressLines[0] || "", valueX, lineY);
  if (addressLines[1]) {
    lineY += 4;
    doc.text(addressLines[1], valueX, lineY);
  }
  lineY += 5;
  labelValue("Contact :", customer.phone || record.phone, labelX, valueX, lineY);
  lineY += 4.5;
  labelValue("E mail :", customer.email || record.email, labelX, valueX, lineY);
  lineY += 4.5;
  labelValue("Gst No. :", customer.gstNo, labelX, valueX, lineY);

  const rightX = margin + leftWidth + 3;
  const rightValueX = rightX + 28;
  let rightY = y + 5;
  labelValue("Date :", formatPdfDate(record.quotationDate), rightX, rightValueX, rightY);
  rightY += 5;
  labelValue("Quote No.", record.quotationNumber, rightX, rightValueX, rightY);
  rightY += 5;
  labelValue("Installation :", customer.installationTime || "Within 4 working days", rightX, rightValueX, rightY);
  y += boxHeight + 1;

  const productRows = record.products.map((item, index) => {
    const rate = num(item.rateSqFt) || (num(item.rateSqMeter) ? num(item.rateSqMeter) / 10.7639 : 0);
    const description = (item.category || "") +
      (item.productName ? "\n" + item.productName : "") +
      (item.notes ? "\nNote: " + item.notes : "");
    return [
      String(index + 1),
      description,
      String(num(item.quantity) || 1),
      item.areaSqFt ? item.areaSqFt.toFixed(2) : "",
      rate ? currency2(rate) : "",
      item.productTotal ? currency2(item.productTotal) : ""
    ];
  });
  while (productRows.length < 4) productRows.push(["", "", "", "", "", ""]);

  const columnStyles = {
    0: { cellWidth: 10, halign: "center" },
    1: { cellWidth: 82 },
    2: { cellWidth: 22, halign: "center" },
    3: { cellWidth: 26, halign: "center" },
    4: { cellWidth: 25, halign: "center" },
    5: { cellWidth: 25, halign: "right" }
  };

  doc.autoTable({
    startY: y,
    head: [["S.No.", "Product Description", "Quantity", "Area\n(In Sqft)", "Rate\n(In Rs.)", "Amount\n(In Rs.)"]],
    body: productRows,
    theme: "grid",
    headStyles: { fillColor: PDF_BRAND.navy, textColor: PDF_BRAND.white, fontStyle: "bold", lineColor: PDF_BRAND.navy, lineWidth: 0.3, fontSize: 8, halign: "center", valign: "middle", cellPadding: 2 },
    bodyStyles: { fillColor: PDF_BRAND.white, textColor: PDF_BRAND.ink, lineColor: PDF_BRAND.line, lineWidth: 0.2, fontSize: 8, cellPadding: 2 },
    columnStyles,
    margin: { left: margin, right: margin },
    tableLineColor: PDF_BRAND.line,
    tableLineWidth: 0.3
  });

  let finalY = doc.lastAutoTable.finalY;
  const totalQuantity = record.products.reduce((sum, item) => sum + num(item.quantity), 0);
  const roundoff = Math.round(record.total) - record.total;
  const totalRows = [
    ["", "Total (Products)", "", "", "", currency2(record.productTotal)],
    ["", "Delivery and Installation", String(totalQuantity || ""), "", "", currency2(record.delivery + record.installation)],
    ["", "Sub Total", "", "", "", currency2(record.subtotal)],
    ...(record.discount > 0 ? [["", "Discount (-)", "", "", "", "-" + currency2(record.discount)]] : []),
    ["", "Taxable Amount", "", "", "", currency2(record.taxable)],
    ["", "IGST @ " + record.taxRate + "%", "", "", "", currency2(record.taxAmount)],
    ["", "R/O", "", "", "", roundoff ? currency2(roundoff) : ""]
  ];

  doc.autoTable({
    startY: finalY,
    body: totalRows,
    theme: "grid",
    bodyStyles: { fillColor: PDF_BRAND.sky, textColor: PDF_BRAND.ink, lineColor: PDF_BRAND.line, lineWidth: 0.2, fontSize: 8, cellPadding: 2 },
    columnStyles: { ...columnStyles, 1: { cellWidth: 82, fontStyle: "bold" }, 5: { cellWidth: 25, halign: "right", fontStyle: "bold" } },
    margin: { left: margin, right: margin },
    tableLineColor: PDF_BRAND.line,
    tableLineWidth: 0.3
  });

  finalY = doc.lastAutoTable.finalY;
  doc.autoTable({
    startY: finalY,
    body: [["", "Total Payable Amount", "", "", "", currency2(Math.round(record.total))]],
    theme: "grid",
    bodyStyles: { fillColor: PDF_BRAND.orange, textColor: PDF_BRAND.white, lineColor: PDF_BRAND.orange, lineWidth: 0.4, fontSize: 9, fontStyle: "bold", cellPadding: 2 },
    columnStyles,
    margin: { left: margin, right: margin },
    tableLineColor: PDF_BRAND.orange,
    tableLineWidth: 0.4
  });

  finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Amount (in words) : - " + amountInWords(Math.round(record.total)) + " Rupees Only.", margin, finalY);
  finalY += 6;
  finalY = addPdfNoteBox(doc, "Note:", customer.notes || record.notes, margin, finalY, pageWidth - margin * 2);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS & CONDITIONS:", margin, finalY);
  finalY += 4;
  doc.setFont("helvetica", "normal");
  COMPANY_PROFILE.quotationTerms.forEach((term, index) => {
    const lines = doc.splitTextToSize(index + 1 + ".  " + term, 180);
    doc.text(lines, margin + 2, finalY);
    finalY += lines.length * 4;
  });
  finalY += 3;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Advance : /-", margin, finalY);
  doc.text("Outstanding : /-", margin, finalY + 5);
  await addPdfSignature(doc, finalY, record.signatory || COMPANY_PROFILE.name);
  addPdfFooter(doc);
  return doc;
}

async function buildInvoicePdf(record) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  if (typeof doc.autoTable !== "function") {
    toast("PDF table library is still loading. Try again in a moment.");
    return null;
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const tableWidth = pageWidth - margin * 2;
  const customer = record.customerDetails || {};
  let y = await pdfHeader(doc, "TAX INVOICE");
  const leftWidth = 108;
  const rightWidth = tableWidth - leftWidth;
  const boxHeight = 32;

  setPdfColor(doc, "setFillColor", PDF_BRAND.sky);
  setPdfColor(doc, "setDrawColor", PDF_BRAND.line);
  doc.rect(margin, y, leftWidth, boxHeight, "FD");
  setPdfColor(doc, "setFillColor", PDF_BRAND.peach);
  doc.rect(margin + leftWidth, y, rightWidth, boxHeight, "FD");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8.5);

  const labelValue = (label, value, labelX, valueX, lineY) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, labelX, lineY);
    doc.setFont("helvetica", "normal");
    doc.text(String(value || ""), valueX, lineY);
  };

  let lineY = y + 5;
  const labelX = margin + 2;
  const valueX = margin + 22;
  labelValue("To,", customer.name || record.customerName, labelX, valueX, lineY);
  lineY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.text("Address :", labelX, lineY);
  doc.setFont("helvetica", "normal");
  const addressLines = doc.splitTextToSize(customer.installationAddress || "", 82);
  doc.text(addressLines[0] || "", valueX, lineY);
  if (addressLines[1]) {
    lineY += 4;
    doc.text(addressLines[1], valueX, lineY);
  }
  lineY += 5;
  labelValue("Contact :", customer.phone || record.phone, labelX, valueX, lineY);
  lineY += 4.5;
  labelValue("Gst No. :", customer.gstNo, labelX, valueX, lineY);

  const rightX = margin + leftWidth + 3;
  const rightValueX = rightX + 24;
  let rightY = y + 5;
  labelValue("Date :", formatPdfDate(record.invoiceDate), rightX, rightValueX, rightY);
  rightY += 5;
  labelValue("Invoice No.", record.invoiceNumber, rightX, rightValueX, rightY);
  rightY += 5;
  labelValue("Ref.", record.referenceNumber, rightX, rightValueX, rightY);
  rightY += 5;
  labelValue("Delivery Add :", [customer.city, customer.state].filter(Boolean).join(", "), rightX, rightValueX + 4, rightY);
  y += boxHeight + 1;

  const widths = [10, 65, 16, 14, 22, 30, 33];
  const productRows = record.products.map((item, index) => {
    const rate = num(item.rateSqFt) || (num(item.rateSqMeter) ? num(item.rateSqMeter) / 10.7639 : 0);
    const description = (item.category || "") +
      (item.productName ? "\n" + item.productName : "") +
      (item.notes ? "\nNote: " + item.notes : "");
    return [
      String(index + 1),
      description,
      item.hsnSac || record.hsnSac || "7314",
      String(num(item.quantity) || 1),
      item.areaSqFt ? item.areaSqFt.toFixed(2) : "",
      rate ? currency2(rate) : "",
      item.productTotal ? currency2(item.productTotal) : ""
    ];
  });
  while (productRows.length < 6) productRows.push(["", "", "", "", "", "", ""]);

  const totalQuantity = record.products.reduce((sum, item) => sum + num(item.quantity), 0);
  const halfTax = record.taxAmount / 2;
  const detailRowCount = productRows.length;
  const tableRows = [
    ...productRows,
    ["", "Total (Products)", "", "", "", "", currency2(record.productTotal)],
    ["", "Transportation & Installation Charges", "", String(totalQuantity || ""), "", "", currency2(record.delivery + record.installation)],
    ["", "Sub Total", "", "", "", "", currency2(record.subtotal)],
    ...(record.discount > 0 ? [["", "Discount (-)", "", "", "", "", "-" + currency2(record.discount)]] : []),
    ["", "Taxable Amount", "", "", "", "", currency2(record.taxable)],
    ["", "CGST @ " + record.taxRate / 2 + "%", "", "", "", "", currency2(halfTax)],
    ["", "SGST @ " + record.taxRate / 2 + "%", "", "", "", "", currency2(halfTax)]
  ];
  const columnStyles = {};
  widths.forEach((width, index) => {
    columnStyles[index] = {
      cellWidth: width,
      halign: index === 0 || index === 2 || index === 3 || index === 4 ? "center" : index >= 5 ? "right" : "left"
    };
  });

  doc.autoTable({
    startY: y,
    head: [["S.No.", "Product Description", "HSN\nSAC", "Qty.\nNos.", "Area\n(in Sqft)", "Rate\n(In Rs.)", "Amount\n(In Rs.)"]],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: PDF_BRAND.navy, textColor: PDF_BRAND.white, fontStyle: "bold", lineColor: PDF_BRAND.navy, lineWidth: 0.5, fontSize: 8, halign: "center", valign: "middle", cellPadding: 2 },
    bodyStyles: { fillColor: PDF_BRAND.white, textColor: PDF_BRAND.ink, lineColor: PDF_BRAND.line, lineWidth: 0.5, fontSize: 8, cellPadding: 2 },
    columnStyles,
    didParseCell(data) {
      if (data.section === "body" && data.row.index >= detailRowCount && (data.column.index === 1 || data.column.index === 6)) {
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: margin, right: margin },
    tableLineColor: PDF_BRAND.line,
    tableLineWidth: 0.5
  });

  let finalY = doc.lastAutoTable.finalY + 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("GST Amount (in words) : " + amountInWords(Math.round(record.taxAmount)) + " Rupees Only.", margin, finalY);
  finalY += 4;
  const roundoff = Math.round(record.total) - record.total;

  doc.autoTable({
    startY: finalY,
    body: [
      ["", "", "", "", "", "R/o", roundoff ? currency2(roundoff) : ""],
      ["", "Total Payable Amount", "", "", "", "", currency2(Math.round(record.total))]
    ],
    theme: "grid",
    bodyStyles: { fillColor: PDF_BRAND.sky, textColor: PDF_BRAND.ink, lineColor: PDF_BRAND.line, lineWidth: 0.3, fontSize: 9, fontStyle: "bold", cellPadding: 2 },
    columnStyles,
    didParseCell(data) {
      if (data.section === "body" && data.row.index === 1) {
        data.cell.styles.fillColor = PDF_BRAND.orange;
        data.cell.styles.textColor = PDF_BRAND.white;
        data.cell.styles.lineColor = PDF_BRAND.orange;
      }
    },
    margin: { left: margin, right: margin },
    tableLineColor: PDF_BRAND.line,
    tableLineWidth: 0.3
  });

  finalY = doc.lastAutoTable.finalY + 5;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Total Amount (in words) :- " + amountInWords(Math.round(record.total)) + " Rupees Only.", margin, finalY);
  finalY += 6;
  finalY = addPdfNoteBox(doc, "Note:", customer.notes || record.notes, margin, finalY, pageWidth - margin * 2);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS & CONDITIONS:", margin, finalY);
  finalY += 4;
  doc.setFont("helvetica", "normal");
  COMPANY_PROFILE.invoiceTerms.forEach((term, index) => {
    const lines = doc.splitTextToSize(index + 1 + ".  " + term, 180);
    doc.text(lines, margin + 2, finalY);
    finalY += lines.length * 4;
  });
  await addPdfSignature(doc, finalY + 3, record.signatory || COMPANY_PROFILE.name);
  addPdfFooter(doc);
  return doc;
}

async function buildWarrantyPdf(sourceRecord) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const record = normalizeWarrantyRecord(sourceRecord);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const customer = record.customerDetails || {};

  setPdfColor(doc, "setFillColor", PDF_BRAND.navy);
  doc.rect(0, 0, pageWidth, 16, "F");
  setPdfColor(doc, "setFillColor", PDF_BRAND.orange);
  doc.rect(0, 16, pageWidth, 2, "F");
  setPdfColor(doc, "setTextColor", PDF_BRAND.white);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("WARRANTY CARD", pageWidth / 2, 11, { align: "center" });
  doc.setTextColor(0, 0, 0);

  const cardY = 22;
  const cardHeight = 80;
  setPdfColor(doc, "setFillColor", PDF_BRAND.sky);
  setPdfColor(doc, "setDrawColor", PDF_BRAND.navy);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, cardY, pageWidth - margin * 2, cardHeight, 2, 2, "FD");

  const labelX = margin + 5;
  const valueX = margin + 46;
  let lineY = cardY + 8;
  doc.setFontSize(9.5);
  const warrantyRow = (label, value, rowY) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, labelX, rowY);
    doc.setLineWidth(0.2);
    doc.line(valueX - 2, rowY + 0.5, pageWidth - margin - 5, rowY + 0.5);
    doc.setFont("helvetica", "normal");
    doc.text(String(value || ""), valueX, rowY);
  };

  warrantyRow("Customer's Name", customer.name || record.customerName, lineY);
  lineY += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Address", labelX, lineY);
  doc.line(valueX - 2, lineY + 0.5, pageWidth - margin - 5, lineY + 0.5);
  doc.setFont("helvetica", "normal");
  const addressLines = doc.splitTextToSize(customer.installationAddress || "", pageWidth - margin - 5 - valueX + 2);
  doc.text(addressLines[0] || "", valueX, lineY);
  if (addressLines[1]) {
    lineY += 5;
    doc.line(labelX, lineY + 0.5, pageWidth - margin - 5, lineY + 0.5);
    doc.text(addressLines[1], labelX, lineY);
  }
  lineY += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Mobile No.", labelX, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(customer.phone || record.phone || "", valueX, lineY);
  doc.setFont("helvetica", "bold");
  doc.text("E-mail", pageWidth / 2 + 5, lineY);
  doc.setFont("helvetica", "normal");
  doc.text(customer.email || record.email || "", pageWidth / 2 + 20, lineY);
  lineY += 7;
  warrantyRow("Product Purchased", record.productPurchased, lineY);
  lineY += 7;
  warrantyRow("Order/Invoice No.", record.invoiceNo || record.serialNo, lineY);
  lineY += 7;
  warrantyRow("Installation Date", formatPdfDate(record.installationDate), lineY);

  const logo = await getLogoDataUrl();
  if (logo) {
    try {
      const dimensions = pdfImageDimensions(doc, logo, 50, 38);
      withPdfOpacity(doc, 0.1, () => {
        doc.addImage(logo, "PNG", pageWidth / 2 - dimensions.width / 2 + 18, cardY + 17, dimensions.width, dimensions.height);
      });
    } catch (error) {
      console.warn("Could not add warranty watermark", error);
    }
  }
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150, 150, 150);
  doc.text('"' + COMPANY_PROFILE.tagline + '"', pageWidth / 2 + 14, cardY + 54, { align: "center" });
  doc.setTextColor(0, 0, 0);

  lineY = cardY + cardHeight - 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Installed By", labelX, lineY);
  doc.setFont("helvetica", "normal");
  doc.line(labelX + 22, lineY + 0.5, labelX + 70, lineY + 0.5);
  doc.text(record.installedBy || "", labelX + 24, lineY);

  const stamp = await getStampDataUrl();
  if (stamp) {
    try {
      doc.addImage(stamp, "PNG", pageWidth - margin - 48, lineY - 22, 35, 25);
    } catch (error) {
      console.warn("Could not add warranty stamp", error);
    }
  }
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("For " + COMPANY_PROFILE.name, pageWidth - margin - 8, lineY - 12, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.line(pageWidth - margin - 55, lineY + 0.5, pageWidth - margin - 8, lineY + 0.5);
  doc.text("Authorised Signatory", pageWidth - margin - 8, lineY, { align: "right" });

  const termsY = cardY + cardHeight + 6;
  const termsHeight = 112;
  setPdfColor(doc, "setFillColor", PDF_BRAND.peach);
  setPdfColor(doc, "setDrawColor", PDF_BRAND.orange);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, termsY, pageWidth - margin * 2, termsHeight, 2, 2, "FD");

  let termsLineY = termsY + 7;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setPdfColor(doc, "setTextColor", PDF_BRAND.navy);
  doc.text("Terms & Conditions:", labelX, termsLineY);
  doc.setTextColor(0, 0, 0);
  termsLineY += 5;
  doc.setFont("helvetica", "normal");
  const romanNumbers = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)", "(xi)"];
  COMPANY_PROFILE.warrantyTerms.forEach((term, index) => {
    const lines = doc.splitTextToSize((romanNumbers[index] || "(" + (index + 1) + ")") + " " + term, pageWidth - margin * 2 - 12);
    doc.text(lines, labelX, termsLineY);
    termsLineY += lines.length * 4.2;
  });

  const logoY = termsY + termsHeight - 43;
  if (logo) {
    try {
      const dimensions = pdfImageDimensions(doc, logo, 42, 16);
      doc.addImage(logo, "PNG", pageWidth / 2 - dimensions.width / 2, logoY, dimensions.width, dimensions.height);
    } catch (error) {
      console.warn("Could not add warranty footer logo", error);
    }
  }
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_PROFILE.name, pageWidth / 2, logoY + 19, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.text('"' + COMPANY_PROFILE.tagline + '"', pageWidth / 2, logoY + 24, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const addressFooter = doc.splitTextToSize("Address : " + COMPANY_PROFILE.address, pageWidth - margin * 2 - 8);
  addressFooter.forEach((line, index) => doc.text(line, pageWidth / 2, logoY + 29 + index * 4, { align: "center" }));
  doc.text("Contact : " + COMPANY_PROFILE.contacts.join(", ") + "   Website : " + COMPANY_PROFILE.website, pageWidth / 2, logoY + 37, { align: "center" });
  return doc;
}

async function pdfHeader(doc, title) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  // Title bar
  setPdfColor(doc, "setFillColor", PDF_BRAND.navy);
  doc.rect(0, 0, pageWidth, 13, "F");
  setPdfColor(doc, "setFillColor", PDF_BRAND.orange);
  doc.rect(0, 13, pageWidth, 2.2, "F");
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  setPdfColor(doc, "setTextColor", PDF_BRAND.white);
  doc.text(title, pageWidth / 2, 8.5, { align: "center" });

  // Logo — left side, properly sized, above the details box
  const logo = await getLogoDataUrl();
  if (logo) {
    try {
      const dimensions = pdfImageDimensions(doc, logo, 38, 13);
      const logoX = margin + 1;
      const logoY = 17;
      doc.addImage(logo, "PNG", logoX, logoY, dimensions.width, dimensions.height);
    } catch (error) {
      console.warn("Could not add PDF logo", error);
    }
  }

  // Company name — centered on full page width
  setPdfColor(doc, "setTextColor", PDF_BRAND.navy);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_PROFILE.name.toUpperCase(), pageWidth / 2, 22, { align: "center" });

  // Tagline — centered on full page width
  setPdfColor(doc, "setTextColor", PDF_BRAND.orange);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bolditalic");
  doc.text(COMPANY_PROFILE.tagline, pageWidth / 2, 26.5, { align: "center" });

  // Company details box — full width, properly below logo & name
  setPdfColor(doc, "setFillColor", PDF_BRAND.sky);
  setPdfColor(doc, "setDrawColor", PDF_BRAND.line);
  doc.roundedRect(margin, 30, pageWidth - margin * 2, 17.5, 2, 2, "FD");
  const fullCenter = pageWidth / 2;
  setPdfColor(doc, "setTextColor", PDF_BRAND.ink);
  doc.setFontSize(7.3);
  doc.setFont("helvetica", "normal");
  doc.text("Office : " + COMPANY_PROFILE.officeAddress, fullCenter, 34, { align: "center" });
  doc.text("Factory : " + COMPANY_PROFILE.address, fullCenter, 37.8, { align: "center" });
  doc.text("Email : " + COMPANY_PROFILE.email + "   |   Website : " + COMPANY_PROFILE.website, fullCenter, 41.6, { align: "center" });
  doc.text("Contact Number : " + COMPANY_PROFILE.contacts.join(", ") + "   |   Our GST : " + COMPANY_PROFILE.gstNumber, fullCenter, 45.4, { align: "center" });

  setPdfColor(doc, "setDrawColor", PDF_BRAND.orange);
  doc.setLineWidth(0.7);
  doc.line(margin, 50, pageWidth - margin, 50);
  doc.setTextColor(0, 0, 0);
  return 52;
}

function pdfImageDimensions(doc, dataUrl, maxWidth, maxHeight) {
  const properties = doc.getImageProperties(dataUrl);
  const scale = Math.min(maxWidth / properties.width, maxHeight / properties.height);
  return {
    width: properties.width * scale,
    height: properties.height * scale
  };
}

async function addPdfSignature(doc, y, signatory) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const safeY = Math.min(y, pageHeight - 36);
  const stamp = await getStampDataUrl();
  if (stamp) {
    try {
      doc.addImage(stamp, "PNG", pageWidth - 55, safeY + 1, 35, 25);
    } catch (error) {
      console.warn("Could not add PDF stamp", error);
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("For " + signatory, pageWidth - 18, safeY + 2, { align: "right" });
  doc.setLineWidth(0.2);
  doc.line(pageWidth - 72, safeY + 24, pageWidth - 18, safeY + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Authorised Signatory", pageWidth - 18, safeY + 29, { align: "right" });
}

function addPdfFooter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("computer generated", pageWidth / 2, pageHeight - 5, { align: "center" });
}

function pdfLine(doc, label, value, x, y, labelWidth = 42) {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  const text = doc.splitTextToSize(String(value || ""), 118);
  doc.text(text.slice(0, 2), x + labelWidth, y);
  doc.line(x + labelWidth - 2, y + 1, 196, y + 1);
}

function getLogoDataUrl() {
  if (logoDataUrlPromise) return logoDataUrlPromise;
  logoDataUrlPromise = imageToDataUrl(COMPANY_PROFILE.logo, "logo");
  return logoDataUrlPromise;
}

function getStampDataUrl() {
  if (stampDataUrlPromise) return stampDataUrlPromise;
  stampDataUrlPromise = imageToDataUrl(COMPANY_PROFILE.stamp, "stamp");
  return stampDataUrlPromise;
}

function imageToDataUrl(src, label) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        console.warn("Could not convert " + label + " to data URL", error);
        resolve("");
      }
    };
    image.onerror = () => resolve("");
    image.src = src;
  });
}

function defaultCommercialRecord(kind) {
  const meta = DOCUMENTS[kind];
  const record = {
    [meta.numberField]: kind === "invoices" ? generateInvoiceNumber() : generateQuotationNumber(),
    [meta.dateField]: todayISO(),
    customerDetails: {
      country: "India",
      installationTime: kind === "quotations" ? "Within 4 working days" : ""
    },
    products: [emptyProduct()],
    taxMode: 18,
    customTaxRate: 0,
    discount: 0,
    signatory: COMPANY_PROFILE.name,
    status: defaultStatus(kind),
    companyProfile: COMPANY_PROFILE
  };
  if (kind === "invoices") {
    record.hsnSac = "7314";
    record.referenceNumber = "";
  }
  return record;
}

function normalizeCommercialRecord(kind, record) {
  const meta = DOCUMENTS[kind];
  return {
    ...record,
    [meta.numberField]: record[meta.numberField] || (kind === "invoices" ? generateInvoiceNumber() : generateQuotationNumber()),
    [meta.dateField]: record[meta.dateField] || todayISO(),
    customerDetails: {
      name: "",
      phone: "",
      email: "",
      gstNo: "",
      city: "",
      state: "",
      country: "India",
      installationTime: kind === "quotations" ? "Within 4 working days" : "",
      installationAddress: "",
      notes: "",
      ...(record.customerDetails || {})
    },
    products: Array.isArray(record.products) ? record.products : [emptyProduct()],
    taxMode: record.taxMode === undefined || record.taxMode === null ? 18 : record.taxMode,
    customTaxRate: record.customTaxRate || 0,
    discount: record.discount || 0,
    signatory: record.signatory || COMPANY_PROFILE.name,
    status: record.status || defaultStatus(kind),
    hsnSac: record.hsnSac || "7314",
    referenceNumber: record.referenceNumber || record.quotationNumber || ""
  };
}

function defaultWarrantyRecord() {
  return {
    serialNo: generateWarrantySerial(),
    installationDate: todayISO(),
    customerDetails: { country: "India" },
    productPurchased: "",
    invoiceNo: "",
    installedBy: "",
    status: "active",
    companyProfile: COMPANY_PROFILE
  };
}

function normalizeWarrantyRecord(record) {
  return {
    ...record,
    serialNo: record.serialNo || generateWarrantySerial(),
    installationDate: record.installationDate || todayISO(),
    customerDetails: {
      name: "",
      phone: "",
      email: "",
      city: "",
      state: "",
      country: "India",
      installationAddress: "",
      ...(record.customerDetails || {})
    },
    productPurchased: record.productPurchased || "",
    invoiceNo: record.invoiceNo || "",
    installedBy: record.installedBy || "",
    status: record.status || "active"
  };
}

function emptyProduct() {
  return {
    category: PRODUCT_CATEGORIES[0],
    productName: "",
    width: 0,
    height: 0,
    unit: "Sq Ft",
    quantity: 1,
    rateSqFt: 0,
    rateSqMeter: 0,
    installationCharge: 0,
    deliveryCharge: 0,
    discount: 0,
    notes: ""
  };
}

function applyNewNumber(kind, record) {
  if (kind === "quotations") record.quotationNumber = generateQuotationNumber();
  if (kind === "invoices") record.invoiceNumber = generateInvoiceNumber();
  if (kind === "warrantyCards") record.serialNo = generateWarrantySerial();
}

async function ensureDocumentNumber(kind, record) {
  if (record.id) return;
  const meta = DOCUMENTS[kind];
  if (!meta) return;
  if (navigator.onLine && window.firebaseSync && typeof window.firebaseSync.reserveNumber === "function") {
    try {
      const reserved = await window.firebaseSync.reserveNumber(kind);
      if (reserved) {
        record[meta.numberField] = reserved;
        return;
      }
    } catch (error) {
      console.warn("Could not reserve shared document number", error);
    }
  }
  record[meta.numberField] = generateOfflineNumber(kind);
}

function generateQuotationNumber() {
  if (!navigator.onLine) return generateOfflineNumber("quotations");
  const year = new Date().getFullYear();
  const next = maxDocumentSequence("quotations", year) + 1;
  return "NTHS-" + year + "-" + String(next).padStart(4, "0");
}

function generateInvoiceNumber() {
  if (!navigator.onLine) return generateOfflineNumber("invoices");
  const year = new Date().getFullYear();
  const nextYear = String(year + 1).slice(2);
  const prefix = year + "-" + nextYear;
  const next = maxDocumentSequence("invoices", year) + 1;
  return prefix + "/" + String(next).padStart(3, "0");
}

function generateWarrantySerial() {
  if (!navigator.onLine) return generateOfflineNumber("warrantyCards");
  const year = new Date().getFullYear();
  const next = maxDocumentSequence("warrantyCards", year) + 1;
  return "WC-" + year + "-" + String(next).padStart(4, "0");
}

function maxDocumentSequence(kind, year) {
  const meta = DOCUMENTS[kind];
  if (!meta) return 0;
  return (db[kind] || []).reduce((max, row) => Math.max(max, extractDocumentSequence(kind, row[meta.numberField], year)), 0);
}

function extractDocumentSequence(kind, value, year) {
  const text = String(value || "");
  if (text.includes("-OFF-") || text.includes("/OFF-")) return 0;
  let match = null;
  if (kind === "quotations") match = text.match(new RegExp("^NTHS-" + year + "-(\\d+)$"));
  if (kind === "invoices") match = text.match(new RegExp("^" + year + "-" + String(year + 1).slice(2) + "/(\\d+)$"));
  if (kind === "warrantyCards") match = text.match(new RegExp("^WC-" + year + "-(\\d+)$"));
  return match ? num(match[1]) : 0;
}

function generateOfflineNumber(kind) {
  const year = new Date().getFullYear();
  const sequence = nextLocalNumber(kind, year);
  const device = getDeviceNumberId();
  if (kind === "quotations") return `NTHS-${year}-OFF-${device}-${String(sequence).padStart(4, "0")}`;
  if (kind === "invoices") return `${year}-${String(year + 1).slice(2)}/OFF-${device}-${String(sequence).padStart(3, "0")}`;
  if (kind === "warrantyCards") return `WC-${year}-OFF-${device}-${String(sequence).padStart(4, "0")}`;
  return `${year}-OFF-${device}-${sequence}`;
}

function nextLocalNumber(kind, year) {
  let counters = {};
  try { counters = JSON.parse(localStorage.getItem(NUMBER_COUNTER_KEY) || "{}"); }
  catch { counters = {}; }
  const key = `${kind}-${year}`;
  const next = Math.max(1, Number(counters[key] || 0) + 1);
  counters[key] = next;
  try { localStorage.setItem(NUMBER_COUNTER_KEY, JSON.stringify(counters)); }
  catch (error) { console.warn("Could not store local document counter", error); }
  return next;
}

function getDeviceNumberId() {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const id = `${SITE_NUMBER_CODE}-${suffix}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return SITE_NUMBER_CODE;
  }
}

function defaultStatus(kind) {
  return kind === "warrantyCards" ? "active" : "draft";
}

function requiredCustomerName(record) {
  return Boolean((record.customerDetails && record.customerDetails.name) || record.customerName);
}

function pdfFileName(kind, record) {
  const meta = DOCUMENTS[kind];
  const number = record[meta.numberField] || meta.singular;
  const customer = (record.customerDetails && record.customerDetails.name) || record.customerName || "Customer";
  return safeFileName(number + "_" + customer + ".pdf");
}

function safeFileName(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, "_").replace(/_+/g, "_");
}

function areaLabel(calc) {
  return calc.areaSqFt.toFixed(2) + " sq ft / " + calc.areaSqMeter.toFixed(2) + " sq m";
}

function formatPdfDate(value) {
  if (!value) return "";
  const parts = String(value).split("-");
  return parts.length === 3 ? parts.reverse().join(".") : String(value);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function num(value) {
  return Number(value || 0) || 0;
}

function currency(value) {
  return "Rs. " + num(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function currency2(value) {
  return num(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sanitize(value) {
  return String(value || "").trim().replace(/[<>]/g, "");
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function capitalize(value) {
  return String(value || "").replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function uid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function toast(message, duration = 3000) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.getElementById("toastWrap").appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function amountInWords(amount) {
  const n = Math.max(0, Math.floor(num(amount)));
  if (n === 0) return "Zero";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const underHundred = (value) => value < 20 ? ones[value] : tens[Math.floor(value / 10)] + (value % 10 ? " " + ones[value % 10] : "");
  const underThousand = (value) => {
    const hundred = Math.floor(value / 100);
    const rest = value % 100;
    return (hundred ? ones[hundred] + " Hundred" : "") + (hundred && rest ? " " : "") + (rest ? underHundred(rest) : "");
  };

  const parts = [];
  let value = n;
  const crore = Math.floor(value / 10000000);
  if (crore) {
    parts.push(underThousand(crore) + " Crore");
    value %= 10000000;
  }
  const lakh = Math.floor(value / 100000);
  if (lakh) {
    parts.push(underThousand(lakh) + " Lakh");
    value %= 100000;
  }
  const thousand = Math.floor(value / 1000);
  if (thousand) {
    parts.push(underThousand(thousand) + " Thousand");
    value %= 1000;
  }
  if (value) parts.push(underThousand(value));
  return parts.join(" ");
}
