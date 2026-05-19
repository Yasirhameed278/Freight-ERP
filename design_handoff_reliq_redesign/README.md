# Handoff: Reliq Freight ERP — Dashboard Redesign

## Overview

This handoff covers a visual redesign of the Reliq Freight ERP frontend, inspired by the **Finexy** dashboard aesthetic. The goal: keep all existing routes, data shapes, role-based access, and business logic — but replace the visual surface with a cleaner, more modern UI that better suits a single-tenant operations console.

The redesign covers **14 pages** with **3 dashboard variants** to choose from.

---

## About the Design Files

The files in this bundle are **design references created in HTML** — interactive prototypes showing the intended look and behavior. They are **not production code to copy directly**.

The task is to **recreate these designs inside the existing Reliq codebase** (React 18 + Vite + Bootstrap 5 + Bootstrap Icons + Recharts, located at `frontend/src/`), using its established patterns:

- React function components in `frontend/src/pages/` and `frontend/src/components/`
- Existing routing in `App.jsx` (React Router 6) — **do not change routes**
- Existing API layer in `frontend/src/api/`
- Existing contexts: `AuthContext`, `ThemeContext`, `NotificationContext`
- Bootstrap 5 + Bootstrap Icons (already installed)
- Recharts for any charts you want richer than the prototype's hand-rolled SVG (Recharts is already installed)

> Replace the **styling and layout** of each existing page file; preserve the **data fetching, state, role gating, and prop contracts** unchanged.

---

## Fidelity

**High-fidelity.** All colors, type sizes, spacing, radii, shadows, and component anatomy are final. The developer should match them pixel-close, but is welcome to use Recharts in place of the hand-rolled SVG charts (Sparkline, BarChart, StackedBarChart, LineChart, Donut) — those primitives exist in the prototype only because it avoided pulling in extra deps.

---

## How to View the Prototype

Open `Reliq Dashboard.html` in any modern browser. It works offline (uses CDN React/Babel — needs internet on first load).

- The **left icon rail** + **top segmented nav** navigate between pages.
- The **floating switcher at bottom** swaps between Dashboard V1 / V2 / V3.
- The **Tweaks panel** (gear icon, bottom-right) toggles dark mode, accent color, density, and offers a jump-to-page dropdown for fast navigation.
- Card/row clicks on Shipments → Shipment Detail; Clients → Client 360.

---

## Design System

### Type

| Use | Family | Notes |
|---|---|---|
| UI body, headings | **Inter** (400, 500, 600, 700) | Already loaded via Google Fonts |
| Numbers, codes, ports | **JetBrains Mono** (400, 500, 600, 700) | Used on shipment IDs, port codes, money values |

Letter-spacing on titles: `-0.025em` (page titles), `-0.02em` (port codes), `-0.005em` (body).

### Color tokens (light mode)

All colors are defined in `assets/reliq/styles.css` as CSS variables on `:root`. Copy them into your global stylesheet or theme provider.

```css
--bg:        oklch(98% 0.004 70);   /* warm off-white page background */
--surface:   #ffffff;                /* card fills */
--surface-2: oklch(96.5% 0.005 70); /* hover / nested surfaces */
--surface-3: oklch(94% 0.006 70);   /* selected / deeper */
--ink:       oklch(17% 0.01 70);     /* primary text */
--ink-2:     oklch(35% 0.012 70);    /* secondary text */
--muted:     oklch(54% 0.01 70);     /* labels, captions */
--muted-2:   oklch(68% 0.008 70);    /* timestamps */
--border:    oklch(91% 0.005 70);    /* buttons, inputs */
--border-2:  oklch(88% 0.006 70);    /* hover borders */
--hairline:  oklch(95% 0.004 70);    /* card borders, table dividers */

--brand:     #FF7A45;                /* Reliq orange */
--brand-2:   #FF6428;                /* hover */
--brand-3:   #FFEFE8;                /* tint background */

--success:   #10B981;
--warning:   #F59E0B;
--danger:    #EF4444;
--info:      #3B82F6;
--violet:    #8B5CF6;

/* Freight mode colors */
--m-sea:     #1A56DB;
--m-air:     #DC2626;
--m-road:    #059669;
--m-rail:    #7C3AED;
--m-courier: #0891B2;
```

### Dark mode

Use CSS attribute `[data-theme="dark"]` on `<html>` or app root. Token overrides are in `styles.css` lines 56–73. The existing `ThemeContext` already manages this — wire it to set the `data-theme` attr.

