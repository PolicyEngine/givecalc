/**
 * The API's Python tests run on tests/fixtures/wizard_households.json. This
 * checks the file is what the wizard builds today; if it fails after a
 * wizard update, run `bun run fixtures` and rerun the Python tests.
 */

import { describe, it, expect } from "vitest";
import committed from "../../../../tests/fixtures/wizard_households.json";
import { fixtureRequests } from "../../../scripts/write-wizard-fixtures";

describe("shared household fixtures", () => {
  it("match what the wizard builds", () => {
    expect(fixtureRequests()).toEqual(committed);
  });
});
