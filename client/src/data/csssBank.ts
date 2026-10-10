export type CsssSection = "memory" | "spatial" | "pattern" | "language" | "audio";
import type { QuestionVisual } from "../components/QuestionDiagram";

export type CsssQuestion = { id: string; section: CsssSection; sectionLabel: string; subtype: string; duration: number; prompt: string; renderHint?: string; visual?: QuestionVisual; flashText?: string; audioText?: string; options: string[]; answer: number; explanation: string };
type Row = [string, string[], number, string, string?, string?, QuestionVisual?];
export type CsssRow = Row;
export type CsssSetRows = { memory: CsssRow[]; spatial: CsssRow[]; pattern: CsssRow[]; language: CsssRow[]; audio: CsssRow[] };

const memoryRows: Row[] = [
  ["A sequence flashes once: 4 · 9 · 2 · 7. Which number occupied position three?", ["2", "4", "7", "9"], 0, "The third position is 2.", "digit_recall"],
  ["A sequence flashes once: 8 · 1 · 6 · 3. Which number appeared at the end?", ["1", "3", "6", "8"], 1, "The last position is 3.", "digit_recall"],
  ["A sequence flashes once: 5 · 2 · 9 · 4. Which number opened the sequence?", ["2", "4", "5", "9"], 2, "The first position is 5.", "digit_recall"],
  ["A sequence flashes once: 7 · 3 · 8 · 1. Select the value in position two.", ["1", "3", "7", "8"], 1, "The second position is 3.", "digit_recall"],
  ["A sequence flashes once: 6 · 4 · 1 · 8. Recall the value in the third slot.", ["1", "4", "6", "8"], 0, "The third position is 1.", "digit_recall"],
  ["A sequence flashes once: 9 · 5 · 2 · 6. Select the final value.", ["2", "5", "6", "9"], 2, "The last position is 6.", "digit_recall"],
  ["A sequence flashes once: 3 · 8 · 5 · 0. Which value followed the first one?", ["0", "3", "5", "8"], 3, "The second position is 8.", "digit_recall"],
  ["A sequence flashes once: 1 · 7 · 4 · 9. Select its opening value.", ["1", "4", "7", "9"], 0, "The first position is 1.", "digit_recall"],
  ["A sequence flashes once: 4 · 8 · 2. Which transformed sequence is correct?", ["5 · 9 · 3", "4 · 9 · 2", "5 · 8 · 3", "3 · 7 · 1"], 0, "Each number increases by one: 5 · 9 · 3.", "updating_memory"],
  ["A sequence flashes: 7 · 2 · 9 · 4. Which pair was adjacent in the original order?", ["7 · 2", "2 · 4", "9 · 7", "4 · 2"], 0, "The original sequence begins with adjacent 7 · 2.", "order_tracking"],
  ["A sequence flashes once: red · blue · green · yellow. Which colour was immediately before green?", ["Red", "Blue", "Green", "Yellow"], 1, "Blue came immediately before green.", "order_tracking"],
  ["A sequence flashes once: 2 · 6 · 0 · 5. Reverse the order. Which is correct?", ["5 · 0 · 6 · 2", "2 · 0 · 6 · 5", "5 · 6 · 0 · 2", "0 · 5 · 6 · 2"], 0, "Reversing the sequence gives 5 · 0 · 6 · 2.", "mental_manipulation"],
  ["A sequence flashes once: 7 · 1 · 5 · 4. Select the value held in slot three.", ["1", "4", "5", "7"], 2, "The third position is 5.", "digit_recall"],
  ["Ignore the ink colour and select the written word: GREEN shown in red ink.", ["RED", "BLUE", "GREEN", "YELLOW"], 2, "The target is the written word GREEN.", "stroop_attention"],
  ["A sequence flashes once: 6 · 9 · 0 · 3. Recall the closing value.", ["0", "3", "6", "9"], 1, "The last position is 3.", "digit_recall"],
];
const spatialRows: Row[] = [
  ["Study the diagram. A horizontal mirror flips the top-left mark. Where will the mark appear?", ["Top-left", "Top-right", "Bottom-left", "Bottom-right"], 1, "A horizontal flip mirrors left to right.", "mirror_grid", undefined, "mirror_horizontal"],
  ["Study the diagram above the water line. Where should the marked point appear in its water reflection?", ["Top-left", "Top-right", "Bottom-left", "Bottom-right"], 2, "A water reflection mirrors the figure vertically across the horizontal line.", "water_reflection", undefined, "water_reflection"],
  ["Study the rotation diagram. A square turns 90° clockwise. Which edge receives the top mark?", ["Left", "Right", "Top", "Bottom"], 1, "The top edge moves to the right edge.", "rotation", undefined, "rotation"],
  ["Follow the illustrated route: north, east, then south by the same distance. Where are you from the start?", ["West", "East", "North", "At the start"], 1, "North and south cancel, leaving east.", "coordinate_path", undefined, "path"],
  ["Study the cube diagram. It rolls forward once. Where does the top dot move?", ["Bottom", "Front", "Back", "It stays on top"], 1, "Rolling forward brings the top face to the front.", "cube_rotation", undefined, "cube"],
  ["Use the compass diagram. You face east, turn left, then left again. Which way do you face?", ["North", "South", "East", "West"], 3, "Two left turns from east lead to west.", "direction", undefined, "direction"],
  ["Study the four-cell diagram. The mark starts bottom-right and the grid rotates 90° clockwise. Where is it?", ["Top-right", "Top-left", "Bottom-left", "Bottom-right"], 2, "Bottom-right rotates to bottom-left.", "grid_rotation", undefined, "grid_rotation"],
  ["Study the line and mirror axis. What happens when the line is reflected across the horizontal mirror?", ["It slopes downward", "It becomes vertical", "It keeps the same slope", "It disappears"], 0, "A horizontal reflection reverses the vertical direction.", "mirror_line", undefined, "line_mirror"],
  ["Study the arrow diagram. The downward arrow rotates 90° anticlockwise. Which way does it point?", ["Right", "Left", "Up", "Down"], 0, "Down rotated anticlockwise points right.", "arrow_rotation", undefined, "arrow_rotation"],
  ["Use the coordinate diagram. A marker moves two cells north and one cell west from centre. Where is it?", ["Upper-left", "Upper-right", "Lower-left", "Lower-right"], 0, "North is up and west is left.", "coordinate_path", undefined, "coordinate"],
  ["Study the vertical mirror axis. What happens to a vertical line after reflection?", ["It becomes horizontal", "It remains vertical", "It becomes diagonal", "It vanishes"], 1, "A vertical mirror preserves vertical orientation.", "mirror_line", undefined, "line_mirror"],
  ["Follow the illustrated path: east three steps, then north one step. Which displacement matches it?", ["Three west, one south", "Three east, one north", "One east, three north", "It returns to the start"], 1, "The movement is three east and one north.", "coordinate_path", undefined, "coordinate"],
  ["Study the triangle diagram. Its shaded corner starts top-left and is flipped horizontally. Where does it move?", ["Top-left", "Top-right", "Bottom-left", "Bottom-right"], 1, "A horizontal flip mirrors the corner to top-right.", "mirror_grid", undefined, "mirror_horizontal"],
  ["Study the square mark. It starts bottom-left and rotates 180°. Where does it go?", ["Top-left", "Top-right", "Bottom-left", "Bottom-right"], 1, "A half-turn maps bottom-left to top-right.", "rotation", undefined, "rotation"],
  ["Follow the illustrated path from centre to 3 o'clock and then 12 o'clock. What shape does it make?", ["A right angle", "A straight line", "A circle", "No path"], 0, "The two perpendicular moves form a right angle.", "coordinate_path", undefined, "path"],
];
const patternRows: Row[] = [
  ["Sequence: 3, 6, 12, 24, __. Which value comes next?", ["30", "36", "42", "48"], 3, "Each term doubles.", "number_series_doubling"],
  ["Sequence: 5, 8, 11, 14, __. Which value completes it?", ["15", "16", "17", "18"], 2, "The series increases by 3.", "number_series_constant_step"],
  ["Sequence: 2, 5, 10, 17, __. Which value follows the pattern?", ["24", "25", "26", "27"], 2, "The increases are +3, +5, +7, then +9.", "number_series_odd_steps"],
  ["Sequence: 81, 27, 9, 3, __. Which value is missing?", ["0", "1", "2", "6"], 1, "Each term is divided by 3.", "number_series_division"],
  ["Sequence: 1, 4, 9, 16, __. Which square number comes next?", ["20", "24", "25", "36"], 2, "These are the squares of 1 through 5.", "number_series_squares"],
  ["Sequence: 7, 10, 16, 25, __. Which value completes the growing gaps?", ["34", "35", "36", "37"], 3, "The increases are +3, +6, +9, then +12.", "number_series_growing_gaps"],
  ["Sequence: 2, 4, 3, 6, 4, 8, __. Which value belongs next?", ["5", "7", "9", "10"], 0, "Odd positions rise by one.", "alternating_series"],
  ["Letters: A, C, F, J, __. Which letter follows the increasing gaps?", ["M", "N", "O", "P"], 2, "The gaps are +2, +3, +4, then +5.", "letter_series"],
  ["Sequence: 100, 90, 72, 48, __. Which value is missing?", ["24", "20", "18", "12"], 1, "The next subtraction is 28: 48 − 28 = 20.", "number_series_decreasing"],
  ["Relationship: 3 is to 12 as __ is to __. Which pair preserves the same relationship?", ["4 : 12", "5 : 20", "6 : 18", "7 : 21"], 1, "The relationship is ×4.", "analogy_numbers"],
  ["Coding rule: each letter moves one place forward. What does DOG become?", ["EPH", "EOH", "CNG", "FPH"], 0, "Each letter moves one place forward.", "coding_decoding"],
  ["Study the visual diagram: ● ○ __. Which tile completes the alternating pattern?", ["● ○ ●", "○ ● ○", "● ● ○", "○ ○ ●"], 0, "The alternating row begins and ends with a filled circle.", "nonverbal_grid", undefined, "nonverbal_grid"],
  ["Study the triangle in the diagram. After a 90° clockwise turn, which option matches?", ["▲", "▶", "▼", "◀"], 1, "The shape rotates 90 degrees clockwise.", "nonverbal_rotation", undefined, "nonverbal_rotation"],
  ["Study the figure and the vertical mirror line. Which option is the left-right mirror?", ["◆ · ○", "○ · ◆", "◆ · ◆", "○ · ○"], 1, "The mirrored arrangement reverses the left and right positions.", "nonverbal_mirror", undefined, "nonverbal_mirror"],
  ["Study the figure above the water line. Which option shows the correct water reflection?", ["◆ above ○", "○ above ◆", "◆ below ○", "○ below ◆"], 2, "A water reflection flips the figure vertically while preserving left and right.", "nonverbal_water", undefined, "nonverbal_water"],
];
const languageRows: Row[] = [
  ["Closest meaning of ‘measured’ in ‘a measured reply’:", ["Angry", "Careful and controlled", "Very long", "Unrelated"], 1, "Measured means considered and controlled.", "vocabulary_synonym"],
  ["Opposite of ‘scarce’:", ["Rare", "Limited", "Abundant", "Hidden"], 2, "Abundant means available in large quantity.", "vocabulary_antonym"],
  ["Complete: The plan was clear and ___.", ["practical", "fragile", "distant", "silent"], 0, "Practical fits a plan that can be acted upon.", "contextual_completion"],
  ["Closest meaning of ‘resilient’:", ["Able to recover", "Unable to move", "Very expensive", "Easily distracted"], 0, "Resilient means able to recover.", "vocabulary_synonym"],
  ["Which word is different: observe, notice, ignore, watch?", ["observe", "notice", "ignore", "watch"], 2, "Ignore is the opposite of paying attention.", "odd_one_out"],
  ["Best synonym for ‘brief’:", ["Short", "Loud", "Late", "Exact"], 0, "Brief means short.", "vocabulary_synonym"],
  ["A person who can be trusted is ___.", ["reliable", "random", "rigid", "restless"], 0, "Reliable means dependable.", "contextual_completion"],
  ["Opposite of ‘expand’:", ["Stretch", "Contract", "Explain", "Improve"], 1, "Contract means become smaller.", "vocabulary_antonym"],
  ["Which sentence is clearest?", ["Because the rain, the route changed.", "The route changed because of rain.", "Rain route changed because.", "Changed route the rain."], 1, "The second sentence is complete and direct.", "sentence_clarity"],
  ["Closest meaning of ‘candid’:", ["Frank", "Careless", "Secretive", "Polished"], 0, "Candid means honest and direct.", "vocabulary_synonym"],
  ["A decision made after thought is ___.", ["deliberate", "accidental", "restless", "instant"], 0, "Deliberate can mean carefully considered.", "contextual_completion"],
  ["Which word does not fit: calm, steady, composed, frantic?", ["calm", "steady", "composed", "frantic"], 3, "Frantic contrasts with the other three.", "odd_one_out"],
  ["The team reached a ___ agreement after discussion.", ["mutual", "musical", "minor", "remote"], 0, "Mutual means shared by both sides.", "contextual_completion"],
  ["Best meaning of ‘adapt’:", ["Adjust to conditions", "Repeat exactly", "Reject evidence", "Move backward"], 0, "To adapt is to adjust to a new condition.", "vocabulary_definition"],
  ["Book is to reading as fork is to…", ["writing", "eating", "walking", "sleeping"], 1, "A fork is a tool used for eating.", "verbal_analogy"],
];
const audioRows: Row[] = [
  ["Listen once, then select the number sequence you heard.", ["7–9–3–2–8", "7–3–9–2–8", "3–7–9–8–2", "7–3–2–9–8"], 1, "The correct response preserves the five-number order.", "digit_recall_audio", "7 3 9 2 8"],
  ["Listen once, then select the word order you heard.", ["alpha bravo delta echo", "alpha delta bravo echo", "bravo alpha delta echo", "alpha bravo echo delta"], 0, "The correct response preserves the spoken word order.", "word_order_audio", "alpha bravo delta echo"],
  ["Listen once, then select the letter order you heard.", ["K R M T", "K M R T", "R K M T", "K R T M"], 0, "The correct response preserves the spoken letter order.", "letter_order_audio", "K R M T"],
  ["Listen once, then identify the direction heard in the third position.", ["North", "East", "South", "West"], 2, "South was the third direction in the audio cue.", "direction_tracking_audio", "north east south west"],
  ["Listen once, then count how many times the word ‘apple’ was heard.", ["2", "3", "4", "5"], 1, "The target word was repeated three times.", "category_count_audio", "apple chair apple river apple"],
  ["Listen once, then select the pattern of the spoken parity labels.", ["Odd–Even–Even–Odd–Even", "Even–Odd–Even–Odd–Even", "Odd–Even–Odd–Even–Odd", "Even–Even–Odd–Odd–Even"], 0, "The spoken labels follow the first option's pattern.", "parity_pattern_audio", "odd even even odd even"],
  ["Listen once, then select the action requested by the spoken instruction.", ["Mark the circle", "Underline the square", "Cross the triangle", "Leave the page blank"], 1, "The instruction asks for the square to be underlined.", "instruction_following_audio", "underline the square"],
  ["Listen once, then decide whether the two spoken pairs are the same or different.", ["Same order", "Different order", "Same words, reversed", "One word missing"], 2, "The second pair contains the same words in reversed order.", "same_different_audio", "red blue; blue red"],
  ["Listen once, then select the day heard in the fourth position.", ["Monday", "Tuesday", "Wednesday", "Friday"], 1, "Tuesday was heard fourth.", "day_order_audio", "monday wednesday friday tuesday"],
  ["Listen once, then identify which word was repeated most often.", ["Candle", "Candy", "Cannon", "Canvas"], 0, "Candle was repeated more often than the distractor words.", "word_discrimination_audio", "candle candy candle cannon candle"],
];
const build = (section: CsssSection, label: string, duration: number, rows: Row[], prefix: string): CsssQuestion[] => rows.map(([rawPrompt, options, answer, explanation, subtype, audioText, visual], index) => {
  const flashMatch = section === "memory" ? rawPrompt.match(/^A sequence flashes(?: once)?:\s*(.*?)\.\s*(.*)$/) : null;
  const prompt = flashMatch ? flashMatch[2] : rawPrompt;
  return { id: `CSSS-${prefix}-${String(index + 1).padStart(2, "0")}`, section, sectionLabel: label, subtype: subtype ?? "standard", duration, prompt, options, answer, explanation, ...(flashMatch ? { flashText: flashMatch[1] } : {}), ...(audioText ? { audioText } : {}), ...(visual ? { visual } : {}) };
});
const SET_SECTIONS: { section: CsssSection; label: string; duration: number; code: string }[] = [
  { section: "memory", label: "Working memory & selective attention", duration: 5, code: "A" },
  { section: "spatial", label: "Spatial & form perception", duration: 12, code: "B" },
  { section: "pattern", label: "Verbal + non-verbal reasoning", duration: 10, code: "C" },
  { section: "language", label: "Linguistic ability", duration: 6, code: "D" },
  { section: "audio", label: "Auditory discrimination", duration: 6, code: "E" },
];
export const buildCsssSet = (rows: CsssSetRows, prefix: string): CsssQuestion[] =>
  SET_SECTIONS.flatMap(({ section, label, duration, code }) => build(section, label, duration, rows[section], `${prefix}${code}`));
export const csssBank: CsssQuestion[] = [
  ...build("memory", "Working memory & selective attention", 5, memoryRows, "A"),
  ...build("spatial", "Spatial & form perception", 12, spatialRows, "B"),
  ...build("pattern", "Verbal + non-verbal reasoning", 10, patternRows, "C"),
  ...build("language", "Linguistic ability", 6, languageRows, "D"),
  ...build("audio", "Auditory discrimination", 6, audioRows, "E"),
];
export const CSSS_TOTAL = csssBank.length;
export const CSSS_SECTION_COUNTS: Record<CsssSection, number> = { memory: 15, spatial: 15, pattern: 15, language: 15, audio: 10 };