### Radii

| Token | Value | Where |
|---|---|---|
| `--r-sm` | 8px | small chips, inner pills |
| `--r` | 12px | inputs, kanban cards |
| `--r-lg` | 16px | KPI tiles, main cards |
| `--r-xl` | 22px | hero tiles |
| Buttons | 10px | not a var, hard-coded |
| Chips | 999px | pills |

### Shadows

```css
--sh-1: 0 1px 2px rgba(16,24,40,.04), 0 1px 0 rgba(16,24,40,.02);  /* default card */
--sh-2: 0 1px 2px rgba(16,24,40,.04), 0 6px 16px rgba(16,24,40,.05); /* hover */
--sh-3: 0 12px 32px -8px rgba(16,24,40,.10), 0 2px 6px rgba(16,24,40,.04); /* lifted */
```

Hero orange tile shadow: `0 8px 24px -6px rgba(255, 122, 69, .35)`.

### Density

Three modes via `[data-density]` attribute on app root: `compact` (14px gutter/padding), `default` (20px), `roomy` (28px). Implement as a setting on `ThemeContext`.

### Spacing scale (gap utilities)

`gap-2: 8px`, `gap-3: 12px`, `gap-4: 16px`, `gap-5: 20px`, `gap-6: 24px`. Use these in flex/grid.

---

## App Shell

### Layout

```
┌──────┬──────────────────────────────────────────────────┐
│      │  topbar (64px)                                    │
│ rail ├──────────────────────────────────────────────────┤
│ 64px │  page (max 1480px, 28px gutters)                  │
│      │                                                    │
└──────┴──────────────────────────────────────────────────┘
```

### Sidebar (icon rail)

- **Width**: 64px, fixed
- **Background**: `var(--surface)` with right border `1px solid var(--border)`
- **Brand**: 36×36 orange-filled rounded square (10px radius) at top with "R", `box-shadow: 0 2px 6px rgba(255,122,69,.35)`
- **Items**: 38×38 buttons, 10px radius, only icon (use existing Bootstrap Icons from the codebase)
- **Active item**: dark ink fill (`var(--ink)`), light surface icon color
- **Sections separated by**: 28px-wide × 1px hairline divider, centered
- **Groups** (in order, matching existing `NAV` structure):
  1. Main → Dashboard
  2. Operations → Shipments, Pipeline, Tasks
  3. Finance → Invoices, AR, AP, Collections, GL
  4. CRM → Clients
  5. Tools → Rates, Analytics
- **Footer**: Settings + Help icons, pushed to bottom

### Topbar (top nav)

- **Height**: 64px, transparent background with `border-bottom: 1px solid var(--hairline)`, `backdrop-filter: blur(12px)`
- **Left**: Segmented pill nav with 5 items: **Overview · Operations · Finance · Clients · Reports**
  - Pill container: `var(--surface)`, 1px border, 999px radius, 4px padding
  - Active segment: dark ink background, light text
  - Inactive: muted text, hover → ink color
  - Clicking a segment navigates to the first page in that group
- **Center**: spacer (flex: 1)
- **Right**:
  - Search input (320px wide, pill-shaped) with `⌘K` keyboard hint kbd
  - Bell icon button (38×38 circle, with orange dot indicator)
  - Chat icon button
  - User pill: 30px avatar with orange-to-amber gradient, name "Sajibur R.", role "Operations Lead"

### Page container

- `padding: 28px 28px 80px`
- `max-width: 1480px`, centered
- Page title: 30px / 700 / `-0.025em` tracking
- Page subtitle: 14px / `var(--muted)`
- Page hero row: title block left, action buttons right

---

## Pages

Each page below maps 1:1 to an existing file in `frontend/src/pages/`. **Recreate the visual layout described; keep the page's existing data fetching, hooks, and props.**

### 1. `Dashboard.jsx` — Overview

Three variants — **ship V1 as default**. V2 and V3 should be selectable behind a setting (or chosen by the manager). Each variant has identical data dependencies.

#### V1 — "Operations First" (recommended default)
- **Hero row**: Greeting "Good morning, {firstName}" + sub line with shipment/task counts. Actions right: "Export" (ghost) + "New Job" (orange primary).
- **KPI strip (4 columns)**:
  1. **Hero orange tile** — "Total Revenue (YTD)" $1.24M with a faint white sparkline overlay
  2. Active Shipments — info blue icon
  3. Outstanding AR — success green icon
  4. Gross Margin — violet icon
