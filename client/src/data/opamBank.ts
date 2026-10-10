export type OpamPart = "self" | "forced" | "situation";
export type OlqCode = "ORG" | "REA" | "OOA" | "PEX" | "SAD" | "COO" | "SOR" | "INI" | "SCO" | "SDE" | "INF" | "LIV" | "DET" | "COUR" | "STA";

export type OpamSelfItem = { id: string; type: "self"; trait: string; olq: OlqCode; text: string; keyed: "positive" | "negative"; pairId: string | null; socialDesirabilityFlag: boolean };
export type OpamForcedItem = { id: string; type: "forced"; pairKey: string; left: string; right: string; leftOlq: OlqCode; rightOlq: OlqCode };
export type OpamSituationOption = { text: string; style: "responsible" | "avoidant" | "impulsive" | "dependent"; olq: OlqCode };
export type OpamSituationItem = { id: string; type: "situation"; text: string; options: string[]; optionMeta: OpamSituationOption[]; best: number };
export type OpamItem = OpamSelfItem | OpamForcedItem | OpamSituationItem;

export type OpamSelfSeed = [OlqCode, string, [string, string, string, string]];
export type OpamForcedSeed = [string, string, string, OlqCode, OlqCode];
export type OpamSituationSeed = { text: string; options: OpamSituationOption[]; best: number };
export type OpamSetContent = { olqs: OpamSelfSeed[]; forcedSeeds: OpamForcedSeed[]; situationSeeds: OpamSituationSeed[] };
export type OpamSet = {
  selfItems: OpamSelfItem[];
  forcedItems: OpamForcedItem[];
  situationItems: OpamSituationItem[];
  opamBank: OpamItem[];
  mixedOpamItems: OpamItem[];
  counts: { self: number; forced: number; situation: number };
  total: number;
};

/**
 * Builds a complete OPAM personality set from raw seed content. The run order is
 * mixed so candidates repeatedly switch between self-description, forced-choice
 * trade-offs, and practical situation reactions.
 */
export function buildOpamSet(content: OpamSetContent, setTag = ""): OpamSet {
  const selfItems: OpamSelfItem[] = content.olqs.flatMap(([olq, trait, texts], groupIndex) =>
    texts.map((text, itemIndex) => ({
      id: `OP${setTag}1-${String(groupIndex * 4 + itemIndex + 1).padStart(3, "0")}`,
      type: "self",
      trait,
      olq,
      text,
      keyed: itemIndex === 2 && groupIndex % 3 === 0 ? "negative" : "positive",
      pairId: groupIndex < 5 ? `P${groupIndex + 1}` : null,
      socialDesirabilityFlag: itemIndex === 3 && ["SOR", "COUR", "STA"].includes(olq),
    })),
  );

  const forcedItems: OpamForcedItem[] = content.forcedSeeds.map(([pairKey, left, right, leftOlq, rightOlq], index) => ({
    id: `OP${setTag}2-${String(index + 1).padStart(3, "0")}`,
    type: "forced",
    pairKey,
    left,
    right,
    leftOlq,
    rightOlq,
  }));

  const situationItems: OpamSituationItem[] = content.situationSeeds.map((seed, index) => {
    const shift = index % seed.options.length;
    const optionMeta = seed.options.map((_, position) => seed.options[(position + shift) % seed.options.length]);
    return {
      id: `OP${setTag}3-${String(index + 1).padStart(3, "0")}`,
      type: "situation",
      text: seed.text,
      options: optionMeta.map((option) => option.text),
      optionMeta,
      best: (seed.best + seed.options.length - shift) % seed.options.length,
    };
  });

  const opamBank: OpamItem[] = [...selfItems, ...forcedItems, ...situationItems];
  const total = opamBank.length;
  const counts = { self: selfItems.length, forced: forcedItems.length, situation: situationItems.length };

  const mixedOpamItems: OpamItem[] = (() => {
    const pools: Record<OpamItem["type"], OpamItem[]> = { self: [...selfItems], forced: [...forcedItems], situation: [...situationItems] };
    const totals: Record<OpamItem["type"], number> = { self: selfItems.length, forced: forcedItems.length, situation: situationItems.length };
    const used: Record<OpamItem["type"], number> = { self: 0, forced: 0, situation: 0 };
    const sequence: OpamItem[] = [];
    let previous: OpamItem["type"] | null = null;
    while (sequence.length < total) {
      const available = (Object.keys(pools) as OpamItem["type"][]).filter((type) => pools[type].length > 0 && type !== previous);
      const nextType = available.sort((left, right) => used[left] / totals[left] - used[right] / totals[right])[0] ?? (Object.keys(pools) as OpamItem["type"][]).find((type) => pools[type].length > 0);
      if (!nextType) break;
      sequence.push(pools[nextType].shift() as OpamItem);
      used[nextType] += 1;
      previous = nextType;
    }
    return sequence;
  })();

  return { selfItems, forcedItems, situationItems, opamBank, mixedOpamItems, counts, total };
}

