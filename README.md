# Legacy Builders HELOC Strategy Calculator

Educational calculator for Legacy Builders Enterprise Group workshops. A homeowner can enter a HELOC, household cash flow, and other debts, then compare repayment strategies with a daily interest model.

The primary example is a $150,000 line with $75,000 initially outstanding. The model compares minimum payments, a fixed monthly payment, full paycheck cycling, and partial paycheck cycling. It does not assume that velocity banking saves money, and it does not treat a balance transfer as debt elimination.

Figures stay in the browser. The app does not connect to bank accounts or submit financial information to a server.

## Requirements

- Node.js 22 or newer
- npm

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

## Tests

```bash
npm test
```

The calculation tests cover available credit, principal paydown, draws, the credit limit, daily interest, promotional expiration, rate shocks, paycheck cycling, equivalent cash flows, missed payments, and consolidation transfers. See [docs/TESTING.md](docs/TESTING.md).

## Production build

```bash
npm run build
npm start
```

## Deploy

The app has no required environment variables and no database. PDF reports are generated in the browser.

GitHub Pages serves the static export. Pushes to `main` run `.github/workflows/pages.yml` and publish to:

https://jahshuamaxwell.github.io/heloc-lab/

In the repository settings, set Pages to deploy from GitHub Actions if that source is not already selected. Build the same export locally with:

```bash
GITHUB_PAGES=true npm run build
```

The exported site is written to `out/`. A normal `npm run build` followed by `npm start` still runs the Node server, including on Vercel, with no base path.

## Project map

- `lib/finance` — money, dates, the daily interest engine, strategy comparisons, and stress tests
- `components` and `app` — the workshop interface
- `lib/scenarios` — browser storage, with a CRM repository interface left unimplemented
- `lib/report` — the PDF workshop report
- `docs` — requirements, architecture, calculation rules, and the user flow

## Workshop example

The app opens with sample inputs: a $150,000 limit, a $75,000 balance, a 4.99% promotional rate through April 1, 2027, an 8.50% rate after that, biweekly take-home pay, living expenses, and four other debts. Use **Reload workshop example** on the Scenarios screen to restore them.
