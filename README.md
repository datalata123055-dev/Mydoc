# eDocument Generator

Standalone document-generation project extracted from the NewTech admin dashboard.

## What It Does

- Creates quotations, tax invoices, and warranty cards.
- Calculates area, product totals, discounts, GST, and grand totals.
- Saves records in browser localStorage.
- Downloads or prints branded PDF documents with jsPDF.
- Exports and imports JSON for transfer into an eDocument system.

## Files

- `index.html` - app shell and CDN dependencies.
- `styles.css` - standalone UI styles.
- `app.js` - document logic, storage, PDF generation, and JSON transfer.
- `assets/logo.png` - NewTech logo used in the app and PDFs.

## Run

Open `index.html` in a browser. No build step is required.

Direct PDF export uses the jsPDF CDN loaded in `index.html`. If the CDN is blocked, the app falls back to a printable HTML document that can be opened and saved as PDF from the browser print dialog.

## Transfer Notes

Use `Export JSON` to move saved records into another eDocument project. The JSON contains:

- `quotations`
- `invoices`
- `warrantyCards`

If the target eDocument project has an API or Firebase collection, connect that integration inside `saveRecord()` and `loadStore()` in `app.js`.
