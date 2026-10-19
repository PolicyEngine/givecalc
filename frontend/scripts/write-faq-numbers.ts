/**
 * Run the FAQ's example households through the GiveCalc API and write the
 * answers to src/lib/faqNumbers.json, which the FAQ reads:
 *
 *   bun run faq-numbers                      # the production API
 *   GIVECALC_API_URL=http://localhost:8000 bun run faq-numbers
 *
 * Each request is the one the calculator sends for that household
 * (src/lib/faqCases.ts). The file records the API and the model versions
 * modal_app.py pins, which the production API runs once main deploys.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toCalculateRequest } from "../src/lib/household";
import {
  UK_FAQ_CASES,
  US_BUNCHING_CASES,
  US_FAQ_CASES,
  type UKFaqCase,
  type USFaqCase,
} from "../src/lib/faqCases";

const PRODUCTION_API = "https://policyengine--givecalc-fastapi-app.modal.run";
const api = process.env.GIVECALC_API_URL || PRODUCTION_API;
// api.ts reads its URL when it loads.
process.env.NEXT_PUBLIC_API_URL = api;
const { calculateSavings, calculateUKSavings, ukApiRequest } = await import(
  "../src/lib/api"
);

function pinnedVersion(name: string): string {
  const modalApp = readFileSync(
    fileURLToPath(new URL("../../modal_app.py", import.meta.url)),
    "utf8",
  );
  const match = new RegExp(`"${name}==([^"]+)"`).exec(modalApp);
  if (!match) throw new Error(`modal_app.py does not pin ${name}`);
  return match[1];
}

// A cold API container takes about a minute; wake it before timing out.
await fetch(`${api}/api/health`, { signal: AbortSignal.timeout(300_000) });

const us: Record<string, unknown> = {};
for (const name of Object.keys(US_FAQ_CASES) as USFaqCase[]) {
  const request = {
    ...toCalculateRequest(US_FAQ_CASES[name]),
    ...(US_BUNCHING_CASES.has(name) ? { bunching: true } : {}),
  };
  const response = await calculateSavings(request);
  us[name] = { request, response };
  console.log(`${name}: ${JSON.stringify(response)}`);
}

const uk: Record<string, unknown> = {};
for (const name of Object.keys(UK_FAQ_CASES) as UKFaqCase[]) {
  const request = ukApiRequest(UK_FAQ_CASES[name]);
  const response = await calculateUKSavings(request);
  uk[name] = { request, response };
  console.log(`${name}: ${JSON.stringify(response)}`);
}

const out = fileURLToPath(new URL("../src/lib/faqNumbers.json", import.meta.url));
const numbers = {
  api,
  generated: new Date().toISOString().slice(0, 10),
  models: {
    "policyengine-us": pinnedVersion("policyengine-us"),
    "policyengine-uk": pinnedVersion("policyengine-uk"),
  },
  us,
  uk,
};
writeFileSync(out, `${JSON.stringify(numbers, null, 2)}\n`);
console.log(`Wrote ${out}`);
