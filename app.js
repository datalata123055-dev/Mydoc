const STORAGE_KEY = "newtech-edocument-generator-v1";

const COMPANY_PROFILE = {
  name: "NewTech Home Solutions",
  tagline: "Supreme Insect Protection Systems",
  logo: "assets/logo.png",
  officeAddress: "NewTech Home Solutions",
  address: "Delhi NCR, India",
  email: "homesolutionsnewtech@gmail.com",
  website: "www.newtechhomesolutions.in",
  contacts: ["+91 9876543210"],
  gstNumber: "",
  bankDetails: {
    accountName: "NewTech Home Solutions",
    bankName: "",
    accountNo: "",
    ifsc: ""
  },
  quotationTerms: [
    "Warranty for the period of 5 years for manufacturing defects except net, from date of delivery.",
    "Nominal amount of Rs. 500 would be charged as technician visit during warranty period.",
    "Transportation, installation and taxes are charged as mentioned in this document.",
    "All disputes are subject to Delhi jurisdiction."
  ],
  invoiceTerms: [
    "Goods once sold will not be taken back.",
    "Warranty for the period of 5 years for manufacturing defects except net, for pleated mesh only.",
    "Nominal amount of Rs. 500 would be charged as technician visit during warranty period.",
    "All disputes are subject to Delhi jurisdiction."
  ],
  warrantyTerms: [
    "Warranty card covers only the actual user.",
    "Warranty card is valid for a period of 60 months from the date of installation.",
    "Guarantee of mesh/honeycomb is for natural climate wear and tear only.",
    "Warranty card will be issued only after clearance of total payments.",
    "Warranty card must be signed and stamped with company seal.",
    "Replacement for malfunction due to faulty usage would be chargeable as per value.",
    "Cut and damage to mesh/honeycomb is not covered under warranty.",
    "Original warranty card soft copy has to be produced to avail warranty.",
    "All disputes are subject to Delhi jurisdiction."
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
  filter: ""
};

let db = loadStore();
let logoDataUrlPromise = null;

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
document.getElementById("exportBtn").addEventListener("click", exportJson);
document.getElementById("importInput").addEventListener("change", importJson);

render();

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
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
  return `
    <div class="row-actions">
      <button class="btn btn-secondary" type="button" onclick="openEditor('${kind}', '${id}')">Edit</button>
      <button class="btn btn-secondary" type="button" onclick="duplicateRecord('${kind}', '${id}')">Duplicate</button>
      <button class="btn btn-secondary" type="button" onclick="downloadRecordPdf('${kind}', '${id}')">PDF</button>
      <button class="btn btn-secondary" type="button" onclick="printRecordPdf('${kind}', '${id}')">Print</button>
      <button class="btn btn-danger" type="button" onclick="deleteRecord('${kind}', '${id}')">Delete</button>
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
      country: "India",
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
      country: "India",
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

  saveRecord(kind, record);
  state.mode = "list";
  state.editingId = null;
  render();
  toast(DOCUMENTS[kind].singular + " saved.");
}

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
}

function deleteRecord(kind, id) {
  if (!confirm("Delete this record?")) return;
  db[kind] = (db[kind] || []).filter((row) => row.id !== id);
  saveStore();
  render();
  toast("Record deleted.");
}

function duplicateRecord(kind, id) {
  const record = (db[kind] || []).find((row) => row.id === id);
  if (!record) return;
  const copy = structuredCloneSafe(record);
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  applyNewNumber(kind, copy);
  copy.status = defaultStatus(kind);
  saveRecord(kind, copy);
  render();
  toast("Record duplicated.");
}

async function downloadRecordPdf(kind, id) {
  const record = (db[kind] || []).find((row) => row.id === id);
  if (!record) return;
  if (!isPdfReady()) {
    downloadPrintableHtml(kind, record);
    return;
  }
  const pdf = await buildPdf(kind, record);
  if (!pdf) return;
  pdf.save(pdfFileName(kind, record));
}

async function printRecordPdf(kind, id) {
  const record = (db[kind] || []).find((row) => row.id === id);
  if (!record) return;
  if (!isPdfReady()) {
    openPrintableDocument(kind, record);
    return;
  }
  const pdf = await buildPdf(kind, record);
  if (!pdf) return;
  pdf.output("dataurlnewwindow");
}

async function downloadCurrentPdf() {
  const kind = state.tab;
  const record = kind === "warrantyCards" ? warrantyFromForm() : commercialFromForm();
  if (!isPdfReady()) {
    downloadPrintableHtml(kind, record);
    return;
  }
  const pdf = await buildPdf(kind, record);
  if (!pdf) return;
  pdf.save(pdfFileName(kind, record));
}

async function printCurrentPdf() {
  const kind = state.tab;
  const record = kind === "warrantyCards" ? warrantyFromForm() : commercialFromForm();
  if (!isPdfReady()) {
    openPrintableDocument(kind, record);
    return;
  }
  const pdf = await buildPdf(kind, record);
  if (!pdf) return;
  pdf.output("dataurlnewwindow");
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

function openPrintableDocument(kind, record) {
  const popup = window.open("", "_blank");
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
    body{font-family:Arial,sans-serif;color:#111827;margin:24px;font-size:12px}
    .header{text-align:center;border-bottom:1px solid #111827;padding-bottom:10px;margin-bottom:14px}
    .header img{height:52px;object-fit:contain;margin-bottom:6px}
    h1{font-size:18px;margin:0 0 8px}
    h2{font-size:14px;margin:18px 0 8px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
    .box{border:1px solid #111827;padding:10px;min-height:82px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{border:1px solid #111827;padding:6px;text-align:left;vertical-align:top}
    th{font-weight:700;background:#f3f4f6}
    .totals-table{margin-left:auto;width:340px}
    .terms li{margin-bottom:4px}
    .signature{text-align:right;margin-top:36px}
    @media print{body{margin:12mm}.no-print{display:none}}
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print / Save as PDF</button>
  <div class="header">
    <img src="${escapeAttr(COMPANY_PROFILE.logo)}" alt="">
    <h1>${escapeHtml(COMPANY_PROFILE.name)}</h1>
    <div>${escapeHtml(COMPANY_PROFILE.tagline)}</div>
    <div>${escapeHtml(COMPANY_PROFILE.address)} | ${escapeHtml(COMPANY_PROFILE.email)} | ${escapeHtml(COMPANY_PROFILE.website)}</div>
    <div>${escapeHtml(COMPANY_PROFILE.contacts.join(", "))}</div>
  </div>
  <h1>${escapeHtml(title)}</h1>
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
      <strong>Status:</strong> ${escapeHtml(capitalize(record.status || defaultStatus(kind)))}
    </div>
  </div>
  ${commercialTable}
  ${warrantyBody}
  <h2>Terms and Conditions</h2>
  <ol class="terms">${terms.map((term) => `<li>${escapeHtml(term)}</li>`).join("")}</ol>
  <div class="signature">
    <strong>For ${escapeHtml(record.signatory || COMPANY_PROFILE.name)}</strong><br><br><br>
    Authorised Signatory
  </div>
</body>
</html>`;
}

