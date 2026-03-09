/**
 * STEVE OBIZZ STORE — RENDER KEEP-ALIVE SCRIPT
 * ------------------------------------------------
 * Render free tier sleeps after 15 mins of inactivity.
 * This script pings your backend every 13 minutes to keep it awake.
 *
 * HOW TO USE (3 options — pick ONE):
 *
 * OPTION A: Add to your existing backend (Recommended - Zero cost)
 *   1. Copy this file into your backend project root
 *   2. In your main server file (e.g. index.js / server.js), add:
 *        import './keep-alive.js';
 *   3. Redeploy to Render — done!
 *
 * OPTION B: Free External Cron (Easiest - No code changes)
 *   1. Go to https://cron-job.org (free account)
 *   2. Create a new cron job pointing to:
 *        https://steveobizzstore.onrender.com/health
 *   3. Set schedule to every 13 minutes
 *   4. Done — your server stays awake automatically
 *
 * OPTION C: UptimeRobot (Also free)
 *   1. Go to https://uptimerobot.com (free account)
 *   2. Add a new HTTP(s) monitor for:
 *        https://steveobizzstore.onrender.com/health
 *   3. Set interval to 5 minutes
 *   4. Bonus: It also alerts you if your server goes down!
 */

// ---- STEP 1: Add this /health route to your Express app (index.js or server.js) ----
// app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date() }));


// ---- STEP 2: Self-ping logic (for Option A) ----
const BACKEND_URL = 'https://steveobizzstore.onrender.com/health';
const PING_INTERVAL_MS = 13 * 60 * 1000; // 13 minutes

const pingServer = async () => {
    try {
        const res = await fetch(BACKEND_URL);
        const data = await res.json();
        console.log(`[Keep-Alive] ✅ Server is awake at ${new Date().toLocaleTimeString('en-NG', { timeZone: 'Africa/Lagos' })} — Status: ${data.status}`);
    } catch (err) {
        console.error(`[Keep-Alive] ❌ Ping failed: ${err.message}`);
    }
};

// Run once immediately on startup, then every 13 minutes
pingServer();
setInterval(pingServer, PING_INTERVAL_MS);

console.log('[Keep-Alive] 🚀 Pinging server every 13 minutes to prevent Render sleep...');