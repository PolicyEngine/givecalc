/**
 * Questions and answers below the calculator. Each answer opens in place,
 * with native <details> elements, so keyboards and screen readers get a
 * disclosure button for every question.
 */

import { FAQ_ITEMS } from "./questions";

export const FAQ_HEADING_ID = "questions";

export default function Faq() {
  return (
    <section
      aria-labelledby={FAQ_HEADING_ID}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <h2
        id={FAQ_HEADING_ID}
        // Clears the sticky PolicyEngine header when a link jumps here.
        className="text-lg font-semibold text-gray-900 scroll-mt-24"
      >
        Questions
      </h2>
      <div className="mt-2 divide-y divide-gray-100">
        {FAQ_ITEMS.map(({ id, question, answer }) => (
          <details key={id} id={`faq-${id}`} className="group py-1 scroll-mt-24">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-3 text-left font-medium text-gray-900 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 [&::-webkit-details-marker]:hidden">
              <span>{question}</span>
              <svg
                aria-hidden="true"
                className="h-5 w-5 flex-shrink-0 text-gray-500 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="pb-4 space-y-3 text-sm leading-relaxed text-gray-600">
              {answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
