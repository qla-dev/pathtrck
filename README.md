<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/987a1401-a969-4d35-89d6-7634f019d917

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
# Server redeploy

The repository includes `redeploy.php` and `.htaccess`, following the Putni nalozi cPanel deployment layout. The endpoint pulls `main`, installs locked dependencies, and rebuilds `dist`.

Open `/redeploy.php` to trigger deployment. The frontend rewrite explicitly leaves `/endpoints` to the Laravel API.

## API backend switching

This follows Bowido's explicit environment switch. Local development uses `VITE_API_BACKEND=local` and Vite proxies `/api` to `127.0.0.1:8000`. On the production server, keep an ignored `.env` file in the frontend repository containing:

```env
VITE_API_BACKEND=production
```

Production builds then call `https://cargo.qla.dev/endpoints/api` directly.
