import { useEffect, useRef, useState } from "react";
import { Award, Clock, ListChecks } from "lucide-react";
import { ChoiceButton, Counter, PageShell, ProgressTrack, PrintLink, ReportMetric, RestartButton, SectionEyebrow, SiteFooter, SiteHeader, StatusChip, TrustMark } from "../components/SiteChrome";
import StudentRegistration from "../components/StudentRegistration";
import LeadForm from "../components/LeadForm";
import { ExitConfirmDialog, TestInstructions } from "../components/TestInstructions";
import { mixedOpamItems, opamBank, selfItems, OPAM_COUNTS, type OpamForcedItem, type OpamItem, type OpamSelfItem, type OpamSituationItem } from "../data/opamBank";
import { isAccountServiceEnabled, recognizeStudent, saveAssessmentAttempt } from "../lib/student";
import { isLeadFormEnabled } from "../lib/leads";

type Screen = "landing" | "briefing" | "run" | "report";
type Answer = { itemId: string; type: OpamItem["type"]; value: string; latency: number; score: number };

function typeLabel(type: OpamItem["type"]) {
  if (type === "self") return "SELF-DESCRIPTION";
  if (type === "forced") return "FORCED CHOICE";
  return "SITUATION REACTION";
}

function itemPrompt(item: OpamItem) {
  return item.type === "self" ? item.text : item.type === "forced" ? item.left : item.text;
}

// OLQ code -> readable trait name, derived from the self-description bank so the
// report always uses the same vocabulary as the content.
const traitLabel: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const item of selfItems) map[item.olq] = item.trait;
  return map;
})();
const itemById = new Map(opamBank.map((item) => [item.id, item]));

/**
 * Builds a per-OLQ signal strictly from what the learner actually chose:
 * - self items add a point when the answer matches the item's keyed direction;
 * - forced pairs add a point to the quality behind the chosen side;
 * - situation items add a point to the chosen quality when it is the best-fit action.
 * Everything shown in the report is a direct tally of these choices.
 */
function computeOlqSignals(answers: Answer[]) {
  const tally = new Map<string, { hits: number; opportunities: number }>();
  const bump = (olq: string, hit: number) => {
    const cur = tally.get(olq) ?? { hits: 0, opportunities: 0 };
    cur.hits += hit;
    cur.opportunities += 1;
    tally.set(olq, cur);
  };

  for (const answer of answers) {
    const item = itemById.get(answer.itemId);
    if (!item) continue;
    if (item.type === "self") {
      const matchesKey = (answer.value === "agree") === (item.keyed === "positive");
      bump(item.olq, matchesKey ? 1 : 0);
    } else if (item.type === "forced") {
      if (answer.value === "left") bump(item.leftOlq, 1);
      else if (answer.value === "right") bump(item.rightOlq, 1);
    } else {
      const chosen = answer.value.charCodeAt(0) - 65;
      const meta = item.optionMeta[chosen];
      if (meta) bump(meta.olq, chosen === item.best ? 1 : 0);
    }
  }

  return Array.from(tally.entries())
    .map(([olq, value]) => ({
      olq,
      label: traitLabel[olq] ?? olq,
      pct: Math.round((value.hits / Math.max(value.opportunities, 1)) * 100),
      hits: value.hits,
      opportunities: value.opportunities,
    }))
    .filter((signal) => signal.opportunities > 0)
    .sort((a, b) => b.pct - a.pct || b.opportunities - a.opportunities);
}

