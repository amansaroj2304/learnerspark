import { csssBank, type CsssQuestion } from "../csssBank";
import { csssSet2 } from "./set2";
import { csssSet3 } from "./set3";

export type CsssSet = { id: number; title: string; questions: CsssQuestion[]; minutes: number };

export const csssSets: CsssSet[] = [
  { id: 1, title: "CSSS 1", questions: csssBank, minutes: 10 },
  { id: 2, title: "CSSS 2", questions: csssSet2, minutes: 10 },
  { id: 3, title: "CSSS 3", questions: csssSet3, minutes: 10 },
];
