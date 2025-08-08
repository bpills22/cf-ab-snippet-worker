// routes:  www.example.com/*
export default {
  async fetch(request, env) {
    // --- Tunables (or set via env vars in Workers Settings) ---
    const COOKIE_NAME = "site_variant";
    const COOKIE_TTL_DAYS = parseInt(env.COOKIE_TTL_DAYS || "30", 10);
    const NEW_SITE_PERCENTAGE = parseFloat(env.NEW_SITE_PERCENTAGE || "0.10"); // 10%
    const ORIGIN_OLD = env.ORIGIN_OLD || "origin-old.example.com";
    const ORIGIN_NEW = env.ORIGIN_NEW || "origin-new.example.com";
    // Optional: force stickiness even if cookies are blocked
    const DETERMINISTIC =
      (env.DETERMINISTIC || "false").toLowerCase() === "true";

    const url = new URL(request.url); // public FQDN stays the same
    const cookies = request.headers.get("Cookie") || "";
    let variant = (cookies.match(/(?:^|;\s*)site_variant=(old|new)/) || [])[1];

    // Assign on first touch
    if (!variant) {
      if (DETERMINISTIC) {
        // stable assignment from IP + UA hash (best-effort if cookies off)
        const ip = request.headers.get("CF-Connecting-IP") || "";
        const ua = request.headers.get("User-Agent") || "";
        const hash = await sha1(`${ip}:${ua}:${url.hostname}`);
        // Map hash to [0,1)
        const n = (parseInt(hash.slice(0, 8), 16) >>> 0) / 0xffffffff;
        variant = n < NEW_SITE_PERCENTAGE ? "new" : "old";
      } else {
        variant = Math.random() < NEW_SITE_PERCENTAGE ? "new" : "old";
      }
    }

    // Pick backend (must be hostnames in the same zone & proxied)
    const backend = variant === "new" ? ORIGIN_NEW : ORIGIN_OLD;

    // Keep public URL; override resolution only
    // Host header remains the public host unless you explicitly change it.
    const init = {
      cf: { resolveOverride: backend },
      // Example: bump timeouts if your new origin is chatty
      // cf: { resolveOverride: backend, connectTimeout: 5, }
    };

    const upstreamReq = new Request(url, request); // preserve method/body/headers
    // If your origin expects a specific virtual host name, uncomment:
    // upstreamReq.headers.set("Host", "app-internal.vhost");

    let resp = await fetch(upstreamReq, init);

    // On first assignment, set the stickiness cookie
    if (!cookies.includes(`${COOKIE_NAME}=`)) {
      const r = new Response(resp.body, resp);
      r.headers.append(
        "Set-Cookie",
        `${COOKIE_NAME}=${variant}; Path=/; Max-Age=${
          COOKIE_TTL_DAYS * 86400
        }; Secure; HttpOnly; SameSite=Lax`
      );
      r.headers.set("X-Variant", variant);
      return r;
    }

    // Helpful header for validation (remove later)
    const out = new Response(resp.body, resp);
    out.headers.set("X-Variant", variant);
    return out;
  },
};

// Tiny helper for deterministic assignment (optional)
async function sha1(input) {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-1", enc);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
