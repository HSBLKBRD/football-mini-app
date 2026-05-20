# Vercel Deployment Guide - Football Prediction Mini App

This guide lists the Environment Variables required to run the Football Prediction Telegram Mini App on Vercel.

## Environment Variables to Configure in Vercel

Configure these variables in your Vercel Project under **Settings > Environment Variables**:

| Variable Key | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | The API URL of your Supabase project. | `https://xyzabc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The anonymous public API key of your Supabase project. | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_ADMIN_ID` | Your Telegram User ID (gives you access to the Admin tab). | `123456789` |
| `REACT_APP_ADMIN_ID` | Backup variable for Telegram Admin ID. | `123456789` |
| `VITE_WALLET_ADDRESS` | The destination TON wallet address that receives the prediction fees (0.01 TON). | `EQD...` (or testnet address) |
| `REACT_APP_WALLET_ADDRESS`| Backup variable for the destination TON wallet. | `EQD...` |
| `VITE_TON_NETWORK` | The TON network configuration (`-3` for Testnet, `-239` for Mainnet). | `-3` (recommended for testing first) |

---

## Important Deployment Notes

1. **Prefix Constraint**: Vite requires frontend environment variables to be prefixed with `VITE_` to bundle them into the build output. Make sure you set both `VITE_ADMIN_ID` and `VITE_WALLET_ADDRESS`.
2. **Build Settings**: Vercel should automatically detect **Vite** and configure the build settings. If not, make sure they are:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
3. **SPA Routing**: Since this is a Single Page Application (SPA), if you ever switch from HashRouter to BrowserRouter, you'll need a `vercel.json` file in the root to rewrite all requests to `index.html`. Since we are using `HashRouter` for Telegram compatibility, standard routing works out of the box without extra rewrite configurations.
