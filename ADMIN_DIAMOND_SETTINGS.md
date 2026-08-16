Admin Diamond Settings update

User-facing Wallet page is not the place for conversion settings.
Added:
- /admin/diamond-settings
- Coins per Diamond editable (default 50,000)
- Reference Rupees per Diamond editable (default Rs. 1)
- Save button
- Admin page link from the main admin page when available

The settings currently save in the browser for the admin UI demo. For a
production app, store them in Firebase/Firestore with admin-only security
rules and use the server value everywhere.
