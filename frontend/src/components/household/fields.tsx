/**
 * Small inputs shared by the household steps. Each takes an optional `error`,
 * shown under the field and tied to it with aria-invalid and
 * aria-describedby.
 */

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { WizardOptionCard } from "policyengine-household-wizard/primitives";

const INPUT_CLASS =
  "w-full py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

function parse(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/** Hint and error ids for aria-describedby, and the elements to render. */
function useDescription(id: string, hint?: ReactNode, error?: string) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;
  const nodes = (
    <>
      {error && (
        <p id={errorId} className="text-xs text-red-700 mt-1">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-xs text-gray-500 mt-1">
          {hint}
        </p>
      )}
    </>
  );
  return { describedBy, nodes };
}

function borderClass(error?: string) {
  return error ? "border-red-400" : "border-gray-300";
}

interface NumberFieldProps {
  label: ReactNode;
  value: number | null | undefined;
  onChange: (value: number | undefined) => void;
  hint?: ReactNode;
  error?: string;
  /** Show a dollar sign; amounts are annual dollars. */
  money?: boolean;
  /** Capital gains can be negative; other amounts cannot. */
  allowNegative?: boolean;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  id?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  error,
  money = false,
  allowNegative = false,
  min,
  max,
  step,
  suffix,
  id,
}: NumberFieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const { describedBy, nodes } = useDescription(inputId, hint, error);
  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <div className="relative">
        {money && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            $
          </span>
        )}
        <input
          id={inputId}
          type="number"
          inputMode={allowNegative ? "text" : "numeric"}
          value={value ?? ""}
          onChange={(event) => onChange(parse(event.target.value))}
          min={min ?? (allowNegative ? undefined : 0)}
          max={max}
          step={step ?? (money ? 100 : 1)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT_CLASS} ${borderClass(error)} ${
            money ? "pl-7" : "pl-3"
          } ${suffix ? "pr-8" : "pr-3"}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {suffix}
          </span>
        )}
      </div>
      {nodes}
    </div>
  );
}

interface SelectFieldProps {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  hint?: ReactNode;
  error?: string;
  id?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  children,
  hint,
  error,
  id,
}: SelectFieldProps) {
  const generated = useId();
  const selectId = id ?? generated;
  const { describedBy, nodes } = useDescription(selectId, hint, error);
  return (
    <div>
      <label
        htmlFor={selectId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${INPUT_CLASS} ${borderClass(error)} px-3 bg-white`}
      >
        {children}
      </select>
      {nodes}
    </div>
  );
}

interface ChoiceProps<T extends string> {
  label: string;
  value: T | null;
  options: ReadonlyArray<{ value: T; title: string; description?: string }>;
  onChange: (value: T) => void;
  error?: string;
}

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

/**
 * A question answered by picking one card. Follows the ARIA radio group
 * pattern: one tab stop (the chosen card, or the first), and arrow keys move
 * to and choose the next or previous card.
 */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: ChoiceProps<T>) {
  const id = useId();
  const labelId = `${id}-label`;
  const { describedBy, nodes } = useDescription(id, undefined, error);
  const group = useRef<HTMLDivElement>(null);
  const selected = options.findIndex((option) => option.value === value);
  const tabStop = selected >= 0 ? selected : 0;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = NEXT_KEYS.has(event.key) ? 1 : PREVIOUS_KEYS.has(event.key) ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    group.current
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus();
  };

  return (
    <div>
      <p id={labelId} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </p>
      <div
        ref={group}
        role="radiogroup"
        aria-labelledby={labelId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="grid grid-cols-2 gap-2"
      >
        {options.map((option, index) => (
          <WizardOptionCard
            key={option.value}
            tabIndex={index === tabStop ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, index)}
            selected={value === option.value}
            title={option.title}
            description={option.description}
            onSelect={() => onChange(option.value)}
          />
        ))}
      </div>
      {nodes}
    </div>
  );
}
