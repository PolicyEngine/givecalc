/**
 * US input form, built on policyengine-household-wizard's primitives and its
 * US household draft. One question per step; the last step reviews every
 * answer and calculates.
 */

import { useEffect, useMemo, useState } from "react";
import {
  WizardNavigation,
  WizardProgress,
  useWizardStepFocus,
  useWizardSteps,
  type WizardStepConfig,
} from "policyengine-household-wizard/primitives";
import {
  STEP_IDS,
  firstIncompleteStep,
  issuesByStep,
  type Issue,
  type StepId,
} from "../lib/household";
import type { FormState, StateInfo } from "../lib/types";
import GiftStep from "./household/GiftStep";
import HomeStep from "./household/HomeStep";
import HouseholdStep from "./household/HouseholdStep";
import IncomeStep from "./household/IncomeStep";
import ReviewStep from "./household/ReviewStep";

interface Props {
  formState: FormState;
  setFormState: (state: FormState) => void;
  states: StateInfo[];
  onCalculate: () => void;
  isCalculating: boolean;
  /**
   * True when a shared link filled the form. It opens on the first question
   * the link left unanswered, or on the review.
   */
  prefilled?: boolean;
}

/** Field errors by path, for the step being shown. */
export type FieldErrors = Readonly<Record<string, string>>;

const QUESTIONS: Record<StepId, string> = {
  gift: "Your gift",
  household: "Your household",
  income: "Your income",
  home: "Your home",
  review: "Review and calculate",
};

const STEPS: ReadonlyArray<WizardStepConfig<FormState>> = STEP_IDS.map((id) => ({
  id,
  label: QUESTIONS[id],
  isComplete:
    id === "review"
      ? undefined
      : (form: FormState) => issuesByStep(form)[id].errors.length === 0,
}));

export default function InputForm({
  formState,
  setFormState,
  states,
  onCalculate,
  isCalculating,
  prefilled = false,
}: Props) {
  // Focus follows the steps only once the user moves between them, so the
  // page does not jump to the form when it loads.
  const [moved, setMoved] = useState(false);
  const [initialStepId] = useState<StepId>(() =>
    prefilled ? (firstIncompleteStep(formState) ?? "review") : "gift",
  );
  const wizard = useWizardSteps({
    steps: STEPS,
    state: formState,
    initialStepId,
    onComplete: onCalculate,
    onStepChange: () => setMoved(true),
  });
  const step = (wizard.currentStep?.id ?? "gift") as StepId;
  const issues = useMemo(() => issuesByStep(formState), [formState]);
  const { validationStepId, clearValidation } = wizard;
  // Once the step's problems are all fixed, stop showing them: otherwise
  // clearing a field to retype it would bring the summary back and move
  // focus to it mid-word.
  useEffect(() => {
    if (validationStepId === step && issues[step].errors.length === 0) {
      clearValidation();
    }
  }, [validationStepId, clearValidation, step, issues]);
  const showErrors =
    validationStepId === step && issues[step].errors.length > 0;
  // The summary lists what was wrong when Continue was pressed, and changes
  // only on the next attempt, so screen readers announce it once.
  const [summary, setSummary] = useState<{ attempt: number; errors: Issue[] }>({
    attempt: -1,
    errors: [],
  });
  if (summary.attempt !== wizard.validationAttempt) {
    setSummary({ attempt: wizard.validationAttempt, errors: issues[step].errors });
  }
  const fieldErrors: FieldErrors = showErrors
    ? Object.fromEntries(
        issues[step].errors.map((issue) => [issue.path, issue.message]),
      )
    : {};
  const { headingRef, errorRef } = useWizardStepFocus({
    stepId: moved ? (wizard.currentStep?.id ?? null) : null,
    hasError: showErrors,
    errorRevision: wizard.validationAttempt,
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        if (isCalculating) event.preventDefault();
        else wizard.handleSubmit(event);
      }}
      onKeyDown={(event) => {
        // Focus lands on the step's heading, which is not a field, so Enter
        // there would do nothing; on the review it calculates.
        if (event.key === "Enter" && event.target === headingRef.current) {
          event.preventDefault();
          if (!isCalculating) wizard.advance();
          return;
        }
        wizard.handleKeyDown(event);
      }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-5"
      aria-label="Household and gift"
    >
      {/* Lets Enter in a text or number field submit the step (browsers do
          not submit on Enter in a select); the visible buttons are the
          wizard's navigation. */}
      <button type="submit" tabIndex={-1} aria-hidden className="sr-only">
        Continue
      </button>
      <WizardProgress
        aria-label="Form progress"
        totalSteps={wizard.totalSteps}
        currentStepIndex={wizard.currentStepIndex}
        currentStepLabel={wizard.currentStep?.label}
      />
      <h2
        ref={headingRef}
        tabIndex={-1}
        // Clears the sticky PolicyEngine header when focus scrolls to it.
        className="text-lg font-semibold text-gray-900 focus:outline-none scroll-mt-24"
      >
        {QUESTIONS[step]}
      </h2>

      {showErrors && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 scroll-mt-24"
        >
          <ul className="list-disc pl-4 space-y-1">
            {summary.errors.map((issue) => (
              <li key={`${issue.path}:${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}
      {issues[step].warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
          {issues[step].warnings.map((issue) => issue.message).join(" ")}
        </div>
      )}

      {step === "gift" && (
        <GiftStep form={formState} setForm={setFormState} errors={fieldErrors} />
      )}
      {step === "household" && (
        <HouseholdStep
          form={formState}
          setForm={setFormState}
          states={states}
          errors={fieldErrors}
        />
      )}
      {step === "income" && (
        <IncomeStep form={formState} setForm={setFormState} errors={fieldErrors} />
      )}
      {step === "home" && (
        <HomeStep form={formState} setForm={setFormState} errors={fieldErrors} />
      )}
      {step === "review" && (
        <ReviewStep form={formState} onEdit={(id) => wizard.goToStep(id)} />
      )}

      <WizardNavigation
        canAdvance
        isFirstStep={wizard.isFirstStep}
        isLastStep={wizard.isLastStep}
        onBack={wizard.goBack}
        onContinue={wizard.advance}
        onSubmit={wizard.advance}
        submitLabel="Calculate tax impact"
        busy={isCalculating}
        busyLabel="Calculating…"
      />
    </form>
  );
}
