/**
 * Hardcoded tax program data for instant UI load (avoids Cloud Run cold start)
 */

import type { TaxProgramsResponse } from "./types";

const FEDERAL_INFO = {
  title: "Federal Charitable Deduction",
  description:
    "The federal charitable deduction allows you to deduct charitable contributions from your taxable income if you itemize deductions on your tax return. The deduction is limited to 60% of your adjusted gross income for cash donations.",
};

const STATE_PROGRAMS: Record<string, { title: string; description: string }> = {
  AZ: {
    title: "Arizona Charitable Contributions Credit",
    description:
      "Arizona offers a dollar-for-dollar tax credit for contributions to Qualifying Charitable Organizations. Single filers can claim up to $400 ($500 if donating to foster care organizations), and married filing jointly can claim up to $800 ($1,000).",
  },
  MS: {
    title: "Mississippi Foster Care Charitable Tax Credit",
    description:
      "Mississippi provides a tax credit for donations to eligible charitable organizations that provide foster care, adoption, and services to children in foster care. The credit is dollar-for-dollar up to $500 for single filers and $1,000 for joint filers.",
  },
  VT: {
    title: "Vermont Charitable Contributions Credit",
    description:
      "Vermont offers a tax credit of 5% of the first $20,000 in eligible charitable contributions when claiming the federal charitable contribution deduction.",
  },
  CO: {
    title: "Colorado Charitable Contribution Subtraction",
    description:
      "Colorado allows taxpayers to subtract charitable contributions over $500 from their state taxable income when they claim the federal standard deduction.",
  },
  NH: {
    title: "New Hampshire Education Tax Credit",
    description:
      "New Hampshire provides a tax credit of up to 85% of contributions made to approved scholarship organizations. This credit can be used against business profits tax, business enterprise tax, or interest and dividends tax.",
  },
  AL: {
    title: "Alabama Itemized Deduction",
    description: "Alabama matches the federal itemized deduction amount.",
  },
  AR: {
    title: "Arkansas Itemized Deduction Match",
    description: "Arkansas matches the federal itemized deduction amount.",
  },
  CA: {
    title: "California Itemized Deduction Match",
    description: "California matches the federal itemized deduction amount.",
  },
  DC: {
    title: "DC Itemized Deduction Match",
    description: "DC matches the federal itemized deduction amount.",
  },
  DE: {
    title: "Delaware Itemized Deduction Match",
    description: "Delaware matches the federal itemized deduction amount.",
  },
  GA: {
    title: "Georgia Itemized Deduction Match",
    description: "Georgia matches the federal itemized deduction amount.",
  },
  HI: {
    title: "Hawaii Itemized Deduction Match",
    description: "Hawaii matches the federal itemized deduction amount.",
  },
  IA: {
    title: "Iowa Itemized Deduction Match",
    description: "Iowa matches the federal itemized deduction amount.",
  },
  ID: {
    title: "Idaho Itemized Deduction Match",
    description: "Idaho matches the federal itemized deduction amount.",
  },
  KS: {
    title: "Kansas Itemized Deduction Match",
    description: "Kansas matches the federal itemized deduction amount.",
  },
  KY: {
    title: "Kentucky Itemized Deduction Match",
    description: "Kentucky matches the federal itemized deduction amount.",
  },
  MD: {
    title: "Maryland Itemized Deduction Match",
    description: "Maryland matches the federal itemized deduction amount.",
  },
  ME: {
    title: "Maine Itemized Deduction Match",
    description: "Maine matches the federal itemized deduction amount.",
  },
  MN: {
    title: "Minnesota Reduced Itemized Deductions",
    description:
      "Minnesota reduces the federal itemized deduction amount by 3% for income over $220k and by 10% for income over $300k.",
  },
  MO: {
    title: "Missouri Itemized Deduction Match",
    description: "Missouri matches the federal itemized deduction amount.",
  },
  MT: {
    title: "Montana Itemized Deduction Match",
    description: "Montana matches the federal itemized deduction amount.",
  },
  NC: {
    title: "North Carolina Itemized Deduction Match",
    description: "North Carolina matches the federal itemized deduction amount.",
  },
  ND: {
    title: "North Dakota Itemized Deduction Match",
    description: "North Dakota matches the federal itemized deduction amount.",
  },
  NE: {
    title: "Nebraska Itemized Deduction Match",
    description: "Nebraska matches the federal itemized deduction amount.",
  },
  NM: {
    title: "New Mexico Itemized Deduction Match",
    description:
      "New Mexico matches the federal itemized deduction amount and is reduced by the standard deduction amount.",
  },
  NY: {
    title: "New York Itemized Deduction Match",
    description: "New York matches the federal itemized deduction amount.",
  },
  OR: {
    title: "Oregon Itemized Deduction Match",
    description: "Oregon matches the federal itemized deduction amount.",
  },
  VA: {
    title: "Virginia Reduced Itemized Deductions",
    description:
      "Virginia applies a reduced federal itemized deductions for income over $368,900 if jointly or qualifying widow(er)/qualifying surviving spouse, $338,150 if head of household, $307,400 if single, or $184,450.",
  },
  SD: {
    title: "South Dakota Deduction",
    description:
      "South Dakota does not provide a state specific deduction amount for charitable contributions.",
  },
  AK: {
    title: "Alaska Deduction",
    description:
      "Alaska does not provide a state specific deduction amount for charitable contributions.",
  },
  FL: {
    title: "Florida Deduction",
    description:
      "Florida does not provide a state specific deduction amount for charitable contributions.",
  },
  IL: {
    title: "Illinois Deduction",
    description:
      "Illinois does not provide a state specific deduction amount for charitable contributions.",
  },
  IN: {
    title: "Indiana Deduction",
    description:
      "Indiana does not provide a state specific deduction amount for charitable contributions.",
  },
  LA: {
    title: "Louisiana Deduction",
    description:
      "Louisiana does not provide a state specific deduction amount for charitable contributions.",
  },
  MA: {
    title: "Massachusetts Deduction",
    description:
      "Massachusetts does not provide a state specific deduction amount for charitable contributions.",
  },
  MI: {
    title: "Michigan Deduction",
    description:
      "Michigan does not provide a state specific deduction amount for charitable contributions.",
  },
  NV: {
    title: "Nevada Deduction",
    description:
      "Nevada does not provide a state specific deduction amount for charitable contributions.",
  },
  NJ: {
    title: "New Jersey Deduction",
    description:
      "New Jersey does not provide a state specific deduction amount for charitable contributions.",
  },
  OH: {
    title: "Ohio Deduction",
    description:
      "Ohio does not provide a state specific deduction amount for charitable contributions.",
  },
  OK: {
    title: "Oklahoma Deduction",
    description:
      "Oklahoma does not provide a state specific deduction amount for charitable contributions.",
  },
  PA: {
    title: "Pennsylvania Deduction",
    description:
      "Pennsylvania does not provide a state specific deduction amount for charitable contributions.",
  },
  SC: {
    title: "South Carolina Deduction",
    description:
      "South Carolina does not provide a state specific deduction amount for charitable contributions.",
  },
  TN: {
    title: "Tennessee Deduction",
    description:
      "Tennessee does not provide a state specific deduction amount for charitable contributions.",
  },
  TX: {
    title: "Texas Deduction",
    description:
      "Texas does not provide a state specific deduction amount for charitable contributions.",
  },
  UT: {
    title: "Utah Deduction",
    description:
      "Utah does not provide a state specific deduction amount for charitable contributions.",
  },
  WV: {
    title: "West Virginia Deduction",
    description:
      "West Virginia does not provide a state specific deduction amount for charitable contributions.",
  },
  WY: {
    title: "Wyoming Deduction",
    description:
      "Wyoming does not provide a state specific deduction amount for charitable contributions.",
  },
  RI: {
    title: "Rhode Island Deduction",
    description:
      "Rhode Island does not provide a state specific deduction amount for charitable contributions.",
  },
  WI: {
    title: "Wisconsin Deduction",
    description:
      "Wisconsin does not provide a state specific deduction amount for charitable contributions.",
  },
  WA: {
    title: "Washington Deduction",
    description:
      "Washington does not provide a state specific deduction amount for charitable contributions.",
  },
  CT: {
    title: "Connecticut Deduction",
    description:
      "Connecticut does not provide a state specific deduction amount for charitable contributions.",
  },
};

export function getTaxProgramsData(stateCode: string): TaxProgramsResponse {
  const stateProgram = STATE_PROGRAMS[stateCode];
  return {
    federal: FEDERAL_INFO,
    state: stateProgram || null,
  };
}
