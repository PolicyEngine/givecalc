/**
 * The API's Python tests run on tests/fixtures/wizard_households.json. This
 * checks the file is what the wizard builds today; if it fails after a
 * wizard update, run `bun run fixtures` and rerun the Python tests.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { fixtureRequests } from "../../../scripts/write-wizard-fixtures";

// Read at run time rather than imported: Vercel deploys leave out tests/,
// and the production build type-checks this file. Under jsdom,
// import.meta.url is not a file URL, so the path comes from __dirname.
const FIXTURES = resolve(__dirname, "../../../../tests/fixtures/wizard_households.json");

describe("shared household fixtures", () => {
  it("match what the wizard builds", () => {
    const committed: unknown = JSON.parse(readFileSync(FIXTURES, "utf8"));
    expect(fixtureRequests()).toEqual(committed);
  });
});
