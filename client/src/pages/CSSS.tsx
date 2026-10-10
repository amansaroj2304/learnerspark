import { useEffect, useMemo, useRef, useState } from "react";
import { Award, Brain, Clock, Eye, Grid3X3, Headphones, Keyboard, ListChecks } from "lucide-react";
import { BackLink, Counter, MiniStat, PageShell, PrimaryButton, ProgressTrack, ReportMetric, RestartButton, SectionEyebrow, SiteFooter, SiteHeader, StatusChip, TimerRing, TrustMark } from "../components/SiteChrome";
import QuestionDiagram from "../components/QuestionDiagram";
import StudentRegistration from "../components/StudentRegistration";
import LeadForm from "../components/LeadForm";
import { ExitConfirmDialog, TestInstructions } from "../components/TestInstructions";
import { CSSS_SECTION_COUNTS, CSSS_TOTAL, type CsssQuestion, type CsssSection } from "../data/csssBank";
import { csssSets } from "../data/csssSets";
import { isAccountServiceEnabled, recognizeStudent, saveAssessmentAttempt } from "../lib/student";
import { isLeadFormEnabled } from "../lib/leads";

type Screen = "landing" | "briefing" | "run" | "pause" | "results";
type RunPhase = "flash" | "question";

const sectionMeta: Record<CsssSection, { label: string; icon: typeof Brain; count: string }> = {
  memory: { label: "Working memory", icon: Brain, count: `${CSSS_SECTION_COUNTS.memory}Q / 5s` },
  spatial: { label: "Spatial perception", icon: Eye, count: `${CSSS_SECTION_COUNTS.spatial}Q / 12s` },
  pattern: { label: "Verbal + non-verbal reasoning", icon: Grid3X3, count: `${CSSS_SECTION_COUNTS.pattern}Q / 10s` },
  language: { label: "Linguistic ability", icon: Keyboard, count: `${CSSS_SECTION_COUNTS.language}Q / 6s` },
  audio: { label: "Auditory discrimination", icon: Headphones, count: `${CSSS_SECTION_COUNTS.audio}Q / 6s` },
};

const sectionOrder: CsssSection[] = ["memory", "spatial", "pattern", "language", "audio"];
type Answer = { index: number; answer: number; latency: number; correct: boolean };

