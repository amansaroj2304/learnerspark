import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Brain, Eye, Grid3X3, Headphones, Keyboard, ScanLine, ShieldCheck, TimerReset } from "lucide-react";
import { BackLink, Counter, MiniStat, PageShell, PrimaryButton, ProgressTrack, ReportMetric, RestartButton, SectionEyebrow, SiteFooter, SiteHeader, StatusChip, TimerRing, TrustMark } from "../components/SiteChrome";
import QuestionDiagram from "../components/QuestionDiagram";
import StudentRegistration from "../components/StudentRegistration";
import LeadForm from "../components/LeadForm";
import { CSSS_SECTION_COUNTS, CSSS_TOTAL, csssBank, type CsssQuestion, type CsssSection } from "../data/csssBank";
import { isAccountServiceEnabled, recognizeStudent, saveAssessmentAttempt } from "../lib/student";
import { isLeadFormEnabled } from "../lib/leads";

type Screen = "landing" | "run" | "pause" | "results";
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
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(10);
  const [startedAt, setStartedAt] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [runPhase, setRunPhase] = useState<RunPhase>("question");
  const [studentReady, setStudentReady] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [ttsAvailable, setTtsAvailable] = useState(true);
  const [audioRevealed, setAudioRevealed] = useState(false);
  const answeringQuestionRef = useRef<string | null>(null);
  const audioPlayedQuestionRef = useRef<string | null>(null);
  const question: CsssQuestion | undefined = csssBank[index];
  const answered = answers.length;
  const progress = (index / CSSS_TOTAL) * 100;
  const nextSection = index < CSSS_TOTAL - 1 ? csssBank[index + 1].section : null;
  const sectionQuestions = useMemo(() => csssBank.filter((item) => item.section === nextSection), [nextSection]);

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

  function start() {
    if (isAccountServiceEnabled && !studentReady) { setRegistrationOpen(true); return; }
    if (isLeadFormEnabled) { setLeadOpen(true); return; }
    beginRun();
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
    if (csssBank[index + 1]?.section !== question.section) {
      setScreen("pause");
      return;
    }
    if (csssBank[index + 1]?.section === "audio") playAudioOnce(csssBank[index + 1], true);
    setIndex(index + 1);
  }

  function continueSection() {
    if (csssBank[index + 1]?.section === "audio") playAudioOnce(csssBank[index + 1], true);
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
    const done = answers.filter((item) => csssBank[item.index].section === key);
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
    const miss = answers.find((item) => csssBank[item.index].section === key && !item.correct);
    return miss ? csssBank[miss.index].explanation : "Clean run in this section — keep the same pace and method.";
  }

  if (screen === "landing") return <PageShell><SiteHeader /><main className="assessment-landing csss-landing"><div className="container assessment-landing-grid"><div><BackLink /><div className="assessment-kicker"><span className="assessment-badge olive">CSSS</span><span>COMPUTERISED SELECTION SCREENING SYSTEM</span></div><h1>Stay useful when the clock gets loud.</h1><p className="assessment-lead">CSSS now runs as a full 70-question cognitive battery across working memory, spatial perception, verbal + non-verbal reasoning, linguistic ability, and auditory discrimination.</p><PrimaryButton onClick={start}>Start the full practice set</PrimaryButton><p className="assessment-note"><ShieldCheck size={14} /> This is original practice content, not official board questions.</p></div><div className="assessment-spec csss-spec"><div className="spec-heading"><ScanLine size={21} /><span>THE RUN / FULL BANK</span></div><div className="spec-number">70</div><p>15 memory · 15 spatial · 15 reasoning · 15 language · 10 audio</p><div className="spec-list"><div><TimerReset size={16} /><span>5 sections / timers shortened by 10 sec</span></div><div><Keyboard size={16} /><span>once answered, no back navigation</span></div><div><AudioLines size={16} /><span>audio task plays once automatically</span></div></div><div className="spec-foot"><span>5—12 SEC</span><span>NO BACK</span></div></div></div><div className="container"><div className="assessment-legal"><strong>Read this first.</strong><span>Run the full bank in a quiet place. Listen once during the auditory task, then select the sequence you heard. The spoken content is intentionally not shown on screen.</span></div></div></main><SiteFooter />{registrationOpen && <StudentRegistration onClose={() => setRegistrationOpen(false)} onReady={() => { setStudentReady(true); setRegistrationOpen(false); beginRun(); }} />}{leadOpen && <LeadForm testLabel="CSSS" onClose={() => setLeadOpen(false)} onProceed={() => { setLeadOpen(false); beginRun(); }} />}</PageShell>;

  if (screen === "pause" && question && nextSection) {
    const NextMeta = sectionMeta[nextSection];
    return <PageShell><div className="assessment-shell"><header className="assessment-header"><div className="container assessment-header-inner"><BackLink /><div className="assessment-header-brand"><span className="brand-mark"><span /><span /><span /></span><span>CSSS / SECTION BREAK</span></div><span className="pause-label">PAUSE</span></div></header><main className="section-pause"><div className="pause-card"><span className="assessment-badge orange">NEXT SECTION</span><h1>{NextMeta.label}</h1><p>Take one breath. The task shape changes here. The clock resets when you continue.</p><div className="pause-spec"><div><span>Questions</span><strong>{sectionQuestions.length}</strong></div><div><span>Per question</span><strong>{csssBank[index + 1].duration}s</strong></div><div><span>Direction</span><strong>No back</strong></div></div><PrimaryButton onClick={continueSection}>Continue to section</PrimaryButton></div></main></div></PageShell>;
  }

  if (screen === "results") {
    const scores = sectionOrder.map((key) => ({ key, ...getSectionScore(key) }));
    const overall = Math.round(scores.reduce((sum, score) => sum + score.accuracy, 0) / scores.length);
    const band = overall >= 75 ? "Strong" : overall >= 55 ? "Competitive" : "Needs work";
    const median = Math.round(answers.map((item) => item.latency).sort((a, b) => a - b)[Math.floor(answers.length / 2)] || 0);
    return <PageShell><SiteHeader /><main className="report-page csss-results"><div className="container report-shell"><div className="report-top"><div><SectionEyebrow>CSSS / RESULTS READOUT</SectionEyebrow><h1>Keep the signal. Adjust the method.</h1><p>This is a practice benchmark for all 70 questions, not a forecast of an official screening result.</p></div><div className="report-actions"><RestartButton onClick={start} /></div></div><div className="report-score-panel csss-score"><div><span className="report-score-label">OVERALL BAND</span><strong className="band-word">{band}</strong><span className="report-score-band">{overall}% accuracy across full bank</span></div><div className="report-score-copy"><p>Notice the split between speed and accuracy. A strong next rep usually targets the section that became noisy, not the one that felt comfortable.</p><div className="report-metrics"><ReportMetric label="Questions" value={`${answers.length} / ${CSSS_TOTAL}`} /><ReportMetric label="Median latency" value={`${median}ms`} /><ReportMetric label="Correct" value={`${answers.filter((item) => item.correct).length} / ${CSSS_TOTAL}`} /></div></div></div><div className="csss-section-results">{scores.map((score) => { const Meta = sectionMeta[score.key]; const Icon = Meta.icon; return <article key={score.key} className="csss-section-result"><div className="csss-result-head"><span className="csss-result-icon"><Icon size={18} /></span><div><strong>{Meta.label}</strong><small>{score.answered} / {Meta.count}</small></div><StatusChip tone={score.accuracy >= 75 ? "orange" : score.accuracy >= 50 ? "olive" : "steel"}>{score.accuracy >= 75 ? "Strong" : score.accuracy >= 50 ? "Competitive" : "Needs work"}</StatusChip></div><div className="csss-result-stats"><MiniStat label="accuracy" value={`${score.accuracy}%`} /><MiniStat label="avg latency" value={`${score.speed}ms`} /></div><p className="csss-result-cue"><strong>Review cue</strong>{getReviewCue(score.key)}</p><ProgressTrack value={score.accuracy} tone={score.accuracy >= 75 ? "orange" : "olive"} /></article>; })}</div><div className="mentor-debrief"><div className="mentor-debrief-label"><span>NEXT REP</span><span>CSSS / 70</span></div><p>Start with the section that went noisy, not the one that felt comfortable. For memory, reset your eyes between items. For spatial, draw the fold in your head. For audio, do not rehearse the sound — listen, decide, move.</p></div><TrustMark /></div></main><SiteFooter /></PageShell>;
  }

  if (!question) return null;
  const Meta = sectionMeta[question.section];
  const Icon = Meta.icon;
    return <PageShell><div className="assessment-shell"><header className="assessment-header"><div className="container assessment-header-inner"><BackLink label="Exit run" /><div className="assessment-header-brand"><span className="brand-mark"><span /><span /><span /></span><span>CSSS / {Meta.label}</span></div><div className="assessment-header-right"><Counter current={index + 1} total={CSSS_TOTAL} /><TimerRing seconds={seconds} total={question.duration} /></div></div></header><main className="assessment-run csss-run"><div className="container assessment-run-grid"><aside className="assessment-rail"><span className="rail-label">BATTERY STATUS</span><div className="rail-progress"><span style={{ height: `${progress}%` }} /></div><div className="rail-steps">{sectionOrder.map((key, step) => { const StepIcon = sectionMeta[key].icon; const active = key === question.section; const done = sectionOrder.indexOf(question.section) > step; return <div key={key} className={`${active ? "active" : ""} ${done ? "done" : ""}`}><span>{String(step + 1).padStart(2, "0")}</span><small><StepIcon size={13} />{sectionMeta[key].label} · {CSSS_SECTION_COUNTS[key]}</small></div>; })}</div><p className="rail-note">{runPhase === "flash" ? "Memorise the sequence. It will disappear once." : "The sequence has flashed once. Answer from memory; no replay is available."}</p></aside><section className="prompt-stage"><div className="prompt-meta"><StatusChip tone="orange"><Icon size={14} /> {Meta.count}</StatusChip><span className="prompt-type">{formatQuestionType(question.subtype)}</span><TrustMark /></div>{runPhase === "flash" && question.flashText ? <div className="prompt-card csss-prompt-card memory-flash" aria-live="assertive"><div className="prompt-label">WORKING MEMORY / FLASH ONCE</div><div className="flash-sequence">{question.flashText}</div><p className="prompt-foot"><span>Memorise now.</span><span>Sequence disappears after one flash.</span></p></div> : <div className="prompt-card csss-prompt-card"><div className="prompt-label">{question.sectionLabel.toUpperCase()}</div>{question.visual ? <QuestionDiagram type={question.visual} label={`${formatQuestionType(question.subtype)} diagram`} /> : null}<h1>{question.prompt}</h1>{question.section === "audio" && audioRevealed && question.audioText ? <div className="audio-assist" role="note"><span className="audio-assist-label">TRANSCRIPT</span><span className="audio-assist-text">{question.audioText}</span></div> : null}{question.section === "audio" && !audioRevealed && ttsAvailable ? <button type="button" className="audio-assist-trigger" onClick={() => setAudioRevealed(true)}>Couldn’t hear the cue? Show the text instead</button> : null}<div className="choice-stack">{question.options.map((option, optionIndex) => <button type="button" key={`${question.id}-${option}`} className="csss-option" onClick={() => advance(optionIndex)}><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span></button>)}</div><p className="prompt-foot"><span>One direction only.</span><span>{question.section === "audio" ? "Listen once, then answer." : "Response time stays local."}</span></p></div>}<div className="assessment-progress"><ProgressTrack value={progress} /><span>{answered} answered · {CSSS_TOTAL - answered} to go</span></div></section></div></main></div></PageShell>;
}