const olqs: Array<[OlqCode, string, [string, string, string, string]]> = [
  ["ORG", "Planning & organising", ["I break a large task into clear steps before starting.", "I keep the materials for a shared task where others can find them.", "I check which detail must be done first when time is short.", "I leave room in a plan for a change in conditions."]],
  ["REA", "Reasoning ability", ["I separate what I know from what I am assuming.", "I compare two explanations before choosing one.", "I change my view when a better reason appears.", "I look for the rule behind a problem instead of copying a solution."]],
  ["OOA", "Organising ability", ["I clarify who owns each part of a group task.", "I keep track of small details that can affect a deadline.", "I arrange work so one person is not waiting unnecessarily.", "I can bring order to a messy shared assignment."]],
  ["PEX", "Power of expression", ["I explain a difficult point in words the listener can follow.", "I give a short, clear update when work is incomplete.", "I ask directly when an instruction is too vague to use.", "I can disagree without making the other person feel dismissed."]],
  ["SAD", "Social adaptability", ["I adjust my approach when a group has a different working style.", "I can cooperate with someone whose habits differ from mine.", "I notice when a quieter person may have a useful point.", "I can join an unfamiliar group without trying to control it."]],
  ["COO", "Cooperation", ["I support a group decision after my own idea is not selected.", "I share useful information instead of keeping it to look important.", "I give another person credit for work they contributed.", "I keep a disagreement focused on the task rather than the person."]],
  ["SOR", "Sense of responsibility", ["If my mistake affects others, I name it and help repair it.", "I check how my part of a task affects people who depend on it.", "I ask for help before a preventable delay becomes someone else’s problem.", "I review work before handing it over."]],
  ["INI", "Initiative", ["I can start a useful task without waiting for a perfect plan.", "If a discussion drifts, I suggest a practical next step.", "I volunteer for a clear responsibility when a group needs help.", "I test a reasonable first idea instead of waiting indefinitely."]],
  ["SCO", "Self-confidence", ["I share a useful point even when it is not perfectly worded.", "I can ask a question in a group when I do not understand.", "I recover reasonably quickly after a public mistake.", "I trust myself to learn a task through a careful first attempt."]],
  ["SDE", "Speed of decision", ["I can choose a safe next step when information is incomplete.", "I do not need every option before making a reversible decision.", "I decide what matters most when two tasks compete for time.", "I can close a decision once the important facts are known."]],
  ["INF", "Ability to influence the group", ["I can move a discussion forward without trying to dominate it.", "I connect a suggestion to the group’s shared objective.", "I help people see a practical reason to try a proposal.", "I can summarise different views and suggest common ground."]],
  ["LIV", "Liveliness", ["I bring steady energy to a group without forcing attention onto myself.", "I can keep a long practice session from becoming flat and careless.", "I respond warmly when a new person joins a group.", "I use light humour carefully when it helps people reset."]],
  ["DET", "Determination", ["I keep working on a routine task after the interesting part is over.", "I return to a goal after a day when my energy was poor.", "A difficult first attempt makes me look for a better method.", "I practise a weak area steadily instead of waiting for motivation."]],
  ["COUR", "Courage", ["I raise a concern when staying silent could affect the group.", "I can try an unfamiliar task after checking the main risk.", "I admit uncertainty instead of pretending to know.", "I can accept respectful disagreement without retreating from a useful point."]],
  ["STA", "Stamina", ["I keep my attention steady through a repetitive session.", "I manage energy so my work does not collapse late in the day.", "I can continue careful decisions after an early setback.", "I maintain effort without needing constant encouragement."]],
];

