import {
  WizardReviewList,
  type WizardReviewItem,
} from "policyengine-household-wizard/primitives";
import {
  getAdults,
  getCountyName,
  getDependents,
  getStateName,
  getTippedOccupation,
} from "policyengine-household-wizard/us-household";
import { formatCurrency } from "../../lib/format";
import {
  firstAdult,
  giftAmount,
  householdIncome,
  type StepId,
} from "../../lib/household";
import type { FormState } from "../../lib/types";

interface Props {
  form: FormState;
  onEdit: (step: StepId) => void;
}

function list(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Every answer, each with a button back to its question. */
export function reviewItems(
  form: FormState,
  onEdit: (step: StepId) => void,
): WizardReviewItem[] {
  const draft = form.household;
  const [head, spouse] = getAdults(draft);
  const dependents = getDependents(draft);
  const holder = firstAdult(draft);
  const gift = giftAmount(form);
  const tipped = getAdults(draft).filter((person) => person.tipIncome);
  const homeCosts = (form.hasHomeCosts === false ? [] : [
    holder?.mortgageInterest
      ? `${formatCurrency(holder.mortgageInterest)} mortgage interest`
      : null,
    holder?.realEstateTaxes
      ? `${formatCurrency(holder.realEstateTaxes)} property tax`
      : null,
  ]).filter((part): part is string => part !== null);

  const items: Array<WizardReviewItem & { step: StepId }> = [
    {
      id: "gift",
      step: "gift",
      label: "Gift",
      value:
        form.mode === "pledge"
          ? `${form.pledge_percent}% of income (${formatCurrency(gift)})`
          : formatCurrency(form.donation_amount),
    },
    { id: "year", step: "gift", label: "Tax year", value: String(draft.year) },
    {
      id: "location",
      step: "household",
      label: "Where you live",
      value: [getCountyName(draft.county), getStateName(draft.state)]
        .filter(Boolean)
        .join(", "),
      missing: !draft.state,
    },
    {
      id: "marital",
      step: "household",
      label: "Marital status",
      value: draft.maritalStatus === "married" ? "Married" : draft.maritalStatus === "single" ? "Single" : "",
      missing: !draft.maritalStatus,
    },
    {
      id: "ages",
      step: "household",
      label: spouse ? "Ages" : "Age",
      value: [head, spouse]
        .filter(Boolean)
        .map((person) => (person?.age ?? "?").toString())
        .join(" and "),
    },
    {
      id: "dependents",
      step: "household",
      label: "Dependents",
      value:
        dependents.length === 0
          ? "None"
          : `${dependents.length}, aged ${list(dependents.map((d) => String(d.age ?? "?")))}`,
    },
    {
      id: "income",
      step: "income",
      label: "Household income",
      value: formatCurrency(householdIncome(draft)),
    },
    ...tipped.map((person) => {
      const occupation =
        person.tippedOccupationCode === undefined
          ? "occupation not given"
          : person.tippedOccupationCode === 0
            ? "not a listed occupation"
            : getTippedOccupation(person.tippedOccupationCode)?.label ?? "";
      return {
        id: `tips-${person.id}`,
        step: "income" as const,
        label: person === head ? "Your tips" : "Your spouse's tips",
        value: `${formatCurrency(person.tipIncome ?? 0)}, ${occupation.toLowerCase()}`,
      };
    }),
    {
      id: "home",
      step: "home",
      label: "Home costs",
      value:
        homeCosts.length > 0
          ? list(homeCosts)
          : form.hasHomeCosts === false
            ? "None"
            : form.hasHomeCosts
              ? "None entered"
              : "",
      missing: form.hasHomeCosts === null,
    },
  ];
  return items.map(({ step, ...item }) => ({ ...item, onEdit: () => onEdit(step) }));
}

export default function ReviewStep({ form, onEdit }: Props) {
  return <WizardReviewList items={reviewItems(form, onEdit)} />;
}
