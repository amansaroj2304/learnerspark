import { useState, type FormEvent } from "react";
import { ShieldCheck, X } from "lucide-react";
import { submitLead } from "../lib/leads";

type Props = { testLabel: string; onClose: () => void; onProceed: () => void };

const phonePattern = "[+]?[0-9\\s\\-]{10,17}";

export default function LeadForm({ testLabel, onClose, onProceed }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await submitLead({ name, email, phone });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please check the form and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="student-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="lead-form-title">
      <div className="student-modal">
        <button type="button" className="student-modal-close" aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
        {done ? (
          <div className="student-success">
            <span className="student-success-icon">✓</span>
            <p className="eyebrow">YOU'RE ON THE LIST</p>
            <h2>Thanks, {name.split(" ")[0] || "aspirant"}.</h2>
            <p>
              We'll email your {testLabel} practice details and test-series updates to <strong>{email}</strong>.
            </p>
            <button className="primary-button" type="button" onClick={onProceed}>
              Start the {testLabel} test <span>↗</span>
            </button>
          </div>
        ) : (
          <>
            <div className="student-form-heading">
              <span className="assessment-badge olive">FREE TEST SERIES</span>
              <h2 id="lead-form-title">Get your score report by email.</h2>
              <p>Add your details to receive your {testLabel} practice report, curated mentorship and test-series updates from Learners Park.</p>
            </div>
            <form className="student-form" onSubmit={submit}>
              <label>
                Full name
                <input required type="text" placeholder="e.g. Rahul Sharma" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label>
                Email address
                <input required type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label>
                Mobile number
                <input required type="tel" pattern={phonePattern} placeholder="+91 98765 43210" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>
              <label aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
                Company
                <input type="text" tabIndex={-1} autoComplete="off" value={company} onChange={(event) => setCompany(event.target.value)} />
              </label>
              <p className="student-privacy">
                <ShieldCheck size={14} /> We use your details only to send your report and related test-series updates. No spam, and you can opt out anytime.
              </p>
              {error && <p className="student-form-error">{error}</p>}
              <button className="primary-button" disabled={saving} type="submit">
                {saving ? "Sending…" : "Send my details and continue ↗"}
              </button>
            </form>
            <button type="button" className="student-secondary-action" onClick={onProceed}>
              Skip and start the test
            </button>
          </>
        )}
      </div>
    </div>
  );
}
