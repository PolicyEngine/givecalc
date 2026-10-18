import { useState } from "react";
import {
  NOT_A_TIPPED_OCCUPATION,
  TIPPED_OCCUPATIONS,
  getAdults,
  updatePerson,
  type USPersonDraft,
} from "policyengine-household-wizard/us-household";
import { formatCurrency } from "../../lib/format";
import { householdIncome, type PledgeIncomeField } from "../../lib/household";
import type { FormState } from "../../lib/types";
import type { FieldErrors } from "../InputForm";
import { NumberField, SelectField } from "./fields";

const OTHER_INCOME: ReadonlyArray<{
  field: Exclude<PledgeIncomeField, "employmentIncome" | "tipIncome">;
  label: string;
  allowNegative?: boolean;
}> = [
  {
    field: "selfEmploymentIncome",
    label: "Self-employment income (negative for a loss)",
    allowNegative: true,
  },
  { field: "taxableInterestIncome", label: "Taxable interest" },
  { field: "dividendIncome", label: "Qualified dividends" },
  { field: "nonQualifiedDividendIncome", label: "Other ordinary dividends" },
  {
    field: "shortTermCapitalGains",
    label: "Short-term capital gains (negative for a loss)",
    allowNegative: true,
  },
  {
    field: "longTermCapitalGains",
    label: "Long-term capital gains (negative for a loss)",
    allowNegative: true,
  },
];

const CATEGORIES = [...new Set(TIPPED_OCCUPATIONS.map((o) => o.category))];

function hasOtherIncome(person: USPersonDraft): boolean {
  return (
    Boolean(person.tipIncome) || OTHER_INCOME.some(({ field }) => Boolean(person[field]))
  );
}

interface PersonIncomeProps {
  form: FormState;
  setForm: (form: FormState) => void;
  person: USPersonDraft;
  /** Shown only for a couple, where it says whose income this is. */
  legend?: string;
  errors: FieldErrors;
  /** The household-wide income error goes on the first adult's wages. */
  incomeError?: string;
}

function PersonIncome({
  form,
  setForm,
  person,
  legend,
  errors,
  incomeError,
}: PersonIncomeProps) {
  const [userOpen, setOpen] = useState(() => hasOtherIncome(person));
  const set = (changes: Partial<USPersonDraft>) =>
    setForm({
      ...form,
      household: updatePerson(form.household, person.id, changes),
    });
  const index = form.household.people.findIndex((p) => p.id === person.id);
  const error = (field: string) => errors[`people[${index}].${field}`];
  // A problem in the extra incomes opens them, so its field is visible,
  // and they stay open once it is fixed, so the field keeps focus.
  const hasExtraError = Object.keys(errors).some(
    (path) => path.startsWith(`people[${index}].`) && !path.endsWith(".employmentIncome"),
  );
  if (hasExtraError && !userOpen) setOpen(true);
  const open = userOpen || hasExtraError;
  const prefix = `${person.id}-`;
  const fields = (
    <>
      <NumberField
        id={`${prefix}wages`}
        label="Wages and salaries, not counting tips"
        value={person.employmentIncome}
        onChange={(employmentIncome) => set({ employmentIncome })}
        error={error("employmentIncome") ?? incomeError}
        money
        step={1000}
      />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center justify-between w-full text-left text-sm text-gray-600 hover:text-gray-900"
      >
        <span>Tips, self-employment and investment income</span>
        <span aria-hidden className="text-gray-400">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="space-y-3 pl-3 border-l-2 border-gray-100">
          <NumberField
            id={`${prefix}tips`}
            label="Tips"
            value={person.tipIncome}
            // The occupation is asked only with tips, so it goes with them.
            onChange={(tipIncome) =>
              set(
                tipIncome
                  ? { tipIncome }
                  : { tipIncome, tippedOccupationCode: undefined },
              )
            }
            error={error("tipIncome")}
            money
            hint="Tips you received as an employee. If you're self-employed, include tips in self-employment income; GiveCalc doesn't apply the tip deduction to those."
          />
          {Boolean(person.tipIncome) && (
            <SelectField
              id={`${prefix}occupation`}
              label="Occupation you received tips in"
              value={
                person.tippedOccupationCode === undefined
                  ? ""
                  : String(person.tippedOccupationCode)
              }
              onChange={(code) =>
                set({ tippedOccupationCode: code === "" ? undefined : Number(code) })
              }
              error={error("tippedOccupationCode")}
              hint="From 2025 to 2028, tips in occupations on the Treasury's list can be deducted."
            >
              <option value="">Select an occupation...</option>
              <option value={NOT_A_TIPPED_OCCUPATION}>Not on the list</option>
              {CATEGORIES.map((category) => (
                <optgroup key={category} label={category}>
                  {TIPPED_OCCUPATIONS.filter((o) => o.category === category).map(
                    (occupation) => (
                      <option key={occupation.code} value={occupation.code}>
                        {occupation.label}
                      </option>
                    ),
                  )}
                </optgroup>
              ))}
            </SelectField>
          )}
          {OTHER_INCOME.map(({ field, label, allowNegative }) => (
            <NumberField
              key={field}
              id={`${prefix}${field}`}
              label={label}
              value={person[field]}
              onChange={(value) => set({ [field]: value })}
              money
              allowNegative={allowNegative}
              error={error(field)}
            />
          ))}
        </div>
      )}
    </>
  );
  return legend ? (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-gray-900 mb-2">{legend}</legend>
      {fields}
    </fieldset>
  ) : (
    <div className="space-y-3">{fields}</div>
  );
}

interface Props {
  form: FormState;
  setForm: (form: FormState) => void;
  errors: FieldErrors;
}

export default function IncomeStep({ form, setForm, errors }: Props) {
  const [head, spouse] = getAdults(form.household);
  const total = householdIncome(form.household);
  return (
    <div className="space-y-6">
      {head && (
        <PersonIncome
          form={form}
          setForm={setForm}
          person={head}
          legend={spouse ? "You" : undefined}
          errors={errors}
          incomeError={errors.income}
        />
      )}
      {spouse && (
        <PersonIncome
          form={form}
          setForm={setForm}
          person={spouse}
          legend="Your spouse"
          errors={errors}
        />
      )}
      <p className="text-sm text-gray-600">
        Household income for {form.household.year}: {formatCurrency(total)}
      </p>
    </div>
  );
}