async function buildCommercialPdf(kind, sourceRecord) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  if (typeof doc.autoTable !== "function") {
    toast("PDF table library is still loading. Try again in a moment.");
    return null;
  }

  const record = calculateCommercial(kind, sourceRecord);
  const meta = DOCUMENTS[kind];
  const isInvoice = kind === "invoices";
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let y = await pdfHeader(doc, isInvoice ? "TAX INVOICE" : "QUOTATION");

  doc.setLineWidth(0.3);
  doc.rect(margin, y, 118, 34);
  doc.rect(margin + 118, y, pageWidth - margin * 2 - 118, 34);

  const customer = record.customerDetails || {};
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("To,", margin + 3, y + 6);
  doc.text(String(customer.name || record.customerName || ""), margin + 22, y + 6);
  doc.text("Address:", margin + 3, y + 12);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(customer.installationAddress || "", 92).slice(0, 2), margin + 22, y + 12);
  doc.setFont("helvetica", "bold");
  doc.text("Contact:", margin + 3, y + 25);
  doc.setFont("helvetica", "normal");
  doc.text(customer.phone || record.phone || "", margin + 22, y + 25);
  doc.setFont("helvetica", "bold");
  doc.text("GST No.:", margin + 3, y + 30);
  doc.setFont("helvetica", "normal");
  doc.text(customer.gstNo || "", margin + 22, y + 30);

  const rightX = margin + 121;
  doc.setFont("helvetica", "bold");
  doc.text("Date:", rightX, y + 7);
  doc.text(isInvoice ? "Invoice No.:" : "Quote No.:", rightX, y + 14);
  doc.text("City/State:", rightX, y + 21);
  doc.text("Status:", rightX, y + 28);
  doc.setFont("helvetica", "normal");
  doc.text(formatPdfDate(record[meta.dateField]), rightX + 28, y + 7);
  doc.text(String(record[meta.numberField] || ""), rightX + 28, y + 14);
  doc.text([customer.city, customer.state].filter(Boolean).join(", "), rightX + 28, y + 21);
  doc.text(capitalize(record.status || defaultStatus(kind)), rightX + 28, y + 28);

  y += 39;

  const bodyRows = record.products.map((item, index) => {
    const rate = num(item.rateSqFt) || (num(item.rateSqMeter) ? num(item.rateSqMeter) / 10.7639 : 0);
    const description = [item.category, item.productName, item.notes].filter(Boolean).join("\n");
    if (isInvoice) {
      return [
        String(index + 1),
        description,
        item.hsnSac || record.hsnSac || "7314",
        String(item.quantity || 1),
        item.areaSqFt ? item.areaSqFt.toFixed(2) : "",
        rate ? currency2(rate) : "",
        item.productTotal ? currency2(item.productTotal) : ""
      ];
    }
    return [
      String(index + 1),
      description,
      String(item.quantity || 1),
      item.areaSqFt ? item.areaSqFt.toFixed(2) : "",
      rate ? currency2(rate) : "",
      item.productTotal ? currency2(item.productTotal) : ""
    ];
  });

  while (bodyRows.length < (isInvoice ? 6 : 8)) {
    bodyRows.push(isInvoice ? ["", "", "", "", "", "", ""] : ["", "", "", "", "", ""]);
  }

  const head = isInvoice
    ? [["S.No.", "Product Description", "HSN/SAC", "Qty", "Area (Sqft)", "Rate (Rs.)", "Amount (Rs.)"]]
    : [["S.No.", "Product Description", "Qty", "Area (Sqft)", "Rate (Rs.)", "Amount (Rs.)"]];
  const colStyles = isInvoice
    ? {
        0: { cellWidth: 11, halign: "center" },
        1: { cellWidth: 68 },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 14, halign: "center" },
        4: { cellWidth: 24, halign: "center" },
        5: { cellWidth: 27, halign: "right" },
        6: { cellWidth: 28, halign: "right" }
      }
    : {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 84 },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 30, halign: "center" },
        4: { cellWidth: 24, halign: "right" },
        5: { cellWidth: 22, halign: "right" }
      };

  doc.autoTable({
    startY: y,
    head,
    body: bodyRows,
    theme: "grid",
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 8 },
    columnStyles: colStyles,
    margin: { left: margin, right: margin },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.3
  });

  y = doc.lastAutoTable.finalY;

  const totalRows = [
    ["Products Total", currency2(record.productTotal)],
    ["Installation + Delivery", currency2(record.installation + record.delivery)],
    ["Subtotal", currency2(record.subtotal)],
    ["Discount", "-" + currency2(record.discount)],
    ["Taxable Amount", currency2(record.taxable)],
    ["GST @ " + record.taxRate + "%", currency2(record.taxAmount)],
    ["Total Payable", currency2(Math.round(record.total))]
  ];

  doc.autoTable({
    startY: y + 2,
    body: totalRows,
    theme: "grid",
    styles: { fontSize: 8, lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 145, fontStyle: "bold", halign: "right" },
      1: { cellWidth: 45, fontStyle: "bold", halign: "right" }
    },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Amount in words: " + amountInWords(Math.round(record.total)) + " Rupees Only.", margin, y);
  y += 7;

  doc.setFontSize(7.8);
  doc.text("TERMS AND CONDITIONS:", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  const terms = isInvoice ? COMPANY_PROFILE.invoiceTerms : COMPANY_PROFILE.quotationTerms;
  terms.forEach((term, index) => {
    const lines = doc.splitTextToSize(index + 1 + ". " + term, 180);
    doc.text(lines, margin + 2, y);
    y += lines.length * 4;
  });

  addPdfSignature(doc, y + 4, record.signatory || COMPANY_PROFILE.name);
  addPdfFooter(doc);
  return doc;
}

async function buildWarrantyPdf(record) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let y = await pdfHeader(doc, "WARRANTY CARD");
  const customer = record.customerDetails || {};

  doc.setLineWidth(0.4);
  doc.rect(margin, y, pageWidth - margin * 2, 76);
  y += 8;
  pdfLine(doc, "Customer's Name", customer.name || record.customerName || "", margin + 5, y);
  y += 8;
  pdfLine(doc, "Address", customer.installationAddress || "", margin + 5, y, 124);
  y += 14;
  pdfLine(doc, "Mobile No.", customer.phone || record.phone || "", margin + 5, y);
  pdfLine(doc, "E-mail", customer.email || record.email || "", pageWidth / 2 + 4, y, 30);
  y += 8;
  pdfLine(doc, "Product Purchased", record.productPurchased || "", margin + 5, y);
  y += 8;
  pdfLine(doc, "Order/Invoice No.", record.invoiceNo || record.serialNo || "", margin + 5, y);
  y += 8;
  pdfLine(doc, "Installation Date", formatPdfDate(record.installationDate), margin + 5, y);
  y += 8;
  pdfLine(doc, "Installed By", record.installedBy || "", margin + 5, y);

  addPdfSignature(doc, y - 56, COMPANY_PROFILE.name);

  const termsY = 120;
  doc.rect(margin, termsY, pageWidth - margin * 2, 105);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Terms and Conditions:", margin + 5, termsY + 8);
  doc.setFont("helvetica", "normal");
  let ty = termsY + 14;
  COMPANY_PROFILE.warrantyTerms.forEach((term, index) => {
    const lines = doc.splitTextToSize(index + 1 + ". " + term, pageWidth - margin * 2 - 12);
    doc.text(lines, margin + 5, ty);
    ty += lines.length * 4.3;
  });

  const logo = await getLogoDataUrl();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", pageWidth / 2 - 10, 232, 20, 20);
    } catch (error) {
      console.warn("Could not add PDF logo", error);
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(COMPANY_PROFILE.name, pageWidth / 2, 257, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text(COMPANY_PROFILE.tagline, pageWidth / 2, 262, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(COMPANY_PROFILE.address, pageWidth / 2, 267, { align: "center" });
  doc.text("Contact: " + COMPANY_PROFILE.contacts.join(", ") + "   Website: " + COMPANY_PROFILE.website, pageWidth / 2, 272, { align: "center" });

  addPdfFooter(doc);
  return doc;
}

async function pdfHeader(doc, title) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, pageWidth / 2, 11, { align: "center" });

  const logo = await getLogoDataUrl();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", margin, 15, 24, 18);
    } catch (error) {
      console.warn("Could not add PDF logo", error);
    }
  }

  doc.setFontSize(13);
  doc.text(COMPANY_PROFILE.name, pageWidth / 2, 18, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(COMPANY_PROFILE.tagline, pageWidth / 2, 23, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.text("Office: " + COMPANY_PROFILE.officeAddress, pageWidth / 2, 28, { align: "center" });
  doc.text("Factory: " + COMPANY_PROFILE.address, pageWidth / 2, 32, { align: "center" });
  doc.text("Email: " + COMPANY_PROFILE.email + "   Website: " + COMPANY_PROFILE.website, pageWidth / 2, 36, { align: "center" });
  doc.text("Contact: " + COMPANY_PROFILE.contacts.join(", "), pageWidth / 2, 40, { align: "center" });
  if (COMPANY_PROFILE.gstNumber) {
    doc.text("GST: " + COMPANY_PROFILE.gstNumber, pageWidth - margin, 40, { align: "right" });
  }
  return 45;
}

function addPdfSignature(doc, y, signatory) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const safeY = Math.min(y, pageHeight - 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("For " + signatory, pageWidth - 18, safeY, { align: "right" });
  doc.setLineWidth(0.2);
  doc.line(pageWidth - 72, safeY + 16, pageWidth - 18, safeY + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Authorised Signatory", pageWidth - 18, safeY + 21, { align: "right" });
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
  logoDataUrlPromise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        console.warn("Could not convert logo to data URL", error);
        resolve("");
      }
    };
    image.onerror = () => resolve("");
    image.src = COMPANY_PROFILE.logo;
  });
  return logoDataUrlPromise;
}

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    source: "NewTech eDocument Generator",
    ...db
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "newtech-edocument-records.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      ["quotations", "invoices", "warrantyCards"].forEach((key) => {
        const incoming = Array.isArray(parsed[key]) ? parsed[key] : [];
        const current = db[key] || [];
        const byId = new Map(current.map((row) => [row.id, row]));
        incoming.forEach((row) => {
          const id = row.id || uid();
          byId.set(id, { ...row, id });
        });
        db[key] = [...byId.values()];
      });
      saveStore();
      render();
      toast("JSON imported.");
    } catch (error) {
      console.error(error);
      toast("Import failed. Please select a valid JSON file.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function defaultCommercialRecord(kind) {
  const meta = DOCUMENTS[kind];
  const record = {
    [meta.numberField]: kind === "invoices" ? generateInvoiceNumber() : generateQuotationNumber(),
    [meta.dateField]: todayISO(),
    customerDetails: { country: "India" },
    products: [emptyProduct()],
    taxMode: 18,
    customTaxRate: 0,
    discount: 0,
    signatory: COMPANY_PROFILE.name,
    status: defaultStatus(kind),
    companyProfile: COMPANY_PROFILE
  };
  if (kind === "invoices") record.hsnSac = "7314";
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
      installationAddress: "",
      notes: "",
      ...(record.customerDetails || {})
    },
    products: Array.isArray(record.products) ? record.products : [emptyProduct()],
    taxMode: record.taxMode ?? 18,
    customTaxRate: record.customTaxRate || 0,
    discount: record.discount || 0,
    signatory: record.signatory || COMPANY_PROFILE.name,
    status: record.status || defaultStatus(kind),
    hsnSac: record.hsnSac || "7314"
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

function generateQuotationNumber() {
  const year = new Date().getFullYear();
  const count = (db.quotations || []).filter((row) => String(row.quotationNumber || "").includes("NTHS-" + year)).length + 1;
  return "NTHS-" + year + "-" + String(count).padStart(4, "0");
}

function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const nextYear = String(year + 1).slice(2);
  const prefix = year + "-" + nextYear;
  const count = (db.invoices || []).filter((row) => String(row.invoiceNumber || "").startsWith(prefix)).length + 1;
  return prefix + "/" + String(count).padStart(3, "0");
}

function generateWarrantySerial() {
  const year = new Date().getFullYear();
  const count = (db.warrantyCards || []).filter((row) => String(row.serialNo || "").includes("WC-" + year)).length + 1;
  return "WC-" + year + "-" + String(count).padStart(4, "0");
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
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function capitalize(value) {
  return String(value || "").replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function uid() {
  if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
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
