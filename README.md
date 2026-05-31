# Dad's Bitcoin

A lightweight replacement for the old WordPress/Brizy Dad's Bitcoin page.

## What it does

- Shows Dad's BTC amount.
- Fetches the live Bitcoin USD price from CoinGecko.
- Calculates Dad's current USD value.
- Shows real BTC price history for 1H, 1D, 1W, 1M, 6M, 1Y, and all-time ranges.
- Dad's BTC amount is controlled by the deploy-time `VITE_DAD_BTC_AMOUNT` setting.
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

Tell Hermes the new amount, then rebuild/redeploy with:

```bash
VITE_DAD_BTC_AMOUNT=0.042079 npm run build
```

There is intentionally no public BTC amount editor on the page. For now, updates happen through deploy configuration/code. A private admin page can be added later.

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
