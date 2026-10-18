/**
 * Write each shared fixture form's API request to
 * tests/fixtures/wizard_households.json, for the Python tests:
 *
 *   bun run fixtures
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { FIXTURE_FORMS } from "../src/lib/__fixtures__/forms";
import { toCalculateRequest } from "../src/lib/household";

export function fixtureRequests() {
  return FIXTURE_FORMS.map(({ name, form, legacy }) => ({
    name,
    request: toCalculateRequest(form),
    ...(legacy ? { legacy: { ...legacy, year: form.household.year } } : {}),
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = fileURLToPath(
    new URL("../../tests/fixtures/wizard_households.json", import.meta.url),
  );
  writeFileSync(out, `${JSON.stringify(fixtureRequests(), null, 2)}\n`);
  console.log(`Wrote ${FIXTURE_FORMS.length} households to ${out}`);
}
