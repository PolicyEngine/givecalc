/**
 * The FAQ's questions and answers. Every figure comes from faqFigures.ts:
 * results from API runs of the households in faqCases.ts, and rules that
 * tests/test_faq_numbers.py checks against the PolicyEngine parameters.
 */

import type { ReactNode } from "react";
import { bunchingSentence } from "../Results";
import { FAQ_FIGURES, FAQ_RULES } from "../../lib/faqFigures";
import { US_FAQ_CASES } from "../../lib/faqCases";
import { formatCurrency, formatPercent } from "../../lib/format";
import { TAX_YEAR_OPTIONS, type FormState } from "../../lib/types";
import { toSearchParams } from "../../lib/urlState";

export interface FaqItem {
  id: string;
  question: string;
  answer: ReactNode;
}

const usd = (value: number) => formatCurrency(value);
const gbp = (value: number) => formatCurrency(value, "GBP");

/** A link that opens the example in the calculator, while it offers its year. */
export function exampleHref(
  form: FormState,
  offeredYears: readonly number[] = TAX_YEAR_OPTIONS,
): string | null {
  return offeredYears.includes(form.household.year)
    ? `?${toSearchParams(form)}`
    : null;
}

function ExampleLink({ form, place }: { form: FormState; place: string }) {
  const href = exampleHref(form);
  if (!href) return null;
  return (
    <>
      {" "}
      <a href={href} className="text-primary-600 hover:text-primary-700 underline">
        Open the {place} example
      </a>
    </>
  );
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary-600 hover:text-primary-700 underline"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

const { california, newYork, texas, giftAid } = FAQ_FIGURES;
const { us, uk } = FAQ_RULES;
const singleCap = usd(us.non_itemizer_cap.single);
const jointCap = usd(us.non_itemizer_cap.joint);
const limit = `${us.top_bracket_limit.numerator}/${us.top_bracket_limit.denominator}`;
const centsPerExtraDollar = Math.round(
  (100 * texas.extraSavings) / (texas.largerGift - texas.gift),
);
const toCharity = giftAid.gift / (1 - uk.basic_rate);
const pencePerPound = Math.round((100 * uk.basic_rate) / (1 - uk.basic_rate));
const ukTaxYear = `${giftAid.year}/${giftAid.year + 1 - 2000}`;

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "what",
    question: "What does GiveCalc calculate?",
    answer: (
      <>
        <p>
          GiveCalc estimates what a cash gift to charity costs you after tax.
          It runs PolicyEngine&apos;s model of your household twice, without
          the gift and with it, and reports how much the gift lowers your net
          taxes: your taxes minus any benefits you receive.
        </p>
        <p>
          In the US, GiveCalc counts federal and state taxes, and the local
          income taxes PolicyEngine models, such as New York City&apos;s. In
          the UK, it applies Gift Aid to your income tax. The charts show how your
          net taxes change with gifts from nothing up to your income.
        </p>
      </>
    ),
  },
  {
    id: "little-or-nothing",
    question: "Why did my gift save little or nothing?",
    answer: (
      <>
        <p>
          In the US, a gift lowers your federal income tax only through the
          part you can deduct. If you take the standard deduction, you can
          deduct up to {singleCap} of cash gifts from {us.year}, or {jointCap}{" "}
          on a joint return; in {california.earlierYear} you could deduct
          nothing. Above that, a larger gift lowers your federal income tax
          only once itemizing, gift included, would lower it more than the
          standard deduction does. Some states, such as California, let you
          itemize on the state return either way, so a larger gift can still
          lower your state tax.
        </p>
        <p>
          A single 30-year-old in California earning {usd(california.wages)}{" "}
          saves {usd(california.savings)} by giving {usd(california.gift)} in{" "}
          {california.year}, and the same{" "}
          {usd(california.largerGiftSavings)} by giving{" "}
          {usd(california.largerGift)}. In {california.earlierYear}, the{" "}
          {usd(california.gift)} gift saved{" "}
          {california.earlierYearSavings === 0
            ? "nothing"
            : usd(california.earlierYearSavings)}
          .
          <ExampleLink form={US_FAQ_CASES.california} place="California" />
        </p>
        <p>
          In the UK, a basic-rate taxpayer saves nothing: Gift Aid&apos;s
          basic-rate relief goes to the charity.
        </p>
      </>
    ),
  },
  {
    id: "2026",
    question: `What changed for ${us.year}?`,
    answer: (
      <>
        <p>
          Three federal rules took effect in {us.year}, and GiveCalc applies
          all three.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Filers who take the standard deduction can deduct up to{" "}
            {singleCap} of cash gifts, or {jointCap}{" "}
            on a joint return.
          </li>
          <li>
            Itemizers deduct only the part of their gifts above{" "}
            {formatPercent(us.itemizer_floor_share_of_agi, 1)} of their
            adjusted gross income.
          </li>
          <li>
            Filers whose income before itemized deductions reaches the top{" "}
            {formatPercent(us.top_bracket_rate, 0)} bracket give up {limit} of
            their itemized deductions, up to {limit} of their income in that
            bracket.
          </li>
        </ul>
        <p>
          Take a single 30-year-old earning {usd(texas.wages)} in Texas,
          which has no state income tax. Giving {usd(texas.largerGift)} in{" "}
          {texas.year} saves {usd(texas.extraSavings)} more than giving{" "}
          {usd(texas.gift)}: {centsPerExtraDollar} cents for each extra
          dollar.
          <ExampleLink form={US_FAQ_CASES.texasMore} place="Texas" />
        </p>
      </>
    ),
  },
  {
    id: "share-of-income",
    question: "What does “Share of income” do?",
    answer: (
      <p>
        In the US calculator, choose &ldquo;Share of income&rdquo; in the first
        step and enter a percentage, such as 10%. GiveCalc then works out the
        gift from the income you enter in step 3: everyone&apos;s wages, tips,
        self-employment income, interest, dividends and capital gains, minus
        any losses. The UK calculator asks for an amount.
      </p>
    ),
  },
  {
    id: "bunching",
    question: "How does the bunching check work?",
    answer: (
      <>
        <p>
          After a US result, GiveCalc checks whether giving two years&apos;
          gifts at once would save more tax. It compares giving your gift in
          the year you chose and again the next year with giving twice the
          gift in the first year and nothing in the second. It keeps your
          household and income the same in the second year, with everyone a
          year older, and applies that year&apos;s tax rules.
        </p>
        <p>
          Bunching can lower your taxes when you itemize in the year you give
          and take the standard deduction in the year you skip. Take a single
          30-year-old earning {usd(newYork.wages)} who lives in New York,
          outside New York City.{" "}
          {bunchingSentence(newYork.bunching, newYork.gift, newYork.year)}
          <ExampleLink form={US_FAQ_CASES.newYork} place="New York" />
        </p>
        <p>
          For a gift in the latest year GiveCalc offers, pick an earlier year
          to run the check.
        </p>
      </>
    ),
  },
  {
    id: "gift-aid",
    question: "How does Gift Aid work in GiveCalc?",
    answer: (
      <>
        <p>
          With Gift Aid, a charity claims the basic-rate tax on your gift:{" "}
          {pencePerPound}p for every &pound;1, so a {gbp(giftAid.gift)} gift
          gives the charity {gbp(toCharity)}. Taxpayers above the basic rate
          also save income tax: the difference between their rate and the
          basic rate, on as much of that {gbp(toCharity)} as they pay their
          higher rate on. GiveCalc shows that saving as your tax relief.
        </p>
        <p>
          A donor in England, Wales or Northern Ireland earning{" "}
          {gbp(giftAid.higherRateIncome)} who gives {gbp(giftAid.gift)} in{" "}
          {ukTaxYear} saves {gbp(giftAid.higherRateSavings)}. One earning{" "}
          {gbp(giftAid.basicRateIncome)} saves{" "}
          {giftAid.basicRateSavings === 0
            ? "nothing"
            : gbp(giftAid.basicRateSavings)}
          , because the basic-rate relief goes to the charity.
        </p>
        <p>
          GiveCalc uses Scottish rates for donors in Scotland, where relief
          starts at the {formatPercent(uk.scottish_intermediate_rate, 0)}{" "}
          intermediate rate. Gift Aid also
          lowers the income that tapers the personal allowance above{" "}
          {gbp(uk.personal_allowance_taper_start)} and sets the High Income
          Child Benefit Charge, and GiveCalc counts both effects.
        </p>
      </>
    ),
  },
  {
    id: "leaves-out",
    question: "What does GiveCalc leave out?",
    answer: (
      <>
        <p>
          GiveCalc models cash gifts and assumes each one qualifies for the
          relief it applies. It leaves out:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>gifts of shares, property and goods;</li>
          <li>
            state tax credits that depend on which charity you give to, such
            as Arizona&apos;s and Mississippi&apos;s;
          </li>
          <li>countries other than the US and the UK.</li>
        </ul>
        <p>
          GiveCalc treats each US gift as cash to a public charity. Gifts to
          donor-advised funds can&apos;t use the deduction for filers
          who don&apos;t itemize, and GiveCalc doesn&apos;t tell them apart.
          Use its estimates to plan, and ask a tax professional about your
          own return.
        </p>
      </>
    ),
  },
  {
    id: "stored",
    question: "Is my information stored?",
    answer: (
      <>
        <p>
          GiveCalc asks for no name, email address or account. To calculate,
          your browser sends the household you enter to GiveCalc&apos;s
          server, which runs the model and sends back the result. GiveCalc&apos;s
          code saves none of it to a database or file. The server&apos;s log
          records each request&apos;s type, such as a savings calculation,
          whether it worked and how long it took, without the household.
        </p>
        <p>
          Each server keeps recent households and their results in memory to
          answer repeat questions faster, and drops them when it needs the room or shuts
          down.
        </p>
        <p>
          When a link can reproduce a US calculation, GiveCalc puts your
          inputs in the page&apos;s address so you can share it. Your
          browser&apos;s history keeps that address, and opening it sends the
          inputs to the site&apos;s host, as any web address does.
        </p>
      </>
    ),
  },
  {
    id: "model",
    question: "Where does the model come from?",
    answer: (
      <p>
        GiveCalc runs PolicyEngine&apos;s open-source models of taxes and
        benefits,{" "}
        <Link href="https://github.com/PolicyEngine/policyengine-us">
          policyengine-us
        </Link>{" "}
        and{" "}
        <Link href="https://github.com/PolicyEngine/policyengine-uk">
          policyengine-uk
        </Link>
        . PolicyEngine is a nonprofit that provides free, open source software
        to compute the impact of public policy. It publishes the code for{" "}
        <Link href="https://github.com/PolicyEngine/givecalc">GiveCalc</Link>{" "}
        and both models on GitHub.
      </p>
    ),
  },
];
