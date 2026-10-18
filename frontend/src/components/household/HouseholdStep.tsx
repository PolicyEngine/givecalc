import {
  addPerson,
  applyMaritalStatusChange,
  getAdults,
  getCountiesByState,
  getDependents,
  removePerson,
  updatePerson,
  type USHouseholdDraft,
  type USPersonDraft,
} from "policyengine-household-wizard/us-household";
import { COUNTY_REQUIRED_STATES, orderPeople } from "../../lib/household";
import type { FormState, StateInfo } from "../../lib/types";
import type { FieldErrors } from "../InputForm";
import { Choice, NumberField, SelectField } from "./fields";

const MAX_DEPENDENTS = 10;

// Where PolicyEngine US taxes income by county. Elsewhere a blank county
// adds no local income tax.
const COUNTY_HINTS: Record<string, string> = {
  NY: "New York City residents: pick your borough's county. Manhattan is New York County, Brooklyn is Kings County and Staten Island is Richmond County.",
  MD: "Maryland's local income tax rate depends on your county.",
  IN: "Indiana's county income tax rate depends on your county.",
  OR: "Multnomah County residents pay its Preschool for All income tax.",
  KY: "Jefferson County (Louisville) and Fayette County (Lexington) charge occupational license taxes on earnings.",
};
const DEFAULT_COUNTY_HINT = "Leave blank unless your county has its own income tax.";

const SET_ASIDE = "givecalcFormerSpouse";

/**
 * Marital status, keeping a removed spouse's answers. Choosing "Single" sets
 * the spouse aside in the draft's `extras`, which the wizard's adapters
 * ignore, so choosing "Married" again (or an arrow key passing over
 * "Single") restores their age and income.
 */
function changeMaritalStatus(
  draft: USHouseholdDraft,
  status: "single" | "married",
): USHouseholdDraft {
  const { [SET_ASIDE]: setAside, ...extras } = draft.extras ?? {};
  const spouse = getAdults(draft)[1];
  if (status === "single" && spouse) {
    return {
      ...applyMaritalStatusChange(draft, status),
      extras: { ...extras, [SET_ASIDE]: spouse },
    };
  }
  if (status === "married" && setAside && getAdults(draft).length === 1) {
    return {
      ...draft,
      maritalStatus: "married",
      people: [...draft.people, setAside as USPersonDraft],
      extras,
    };
  }
  return applyMaritalStatusChange(draft, status);
}

interface Props {
  form: FormState;
  setForm: (form: FormState) => void;
  states: StateInfo[];
  errors: FieldErrors;
}

export default function HouseholdStep({ form, setForm, states, errors }: Props) {
  const draft = form.household;
  const setDraft = (household: USHouseholdDraft) =>
    setForm({ ...form, household: orderPeople(household) });
  const [head, spouse] = getAdults(draft);
  const dependents = getDependents(draft);
  const state = draft.state ?? "";
  const counties = getCountiesByState(draft.state);
  const countyRequired = COUNTY_REQUIRED_STATES.has(state);
  const ageError = (personId: string) =>
    errors[`people[${draft.people.findIndex((p) => p.id === personId)}].age`];

  return (
    <div className="space-y-5">
      <SelectField
        id="state"
        label="State"
        value={state}
        error={errors.state}
        onChange={(next) =>
          setDraft({
            ...draft,
            state: next || null,
            // A county belongs to one state.
            county: next === draft.state ? draft.county : null,
          })
        }
      >
        <option value="">Select a state...</option>
        {states.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </SelectField>

      {counties.length > 0 && (
        <SelectField
          id="county"
          label={countyRequired ? "County" : "County (optional)"}
          value={draft.county ?? ""}
          error={errors.county}
          onChange={(county) => setDraft({ ...draft, county: county || null })}
          hint={COUNTY_HINTS[state] ?? DEFAULT_COUNTY_HINT}
        >
          <option value="">{countyRequired ? "Select a county..." : "Not specified"}</option>
          {counties.map((county) => (
            <option key={county.code} value={county.code}>
              {county.name}
            </option>
          ))}
        </SelectField>
      )}

      <Choice
        label="Marital status"
        value={draft.maritalStatus}
        error={errors.maritalStatus}
        options={[
          { value: "single", title: "Single" },
          { value: "married", title: "Married" },
        ]}
        onChange={(status) => setDraft(changeMaritalStatus(draft, status))}
      />

      <div className="grid grid-cols-2 gap-3">
        {head && (
          <NumberField
            id="age-you"
            label="Your age"
            value={head.age}
            error={ageError(head.id)}
            onChange={(age) =>
              setDraft(updatePerson(draft, head.id, { age: age ?? null }))
            }
            max={120}
          />
        )}
        {spouse && (
          <NumberField
            id="age-spouse"
            label="Your spouse's age"
            value={spouse.age}
            error={ageError(spouse.id)}
            onChange={(age) =>
              setDraft(updatePerson(draft, spouse.id, { age: age ?? null }))
            }
            max={120}
          />
        )}
      </div>

      <div>
        <p id="dependents-label" className="block text-sm font-medium text-gray-700 mb-1">
          Children and other dependents
        </p>
        <div
          role="group"
          aria-labelledby="dependents-label"
          aria-describedby="dependents-hint"
          className="flex items-center gap-3"
        >
          <button
            type="button"
            onClick={() =>
              setDraft(removePerson(draft, dependents[dependents.length - 1].id))
            }
            disabled={dependents.length === 0}
            aria-label="Remove a dependent"
            className="w-9 h-9 rounded-md border border-gray-300 text-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            −
          </button>
          <output aria-live="polite" className="min-w-6 text-center text-base font-medium">
            {dependents.length}
          </output>
          <button
            type="button"
            onClick={() => setDraft(addPerson(draft, "dependent"))}
            disabled={dependents.length >= MAX_DEPENDENTS}
            aria-label="Add a dependent"
            className="w-9 h-9 rounded-md border border-gray-300 text-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            +
          </button>
        </div>
        <p id="dependents-hint" className="text-xs text-gray-500 mt-1">
          People you claim on your tax return.
        </p>
      </div>
      {dependents.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {dependents.map((dependent, index) => (
            <NumberField
              key={dependent.id}
              id={`age-${dependent.id}`}
              label={`Age of dependent ${index + 1}`}
              value={dependent.age}
              error={ageError(dependent.id)}
              onChange={(age) =>
                setDraft(updatePerson(draft, dependent.id, { age: age ?? null }))
              }
              max={120}
            />
          ))}
        </div>
      )}
    </div>
  );
}
