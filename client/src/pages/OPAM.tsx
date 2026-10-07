import { useEffect, useRef, useState } from "react";
import { Clock3, Fingerprint, HeartHandshake, ShieldCheck, TimerReset } from "lucide-react";
import { BackLink, ChoiceButton, Counter, PageShell, PrimaryButton, ProgressTrack, PrintLink, ReportMetric, RestartButton, SectionEyebrow, SiteFooter, SiteHeader, StatusChip, TrustMark } from "../components/SiteChrome";
import StudentRegistration from "../components/StudentRegistration";
import LeadForm from "../components/LeadForm";
import { mixedOpamItems, opamBank, selfItems, OPAM_COUNTS, type OpamForcedItem, type OpamItem, type OpamSelfItem, type OpamSituationItem } from "../data/opamBank";
import { isAccountServiceEnabled, recognizeStudent, saveAssessmentAttempt } from "../lib/student";
import { isLeadFormEnabled } from "../lib/leads";

type Screen = "landing" | "run" | "report";
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
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(15);
  const [startedAt, setStartedAt] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [studentReady, setStudentReady] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const answeringItemRef = useRef<string | null>(null);
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

  function beginRun() {
    answeringItemRef.current = null;
    setScreen("run");
    setIndex(0);
    setAnswers([]);
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
    beginRun();
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
    return (
      <PageShell>
        <SiteHeader />
        <main className="assessment-landing">
          <div className="container assessment-landing-grid">
            <div>
              <BackLink />
              <div className="assessment-kicker">
                <span className="assessment-badge orange">OPAM</span>
                <span>PERSONALITY ASSESSMENT MODULE</span>
              </div>
              <h1>
                Answer as <em>you</em> are, not as an ideal officer.
              </h1>
              <p className="assessment-lead">
                The full bank runs through 120 original prompts in a mixed sequence. Self-description, forced choice, and situation reaction items keep changing shape so you practise staying
                consistent rather than memorising a rhythm.
              </p>
              <PrimaryButton onClick={start}>Start the assessment</PrimaryButton>
              <p className="assessment-note">
                <ShieldCheck size={14} />{" "}
                {isAccountServiceEnabled ? "Your answers sync to your profile so results carry across attempts." : "Results are saved on this device only."}
              </p>
            </div>
            <div className="assessment-spec">
              <div className="spec-heading">
                <Fingerprint size={21} />
                <span>THE RUN / MIXED BANK</span>
              </div>
              <div className="spec-number">120</div>
              <p>
                {OPAM_COUNTS.self} self-description · {OPAM_COUNTS.forced} forced choice · {OPAM_COUNTS.situation} situations
              </p>
              <div className="spec-list">
                <div>
                  <Clock3 size={16} />
                  <span>15 sec soft timer per response</span>
                </div>
                <div>
                  <TimerReset size={16} />
                  <span>question shape changes throughout</span>
                </div>
                <div>
                  <HeartHandshake size={16} />
                  <span>answer honestly, not ideally</span>
                </div>
              </div>
              <div className="spec-foot">
                <span>NO BACK NAVIGATION</span>
                <span>MIXED SEQUENCE</span>
              </div>
            </div>
          </div>
          <div className="container">
            <div className="assessment-legal">
              <strong>Read this first.</strong>
              <span>
                There are no “correct” personality answers in self-description or forced choice. Situation items use a best-fit response only to make the debrief actionable. This is original
                practice content, not an official board instrument.
              </span>
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
              beginRun();
            }}
          />
        )}
        {leadOpen && (
          <LeadForm
            testLabel="OPAM"
            onClose={() => setLeadOpen(false)}
            onProceed={() => {
              setLeadOpen(false);
              beginRun();
            }}
          />
        )}
      </PageShell>
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
            <BackLink label="Exit run" />
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
    </PageShell>
  );
}

function isSituation(item: OpamItem): item is OpamSituationItem {
  return item.type === "situation";
}