- **"Operations by Mode" card** — full-width with 5 mode tiles (Sea Export, Sea Import, Air, Road, Rail). Each tile shows: colored mode chip, count, sub-line ("42 TEUs · 4 in transit"), sparkline at bottom.
- **Two-column charts**: Stacked bar chart (Revenue/Profit, 12 months, brand orange + dark ink) | AR Aging bar chart with 5 buckets below.
- **Two-column tables**: Shipments in Transit table | Live Activity feed with pulsing live dot.
- **Quick Links footer**: 6 link cards in a row.

#### V2 — "Finance First" (Finexy-style)
- **Hero greeting** — same as V1 but sub-line emphasizes "monitor cash & operations"
- **Three-column hero row**:
  - **Left card**: Total Revenue with USD flag chip, big 38px value, +12.4% delta, Transfer/Request buttons, then a sub-list of currency accounts (USD/EUR/GBP) with flag emojis, balances, Active/Idle chips.
  - **Center 2x2 KPI grid**: orange Earnings (hero) | Spending | Outstanding AR | Outstanding AP.
  - **Right card**: Stacked profit/cost bar chart (8 months).
- **Two-column row**: Monthly Spending Limit bar + Mode Mix donut on left | Recent Activities full table on right (selectable rows, one row pre-selected with orange tint and inset border).

#### V3 — "Bento Dense"
- **Compact header** — small page title, filter chips (Live/7d/30d/YTD) and small "New" button.
- **Bento grid** — 4-column grid, mixed row spans:
  - Row 1: 4 small KPIs with sparklines (Revenue MTD, Active Jobs, On-Time %, Gross Margin)
  - Row 2-3: Large World Map (2 col × 2 row, with port dots and "Vessels at sea / In customs / Delayed" footer stats) | Mode Mix donut (2 col)
  - Row 4: AR Aging bar (2 col) | Activity feed (2 col × 2 row)
  - Row 5: Revenue trend line chart (2 col)
  - Row 6: Top Customers (4 col row)

### 2. `Shipments.jsx` — Shipments list

- **Header**: "Shipments" title, count subtitle. Actions: card/table view toggle (segmented), Export, New Job (orange primary).
- **Filter row 1**: Status pill chips (Active / All / Delivered / On Hold) with counts in inset badges, dividers, then mode chips (All / Sea / Air / Road / Rail). Search input pushed to the right (240px).
- **Status Pipeline card**: horizontal pipeline with 9 steps (Quote → Booked → Received → Export → Transit → Arrived → Import → Cleared → Delivered). Each step is a 30px circle (filled orange when done, ring + orange dot when current), label below, count below label. Steps connected by 2px line (orange when done).
- **Card view**: 3-column grid of `ship-card`s
  - Top: shipment number (mono orange) + client name | mode chip
  - Middle: route (port code 19px mono bold + city name muted, with dashed line + day count between)
  - Footer row: ETD, vessel/flight, ETA (red if late, with warning icon)
  - Bottom: status chip + container count
- **Table view**: standard data table with Job#, Mode, Route, Client, ETD, ETA, Carrier, Status columns.

### 3. `ShipmentDetail.jsx` — Shipment detail

- **Breadcrumb**: "Shipments › {ID}"
- **Detail header**: ID (mono 26px), status chip, mode chip, late warning chip if applicable. Actions: Edit, Print BOL, Send docs, Update Status (orange primary).
- **Route card**: 3-column layout
  - Left: Origin (port code 28px mono, city, country, ETD)
  - Center: Mode icon, "{n}d transit", progress bar (filled to current step / 8), status label
  - Right: Destination (same as left, mirrored)
- **Mini world map** below with dashed orange route line connecting origin → destination dots.
- **Tabs**: Overview / Milestones / Containers / Documents / Financials / Messages.
- **Overview tab**: 2-column layout
  - Left: Milestones timeline — 7 stepped events, each with colored icon circle (filled if done, dashed border if pending), title, timestamp.
  - Right column stack: Shipment Details list, Cost Summary (4 line items + bordered total + margin), Documents list (Bill of Lading, Commercial Invoice, Packing List, Cert of Origin — each with file icon + status chip).

### 4. `Kanban.jsx` (Pipeline)

