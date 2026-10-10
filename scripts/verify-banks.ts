import { mixedOpamItems, OPAM_COUNTS, OPAM_TOTAL, forcedItems, opamBank, selfItems, situationItems } from "../client/src/data/opamBank";
import { mixedOpamItems as mixedOpamItems2, OPAM_COUNTS as OPAM_COUNTS2, OPAM_TOTAL as OPAM_TOTAL2, forcedItems as forcedItems2, opamBank as opamBank2, selfItems as selfItems2, situationItems as situationItems2 } from "../client/src/data/opamBank2";
import { CSSS_SECTION_COUNTS, CSSS_TOTAL, csssBank } from "../client/src/data/csssBank";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
};
const unique = (values: string[]) => new Set(values).size === values.length;

assert(OPAM_COUNTS.self === 60, `OPAM self-description bank has ${OPAM_COUNTS.self} items`);
assert(OPAM_COUNTS.forced === 35, `OPAM forced-choice bank has ${OPAM_COUNTS.forced} items`);
assert(OPAM_COUNTS.situation === 25, `OPAM situation bank has ${OPAM_COUNTS.situation} items`);
assert(OPAM_TOTAL === 120 && opamBank.length === 120, `OPAM total is ${OPAM_TOTAL}`);
assert(unique(opamBank.map((item) => item.id)), "OPAM ids are unique");
assert(unique(selfItems.map((item) => item.text)), "OPAM self statements are unique");
assert(unique(situationItems.map((item) => item.text)), "OPAM situation prompts are unique");
assert(situationItems.every((item) => item.options.length === 4 && item.best >= 0 && item.best < 4), "OPAM situations have four options and valid best indexes");
assert(new Set(situationItems.map((item) => item.best)).size > 1, "OPAM responsible options are shuffled");
assert(forcedItems.every((item) => item.left !== item.right && item.leftOlq !== item.rightOlq), "OPAM forced pairs are distinct and cross-tagged");
assert(mixedOpamItems.length === OPAM_TOTAL, "OPAM mixed sequence preserves all 120 items");
assert((mixedOpamItems.filter((item) => item.type === "self").length === OPAM_COUNTS.self) && (mixedOpamItems.filter((item) => item.type === "forced").length === OPAM_COUNTS.forced) && (mixedOpamItems.filter((item) => item.type === "situation").length === OPAM_COUNTS.situation), "OPAM mixed sequence preserves type distribution");
assert(mixedOpamItems.slice(0, -1).filter((item, index) => item.type === mixedOpamItems[index + 1].type).length < 20, "OPAM mixed sequence avoids repetitive type runs");
assert(CSSS_TOTAL === 70 && csssBank.length === 70, `CSSS total is ${CSSS_TOTAL}`);
assert(CSSS_SECTION_COUNTS.memory === 15 && CSSS_SECTION_COUNTS.spatial === 15 && CSSS_SECTION_COUNTS.pattern === 15 && CSSS_SECTION_COUNTS.language === 15 && CSSS_SECTION_COUNTS.audio === 10, "CSSS section split is 15/15/15/15/10");
assert(unique(csssBank.map((item) => item.id)), "CSSS ids are unique");
assert(unique(csssBank.map((item) => item.prompt)), "CSSS prompts are unique");
assert(csssBank.every((item) => item.options.length === 4 && item.answer >= 0 && item.answer < 4 && item.explanation.length > 10), "CSSS items have four options, valid answers, and explanations");
assert(!csssBank.some((item) => item.prompt.includes("CTO[A]")), "CSSS coding typo is removed");
assert(new Set(csssBank.map((item) => item.subtype)).size >= 12, "CSSS uses a broad range of relevant question subtypes");

// --- Bank B ---
assert(OPAM_COUNTS2.self === 60, `OPAM Bank B self-description bank has ${OPAM_COUNTS2.self} items`);
assert(OPAM_COUNTS2.forced === 35, `OPAM Bank B forced-choice bank has ${OPAM_COUNTS2.forced} items`);
assert(OPAM_COUNTS2.situation === 25, `OPAM Bank B situation bank has ${OPAM_COUNTS2.situation} items`);
assert(OPAM_TOTAL2 === 120 && opamBank2.length === 120, `OPAM Bank B total is ${OPAM_TOTAL2}`);
assert(unique(opamBank2.map((item) => item.id)), "OPAM Bank B ids are unique");
assert(unique(selfItems2.map((item) => item.text)), "OPAM Bank B self statements are unique");
assert(unique(situationItems2.map((item) => item.text)), "OPAM Bank B situation prompts are unique");
assert(situationItems2.every((item) => item.options.length === 4 && item.best >= 0 && item.best < 4), "OPAM Bank B situations have four options and valid best indexes");
assert(new Set(situationItems2.map((item) => item.best)).size > 1, "OPAM Bank B responsible options are shuffled");
assert(forcedItems2.every((item) => item.left !== item.right && item.leftOlq !== item.rightOlq), "OPAM Bank B forced pairs are distinct and cross-tagged");
assert(mixedOpamItems2.length === OPAM_TOTAL2, "OPAM Bank B mixed sequence preserves all 120 items");
assert((mixedOpamItems2.filter((item) => item.type === "self").length === OPAM_COUNTS2.self) && (mixedOpamItems2.filter((item) => item.type === "forced").length === OPAM_COUNTS2.forced) && (mixedOpamItems2.filter((item) => item.type === "situation").length === OPAM_COUNTS2.situation), "OPAM Bank B mixed sequence preserves type distribution");
assert(mixedOpamItems2.slice(0, -1).filter((item, index) => item.type === mixedOpamItems2[index + 1].type).length < 20, "OPAM Bank B mixed sequence avoids repetitive type runs");

console.log("PASS content audit complete");
