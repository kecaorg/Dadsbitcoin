# Dad's Bitcoin

A lightweight replacement for the old WordPress/Brizy Dad's Bitcoin page.

## What it does

- Shows Dad's BTC amount.
- Fetches the live Bitcoin USD price from CoinGecko.
- Calculates Dad's current USD value.
- Shows real BTC price history for 1H, 1D, 1W, 1M, 6M, 1Y, and all-time ranges.
- Lets you update Dad's BTC amount in the browser and saves it in localStorage.
- Falls back to generated demo data if CoinGecko is temporarily unavailable.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The production site is emitted to `dist/`.

## Default BTC amount

The deploy-time default can be set with:

```bash
VITE_DAD_BTC_AMOUNT=1.45 npm run build
```

Visitors can still override the amount locally using the input on the page; that override is saved only in their browser.

## Deployment recommendation

This is a static Vite app, so it should be deployed somewhere simpler and more reliable than WordPress:

- Cloudflare Pages
- Vercel
- Netlify
- GitHub Pages
- any static web host

Recommended build settings:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 22 or current LTS
