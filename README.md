# CRTC Test Rate Invoice System

Secure invoicing for CRTC: official test & rate list (BDT, VAT-inclusive), A4 print for the CRTC official pad, payment tracking, QR verification, and sign-in with CRTC-approved registration. Data is stored in Google Drive through a free Google Apps Script server.

## Project structure

```
crtc-invoice/
├── index.html            # App shell (loads CSS and JS in order)
├── css/
│   ├── style.css         # Base, layout, components
│   ├── auth.css          # Sign-in, registration, modal, read-only (viewer) rules
│   └── print.css         # A4 / official-pad print rules
├── js/                   # Classic scripts, loaded in this order:
│   ├── config.js         # API_URL  <- the only file you must edit
│   ├── rates-data.js     # Official CRTC test & rate list (128 items)
│   ├── state.js          # Helpers, default data model, app state
│   ├── api.js            # Server calls, role check, debounced save/load
│   ├── auth.js           # Sign-in, registration, sessions, idle timeout
│   ├── users.js          # Admin: approve / reject / roles / reset / delete
│   ├── calc.js           # Totals (VAT incl./excl., AIT), status, words, hash
│   ├── router.js         # Navigation
│   ├── invoices.js       # Invoice list, editor, preview/print, payments
│   ├── rates.js          # Test & rate list view
│   ├── clients.js        # Clients view
│   ├── settings.js       # Company, bank, QR, official pad, backup, logo
│   ├── verify.js         # QR link, public registry, public verify page
│   └── main.js           # Entry point
├── assets/               # logo.svg, logo-white.svg, favicon.svg
├── server/Code.gs        # Google Apps Script backend
├── _headers              # Netlify security headers (optional)
└── robots.txt            # Keeps search engines out
```

## Setup (about 15 minutes)

### 1. Backend (Google Apps Script)
1. Sign in with the Google account that should **own the data**, open <https://script.google.com> and create a project.
2. Paste the contents of `server/Code.gs`.
3. Edit `ADMIN` (name, email, first password) and `SITE_URL` at the top.
4. Run `setup()` once and accept the permissions (Drive, Mail).
5. **Deploy → New deployment → Web app**: Execute as **Me**, access **Anyone**. Copy the Web app URL.
6. After changing `Code.gs` later, use **Deploy → Manage deployments → Edit → New version**.

### 2. Front end
1. Open `js/config.js` and paste the Web app URL into `API_URL` (or leave it empty and enter it under *Server settings* on the sign-in page).
2. Upload the whole folder to an **HTTPS** host:
   - **Netlify**: drag the folder onto <https://app.netlify.com/drop>.
   - **GitHub Pages**: push the folder to a repository, then Settings → Pages.
3. Open the site and sign in with the admin account. You will be asked to set a new password.
4. In **Settings**: enter company details, BIN/TIN, bank details, logo, and the public URL of the site (for QR codes).

### 3. Users
People register on the sign-in page. Their account stays *pending* until an admin approves it under **Users**.

| Role   | Can do |
|--------|--------|
| Admin  | Everything, including Users and Settings |
| Staff  | Create/edit invoices, rates and clients |
| Viewer | Read-only (enforced by the server) |

## Printing on the CRTC official pad
Preview an invoice, tick **Official pad (no letterhead)**, set the top/bottom blank space in Settings, then print: paper **A4**, scale **100%**, headers and footers **off**.

## QR verification
Invoices with status **Sent** are published to a read-only register. Scanning the QR opens `index.html?verify=…` and shows Authentic / Invalid / Cancelled with the live balance and status.

## Data & backup
Files are created in the owner's Drive: `crtc_users.json`, `crtc_data.json`, `crtc_registry.json`. Use **Settings → Export backup** regularly.

## Security notes
- Passwords are salted and hashed on the server; 5 failed sign-ins lock an account for 15 minutes; sessions last up to 6 hours and end after 30 minutes idle.
- Roles are enforced on the server, not only in the page.
- The Web app URL is public by design; access is controlled by sign-in. Keep the script owner's Google account secured with 2-step verification.
- Anyone who scans an invoice QR can see that invoice's number, client name, total, balance and status.

## Optional
- Format code: `npx prettier --write css js`
- Offline QR library: download `qrcode.min.js` into `assets/vendor/` and update the path in `index.html`.
- If a host rejects the `_headers` file or something fails to load, delete the `Content-Security-Policy` line first.
