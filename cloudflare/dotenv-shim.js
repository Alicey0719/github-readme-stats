// @ts-check

/**
 * @file No-op replacement for "dotenv" on Cloudflare Workers, where vars and
 * secrets come from the Worker bindings instead of a `.env` file.
 */

const config = () => ({ parsed: {} });

export { config };
export default { config };
