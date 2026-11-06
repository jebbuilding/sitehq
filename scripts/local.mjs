// Local run of SiteHQ on its own backend: the page for our own hosting (the app behind src/platform/aws-adapter.js)
// with the API, the WebSocket and the files from server/, all in this one process. No AWS account is involved.
//   npm run local  →  http://localhost:4322/owner | /trade | /client     (PORT and HOST env vars override)
// Unlike `npm run dev`, the data is held by the server: it survives a reload, every tab and browser shares it, a
// change made in one shows up live in the others, and the access rules are enforced. It starts from the tests'
// made-up seed (scripts/seed.mjs) and is forgotten when the server stops. Synthetic data only.
// Sources are re-read on every page request: edit src/, reload the page.
//   /app is the page exactly as it is deployed (dist/web/index.html): it reads /config.json and shows the sign-in
//   screen (src/platform/sign-in.js). A stand-in for Cognito in this process (server/auth/local-cognito.mjs)
//   answers it; no email is sent – the code is printed in this terminal. Who can sign in: LOCAL_PEOPLE there.
import { fileURLToPath } from "node:url";
import { bundleApp, webPage } from "./bundle.mjs";
import { seedFiles, testSeed } from "./seed.mjs";
import { createLocalCognito, LOCAL_PEOPLE } from "../server/auth/local-cognito.mjs";
import { startLocal } from "../server/local.mjs";

// Which made-up person each address signs in as (server/auth/dev.mjs › SEED_USERS).
export const ROLE_USER = { owner: "owner", trade: "emp1", client: "u9" };

/** The page for one role: the web build, told to sign in as that role's made-up user. */
export function rolePage(role, onboarding) {
  let app = bundleApp();
  if (role === "trade" && !onboarding) { // as the crawl and `npm run dev` do: skip the "fill in your details" gate
    const gate = "function detailsDone(d) {\n  return !!(d && d.confirmedAt);\n}";
    if (!app.includes(gate)) throw new Error("local: cannot find detailsDone in the app – has it changed shape?");
    app = app.replace(gate, () => "function detailsDone(d){return true}");
  }
  const config = { api: "/api", ws: "/ws", devToken: "dev:" + ROLE_USER[role] };
  return webPage(app, "<script>window.SITEHQ_CONFIG=" + JSON.stringify(config) + "</script>\n");
}

/**
 * Start the local backend with the test seed, the role pages and the sign-in page. Resolves what
 * server/local.mjs › startLocal does; `cognito` on it is the Cognito stand-in (tests read the codes from it).
 * @param options.cognito  options for the stand-in (createLocalCognito): accessTokenSeconds, onCode, …
 */
export function startLocalSite({ port = 0, host, cognito: cognitoOptions } = {}) {
  const html = (status, body) => ({ status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, body });
  const cognito = createLocalCognito(cognitoOptions);
  // What the deploy writes beside the page (infra › PageConfig), plus where the stand-in for Cognito is.
  const config = { env: "local", region: cognito.region, api: "/api", ws: "/ws", userPoolId: cognito.userPoolId, userPoolClientId: cognito.clientId, cognitoEndpoint: "/cognito" };
  return startLocal({
    port, host, cognito,
    seed: testSeed(),
    files: seedFiles(bundleApp()),
    page({ path, query }) {
      if (path === "/") return { status: 302, headers: { location: "/owner" }, body: "" };
      if (path === "/config.json") return { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" }, body: JSON.stringify(config) };
      if (path === "/app") { try { return html(200, webPage()); } catch (e) { console.error(e.message); return { status: 500, headers: { "content-type": "text/plain; charset=utf-8" }, body: String(e.message) }; } }
      const role = path.slice(1);
      if (!Object.hasOwn(ROLE_USER, role)) return { status: 404, headers: { "content-type": "text/plain; charset=utf-8" }, body: "Not found. Try /owner, /trade, /client or /app" };
      try { return html(200, rolePage(role, query.has("onboarding"))); } catch (e) { console.error(e.message); return { status: 500, headers: { "content-type": "text/plain; charset=utf-8" }, body: String(e.message) }; }
    },
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST || "127.0.0.1";
  const local = await startLocalSite({ port: Number(process.env.PORT) || 4322, host, cognito: { onCode: (email, code) => console.log(`sign-in code for ${email}: ${code}`) } });
  const at = `http://${host === "0.0.0.0" || host === "127.0.0.1" ? "localhost" : host}:${local.port}`;
  console.log(`SiteHQ local (own backend in this process, synthetic data – kept until this server stops)\n  owner   ${at}/owner\n  trade   ${at}/trade   (${at}/trade?onboarding to see the details gate)\n  client  ${at}/client\nOpen two of them side by side: a change in one appears in the other.\n  sign-in ${at}/app   the page as deployed, with the sign-in screen. Sign in as ${Object.keys(LOCAL_PEOPLE).slice(0, 3).join(", ")};\n          no email is sent – the code is printed here.`);
}
