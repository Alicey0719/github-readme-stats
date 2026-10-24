// @ts-check

/**
 * @file Replacement for the Node.js "module" built-in on Cloudflare Workers.
 *
 * @description Some cards load `languageColors.json` through
 * `createRequire(import.meta.url)`, which the Workers bundler cannot follow.
 * `wrangler.jsonc` aliases "module" to this file so the JSON is bundled
 * without touching the upstream sources.
 */

import languageColors from "../src/common/languageColors.json";

/**
 * Minimal `createRequire` that only resolves `languageColors.json`.
 *
 * @returns {(id: string) => any} The require function.
 */
const createRequire = () => (id) => {
  if (id.endsWith("languageColors.json")) {
    return languageColors;
  }
  throw new Error(`Cannot require "${id}" on Cloudflare Workers`);
};

export { createRequire };
export default { createRequire };
