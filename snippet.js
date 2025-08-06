// Unified version for Snippets and Workers

// Optional: set these as env vars in Workers, or leave hardcoded for Snippets
const COOKIE_NAME = "site_variant"; // Cookie for user assignment
const COOKIE_TTL_DAYS = 30; // Days to keep assignment
const NEW_SITE_PERCENTAGE = 0.5; // 50% to new site

// Hostnames for routing
const OLD_SITE_HOST = "oldsite.com";
const NEW_SITE_HOST = "newsite.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Check for an existing variant cookie
    const cookies = request.headers.get("Cookie") || "";
    const cookieMatch = cookies.match(new RegExp(`${COOKIE_NAME}=(old|new)`));
    let variant = cookieMatch ? cookieMatch[1] : null;

    // If no cookie, assign variant
    if (!variant) {
      // Allow Workers to override percentage via env var
      const percentage = parseFloat(
        env?.NEW_SITE_PERCENTAGE || NEW_SITE_PERCENTAGE
      );
      variant = Math.random() < percentage ? "new" : "old";
    }

    // Route based on variant
    url.hostname = variant === "new" ? NEW_SITE_HOST : OLD_SITE_HOST;

    // Fetch from chosen origin
    const newRequest = new Request(url.toString(), request);
    let response = await fetch(newRequest);

    // Set cookie if newly assigned
    if (!cookieMatch) {
      const cookieValue = `${COOKIE_NAME}=${variant}; Path=/; Max-Age=${
        COOKIE_TTL_DAYS * 86400
      }; Secure; HttpOnly; SameSite=Lax`;
      const newResponse = new Response(response.body, response);
      newResponse.headers.append("Set-Cookie", cookieValue);
      response = newResponse;
    }

    return response;
  },
};
