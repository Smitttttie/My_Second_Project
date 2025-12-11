# Expense Tracker (local, no backend)

Client-only web app to record expenses, filter them, visualize trends, and export to CSV. Data is stored in your browser’s localStorage.

## Features
- Add expenses with date, category, description, and amount.
- Currency-aware: store per-expense currency and view everything in your chosen display currency (USD/EUR/GBP/JPY/CAD) with inline conversion.
- Dark/light mode toggle (persisted).
- Filter by date range, category, and text search, plus quick ranges (this/last month, this year).
- Sortable table (date, category, amount) with inline edit + delete; seed with sample data.
- Totals for all vs. filtered expenses, plus current-month highlight in the hero.
- Export filtered list to CSV (includes original + display currency amounts); clear all data button.
- Charts (Chart.js CDN): doughnut by category and line by month (auto-update with filters and display currency).
- Works offline—no backend required (localStorage for data + settings).

## Getting Started
1) Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).
2) Add your expenses in the form; data persists locally.
3) Choose a display currency and toggle theme as desired.
4) Use filters/quick ranges to refine the list; charts and totals update automatically.
5) Sort columns by clicking table headers; edit rows inline or delete.
6) Export filtered rows to CSV or clear all data from the UI. Use “Seed sample data” to try the experience quickly.

## Development Notes
- Stack: HTML, CSS, vanilla JS—no build step needed.
- Charts: Chart.js via CDN.
- Data persistence: `localStorage` under key `expense-tracker:expenses`.
- To reset data, click “Clear All” in the UI or clear the browser’s localStorage entry for the key above.

## Project Structure
- `index.html` – layout and hero, form, filters, charts, table, quick filters
- `style.css` – modern dark styling, cards, tables, logo mark
- `app.js` – expense logic, persistence, multi-currency, charts, totals, CSV export, theme toggle

## Future Enhancements (ideas)
- Editable rows instead of delete/re-add.
- Import from CSV.
- PWA install support and optional cloud sync.
- Budget targets and alerts per category.