function formatQuestionType(subtype: string) {
  return subtype
    .replace(/_audio$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CSSS() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [seriesFilter, setSeriesFilter] = useState<"all" | "full" | "section">("all");
  const [activeSet, setActiveSet] = useState(0);
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(10);
  const [startedAt, setStartedAt] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [runPhase, setRunPhase] = useState<RunPhase>("question");
  const [studentReady, setStudentReady] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [ttsAvailable, setTtsAvailable] = useState(true);
  const [audioRevealed, setAudioRevealed] = useState(false);
  const answeringQuestionRef = useRef<string | null>(null);
  const audioPlayedQuestionRef = useRef<string | null>(null);
  const exitConfirmRef = useRef(false);
  const bank = csssSets[activeSet].questions;
  const question: CsssQuestion | undefined = bank[index];
  const answered = answers.length;
  const progress = (index / CSSS_TOTAL) * 100;
  const nextSection = index < CSSS_TOTAL - 1 ? bank[index + 1].section : null;
  const sectionQuestions = useMemo(() => bank.filter((item) => item.section === nextSection), [nextSection, bank]);

  useEffect(() => {
    recognizeStudent().then((student) => {
      setStudentReady(Boolean(student));
      if (student) setRegistrationOpen(false);
    });
    setTtsAvailable(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    if (screen !== "run" || !question) return;
    answeringQuestionRef.current = null;
    const shouldFlash = question.section === "memory" && Boolean(question.flashText);
    setRunPhase(shouldFlash ? "flash" : "question");
    setSeconds(question.duration);
    setAudioRevealed(question.section === "audio" && !ttsAvailable);
    playAudioOnce(question);
    let timer: number | undefined;
    let flashTimer: number | undefined;
    const beginTimer = () => {
      setStartedAt(performance.now());
      timer = window.setInterval(() => setSeconds((value) => {
        if (exitConfirmRef.current) return value;
        if (value <= 1) {
          if (timer) window.clearInterval(timer);
          advance(-1);
          return question.duration;
        }
        return value - 1;
      }), 1000);
    };
    if (shouldFlash) flashTimer = window.setTimeout(() => { setRunPhase("question"); beginTimer(); }, 900);
    else beginTimer();
    return () => {
      if (timer) window.clearInterval(timer);
      if (flashTimer) window.clearTimeout(flashTimer);
    };
  }, [screen, index]);

  function beginRun() {
    answeringQuestionRef.current = null;
    audioPlayedQuestionRef.current = null;
    setScreen("run");
    setIndex(0);
    setRunPhase("question");
    setAnswers([]);
  }

  function beginBriefing() {
    setScreen("briefing");
  }

  function start(setIdx: number = activeSet) {
    setActiveSet(setIdx);
    if (isAccountServiceEnabled && !studentReady) { setRegistrationOpen(true); return; }
    if (isLeadFormEnabled) { setLeadOpen(true); return; }
    beginBriefing();
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
    answeringQuestionRef.current = null;
    setScreen("landing");
  }

  function advance(answer: number) {
    if (!question || answeringQuestionRef.current === question.id) return;
    answeringQuestionRef.current = question.id;
    const next = [...answers, { index, answer, latency: Math.round(performance.now() - startedAt), correct: answer === question.answer }];
    setAnswers(next);
    if (index >= CSSS_TOTAL - 1) {
      localStorage.setItem("learnerspark-csss-result", JSON.stringify({ answers: next, savedAt: new Date().toISOString(), bankSize: CSSS_TOTAL }));
      saveAssessmentAttempt("csss", "CSSS Cognitive Battery", next.filter((item) => item.correct).length, Math.round((next.filter((item) => item.correct).length / CSSS_TOTAL) * 100));
      setScreen("results");
      return;
    }
    if (bank[index + 1]?.section !== question.section) {
      setScreen("pause");
      return;
    }
    if (bank[index + 1]?.section === "audio") playAudioOnce(bank[index + 1], true);
    setIndex(index + 1);
  }

  function continueSection() {
    if (bank[index + 1]?.section === "audio") playAudioOnce(bank[index + 1], true);
    setIndex(index + 1);
    setScreen("run");
  }

  function playAudioOnce(target: CsssQuestion, immediate = false) {
    if (target.section !== "audio" || audioPlayedQuestionRef.current === target.id) return;
    audioPlayedQuestionRef.current = target.id;
    if (!ttsAvailable) {
      // No speech engine on this device: keep the item answerable by showing the cue.
      setAudioRevealed(true);
      return;
    }
    if (immediate) playAudioCue(target);
    else window.setTimeout(() => playAudioCue(target), 80);
  }

  function playAudioCue(target: CsssQuestion = question as CsssQuestion) {
    const sequence = target?.audioText;
    if (sequence && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sequence.split(/[–-]/).join(" ... "));
      utterance.rate = 0.72;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
      return;
    }
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = 740;
    oscillator.type = "sine";
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.22);
  }

  function getSectionScore(key: CsssSection) {
    const done = answers.filter((item) => bank[item.index].section === key);
    const correct = done.filter((item) => item.correct).length;
    return {
      correct,
      total: CSSS_SECTION_COUNTS[key],
      answered: done.length,
      accuracy: Math.round((correct / Math.max(done.length, 1)) * 100),
      speed: Math.round(done.reduce((sum, item) => sum + item.latency, 0) / Math.max(done.length, 1)),
    };
  }

  function getReviewCue(key: CsssSection) {
    const miss = answers.find((item) => bank[item.index].section === key && !item.correct);
    return miss ? bank[miss.index].explanation : "Clean run in this section — keep the same pace and method.";
  }

  if (screen === "landing") {
    const seriesTests: { id: number; title: string; tags: [string, string]; questions: number; marks: number; minutes: number; unlocked: boolean; kind: "Full Test" | "Section Test"; setIndex?: number }[] = [
      { id: 1, title: "CSSS 1", tags: ["Full Test", "All Sections"], questions: CSSS_TOTAL, marks: CSSS_TOTAL, minutes: 10, unlocked: true, kind: "Full Test", setIndex: 0 },
      { id: 2, title: "CSSS 2", tags: ["Full Test", "All Sections"], questions: CSSS_TOTAL, marks: CSSS_TOTAL, minutes: 10, unlocked: true, kind: "Full Test", setIndex: 1 },
      { id: 3, title: "CSSS 3", tags: ["Full Test", "All Sections"], questions: CSSS_TOTAL, marks: CSSS_TOTAL, minutes: 10, unlocked: true, kind: "Full Test", setIndex: 2 },
      { id: 4, title: "CSSS 4", tags: ["Section Test", "Working Memory"], questions: CSSS_SECTION_COUNTS.memory, marks: CSSS_SECTION_COUNTS.memory, minutes: 3, unlocked: false, kind: "Section Test" },
      { id: 5, title: "CSSS 5", tags: ["Section Test", "Spatial Perception"], questions: CSSS_SECTION_COUNTS.spatial, marks: CSSS_SECTION_COUNTS.spatial, minutes: 4, unlocked: false, kind: "Section Test" },
      { id: 6, title: "CSSS 6", tags: ["Section Test", "Reasoning"], questions: CSSS_SECTION_COUNTS.pattern, marks: CSSS_SECTION_COUNTS.pattern, minutes: 4, unlocked: false, kind: "Section Test" },
      { id: 7, title: "CSSS 7", tags: ["Section Test", "Linguistic Ability"], questions: CSSS_SECTION_COUNTS.language, marks: CSSS_SECTION_COUNTS.language, minutes: 3, unlocked: false, kind: "Section Test" },
      { id: 8, title: "CSSS 8", tags: ["Section Test", "Auditory"], questions: CSSS_SECTION_COUNTS.audio, marks: CSSS_SECTION_COUNTS.audio, minutes: 2, unlocked: false, kind: "Section Test" },
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
        <main className="series-page csss-landing">
          <div className="container series-grid">
            <div className="series-main">
              <div className="series-head">
                <span className="assessment-badge olive">CSSS</span>
                <span className="series-eyebrow">COMPUTERISED SELECTION SCREENING SYSTEM</span>
              </div>
              <h1 className="series-title">All Tests <span>({seriesTests.length})</span></h1>
              <p className="series-lead">A full 70-question cognitive battery across working memory, spatial perception, verbal + non-verbal reasoning, linguistic ability, and auditory discrimination.</p>
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
                      {test.unlocked ? <button type="button" className="series-start" onClick={() => start(test.setIndex ?? 0)}>Start Test</button> : <button type="button" className="series-start is-locked" disabled>Unlock soon</button>}
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
                  <div><span>Full tests</span><strong>3</strong></div>
                  <div><span>Section tests</span><strong>5</strong></div>
                  <div><span>Free access</span><strong>3</strong></div>
                </div>
                <p className="series-total-note">Three full batteries are open. Section tests unlock soon.</p>
              </div>
            </aside>
          </div>
          <div className="container">
            <div className="assessment-legal"><strong>Read this first.</strong><span>Run the full bank in a quiet place. Listen once during the auditory task, then select the sequence you heard. The spoken content is intentionally not shown on screen.</span></div>
          </div>
        </main>
        <SiteFooter />
        {registrationOpen && <StudentRegistration onClose={() => setRegistrationOpen(false)} onReady={() => { setStudentReady(true); setRegistrationOpen(false); beginBriefing(); }} />}
        {leadOpen && <LeadForm testLabel="CSSS" onClose={() => setLeadOpen(false)} onProceed={() => { setLeadOpen(false); beginBriefing(); }} />}
      </PageShell>
    );
  }

  if (screen === "briefing") {
    return <TestInstructions label="CSSS" questions={CSSS_TOTAL} minutes={10} audio onBegin={beginRun} onBack={() => setScreen("landing")} />;
  }

  if (screen === "pause" && question && nextSection) {
    const NextMeta = sectionMeta[nextSection];
    return <PageShell><div className="assessment-shell"><header className="assessment-header"><div className="container assessment-header-inner"><BackLink /><div className="assessment-header-brand"><span className="brand-mark"><span /><span /><span /></span><span>CSSS / SECTION BREAK</span></div><span className="pause-label">PAUSE</span></div></header><main className="section-pause"><div className="pause-card"><span className="assessment-badge orange">NEXT SECTION</span><h1>{NextMeta.label}</h1><p>Take one breath. The task shape changes here. The clock resets when you continue.</p><div className="pause-spec"><div><span>Questions</span><strong>{sectionQuestions.length}</strong></div><div><span>Per question</span><strong>{bank[index + 1].duration}s</strong></div><div><span>Direction</span><strong>No back</strong></div></div><PrimaryButton onClick={continueSection}>Continue to section</PrimaryButton></div></main></div></PageShell>;
  }

  if (screen === "results") {
    const scores = sectionOrder.map((key) => ({ key, ...getSectionScore(key) }));
    const overall = Math.round(scores.reduce((sum, score) => sum + score.accuracy, 0) / scores.length);
    const band = overall >= 75 ? "Strong" : overall >= 55 ? "Competitive" : "Needs work";
    const median = Math.round(answers.map((item) => item.latency).sort((a, b) => a - b)[Math.floor(answers.length / 2)] || 0);
    return <PageShell><SiteHeader /><main className="report-page csss-results"><div className="container report-shell"><div className="report-top"><div><SectionEyebrow>CSSS / RESULTS READOUT</SectionEyebrow><h1>Keep the signal. Adjust the method.</h1><p>This is a practice benchmark for all 70 questions, not a forecast of an official screening result.</p></div><div className="report-actions"><RestartButton onClick={() => start()} /></div></div><div className="report-score-panel csss-score"><div><span className="report-score-label">OVERALL BAND</span><strong className="band-word">{band}</strong><span className="report-score-band">{overall}% accuracy across full bank</span></div><div className="report-score-copy"><p>Notice the split between speed and accuracy. A strong next rep usually targets the section that became noisy, not the one that felt comfortable.</p><div className="report-metrics"><ReportMetric label="Questions" value={`${answers.length} / ${CSSS_TOTAL}`} /><ReportMetric label="Median latency" value={`${median}ms`} /><ReportMetric label="Correct" value={`${answers.filter((item) => item.correct).length} / ${CSSS_TOTAL}`} /></div></div></div><div className="csss-section-results">{scores.map((score) => { const Meta = sectionMeta[score.key]; const Icon = Meta.icon; return <article key={score.key} className="csss-section-result"><div className="csss-result-head"><span className="csss-result-icon"><Icon size={18} /></span><div><strong>{Meta.label}</strong><small>{score.answered} / {Meta.count}</small></div><StatusChip tone={score.accuracy >= 75 ? "orange" : score.accuracy >= 50 ? "olive" : "steel"}>{score.accuracy >= 75 ? "Strong" : score.accuracy >= 50 ? "Competitive" : "Needs work"}</StatusChip></div><div className="csss-result-stats"><MiniStat label="accuracy" value={`${score.accuracy}%`} /><MiniStat label="avg latency" value={`${score.speed}ms`} /></div><p className="csss-result-cue"><strong>Review cue</strong>{getReviewCue(score.key)}</p><ProgressTrack value={score.accuracy} tone={score.accuracy >= 75 ? "orange" : "olive"} /></article>; })}</div><div className="mentor-debrief"><div className="mentor-debrief-label"><span>NEXT REP</span><span>CSSS / 70</span></div><p>Start with the section that went noisy, not the one that felt comfortable. For memory, reset your eyes between items. For spatial, draw the fold in your head. For audio, do not rehearse the sound — listen, decide, move.</p></div><TrustMark /></div></main><SiteFooter /></PageShell>;
  }

  if (!question) return null;
  const Meta = sectionMeta[question.section];
  const Icon = Meta.icon;
    return <PageShell><div className="assessment-shell"><header className="assessment-header"><div className="container assessment-header-inner"><button type="button" className="back-link" onClick={requestExit}>← Exit run</button><div className="assessment-header-brand"><span className="brand-mark"><span /><span /><span /></span><span>CSSS / {Meta.label}</span></div><div className="assessment-header-right"><Counter current={index + 1} total={CSSS_TOTAL} /><TimerRing seconds={seconds} total={question.duration} /></div></div></header><main className="assessment-run csss-run"><div className="container assessment-run-grid"><aside className="assessment-rail"><span className="rail-label">BATTERY STATUS</span><div className="rail-progress"><span style={{ height: `${progress}%` }} /></div><div className="rail-steps">{sectionOrder.map((key, step) => { const StepIcon = sectionMeta[key].icon; const active = key === question.section; const done = sectionOrder.indexOf(question.section) > step; return <div key={key} className={`${active ? "active" : ""} ${done ? "done" : ""}`}><span>{String(step + 1).padStart(2, "0")}</span><small><StepIcon size={13} />{sectionMeta[key].label} · {CSSS_SECTION_COUNTS[key]}</small></div>; })}</div><p className="rail-note">{runPhase === "flash" ? "Memorise the sequence. It will disappear once." : "The sequence has flashed once. Answer from memory; no replay is available."}</p></aside><section className="prompt-stage"><div className="prompt-meta"><StatusChip tone="orange"><Icon size={14} /> {Meta.count}</StatusChip><span className="prompt-type">{formatQuestionType(question.subtype)}</span><TrustMark /></div>{runPhase === "flash" && question.flashText ? <div className="prompt-card csss-prompt-card memory-flash" aria-live="assertive"><div className="prompt-label">WORKING MEMORY / FLASH ONCE</div><div className="flash-sequence">{question.flashText}</div><p className="prompt-foot"><span>Memorise now.</span><span>Sequence disappears after one flash.</span></p></div> : <div className="prompt-card csss-prompt-card"><div className="prompt-label">{question.sectionLabel.toUpperCase()}</div>{question.visual ? <QuestionDiagram type={question.visual} label={`${formatQuestionType(question.subtype)} diagram`} /> : null}<h1>{question.prompt}</h1>{question.section === "audio" && audioRevealed && question.audioText ? <div className="audio-assist" role="note"><span className="audio-assist-label">TRANSCRIPT</span><span className="audio-assist-text">{question.audioText}</span></div> : null}{question.section === "audio" && !audioRevealed && ttsAvailable ? <button type="button" className="audio-assist-trigger" onClick={() => setAudioRevealed(true)}>Couldn’t hear the cue? Show the text instead</button> : null}<div className="choice-stack">{question.options.map((option, optionIndex) => <button type="button" key={`${question.id}-${option}`} className="csss-option" onClick={() => advance(optionIndex)}><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span></button>)}</div><p className="prompt-foot"><span>One direction only.</span><span>{question.section === "audio" ? "Listen once, then answer." : "Response time stays local."}</span></p></div>}<div className="assessment-progress"><ProgressTrack value={progress} /><span>{answered} answered · {CSSS_TOTAL - answered} to go</span></div></section></div></main></div>{confirmExit && <ExitConfirmDialog open={confirmExit} label="CSSS" onCancel={cancelExit} onConfirm={confirmExitRun} />}</PageShell>;
}