const forcedSeeds: Array<[string, string, string, OlqCode, OlqCode]> = [
  ["F01", "I make a clear plan before beginning.", "I adapt quickly once I begin.", "ORG", "SAD"], ["F02", "I ask a useful question when a group is stuck.", "I offer a practical first move when a group is stuck.", "PEX", "INI"], ["F03", "I protect details that affect others.", "I take the lead when details are unclear.", "SOR", "INF"], ["F04", "I resolve tension early.", "I preserve momentum and return to tension later.", "COO", "DET"], ["F05", "I prefer direct feedback.", "I prefer time to reflect on feedback.", "SCO", "REA"], ["F06", "I choose the safer option when error is costly.", "I choose the bolder option when learning is valuable.", "SOR", "COUR"], ["F07", "I speak early to put an idea on the table.", "I listen longer so my contribution fits.", "INI", "SAD"], ["F08", "I keep a steady pace from the start.", "I use a strong final push to close.", "STA", "DET"], ["F09", "I decide when the group needs direction.", "I help the group reach its own decision.", "SDE", "COO"], ["F10", "I practise a weak area repeatedly.", "I explore a new area to broaden my range.", "DET", "REA"], ["F11", "I simplify a task when pressure rises.", "I increase pace when pressure rises.", "REA", "STA"], ["F12", "I own the part I controlled.", "I examine the wider system behind the outcome.", "SOR", "ORG"], ["F13", "I explain the main point first.", "I use an example before stating the main point.", "PEX", "INF"], ["F14", "I arrange people around clear roles.", "I keep roles flexible as the task changes.", "OOA", "SAD"], ["F15", "I raise a concern early.", "I wait until I have a complete alternative.", "COUR", "REA"], ["F16", "I keep the group’s mood steady.", "I keep the group’s standard high.", "LIV", "DET"], ["F17", "I check the instruction twice.", "I begin and clarify as I go.", "ORG", "INI"], ["F18", "I make room for a quiet voice.", "I ask the strongest speaker to summarise.", "SAD", "INF"], ["F19", "I repair a missed detail quietly.", "I tell the group what caused the missed detail.", "SOR", "PEX"], ["F20", "I decide with the facts available.", "I wait for one more piece of evidence.", "SDE", "REA"], ["F21", "I use a simple routine on a tiring day.", "I change the routine to regain energy.", "STA", "SAD"], ["F22", "I keep my own view in a disagreement.", "I look for the part of the other view that helps.", "SCO", "COO"], ["F23", "I turn a suggestion into a first experiment.", "I ask how the suggestion will affect the plan.", "INI", "ORG"], ["F24", "I make a direct request.", "I show the practical reason for the request.", "PEX", "INF"], ["F25", "I stay with the task after a poor start.", "I change the method after a poor start.", "DET", "REA"], ["F26", "I take a visible role in an unfamiliar group.", "I observe the group before taking a role.", "SCO", "SAD"], ["F27", "I use a checklist for a shared handover.", "I speak to the next person about the handover.", "ORG", "PEX"], ["F28", "I invite agreement around a common aim.", "I make the strongest case for my proposal.", "COO", "INF"], ["F29", "I keep my answer short under time pressure.", "I add context so the answer cannot be misunderstood.", "PEX", "REA"], ["F30", "I take the first safe action.", "I ask who should take the first action.", "SDE", "SOR"], ["F31", "I keep attention on a long routine.", "I add variety to keep attention fresh.", "STA", "LIV"], ["F32", "I admit what I do not know.", "I reason aloud from what I do know.", "COUR", "REA"], ["F33", "I set a clear next deadline.", "I check whether the deadline is realistic.", "OOA", "ORG"], ["F34", "I encourage a hesitant teammate to try.", "I take the difficult part first to demonstrate.", "INF", "INI"], ["F35", "I keep a calm tone when challenged.", "I state the boundary clearly when challenged.", "COO", "SCO"],
];
const situationSeeds: Array<{ text: string; options: OpamSituationOption[]; best: number }> = [
  { text: "At a college sports ground in Pune, your group has ten minutes left and two members are speaking over each other. What do you do?", options: [{ text: "Summarise the shared point, suggest a next step, and invite one quieter voice.", style: "responsible", olq: "INF" }, { text: "Wait silently because interrupting would be uncomfortable.", style: "avoidant", olq: "SCO" }, { text: "Take over the whole discussion so the group cannot lose time.", style: "impulsive", olq: "COUR" }, { text: "Ask the coach to decide the plan for the group.", style: "dependent", olq: "SOR" }], best: 0 },
  { text: "Your hostel study group in Lucknow is handing over notes before a test. One page is missing. What is your response?", options: [{ text: "Check the index, tell the group what is missing, and find a quick substitute.", style: "responsible", olq: "SOR" }, { text: "Say nothing and hope the missing page is not needed.", style: "avoidant", olq: "SOR" }, { text: "Leave the hostel immediately to search for the person who lost it.", style: "impulsive", olq: "COUR" }, { text: "Wait for the senior student to arrange everything.", style: "dependent", olq: "INI" }], best: 0 },
  { text: "At a railway platform in Nagpur, your group notices the meeting point has changed while one person is still on the way. What do you do?", options: [{ text: "Send the new point and a clear landmark, then assign someone to watch the old point briefly.", style: "responsible", olq: "ORG" }, { text: "Continue waiting at the old point without telling anyone.", style: "avoidant", olq: "SOR" }, { text: "Run through the platform looking for the person.", style: "impulsive", olq: "SDE" }, { text: "Ask a railway official to manage your group.", style: "dependent", olq: "INI" }], best: 0 },
  { text: "During a college project in Kochi, your first method gives inconsistent results and the submission is tomorrow. What is the best next step?", options: [{ text: "State what failed, keep the useful part, and test a simpler method.", style: "responsible", olq: "REA" }, { text: "Hide the inconsistent results in the final table.", style: "avoidant", olq: "SOR" }, { text: "Change every part of the project at once.", style: "impulsive", olq: "INI" }, { text: "Wait for the teacher to rebuild the project.", style: "dependent", olq: "INI" }], best: 0 },
  { text: "At home in Jaipur, you promised to collect a document but realise the bus will be late. What do you do?", options: [{ text: "Call early with an exact update and offer a practical alternative.", style: "responsible", olq: "SOR" }, { text: "Say nothing until the deadline passes.", style: "avoidant", olq: "SOR" }, { text: "Take an unsafe shortcut through traffic.", style: "impulsive", olq: "COUR" }, { text: "Wait for someone else to notice the problem.", style: "dependent", olq: "INI" }], best: 0 },
  { text: "A new member joins your NSS group after the briefing has started. How do you help without losing momentum?", options: [{ text: "Give a short summary and the next action they can own.", style: "responsible", olq: "SAD" }, { text: "Tell them to watch until they understand everything.", style: "avoidant", olq: "SAD" }, { text: "Put them in charge of the whole task immediately.", style: "impulsive", olq: "INI" }, { text: "Ask the coordinator to repeat the entire briefing.", style: "dependent", olq: "SOR" }], best: 0 },
  { text: "After a group activity in Chandigarh, an assessor gives you one critical observation. What do you do next?", options: [{ text: "Ask for one example and choose one behaviour to practise.", style: "responsible", olq: "REA" }, { text: "Decide the observation was unfair and ignore it.", style: "avoidant", olq: "SCO" }, { text: "Argue until the assessor changes the comment.", style: "impulsive", olq: "COUR" }, { text: "Ask a friend to tell you what the assessor really meant.", style: "dependent", olq: "SCO" }], best: 0 },
  { text: "On a trek practice near Dehradun, rain makes the planned route slower. The group still has time but visibility is falling. What do you do?", options: [{ text: "Check the remaining route and time, then choose a safer shorter plan if needed.", style: "responsible", olq: "SDE" }, { text: "Continue exactly as planned without checking conditions.", style: "avoidant", olq: "SOR" }, { text: "Push ahead alone to see whether the route is clear.", style: "impulsive", olq: "COUR" }, { text: "Wait for someone senior to make every decision.", style: "dependent", olq: "INI" }], best: 0 },
  { text: "At a market in Surat, you notice a classmate has been charged twice for a shared purchase. What do you do?", options: [{ text: "Show the receipt, correct the amount, and keep the conversation calm.", style: "responsible", olq: "COUR" }, { text: "Ignore it because the amount is small.", style: "avoidant", olq: "SOR" }, { text: "Accuse the shopkeeper loudly in front of everyone.", style: "impulsive", olq: "COUR" }, { text: "Ask another shopper to solve it for you.", style: "dependent", olq: "SCO" }], best: 0 },
  { text: "Your college team in Patna has two possible presentation topics and five minutes to choose. What do you do?", options: [{ text: "Compare both against the objective and close on the stronger fit.", style: "responsible", olq: "SDE" }, { text: "Keep listing possibilities until time runs out.", style: "avoidant", olq: "SDE" }, { text: "Choose your topic without hearing the others.", style: "impulsive", olq: "INI" }, { text: "Ask the lecturer to choose for you.", style: "dependent", olq: "SOR" }], best: 0 },
  { text: "During a train journey from Chennai, a teammate becomes quiet after making a mistake in the plan. What is useful?", options: [{ text: "Acknowledge the mistake, identify the next step, and keep them involved.", style: "responsible", olq: "COO" }, { text: "Pretend nothing happened and exclude them from the next step.", style: "avoidant", olq: "COO" }, { text: "Take every remaining task away from them.", style: "impulsive", olq: "INI" }, { text: "Ask someone else to speak to them for you.", style: "dependent", olq: "PEX" }], best: 0 },
  { text: "At a unit-line style drill practice in Jodhpur, the checklist and the ground layout disagree. What do you do?", options: [{ text: "Pause, identify the mismatch, and confirm which source governs the task.", style: "responsible", olq: "REA" }, { text: "Use whichever version is easier without mentioning the mismatch.", style: "avoidant", olq: "SOR" }, { text: "Change the layout yourself and tell everyone later.", style: "impulsive", olq: "INI" }, { text: "Wait for the group to notice the issue.", style: "dependent", olq: "INI" }], best: 0 },
  { text: "A teammate in Guwahati is struggling to explain a point during a group discussion. What do you do?", options: [{ text: "Ask a short clarifying question and help connect their point to the topic.", style: "responsible", olq: "PEX" }, { text: "Let the group move on without giving them space.", style: "avoidant", olq: "SAD" }, { text: "Repeat their point as if it were your own.", style: "impulsive", olq: "INF" }, { text: "Ask the moderator to explain it for them.", style: "dependent", olq: "SOR" }], best: 0 },
  { text: "You have a tired evening after classes in Bhopal, but a younger cousin needs help planning tomorrow’s study. What do you do?", options: [{ text: "Set a short plan together and agree on the first task.", style: "responsible", olq: "STA" }, { text: "Promise to help later without setting a time.", style: "avoidant", olq: "SOR" }, { text: "Make a long plan without asking what they need.", style: "impulsive", olq: "ORG" }, { text: "Tell them to ask someone else because you are tired.", style: "dependent", olq: "COO" }], best: 0 },
  { text: "A group member in Ranchi suggests a shortcut that saves time but makes the final record unclear. What is your response?", options: [{ text: "Ask whether the record can remain clear, then use the shortcut only if it can.", style: "responsible", olq: "REA" }, { text: "Accept it without checking because the deadline is close.", style: "avoidant", olq: "SOR" }, { text: "Reject every shortcut as unsafe.", style: "impulsive", olq: "ORG" }, { text: "Ask the teacher to choose without explaining the trade-off.", style: "dependent", olq: "PEX" }], best: 0 },
  { text: "Your hostel group in Mysuru has completed the task, but one handover detail is still unclear. What do you do?", options: [{ text: "Clarify the detail before the next person begins.", style: "responsible", olq: "PEX" }, { text: "Leave it because the main task is finished.", style: "avoidant", olq: "SOR" }, { text: "Rewrite the whole task yourself.", style: "impulsive", olq: "INI" }, { text: "Wait for the next person to ask.", style: "dependent", olq: "INI" }], best: 0 },
  { text: "At a college fest in Delhi, two volunteers disagree about the queue arrangement. What is the best first move?", options: [{ text: "Return to the crowd-flow objective and test the simpler arrangement.", style: "responsible", olq: "INF" }, { text: "Avoid the disagreement and work at another stall.", style: "avoidant", olq: "COO" }, { text: "Order both volunteers to follow your plan immediately.", style: "impulsive", olq: "INF" }, { text: "Ask the principal to settle a small operational choice.", style: "dependent", olq: "SOR" }], best: 0 },
  { text: "You receive two conflicting messages about a practice location in Nashik. What do you do?", options: [{ text: "Check the latest reliable source and send one clear correction to the group.", style: "responsible", olq: "REA" }, { text: "Forward both messages and let everyone decide.", style: "avoidant", olq: "PEX" }, { text: "Go to both places in a hurry.", style: "impulsive", olq: "INI" }, { text: "Wait for the coach to message again.", style: "dependent", olq: "SOR" }], best: 0 },
  { text: "A friend asks you to sign attendance for them at college in Kolkata. How do you respond?", options: [{ text: "Decline and explain that the record should reflect who attended.", style: "responsible", olq: "SOR" }, { text: "Agree because it is only one class.", style: "avoidant", olq: "SOR" }, { text: "Sign it and challenge the teacher if questioned.", style: "impulsive", olq: "COUR" }, { text: "Ask another friend what they would do first.", style: "dependent", olq: "SCO" }], best: 0 },
  { text: "Your group in Visakhapatnam is short of one person for a presentation rehearsal. What do you do?", options: [{ text: "Redistribute the parts, keep the missing person updated, and rehearse the structure.", style: "responsible", olq: "ORG" }, { text: "Cancel the rehearsal without checking alternatives.", style: "avoidant", olq: "DET" }, { text: "Perform every missing part yourself without telling the group.", style: "impulsive", olq: "INI" }, { text: "Wait for the absent person to return before preparing.", style: "dependent", olq: "SOR" }], best: 0 },
  { text: "At home in Shimla, a power cut interrupts your online application near the deadline. What is the best response?", options: [{ text: "Save what is complete, find a reliable connection, and recheck the submission.", style: "responsible", olq: "DET" }, { text: "Give up because the first attempt failed.", style: "avoidant", olq: "DET" }, { text: "Submit incomplete details just to finish.", style: "impulsive", olq: "SDE" }, { text: "Wait for someone else to complete the form.", style: "dependent", olq: "INI" }], best: 0 },
  { text: "At a library in Ahmedabad, your group is becoming noisy and another student complains. What do you do?", options: [{ text: "Lower the group’s voices, acknowledge the complaint, and continue the task.", style: "responsible", olq: "COO" }, { text: "Ignore the student because your work is important.", style: "avoidant", olq: "COO" }, { text: "Argue that the library is public and keep speaking.", style: "impulsive", olq: "COUR" }, { text: "Ask the librarian to speak to your group.", style: "dependent", olq: "SOR" }], best: 0 },
  { text: "A bus delay in Indore means your group will reach a practice venue late. What do you do?", options: [{ text: "Inform the venue, share the revised arrival time, and prepare the first step on the way.", style: "responsible", olq: "INI" }, { text: "Say nothing until the group arrives.", style: "avoidant", olq: "SOR" }, { text: "Ask the driver to break traffic rules.", style: "impulsive", olq: "COUR" }, { text: "Wait for the organiser to call you.", style: "dependent", olq: "INI" }], best: 0 },
  { text: "At a college lab in Kanpur, the person scheduled to record readings is absent and the session has started. What do you do?", options: [{ text: "Confirm the method, assign the recording role, and begin with a clear log.", style: "responsible", olq: "OOA" }, { text: "Skip the readings and write them later from memory.", style: "avoidant", olq: "SOR" }, { text: "Start changing the experiment without checking the method.", style: "impulsive", olq: "INI" }, { text: "Wait for the absent student to return before doing anything.", style: "dependent", olq: "INI" }], best: 0 },
  { text: "At a neighbourhood clean-up in Madurai, the bags are full before the last lane is checked. What is the best next step?", options: [{ text: "Inform the coordinator, move the full bags safely, and agree on the remaining area.", style: "responsible", olq: "ORG" }, { text: "Leave the remaining lane because the planned time is over.", style: "avoidant", olq: "DET" }, { text: "Carry overloaded bags alone through the crowd.", style: "impulsive", olq: "COUR" }, { text: "Wait for the coordinator to notice the bags.", style: "dependent", olq: "SOR" }], best: 0 },
];
export const opamSet1 = buildOpamSet({ olqs, forcedSeeds, situationSeeds });

export const { selfItems, forcedItems, situationItems, opamBank, mixedOpamItems } = opamSet1;
export const OPAM_COUNTS = opamSet1.counts;
export const OPAM_TOTAL = opamSet1.total;
