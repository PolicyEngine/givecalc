import { updatePerson } from "policyengine-household-wizard/us-household";
import { firstAdult } from "../../lib/household";
import type { FormState } from "../../lib/types";
import type { FieldErrors } from "../InputForm";
import { Choice, NumberField } from "./fields";

interface Props {
  form: FormState;
  setForm: (form: FormState) => void;
  errors: FieldErrors;
}

/**
 * Home costs, asked once for the household and kept on the first adult.
 * Federal deductions add up the tax unit's amounts, so for them who holds the
 * costs does not matter. A few state rules read a person's own real estate
 * taxes (Montana caps them per person, and some state property tax credits
 * read the owner's), so for a couple there those results can differ.
 */
export default function HomeStep({ form, setForm, errors }: Props) {
  const holder = firstAdult(form.household);
  if (!holder) return null;
  const index = form.household.people.indexOf(holder);
  const set = (changes: Parameters<typeof updatePerson>[2]) =>
    setForm({
      ...form,
      household: updatePerson(form.household, holder.id, changes),
    });
  return (
    <div className="space-y-4">
      <Choice
        label="Do you have a mortgage or pay property tax?"
        error={errors.hasHomeCosts}
        value={
          form.hasHomeCosts === null ? null : form.hasHomeCosts ? "yes" : "no"
        }
        options={[
          { value: "yes", title: "Yes" },
          { value: "no", title: "No" },
        ]}
        // "No" keeps any amounts entered, so going back to "Yes" (or an
        // arrow key passing over "No") loses nothing; the request leaves them
        // out while the answer is "No".
        onChange={(answer) => setForm({ ...form, hasHomeCosts: answer === "yes" })}
      />
      {form.hasHomeCosts && (
        <>
          <NumberField
            id="mortgage-interest"
            label={`Mortgage interest paid in ${form.household.year}`}
            value={holder.mortgageInterest}
            onChange={(mortgageInterest) => set({ mortgageInterest })}
            error={errors[`people[${index}].mortgageInterest`]}
            money
            hint="Your lender's Form 1098 shows it."
          />
          <NumberField
            id="property-tax"
            label={`Property tax paid in ${form.household.year}`}
            value={holder.realEstateTaxes}
            onChange={(realEstateTaxes) => set({ realEstateTaxes })}
            error={errors[`people[${index}].realEstateTaxes`]}
            money
          />
        </>
      )}
    </div>
  );
}
