# Freight ERP

A full-stack Freight Forwarding & Logistics Management ERP built with the MERN stack.

## Features

- **Authentication & RBAC** — JWT auth with 8 roles (admin, manager, operations, sales, finance, customer_service, agent, customer)
- **Customer 360 / CRM** — full client CRUD with aggregate view of shipments, deals, invoices, AR
- **Shipment Lifecycle** — interactive milestone tracker, auto-status advancement
- **Pipeline Kanban** — drag-and-drop deal pipeline (inquiry → quoted → confirmed → lost)
- **Rate Search Engine** — buy/sell rate matrix with markup logic
- **Quote → Booking → Invoice** — full order-to-cash flow
- **PDF Generation** — branded quotes and invoices via Puppeteer
- **Email Engine** — pluggable backend (console/SMTP/mock)
- **Document Vault** — drag-drop upload with OCR (Tesseract or cloud vision)
- **OCR Auto-extract** — container numbers (with ISO 6346 check digit) and weights, auto-merged into shipments
- **KPI Analytics** — revenue, profit, on-time delivery %, AR aging, top customers
- **Activity Audit Log** — every state-changing operation is logged
- **Customer Portal** — restricted view with server-side field stripping
- **Dark Mode** — Bootstrap 5.3 native theming

## Project Structure

```
freight-erp/
├── backend/          Express + MongoDB API
└── frontend/         React + Vite + Bootstrap UI
```

See `SETUP.md` for the step-by-step setup guide.

## Tech Stack

**Backend**: Node.js, Express, MongoDB, Mongoose, JWT, Multer, Tesseract.js, Puppeteer, Nodemailer

**Frontend**: React 18, Vite, React Router, React Bootstrap, dnd-kit, Recharts, Axios