export default function OPAM() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [seriesFilter, setSeriesFilter] = useState<"all" | "full" | "section">("all");
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(15);
  const [startedAt, setStartedAt] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [studentReady, setStudentReady] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const answeringItemRef = useRef<string | null>(null);
  const exitConfirmRef = useRef(false);
  const total = mixedOpamItems.length;
  const completed = answers.length;
  const item = mixedOpamItems[index];
  const progress = (completed / total) * 100;
  const currentGlobal = index + 1;
  const answeredByType = answers.reduce((counts, answer) => ({ ...counts, [answer.type]: counts[answer.type] + 1 }), { self: 0, forced: 0, situation: 0 });

  useEffect(() => {
    recognizeStudent().then((student) => {
      setStudentReady(Boolean(student));
      if (student) setRegistrationOpen(false);
    });
  }, []);

  useEffect(() => {
    if (screen !== "run" || !item) return;
    answeringItemRef.current = null;
    setStartedAt(performance.now());
    setSeconds(15);
    const timer = window.setInterval(
      () =>
        setSeconds((value) => {
          if (exitConfirmRef.current) return value;
          if (value <= 1) {
            finishAnswer("timeout", 0);
            return 15;
          }
          return value - 1;
        }),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [screen, index]);

  function beginBriefing() {
    setScreen("briefing");
  }

  function beginRun() {
    answeringItemRef.current = null;
    setScreen("run");
    setIndex(0);
    setAnswers([]);
  }

  function requestExit() {
    exitConfirmRef.current = true;
    setConfirmExit(true);
  }

  function cancelExit() {
    exitConfirmRef.current = false;
    setConfirmExit(false);
  }

  function confirmExitRun() {
    exitConfirmRef.current = false;
    setConfirmExit(false);
    answeringItemRef.current = null;
    setScreen("landing");
  }

  function start() {
    if (isAccountServiceEnabled && !studentReady) {
      setRegistrationOpen(true);
      return;
    }
    if (isLeadFormEnabled) {
      setLeadOpen(true);
      return;
    }
    beginBriefing();
  }

  function finishAnswer(value: string, score = 1) {
    if (!item || screen !== "run" || answeringItemRef.current === item.id) return;
    answeringItemRef.current = item.id;
    const nextAnswers = [...answers, { itemId: item.id, type: item.type, value, latency: Math.round(performance.now() - startedAt), score }];
    setAnswers(nextAnswers);
    if (index < total - 1) return setIndex(index + 1);
    localStorage.setItem("learnerspark-opam-result", JSON.stringify({ answers: nextAnswers, savedAt: new Date().toISOString(), bankSize: total, sequence: "mixed" }));
    const totalScore = nextAnswers.reduce((sum, answer) => sum + answer.score, 0);
    saveAssessmentAttempt("opam", "OPAM Personality Practice", totalScore, Math.round((totalScore / total) * 100));
    setScreen("report");
  }

  if (screen === "landing") {
    const seriesTests: { id: number; title: string; tags: [string, string]; questions: number; marks: number; minutes: number; unlocked: boolean; kind: "Full Test" | "Section Test" }[] = [
      { id: 1, title: "OPAM 1", tags: ["Full Test", "Mixed Battery"], questions: total, marks: total, minutes: 30, unlocked: true, kind: "Full Test" },
      { id: 2, title: "OPAM 2", tags: ["Section Test", "Self-Description"], questions: OPAM_COUNTS.self, marks: OPAM_COUNTS.self, minutes: 15, unlocked: false, kind: "Section Test" },
      { id: 3, title: "OPAM 3", tags: ["Section Test", "Forced Choice"], questions: OPAM_COUNTS.forced, marks: OPAM_COUNTS.forced, minutes: 9, unlocked: false, kind: "Section Test" },
      { id: 4, title: "OPAM 4", tags: ["Section Test", "Situation Reaction"], questions: OPAM_COUNTS.situation, marks: OPAM_COUNTS.situation, minutes: 6, unlocked: false, kind: "Section Test" },
    ];
    const filters: { key: "all" | "full" | "section"; label: string }[] = [
      { key: "all", label: "All" },
      { key: "full", label: "Full Tests" },
      { key: "section", label: "Section Tests" },
    ];
    const visible = seriesTests.filter((test) => (seriesFilter === "all" ? true : seriesFilter === "full" ? test.kind === "Full Test" : test.kind === "Section Test"));
    return (
      <PageShell>
        <SiteHeader />
        <main className="series-page opam-landing">
          <div className="container series-grid">
            <div className="series-main">
              <div className="series-head">
                <span className="assessment-badge orange">OPAM</span>
                <span className="series-eyebrow">OFFICER POTENTIAL ASSESSMENT MODULE</span>
              </div>
              <h1 className="series-title">All Tests <span>({seriesTests.length})</span></h1>
              <p className="series-lead">A mixed {total}-prompt personality battery. Self-description, forced choice, and situation reaction items keep changing shape so you practise staying consistent rather than memorising a rhythm.</p>
              <div className="series-tabs" role="tablist" aria-label="Filter tests">
                {filters.map((tab) => (
                  <button key={tab.key} type="button" role="tab" aria-selected={seriesFilter === tab.key} className={`series-tab ${seriesFilter === tab.key ? "is-active" : ""}`} onClick={() => setSeriesFilter(tab.key)}>{tab.label}</button>
                ))}
              </div>
              <div className="series-list">
                {visible.map((test) => (
                  <article key={test.id} className={`series-card ${test.unlocked ? "" : "is-locked"}`}>
                    <span className="series-index">TEST {String(test.id).padStart(2, "0")}</span>
                    <div className="series-card-body">
                      <h3>{test.title}</h3>
                      <div className="series-tags">
                        {test.tags.map((tag) => <span key={tag} className="series-tag">{tag}</span>)}
                      </div>
                      <div className="series-meta">
                        <span><ListChecks size={14} />{test.questions} Questions</span>
                        <span><Award size={14} />{test.marks} Marks</span>
                        <span><Clock size={14} />{test.minutes} Mins</span>
                      </div>
                    </div>
                    <div className="series-action">
                      {test.unlocked ? <button type="button" className="series-start" onClick={start}>Start Test</button> : <button type="button" className="series-start is-locked" disabled>Unlock soon</button>}
                      <span className="series-tier">{test.unlocked ? "Free" : "Premium"}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <aside className="series-side">
              <div className="series-total">
                <span className="series-total-label">TOTAL TESTS</span>
                <strong className="series-total-number">{seriesTests.length}</strong>
                <div className="series-total-rows">
                  <div><span>Full tests</span><strong>1</strong></div>
                  <div><span>Section tests</span><strong>3</strong></div>
                  <div><span>Free access</span><strong>1</strong></div>
                </div>
                <p className="series-total-note">Start with the full mixed run. Type-specific sets unlock soon.</p>
              </div>
            </aside>
          </div>
          <div className="container">
            <div className="assessment-legal">
              <strong>Read this first.</strong>
              <span>There are no “correct” personality answers in self-description or forced choice. Situation items use a best-fit response only to make the debrief actionable. This is original practice content, not an official board instrument.</span>
            </div>
          </div>
        </main>
        <SiteFooter />
        {registrationOpen && (
          <StudentRegistration
            onClose={() => setRegistrationOpen(false)}
            onReady={() => {
              setStudentReady(true);
              setRegistrationOpen(false);
              beginBriefing();
            }}
          />
        )}
        {leadOpen && (
          <LeadForm
            testLabel="OPAM"
            onClose={() => setLeadOpen(false)}
            onProceed={() => {
              setLeadOpen(false);
              beginBriefing();
            }}
          />
        )}
      </PageShell>
    );
  }

  if (screen === "briefing") {
    return (
      <TestInstructions
        label="OPAM"
        questions={total}
        minutes={30}
        onBegin={beginRun}
        onBack={() => setScreen("landing")}
      />
    );
  }

  if (screen === "report") {
    const medianLatency = Math.round(answers.map((answer) => answer.latency).sort((a, b) => a - b)[Math.floor(answers.length / 2)] || 0);
    const quickDecisions = answers.filter((answer) => answer.latency < 1000).length;
    const situationAnswers = answers.filter((answer) => answer.type === "situation");
    const bestFit = situationAnswers.filter((answer) => {
      const source = itemById.get(answer.itemId);
      return source && source.type === "situation" && answer.value.charCodeAt(0) - 65 === source.best;
    }).length;
    const situationPct = situationAnswers.length ? Math.round((bestFit / situationAnswers.length) * 100) : 0;
    const signals = computeOlqSignals(answers);
    const strongest = signals.slice(0, 3);
    const growth = signals.slice(-3).reverse();

    return (
      <PageShell>
        <SiteHeader />
        <main className="report-page">
          <div className="container report-shell">
            <div className="report-top">
              <div>
                <SectionEyebrow>OPAM / DEBRIEF REPORT</SectionEyebrow>
                <h1>A read of your own choices.</h1>
                <p>
                  Every figure below is tallied from the {answers.length} answers you gave in this mixed run. It is a mirror for practice, not an assessor’s verdict, and one sitting never tells
                  the whole story.
                </p>
              </div>
              <div className="report-actions">
                <PrintLink />
                <RestartButton onClick={start} />
              </div>
            </div>
            <div className="report-score-panel">
              <div>
                <span className="report-score-label">SITUATION JUDGEMENT</span>
                <strong>{situationPct}%</strong>
                <span className="report-score-band">BEST-FIT CHOICES IN THIS RUN</span>
              </div>
              <div className="report-score-copy">
                <p>
                  Across the {situationAnswers.length} situation prompts, you selected the best-fit action {bestFit} times. The palette below reflects how often your answers lined up with each
                  Officer Like Quality — a reading of your own endorsements, not a fixed label.
                </p>
                <div className="report-metrics">
                  <ReportMetric label="Responses" value={`${answers.length} / ${total}`} />
                  <ReportMetric label="Median latency" value={`${medianLatency} ms`} />
                  <ReportMetric label="Best-fit situations" value={`${bestFit} / ${situationAnswers.length}`} />
                  <ReportMetric label="Decided under 1s" value={`${quickDecisions}`} />
                </div>
              </div>
            </div>
            <div className="report-grid">
              <section className="report-card">
                <SectionEyebrow>MOST ENDORSED</SectionEyebrow>
                <h2>Qualities your answers leaned towards.</h2>
                <div className="report-list">
                  {strongest.map((signal, position) => (
                    <div key={signal.olq}>
                      <span>{String(position + 1).padStart(2, "0")}</span>
                      <strong>{signal.label}</strong>
                      <small>
                        Aligned on {signal.hits} of {signal.opportunities} tagged prompts ({signal.pct}%).
                      </small>
                    </div>
                  ))}
                  {strongest.length === 0 && <p className="report-empty">No tagged answers were recorded in this run.</p>}
                </div>
              </section>
              <section className="report-card growth">
                <SectionEyebrow>LEAST ENDORSED</SectionEyebrow>
                <h2>Qualities with the fewest aligned choices.</h2>
                <div className="report-list">
                  {growth.map((signal, position) => (
                    <div key={signal.olq}>
                      <span>{String(position + 1).padStart(2, "0")}</span>
                      <strong>{signal.label}</strong>
                      <small>
                        Fewer aligned choices here ({signal.pct}%). A useful place for the next deliberate rep.
                      </small>
                    </div>
                  ))}
                  {growth.length === 0 && <p className="report-empty">No tagged answers were recorded in this run.</p>}
                </div>
              </section>
            </div>
            <div className="mentor-debrief">
              <div className="mentor-debrief-label">
                <span>HOW TO READ THIS</span>
                <span>LP / MIXED 120</span>
              </div>
              <p>
                Use the two lists as a starting point, not a scoreboard. The qualities at the top are ones your choices consistently supported; the qualities at the bottom were chosen less often
                and are worth practising on purpose. Repeat the run after a gap and compare — change between sittings is the signal that matters.
              </p>
            </div>
            <TrustMark />
          </div>
        </main>
        <SiteFooter />
      </PageShell>
    );
  }

  if (!item) return null;
  const isSelf = item.type === "self";
  const isForced = item.type === "forced";
  const selfItem = item as OpamSelfItem;
  const forcedItem = item as OpamForcedItem;
  const situationItem = item as OpamSituationItem;
  return (
    <PageShell>
      <div className="assessment-shell">
        <header className="assessment-header">
          <div className="container assessment-header-inner">
            <button type="button" className="back-link" onClick={requestExit}>← Exit run</button>
            <div className="assessment-header-brand">
              <span className="brand-mark">
                <span />
                <span />
                <span />
              </span>
              <span>OPAM / {typeLabel(item.type)}</span>
            </div>
            <div className="assessment-header-right">
              <Counter current={currentGlobal} total={total} />
              <div className="soft-timer">
                <span>SOFT TIMER</span>
                <strong>{seconds}s</strong>
              </div>
            </div>
          </div>
        </header>
        <main className="assessment-run">
          <div className="container assessment-run-grid">
            <aside className="assessment-rail">
              <span className="rail-label">MIXED RUN STATUS</span>
              <div className="rail-progress">
                <span style={{ height: `${progress}%` }} />
              </div>
              <div className="rail-steps">
                <div className={isSelf ? "active" : ""}>
                  <span>01</span>
                  <small>
                    Self-description · {answeredByType.self}/{OPAM_COUNTS.self}
                  </small>
                </div>
                <div className={isForced ? "active" : ""}>
                  <span>02</span>
                  <small>
                    Forced choice · {answeredByType.forced}/{OPAM_COUNTS.forced}
                  </small>
                </div>
                <div className={item.type === "situation" ? "active" : ""}>
                  <span>03</span>
                  <small>
                    Situation reaction · {answeredByType.situation}/{OPAM_COUNTS.situation}
                  </small>
                </div>
              </div>
              <p className="rail-note">The prompt shape changes throughout the run. Once you answer, you move forward with no back navigation.</p>
            </aside>
            <section className="prompt-stage">
              <div className="prompt-meta">
                <StatusChip tone={isSituation(item) ? "olive" : isForced ? "steel" : "orange"}>{isSelf ? selfItem.trait : isForced ? "Pick the more like me" : "Choose the responsible action"}</StatusChip>
                <TrustMark />
              </div>
              <div className="prompt-card">
                <div className="prompt-label">
                  {typeLabel(item.type)}
                  {isForced ? " / BOTH OPTIONS ARE POSITIVE" : ""}
                </div>
                <h1>{itemPrompt(item)}</h1>
                {isSelf && (
                  <div className="choice-stack">
                    <ChoiceButton onClick={() => finishAnswer("agree")}>Agree</ChoiceButton>
                    <ChoiceButton onClick={() => finishAnswer("disagree")}>Disagree</ChoiceButton>
                  </div>
                )}
                {isForced && (
                  <div className="choice-stack">
                    <ChoiceButton onClick={() => finishAnswer("left")}>{forcedItem.left}</ChoiceButton>
                    <ChoiceButton onClick={() => finishAnswer("right")}>{forcedItem.right}</ChoiceButton>
                  </div>
                )}
                {!isSelf && !isForced && (
                  <div className="choice-stack">
                    {situationItem.options.map((option, optionIndex) => (
                      <ChoiceButton key={option} onClick={() => finishAnswer(String.fromCharCode(65 + optionIndex), optionIndex === situationItem.best ? 1 : 0)}>
                        {option}
                      </ChoiceButton>
                    ))}
                  </div>
                )}
                <p className="prompt-foot">
                  <span>Response latency is recorded locally.</span>
                  <span>No back navigation within the run.</span>
                </p>
              </div>
              <div className="assessment-progress">
                <ProgressTrack value={progress} />
                <span>
                  {completed} answered · {total - completed} to go
                </span>
              </div>
            </section>
          </div>
        </main>
      </div>
      {confirmExit && <ExitConfirmDialog open={confirmExit} label="OPAM" onCancel={cancelExit} onConfirm={confirmExitRun} />}
    </PageShell>
  );
}

function isSituation(item: OpamItem): item is OpamSituationItem {
  return item.type === "situation";
}
