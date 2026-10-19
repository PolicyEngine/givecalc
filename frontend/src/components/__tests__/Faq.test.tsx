/**
 * The FAQ: what it renders, and that its numbers are the API's.
 *
 * The figures come from faqNumbers.json, written from production API runs
 * by `bun run faq-numbers`; lib/__tests__/faqNumbers.test.ts checks that
 * file describes the households the answers name.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import Faq from "../faq/Faq";
import { FAQ_ITEMS, exampleHref } from "../faq/questions";
import { costHeadline } from "../Results";
import { US_FAQ_CASES } from "../../lib/faqCases";
import numbers from "../../lib/faqNumbers.json";
import { toSearchParams } from "../../lib/urlState";

function renderFaq() {
  render(<Faq />);
  return screen.getByRole("region", { name: "Questions" });
}

/** The answer text under a question, read from the DOM. */
function answer(question: string): string {
  const summary = screen.getByText(question).closest("summary");
  const details = summary?.parentElement;
  if (!details) throw new Error(`No question "${question}"`);
  return (details.textContent ?? "").slice(question.length);
}

describe("FAQ", () => {
  it("renders every question as a closed disclosure", () => {
    const region = renderFaq();
    const disclosures = region.querySelectorAll("details");
    expect(disclosures).toHaveLength(FAQ_ITEMS.length);
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(6);
    expect(FAQ_ITEMS.length).toBeLessThanOrEqual(9);
    disclosures.forEach((details, index) => {
      expect(details.open).toBe(false);
      const summary = details.querySelector("summary");
      expect(summary?.textContent).toBe(FAQ_ITEMS[index].question);
    });
  });

  it("opens an answer when its question is activated", async () => {
    renderFaq();
    const question = "How does the bunching check work?";
    const details = screen.getByText(question).closest("details");
    expect(details?.open).toBe(false);
    await userEvent.click(screen.getByText(question));
    expect(details?.open).toBe(true);
  });

  it("has unique ids for its questions", () => {
    const ids = FAQ_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses sentence case, no emoji and no pledge wording", () => {
    const region = renderFaq();
    const text = region.textContent ?? "";
    expect(text).not.toMatch(/pledge/i);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    // Words after the first that may be capitalized: names and quoted labels.
    const proper = new Set(["GiveCalc", "Gift", "Aid", "Share"]);
    for (const { question } of FAQ_ITEMS) {
      const words = question.replace(/[^\p{L}\d\s-]/gu, "").split(/\s+/);
      expect(words[0][0]).toMatch(/\p{Lu}|\d/u);
      for (const word of words.slice(1)) {
        if (!proper.has(word)) expect(word, question).not.toMatch(/^\p{Lu}/u);
      }
    }
  });

  it("quotes the API's California figures", () => {
    renderFaq();
    expect(answer("Why did my gift save little or nothing?")).toContain(
      "A single 30-year-old in California earning $75,000 saves $220 by giving $1,000 in 2026, and the same $220 by giving $5,000. In 2025, the $1,000 gift saved nothing.",
    );
    expect(numbers.us.california.response.tax_savings).toBe(220);
    expect(numbers.us.californiaLarger.response.tax_savings).toBe(220);
    expect(numbers.us.california2025.response.tax_savings).toBe(0);
  });

  it("quotes the API's top-bracket figures", () => {
    renderFaq();
    const text = answer("What changed for 2026?");
    expect(text).toContain(
      "Giving $110,000 in 2026 saves $3,500 more than giving $100,000: 35 cents for each extra dollar.",
    );
    const extra =
      numbers.us.texasMore.response.tax_savings -
      numbers.us.texas.response.tax_savings;
    expect(Math.round(extra)).toBe(3_500);
    expect(Math.round((100 * extra) / 10_000)).toBe(35);
  });

  it("quotes the API's bunching figures", () => {
    renderFaq();
    expect(answer("How does the bunching check work?")).toContain(
      "Giving $30,000 in 2026 and nothing in 2027 saves $2,820 more in tax than giving $15,000 in each year.",
    );
    expect(Math.round(numbers.us.newYork.response.bunching.bunching_gain)).toBe(
      2_820,
    );
  });

  it("quotes the API's Gift Aid figures, as the results card does", () => {
    renderFaq();
    const text = answer("How does Gift Aid work in GiveCalc?");
    expect(text).toContain(
      "25p for every £1, so a £1,000 gift gives the charity £1,250.",
    );
    expect(text).toContain(
      "earning £70,000 who gives £1,000 in 2026/27 saves £250. One earning £35,000 saves nothing",
    );
    expect(numbers.uk.higherRate.response.tax_savings).toBe(250);
    expect(numbers.uk.basicRate.response.tax_savings).toBe(0);
    // The charity's £1,250 is the figure the results headline gives.
    const { headline } = costHeadline(
      { ...numbers.uk.higherRate.response, donation_amount: 1_000 },
      "GBP",
      2026,
    );
    expect(headline).toContain("worth £1,250 to a charity");
  });

  it("quotes the rules it states", () => {
    renderFaq();
    const text = answer("What changed for 2026?");
    expect(text).toContain("up to $1,000 of cash gifts, or $2,000 on a joint return");
    expect(text).toContain("above 0.5% of their adjusted gross income");
    expect(text).toContain("top 37% bracket give up 2/37 of their itemized deductions");
    expect(answer("How does Gift Aid work in GiveCalc?")).toContain(
      "tapers the personal allowance above £100,000",
    );
  });

  it("links each US example to the calculator while it offers the year", () => {
    const region = renderFaq();
    // Links show only while the calculator offers the example's year.
    const links = within(region).queryAllByRole("link", { name: /example/ });
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^\?amount=\d+&income=\d+&state=[A-Z]{2}&/);
    }
    const form = US_FAQ_CASES.california;
    expect(exampleHref(form, [2025, 2026, 2027])).toBe(`?${toSearchParams(form)}`);
    expect(exampleHref(form, [2027, 2028, 2029])).toBeNull();
  });

  it("links to the public code", () => {
    const region = renderFaq();
    const hrefs = within(region)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "https://github.com/PolicyEngine/givecalc",
        "https://github.com/PolicyEngine/policyengine-us",
        "https://github.com/PolicyEngine/policyengine-uk",
      ]),
    );
  });
});
