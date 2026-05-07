# Setup Guide

Step-by-step guide to get the Freight ERP running on your machine.

---

## Prerequisites

You'll need these installed first. If you have them, skip to the next section.

### 1. Node.js (v18 or later)

**Check if installed:**
```bash
node --version
# Should print v18.x.x or higher
```

**If not installed**: Download from [nodejs.org](https://nodejs.org/) — pick the LTS version. On macOS/Linux you can also use [nvm](https://github.com/nvm-sh/nvm).

### 2. MongoDB (v6 or later)

You have three options:

**Option A — MongoDB Atlas (recommended, free, no install)**
1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free M0 cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string — looks like `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/`
5. Replace `<password>` in the string with your actual password
6. Save this string — you'll paste it into `.env` later

**Option B — Local MongoDB**
- macOS: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
- Ubuntu/Debian: Follow [mongodb.com docs](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)
- Windows: Download installer from [mongodb.com/try/download](https://www.mongodb.com/try/download/community)

Connection string for local: `mongodb://localhost:27017/freight_erp`

**Option C — Docker**
```bash
docker run -d --name mongo -p 27017:27017 mongo:7
```
Connection string: `mongodb://localhost:27017/freight_erp`

### 3. Git (optional but useful)

**Check:** `git --version`

### 4. VS Code (recommended editor)

Download from [code.visualstudio.com](https://code.visualstudio.com/).

**Useful extensions** (install from VS Code's Extensions panel):
- ESLint
- Prettier
- ES7+ React/Redux/React-Native snippets
- MongoDB for VS Code (lets you query your DB inside VS Code)
- Thunder Client (Postman alternative inside VS Code)

---

## Step 1 — Extract & Open

1. Unzip the downloaded archive into a folder (e.g. `~/projects/freight-erp/`).
2. Open VS Code.
3. **File → Open Folder** → select the `freight-erp` folder.

You should see two folders inside: `backend/` and `frontend/`.

---

## Step 2 — Install System Dependencies for Puppeteer

Puppeteer (used for PDF generation) needs Chromium. The `npm install` step downloads Chromium automatically, but on some systems you need extra system libraries for it to actually run.

### macOS
No action needed — works out of the box.

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libxkbcommon0 libxcomposite1 libxrandr2 \
  libgbm1 libpango-1.0-0 libasound2 fonts-liberation
```

### Windows
No action needed — works out of the box.

> **If you don't need PDF generation right now**, you can skip Puppeteer entirely. Comment out `puppeteer` in `backend/package.json` before installing. The app will start fine; only the "Send Quote" / "Send Invoice" buttons will fail until you re-enable it.

---

## Step 3 — Backend Setup

Open a terminal in VS Code: **Terminal → New Terminal**.

```bash
cd backend
```

### 3a. Configure environment

Copy the example env file:
```bash
# macOS/Linux
cp .env.example .env

# Windows
copy .env.example .env
```

Open `backend/.env` in VS Code and set these values:

```env
MONGODB_URI=<paste your MongoDB connection string here>
JWT_SECRET=<paste a random 32+ character string here>
```

For `JWT_SECRET`, you can generate one with this command:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Leave the other values at their defaults for now. We'll come back to email and branding later.

### 3b. Install dependencies

```bash
npm install
```

This takes 2-5 minutes. It installs Express, Mongoose, Tesseract, Puppeteer, etc. **Puppeteer downloading Chromium is the slowest part** — be patient.

### 3c. Start the backend

```bash
npm run dev
```

You should see:
```
✅ MongoDB connected: <host>/freight_erp
🚀 Server running in development mode on port 5000
```

**Test it works**: open a new browser tab to <http://localhost:5000/api/health>. You should see JSON like:
```json
{ "status": "ok", "database": "connected", ... }
```

If you see an error, see the **Troubleshooting** section at the bottom.

**Leave this terminal running.** Open a new terminal for the next step.

---

## Step 4 — Frontend Setup

In a **new terminal** (Terminal → Split Terminal, or open a new one):

```bash
cd frontend
npm install
```

This takes 1-2 minutes.

```bash
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

It should automatically open <http://localhost:3000/> in your browser. If not, open that URL manually. You'll land on the login page.

---

## Step 5 — Bootstrap Your First Admin

The first admin needs to be created via a one-time API call. After that, normal sign-in works.

You can do this in three ways:

### Option A — From a terminal (curl)

```bash
curl -X POST http://localhost:5000/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Your",
    "lastName": "Name",
    "email": "admin@yourcompany.com",
    "password": "ChangeMe123!"
  }'
```

### Option B — From VS Code with Thunder Client

1. Install the "Thunder Client" extension in VS Code
2. Click the lightning-bolt icon in the sidebar
3. New Request → POST → `http://localhost:5000/api/auth/bootstrap-admin`
4. Body tab → JSON → paste:
   ```json
   {
     "firstName": "Your",
     "lastName": "Name",
     "email": "admin@yourcompany.com",
     "password": "ChangeMe123!"
   }
   ```
5. Send

### Option C — From the browser DevTools console

1. Open <http://localhost:3000/login> in your browser
2. Open DevTools (F12 or right-click → Inspect)
3. Console tab, paste:
   ```js
   fetch('http://localhost:5000/api/auth/bootstrap-admin', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       firstName: 'Your',
       lastName: 'Name',
       email: 'admin@yourcompany.com',
       password: 'ChangeMe123!',
     }),
   }).then((r) => r.json()).then(console.log);
   ```
4. Press Enter

Either way, you should see a success response with a `token` and `user`. **The bootstrap endpoint disables itself after one use.**

---

## Step 6 — Sign In

Go to <http://localhost:3000/login>.

- Email: the email you used in Step 5
- Password: the password you used in Step 5

You should land on the Dashboard with tiles for Analytics, Pipeline, Shipments, Clients, Rates, and Invoices.

---

## Step 7 — Seed Some Data

The empty app isn't very interesting. Let's create a client, a shipment, and try the kanban + invoice flow.

### Create a client

From the dashboard, go to **Clients** → ... wait, Clients page won't have a "New Client" button yet (we deferred that to a future phase). For now, create one via API:

```bash
TOKEN="<eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZmI0OTYwNjY3ZjM3NTE3MWE1YTUxMSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3ODA3NjAwMSwiZXhwIjoxNzc4NjgwODAxfQ.gX-pt9u7ABuSvJtU2doc1XDrS53MxFdHJtJfFjljOf4>"

curl -X POST http://localhost:5000/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Logistics Corp",
    "email": "finance@acme.com",
    "phone": "+1 555 0100",
    "type": "both",
    "status": "active",
    "addresses": [{
      "country": "United States",
      "countryCode": "US",
      "city": "Los Angeles",
      "isPrimary": true
    }]
  }'
```

You'll get back the new client with a `clientCode` (something like `CL-202605-0001`). **Save this code** — you'll use it when registering customer accounts.

### Create a deal

Open the **Pipeline** page and click "New Deal". Fill in a title (e.g. "Acme - 5x40HC monthly to Hamburg"), value, mode/direction. The card appears in the Inquiry column.

Try dragging it to "Quoted" — you'll see a success toast and the change persists if you refresh the page.

### Create an invoice and send it

```bash
CLIENT_ID="<paste the client _id from above>"

curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"client\":\"$CLIENT_ID\",
    \"type\":\"ar\",
    \"dueDate\":\"2026-06-30\",
    \"currency\":\"USD\",
    \"poNumber\":\"PO-2026-001\",
    \"paymentTerms\":\"Net 30\",
    \"lines\":[
      {\"description\":\"Ocean Freight (Karachi → Hamburg, 1×40HC)\",\"quantity\":1,\"unitPrice\":2400,\"taxRate\":0},
      {\"description\":\"Origin THC\",\"quantity\":1,\"unitPrice\":150,\"taxRate\":0},
      {\"description\":\"Documentation\",\"quantity\":1,\"unitPrice\":75,\"taxRate\":17}
    ]
  }"
```

Now go to **Invoices** in the UI. You'll see your invoice in draft state.
- Click the PDF icon → previews the generated invoice in a new tab
- Click "Send" → opens the send modal, fill in the email, click Send

With `EMAIL_PROVIDER=console` (the default), the email content prints in your **backend terminal** instead of actually sending. You'll see something like:

```
📧 ───── EMAIL (console mode) ─────
To:      finance@acme.com
Subject: Invoice INV-202605-00001 from Freight ERP
Attachments: Invoice-INV-202605-00001.pdf
─── body (text) ───
Invoice INV-202605-00001 — $2,637.75
Due: 6/30/2026
...
```

The PDF was actually generated and saved into the document vault.

---

## Step 8 — Try the Customer Portal

To see the customer-facing side, register a customer account.

1. Sign out from the admin account.
2. Go to <http://localhost:3000/reg ister>.
3. Fill in name, email, password, and the **clientCode** from Step 7 (e.g. `CL-202605-0001`).
4. Sign up.

You'll land on **/shipments** (customers don't get a dashboard). Notice:
- The nav only shows "My Shipments" and "My Invoices"
- You can't access /pipeline, /analytics, /clients, /rates (they redirect)
- Even if you fish for the API directly, financial fields like profit/margin are stripped server-side

---

## Step 9 — Try Dark Mode

Click the moon icon in the navbar. The whole UI flips dark, including the kanban cards, charts, and tables. Click again to flip back. Your choice persists across reloads.

---

## Optional — Enable Real Email

When you want emails to actually send (not just console-log):

1. Edit `backend/.env`:
   ```env
   EMAIL_PROVIDER=smtp
   EMAIL_FROM_ADDRESS=your-real-from@gmail.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-real-from@gmail.com
   SMTP_PASS=your-app-password
   ```

   For Gmail, you need an [App Password](https://support.google.com/accounts/answer/185833), not your regular password. Or use a service like SendGrid, Mailgun, or AWS SES.

2. Restart the backend (`Ctrl+C` in the backend terminal, then `npm run dev` again).

3. Test by sending an invoice — the email should arrive in the recipient's inbox.

---

## Optional — Customize Branding

Edit `backend/.env`:

```env
BRAND_NAME=Your Company Name
BRAND_ADDRESS=Your Address
BRAND_EMAIL=hello@yourcompany.com
BRAND_PHONE=+1 555 1234
BRAND_WEBSITE=www.yourcompany.com
BRAND_COLOR=#0b5ed7
```

This affects:
- The header/footer of generated PDFs (quotes, invoices)
- The header of branded emails
- The "From" name on emails

Restart the backend after changing.

---

## Troubleshooting

### "MongoDB connection failed"
- Check your `MONGODB_URI` in `.env` is correct
- For Atlas: did you replace `<password>` with the real password?
- For local: is MongoDB actually running? Try `mongosh` to connect manually
- For Atlas: did you whitelist your IP? In Atlas → Network Access → Add IP → Allow access from anywhere (for development)

### "Port 5000 is already in use"
Something else is running on port 5000. Either stop that process, or change the port in `.env`:
```env
PORT=5001
```
Then update `frontend/.env` to match: `VITE_API_URL=http://localhost:5001/api`

### "Failed to launch the browser process" (Puppeteer error)
Linux: install the system libraries listed in Step 2.
Other systems: try `npm install puppeteer --force` inside `backend/`.

### Frontend shows "Network Error" or CORS errors
- Is the backend running? Check the backend terminal
- Is `CORS_ORIGIN` in `backend/.env` set to `http://localhost:3000`?
- Is `VITE_API_URL` in `frontend/.env` set to `http://localhost:5000/api`?

### Kanban: "Failed to move — changes reverted"
Likely a 401 (token expired) or 403 (RBAC). Check backend terminal for the specific error.

### Login: "Account is not active"
The user's status is something other than `active`. Open `mongosh` and run:
```js
use freight_erp
db.users.updateOne({ email: 'admin@yourcompany.com' }, { $set: { status: 'active' } })
```

### Customer registration: "No client found with that code"
You need to create the Client record first (Step 7), then register the customer with that exact `clientCode`.

### Tesseract first run is slow
Tesseract.js downloads ~10MB of English language data on first OCR call. Subsequent OCR is fast. This is normal.

### "An admin already exists — bootstrap is disabled"
You already ran the bootstrap. Just sign in normally with the admin credentials. To reset (destructive):
```js
use freight_erp
db.users.deleteMany({ role: 'admin' })
```
Then bootstrap again.

---

## Next Steps

Once you have it running, see `ROADMAP.md` for the planned future phases (notifications, carrier tracking, self-service customer portal, workflow automation, hardening, tax compliance).

## Daily Use

Once set up, every day you just:

1. Open VS Code on the project folder
2. Open two terminals
3. Terminal 1: `cd backend && npm run dev`
4. Terminal 2: `cd frontend && npm run dev`
5. Browser: <http://localhost:3000>

That's it. Both processes auto-reload when you change source files.
