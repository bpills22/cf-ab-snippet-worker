# Cloudflare A/B Routing Snippet

This project contains a Cloudflare **Snippet** that routes visitors between two sites (`oldsite.com` and `newsite.com`) for A/B testing or a soft launch.  
The routing is **sticky** — once a visitor is assigned a site, they will continue to see that same site for future visits via a cookie.

---

## How It Works

1. **Checks for a cookie** named `site_variant`.
2. If no cookie exists, randomly assigns `"new"` or `"old"` based on the configured rollout percentage (`NEW_SITE_PERCENTAGE`).
3. **Rewrites the request hostname** to either the old or new site.
4. **Sets the cookie** so future visits go to the same site.
5. Fetches and returns the response from the assigned origin.

---

## Configuration

- **`COOKIE_NAME`** — Name of the cookie to store the assignment (`site_variant` by default).
- **`COOKIE_TTL_DAYS`** — How long (in days) the cookie remains valid.
- **`NEW_SITE_PERCENTAGE`** — Percentage of new visitors that should get the **new** site.  
  Example: `0.5` = 50%, `0.1` = 10%, `0.9` = 90%.

---

## Deploying as a Cloudflare Snippet

1. In the Cloudflare Dashboard, go to **Rules → Snippets**.
2. Create a new Snippet and paste in `snippet.js` code from this repo.
3. Create a **Snippet Rule** to match:
   - Hostname(s) you want to control (e.g., `bigtowntravel.com`, `btt.com`).
   - Optional path restrictions if only part of the site is in the rollout.
4. Deploy.

---

## Testing the Snippet

- Load your site in an incognito browser window.
- Check developer tools → Application → Cookies for `site_variant`.
- Reload to verify stickiness — you should keep hitting the same origin.

---

## Migrating to a Cloudflare Worker

The code in `snippet.js` is written to be **compatible with Workers** with minimal changes.

### Steps to Move

1. In the Cloudflare Dashboard, go to **Workers & Pages → Create Application → Worker**.
2. Paste the same code into the Worker editor.
3. (Optional) Configure `NEW_SITE_PERCENTAGE` as an **environment variable** so you can adjust rollout without redeploying.
4. Create a **Worker Route** that matches the same domains/paths as the Snippet Rule.
5. Deploy.
6. Disable or remove the Snippet Rule to avoid double execution.

---

## Why Start with Snippets?

- **Free** on paid Cloudflare plans (Pro, Business, Enterprise).
- Executes extremely fast (≤ 5 ms CPU).
- No per‑request billing.
- Simple to integrate into Rules Engine.

---

## When to Move to Workers

Move to Workers if you need:
- Logging and observability.
- Rollout control via API calls or KV storage.
- Integration with Durable Objects, D1, or external APIs.
- CLI deployment/version control via Wrangler.

---

## License

This project is provided as‑is, without warranty.  
