# Expense Tracker (local, no backend)

Client-only web app to record expenses, filter them, visualize trends, and export to CSV. Data is stored in your browser’s localStorage.

## Features
- Add expenses with date, category, description, and amount.
- Filter by date range, category, and text search.
- Totals for all vs. filtered expenses, plus current-month highlight.
- Delete individual entries, clear all, export filtered list to CSV.
- Charts (Chart.js CDN): doughnut by category and line by month.
- Works offline—no backend required.

## Getting Started
1) Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).
2) Add your expenses in the form; data persists locally.

## Development Notes
- Stack: HTML, CSS, vanilla JS—no build step needed.
- Data persistence: `localStorage` under key `expense-tracker:expenses`.
- To reset data, click “Clear All” in the UI or clear the browser’s localStorage entry for the key above.

## Project Structure
- `index.html` – layout and UI
- `style.css` – styling
- `app.js` – expense logic, persistence, and CSV export

## Future Enhancements (ideas)
- Category color-coding and charts.
- Editable rows instead of delete/re-add.
- Import from CSV.
- PWA install support and optional cloud sync.