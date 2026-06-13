# eDocument Generator

Standalone document-generation project extracted from the NewTech admin dashboard.

## What It Does

- Creates quotations, tax invoices, and warranty cards.
- Calculates area, product totals, discounts, GST, and grand totals.
- Saves records in browser localStorage.
- Downloads or prints colorful navy/orange branded PDFs with the NewTech logo, company details, GST number, terms, and authorized company stamp.
- Generates separate professional layouts for quotations, tax invoices, and warranty cards.
- Exports and imports JSON for transfer into an eDocument system.

## Files

- `index.html` - app shell and local offline dependencies.
- `styles.css` - standalone UI styles.
- `app.js` - document logic, storage, PDF generation, and JSON transfer.
- `compat.js` - compatibility fallbacks for older iPad Safari versions.
- `service-worker.js` - complete offline app-shell cache.
- `assets/logo.png` - NewTech logo used in the app and PDFs.
- `assets/company-stamp.png` - company stamp used in PDF and printable signatures.

## Run

Serve the folder over HTTP/HTTPS. No build step is required. Service workers do not run from a plain `file://` URL.

All PDF libraries, fonts, logo, stamp, and app files are self-hosted. After one successful online visit, the app works offline and falls back to printable HTML if the PDF library is unavailable.

## Older iPad Use

- Open the deployed HTTPS URL once while online, then use Safari's **Add to Home Screen** action.
- iOS 11.3 or newer is required for service-worker offline caching.
- The interface includes 44px touch targets, safe-area spacing, 16px form controls, and iPad-compatible PDF preview/share behavior.
- Records are stored locally. Use **Export** regularly as a backup, especially before clearing Safari website data.

## Deploy to Vercel

This repository is ready for Vercel as a static site:

1. Import the GitHub repository into Vercel.
2. Keep the framework preset as `Other`.
3. Leave the build command and output directory empty.
4. Deploy from the repository root.

The included `vercel.json` enables clean URLs, security headers, and long-term caching for versioned assets. No environment variables are required.

## Transfer Notes

Use `Export JSON` to move saved records into another eDocument project. The JSON contains:

- `quotations`
- `invoices`
- `warrantyCards`

If the target eDocument project has an API or Firebase collection, connect that integration inside `saveRecord()` and `loadStore()` in `app.js`.