- **Header**: "Pipeline" + sub. Filter chips, then 6-column kanban grid.
- **Columns**: Quote / Booked / Received / Export / In Transit / Cleared.
  - Column header: colored status dot + label + count + "+" button
  - Cards: shipment number, mode chip, port→port route, client name (truncated), ETA + value bottom row.
  - Empty columns get a dashed "Drop jobs here" zone.
- Use `@dnd-kit` (already installed) for drag-reorder.

### 5. `Tasks.jsx`

- 4-column kanban (To do / In Progress / Review / Done) inside `var(--surface-2)` columns.
- Task card: checkbox + title, linked shipment chip below, priority chip + tag chip + 18px avatar + due-date label (Today/Tomorrow/Nd late in red/orange/muted).

### 6. `Invoices.jsx`

- 4 KPI tiles (Invoiced / Collected / Outstanding / Overdue) with deltas.
- Status filter chips with counts.
- Search input + filter button right-aligned.
- Full-width data table with checkbox column, Invoice # (mono orange), Client, Shipment (clickable), Issued, Due (red + Nd late under it if overdue), Amount, Balance, Status chip, action buttons.

### 7. `ARPortal.jsx`

- **"AR Aging Distribution" card**: 5 stat tiles in a row (each with colored 3px top border, bucket name, value, count, progress bar). Then a bar chart of all 5 buckets.
- **Two-column**: Top Receivables by Customer table (with credit utilization progress bars) | Cash Inflow Forecast line chart (4 weeks, 2 lines) with Expected/Confirmed/At-risk stats below.
- Open Invoices table at bottom.

### 8. `APPortal.jsx`

Mirror of AR. 4 KPI tiles → By Category donut + AP Aging strip → Open Bills table.

### 9. `Collections.jsx`

- 4-card escalation funnel (1st Reminder / 2nd Reminder / Final Notice / Legal — each with left colored 3px border).
- Recent Activity feed card.
- Collection Queue table with stage chips, action buttons (Envelope, Phone, More).

### 10. `GL.jsx` (General Ledger)

- Period selector (May 2026 / YTD / FY2026 segmented).
- 4 KPI tiles (Assets / Liabilities / Revenue / Net Income).
- Two-column: Income Statement (line items, bold totals with top border, gross profit in success green) | Revenue vs Expense line chart with YTD stats.
- Trial Balance table at bottom (Code, Account, Type chip, Debit, Credit, Balance — parens for credit balances) with totals row in `var(--surface-2)`.

### 11. `Clients.jsx`

- 4 filter chips with counts (All / Active / Priority / Review).
- Card view: 3-column grid. Each card: 42px monogram avatar in `var(--brand-3)` background + brand text, name, code/country/industry mono sub, status chip, 2-col stats (Revenue YTD orange + Margin success green), credit utilization bar.
- Table view: standard data table.

### 12. `Clients.jsx` (Client 360)

- Breadcrumb back to clients.
- Header with 60px monogram avatar + name + status chip + meta line + action buttons.
- 4 KPI tiles (Revenue / Margin / Shipments / Credit). Priority clients get hero orange treatment on Revenue.
- Tabs: Overview / Shipments / Financials / Contacts / Documents / Activity.
- Overview: Revenue trend line chart + Account Details card → 2-col tables (Recent Shipments | Open Invoices) → Mode Mix 5-tile strip.

### 13. `RateSearch.jsx`

- Search card with 5 inputs in a row (Origin select, Destination select, Mode select, Equipment select, Ready Date) + orange Search button.
- Filter chips (Best Match / Cheapest / Fastest / Most Reliable).
- Stacked rate cards. Each rate card: mode icon tile + carrier/type + transit + validity + rate (huge orange mono + unit) + Details/Book buttons. "Best Value" rates get a chip-brand badge floating above top-left.

### 14. `Analytics.jsx`

- Period segmented (7d / 30d / 90d / 12mo / YTD).
- 4 KPI tiles (Revenue hero / Margin / Avg Job Value / On-Time).
- Two-column: Stacked bar chart 12mo (Revenue + Profit) | Mode Mix donut.
- Two-column: Top Lanes by Revenue table | Top Customers progress-bar list.
- Two-column: On-Time Performance by Mode (5 horizontal bars) | Capacity Utilization stacked bar chart.

---

## Reusable Components to Build

These come up across pages — make them once. The HTML prototype source is in `assets/reliq/components.jsx`:

| Component | Props | Notes |
|---|---|---|
| `<Kpi>` | label, value, delta, deltaLabel, icon, color, hero, children | Includes optional sparkline child |
| `<ModeTile>` | mode, label, count, sub, sparkData | Mode color + sparkline |
| `<ModeChip>` | mode, direction, size | colored chip |
| `<StatusChip>` | status | colored chip with dot |
| `<PaymentStatusChip>` | status | for invoice/bill statuses |
| `<ProgressBar>` | pct, color | 6px bar |
| `<PageHero>` | title, sub, actions, breadcrumb | Standard page header |
| `<Sparkline>` | data, color, height, fill | tiny SVG line |
| `<BarChart>` / `<StackedBarChart>` / `<LineChart>` / `<Donut>` | Replace with **Recharts** in production (already installed) |

---

## Interactions

- **Navigation**: existing React Router routes — do not change.
- **Card/row hover**: lift with `transform: translateY(-2px)` + `box-shadow: var(--sh-3)`; 150ms ease.
- **Button hover**: border darkens to `var(--border-2)`, bg → `var(--surface-2)`. Orange button → `var(--brand-2)`.
- **Status pipeline**: clickable steps filter the list to that status.
- **Filter chips**: single-select per group; active → dark ink fill.
- **Tabs**: 10px padding, 2px brand bottom border on active, ink color.
- **Live activity dot**: 1.6s pulse animation (`@keyframes pulse`).
- **No new modals or flows** — only visual replacement of existing screens.

---

## State Management

- Keep all existing `useAuth`, `useTheme`, page-level `useState` / `useEffect` data fetching unchanged.
- Add a density key to `ThemeContext` if you want to expose compact/roomy.
- The "dashboard variant" V1/V2/V3 switcher is for *design review only* — pick one (V1 recommended) and ship that single variant. Don't ship the floating switcher to production.

---

## Implementation Order (suggested)

1. **Tokens & global CSS** — port the variables from `assets/reliq/styles.css` into your global stylesheet or theme. Keep using Bootstrap's grid utilities; replace `.btn`, `.card`, badge styles with the new ones.
2. **App shell** — rebuild `Sidebar.jsx` (icon rail) and add a new `Topbar.jsx` (segmented nav + search + user pill). Inject into `Layout.jsx`.
3. **Reusable atoms** — `Kpi`, `ModeChip`, `StatusChip`, `PaymentStatusChip`, `ProgressBar`, chart wrappers around Recharts.
4. **Dashboard V1** — biggest visual win, validates the system end to end.
5. **Shipments list + Shipment detail** — second biggest impact pages.
6. **Pipeline, Tasks** — kanban styling.
7. **Finance pages** — Invoices → AR → AP → Collections → GL.
8. **CRM** — Clients list + Client 360.
9. **Rate Search + Analytics**.

---

## Assets

All icons are **Bootstrap Icons** (`bootstrap-icons@1.11.3`, already in `package.json`). No new image assets are needed — the prototype uses placeholder flag emojis for currencies and a stylized SVG world map (continents as blobs). Replace the SVG world map with the existing `VesselMap.jsx` (Leaflet) if a real map is wanted on the shipment detail / V3 dashboard.

---

## Files in This Bundle

| Path | Purpose |
|---|---|
| `Reliq Dashboard.html` | The prototype entry point — open in browser |
| `assets/reliq/styles.css` | Full design system: tokens, components, utilities |
| `assets/reliq/data.js` | Mock freight data (shipments, invoices, clients, etc.) — for reference only |
| `assets/reliq/components.jsx` | Reusable components (Kpi, charts, chips) |
| `assets/reliq/shell.jsx` | App shell (Rail, Topbar, router) |
| `assets/reliq/pages-dashboard.jsx` | Dashboard V1 / V2 / V3 |
| `assets/reliq/pages-ops.jsx` | Shipments, Shipment Detail, Pipeline, Tasks |
| `assets/reliq/pages-finance.jsx` | Invoices, AR, AP, Collections, GL |
| `assets/reliq/pages-crm.jsx` | Clients, Client 360, Rate Search, Analytics |
| `assets/tweaks-panel.jsx` | Design-review tweaks panel (NOT for production) |

---

## Definition of Done

- All 14 pages re-skinned in the existing codebase, matching the prototype.
- Type system, color tokens, radii, and shadows match exactly.
- Light + dark modes both work (existing `ThemeContext`).
- No existing routes, API calls, or role-gating logic is changed.
- Bootstrap grid / utility classes still used where they were; only visual styles replaced.
- Recharts is used for production charts (replacing the prototype's hand-rolled SVG).
