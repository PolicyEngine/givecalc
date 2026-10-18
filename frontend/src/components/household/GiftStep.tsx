import { formatCurrency } from "../../lib/format";
import { giftAmount, householdIncome } from "../../lib/household";
import { TAX_YEAR_OPTIONS, type FormState } from "../../lib/types";
import type { FieldErrors } from "../InputForm";
import { Choice, NumberField, SelectField } from "./fields";

interface Props {
  form: FormState;
  setForm: (form: FormState) => void;
  errors: FieldErrors;
}

export default function GiftStep({ form, setForm, errors }: Props) {
  const gift = giftAmount(form);
  const hasIncome = householdIncome(form.household) > 0;
  return (
    <div className="space-y-4">
      <Choice
        label="How do you describe your gift?"
        value={form.mode}
        options={[
          { value: "amount", title: "Specific amount" },
          {
            value: "pledge",
            title: "Share of income",
            description: "A percentage of what you earn",
          },
        ]}
        onChange={(mode) => setForm({ ...form, mode })}
      />
      {form.mode === "pledge" ? (
        <NumberField
          id="pledge-percent"
          label="What share of your income do you give?"
          value={form.pledge_percent || undefined}
          onChange={(value) =>
            setForm({
              ...form,
              pledge_percent: Math.max(0, Math.min(100, value ?? 0)),
            })
          }
          min={0}
          max={100}
          suffix="%"
          error={errors.gift}
          hint={
            hasIncome
              ? `${formatCurrency(gift)} on the income you entered`
              : "You'll enter your income in step 3."
          }
        />
      ) : (
        <NumberField
          id="donation-amount"
          label="How much do you plan to give?"
          value={form.donation_amount || undefined}
          onChange={(value) =>
            setForm({ ...form, donation_amount: Math.max(0, value ?? 0) })
          }
          money
          error={errors.gift}
        />
      )}
      <SelectField
        id="tax-year"
        label="Year you give"
        value={String(form.household.year)}
        onChange={(value) =>
          setForm({
            ...form,
            household: { ...form.household, year: Number(value) },
          })
        }
        hint="Gifts count in the tax year you make them."
      >
        {TAX_YEAR_OPTIONS.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </SelectField>
    </div>
  );
}
