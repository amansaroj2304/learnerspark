import { PageShell, PrimaryButton, SiteFooter, SiteHeader } from "./SiteChrome";

type InstructionsProps = {
  label: string;
  questions: number;
  minutes: number;
  audio?: boolean;
  onBegin: () => void;
  onBack: () => void;
};

export function TestInstructions({ label, questions, minutes, audio = false, onBegin, onBack }: InstructionsProps) {
  const steps: { title: string; body: string }[] = [
    { title: "Keep an eye on the timer.", body: "Every prompt is timed. When the clock runs out the test moves on by itself." },
    { title: "No back navigation.", body: "Once you answer, you move forward — you cannot return to a previous prompt." },
    { title: "Answer at a steady pace.", body: "Don't overthink any single item. Your first honest instinct is usually the most useful." },
    { title: "Stay on this tab.", body: "Refreshing, switching away, or closing the browser can end your attempt." },
    audio
      ? { title: "Sound on.", body: "Some items play a short audio cue once. Use headphones in a quiet room." }
      : { title: "Find a quiet spot.", body: "A calm, distraction-free room gives you your most honest result." },
    { title: "One sitting is a signal, not a verdict.", body: "Use the debrief to plan your next deliberate rep." },
  ];

  return (
    <PageShell>
      <SiteHeader />
      <main className="section-pause briefing-page">
        <div className="pause-card briefing-card">
          <span className="assessment-badge olive">{label}</span>
          <h1 className="briefing-title">Before you begin.</h1>
          <p className="briefing-intro">Read these once. The test is timed and moves forward automatically, so settle in before you start.</p>
          <div className="pause-spec">
            <div>
              <span>Questions</span>
              <strong>{questions}</strong>
            </div>
            <div>
              <span>Duration</span>
              <strong>~{minutes} min</strong>
            </div>
            <div>
              <span>Going back</span>
              <strong>Not allowed</strong>
            </div>
          </div>
          <ol className="briefing-list">
            {steps.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <span>{step.body}</span>
              </li>
            ))}
          </ol>
          <div className="briefing-actions">
            <button type="button" className="back-link briefing-back" onClick={onBack}>← Back to tests</button>
            <PrimaryButton onClick={onBegin}>Begin test</PrimaryButton>
          </div>
        </div>
      </main>
      <SiteFooter />
    </PageShell>
  );
}

type ExitDialogProps = {
  open: boolean;
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ExitConfirmDialog({ open, label, onCancel, onConfirm }: ExitDialogProps) {
  if (!open) return null;
  return (
    <div className="student-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="exit-dialog-title">
      <div className="student-modal confirm-modal">
        <h2 id="exit-dialog-title">Close the {label} test?</h2>
        <p>Your progress in this attempt will be lost and you'll return to the test list.</p>
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" onClick={onCancel}>Keep going</button>
          <button type="button" className="confirm-exit" onClick={onConfirm}>Yes, close</button>
        </div>
      </div>
    </div>
  );
}
