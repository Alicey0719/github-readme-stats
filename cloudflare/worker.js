// @ts-check

/**
 * @file Cloudflare Workers entry point. Adapts the Express/Vercel style
 * handlers in `api/` to the Workers `fetch` handler, like `express.js` does
 * for local development.
 */

import axios from "axios";

// Workers has neither XMLHttpRequest nor the Node.js http module.
axios.defaults.adapter = "fetch";
// axios otherwise sends `cache: "default"`, which Workers' fetch rejects.
axios.defaults.fetchOptions = { cache: "no-store" };

const REDIRECT_URL = "https://github.com/Alicey0719/github-readme-stats";

// Handlers are imported lazily so `process.env` is filled before the upstream
// modules read it at their top level.
/** @type {Record<string, () => Promise<{ default: Function }>>} */
const routes = {
  "/api": () => import("../api/index.js"),
  "/api/pin": () => import("../api/pin.js"),
  "/api/top-langs": () => import("../api/top-langs.js"),
  "/api/wakatime": () => import("../api/wakatime.js"),
  "/api/gist": () => import("../api/gist.js"),
  "/api/status/up": () => import("../api/status/up.js"),
};

/**
 * Copy string vars and secrets into `process.env`.
 *
 * @param {Record<string, unknown>} env Worker bindings.
 */
const populateProcessEnv = (env) => {
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      process.env[key] = value;
    }
  }
};

/**
 * Run an Express/Vercel style handler and convert its result to a Response.
 *
 * @param {Function} handler The handler from `api/`.
 * @param {URL} url The request URL.
 * @returns {Promise<Response>} The response.
 */
const runHandler = async (handler, url) => {
  const headers = new Headers();
  let body = "";

  const req = { query: Object.fromEntries(url.searchParams) };
  const res = {
    /**
     * @param {string} name Header name.
     * @param {string} value Header value.
     */
    setHeader: (name, value) => {
      headers.set(name, String(value));
    },
    /**
     * @param {unknown} data Response body.
     */
    send: (data) => {
      body = typeof data === "string" ? data : JSON.stringify(data);
    },
  };

  await handler(req, res);
  return new Response(body, { headers });
};

export default {
  /**
   * @param {Request} request The incoming request.
   * @param {Record<string, unknown>} env Worker bindings.
   * @param {ExecutionContext} ctx Execution context.
   * @returns {Promise<Response>} The response.
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/") {
      return Response.redirect(REDIRECT_URL, 307);
    }

    const load = routes[path];
    if (!load || request.method !== "GET") {
      return new Response("Not Found", { status: 404 });
    }

    const cacheable = !path.startsWith("/api/status");
    // @ts-ignore
    const cache = caches.default;
    if (cacheable) {
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }
    }

    populateProcessEnv(env);
    const { default: handler } = await load();
    const response = await runHandler(handler, url);

    if (cacheable) {
      ctx.waitUntil(cache.put(request, response.clone()).catch(() => {}));
    }
    return response;
  },
};
