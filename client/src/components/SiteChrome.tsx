import { Link, useLocation } from "wouter";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, Menu, ShieldCheck, X } from "lucide-react";

const navItems = [
  { label: "Practice", href: "/csss", status: "Live" },
  { label: "Briefs", href: "/briefs", status: "Next" },
  { label: "Guides", href: "/guides", status: "Next" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand-lockup" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span><strong className="brand-name">Learners Park</strong><small className="brand-tagline">Train like the board tests you.</small></span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navItems.map((item) => <Link key={item.label} href={item.href} className={`nav-link ${item.href === "/csss" && ["/csss", "/opam"].includes(location) || location === item.href ? "is-active" : ""}`}>{item.label}<span className="nav-status">{item.status}</span></Link>)}
          <Link href="/opam" className="nav-cta">Start a drill <ArrowUpRight size={15} /></Link>
          <Link href="/founder" className="founder-nav-link">Contact your mentors</Link>
        </nav>
        <button className="icon-button mobile-only" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
      {open && <div className="mobile-menu mobile-only"><div className="container mobile-menu-inner">{navItems.map((item) => <Link key={item.label} href={item.href} className="mobile-nav-link" onClick={() => setOpen(false)}><span>{item.label}</span><span className="nav-status">{item.status}</span></Link>)}<Link href="/opam" className="nav-cta mobile-cta" onClick={() => setOpen(false)}>Start a drill <ArrowUpRight size={15} /></Link><Link href="/founder" className="mobile-nav-link founder-mobile-link" onClick={() => setOpen(false)}>Contact your mentors</Link></div></div>}
    </header>
  );
}

export function TrustNotice({ compact = false }: { compact?: boolean }) {
  return <div className={`trust-notice ${compact ? "compact" : ""}`}><ShieldCheck size={17} aria-hidden="true" /><p>Learners Park is an independent practice platform. It is <strong>not affiliated</strong> with the Indian Armed Forces, DIPR, or any Selection Board. Simulations are based on publicly known patterns and are for self-assessment only — they do not predict official results.</p></div>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div className="container"><TrustNotice /><div className="footer-grid"><div><div className="brand-lockup footer-brand"><span className="brand-mark"><span /><span /><span /></span><span><strong className="brand-name">Learners Park</strong><small className="brand-tagline">Honest reps. Better readiness.</small></span></div><p className="footer-note">A calm, pattern-aware practice room for the next generation of defence aspirants.</p></div><div><p className="footer-label">Explore</p><div className="footer-links"><Link href="/opam">OPAM simulator</Link><Link href="/csss">CSSS simulator</Link><Link href="/tests">Written practice</Link><Link href="/founder">Contact your mentors</Link></div></div><div><p className="footer-label">Official information</p><div className="footer-links"><a href="https://joinindianarmy.nic.in" target="_blank" rel="noreferrer">Indian Army <ArrowUpRight size={13} /></a><a href="https://careerairforce.nic.in" target="_blank" rel="noreferrer">Indian Air Force <ArrowUpRight size={13} /></a><a href="https://joinindiannavy.gov.in" target="_blank" rel="noreferrer">Indian Navy <ArrowUpRight size={13} /></a></div></div></div><div className="footer-bottom"><span>© 2026 Learners Park</span><span>Account profiles and completed attempts stored securely</span><span>Phase 2 full banks</span></div></div></footer>;
}

export function PageShell({ children }: { children: ReactNode }) { return <div className="min-h-screen bg-sand text-ink">{children}</div>; }
export function SectionEyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) { return <p className={`eyebrow ${dark ? "eyebrow-dark" : ""}`}><span className="eyebrow-line" />{children}</p>; }
export function SectionHeading({ kicker, title, body, dark = false }: { kicker: string; title: string; body?: string; dark?: boolean }) { return <div className={`section-heading ${dark ? "dark" : ""}`}><SectionEyebrow dark={dark}>{kicker}</SectionEyebrow><h2>{title}</h2>{body && <p>{body}</p>}</div>; }
export function PrimaryButton({ href, children, onClick, className = "" }: { href?: string; children: ReactNode; onClick?: () => void; className?: string }) { const content = <>{children}<ArrowUpRight size={16} /></>; return href ? <Link href={href} className={`primary-button ${className}`}>{content}</Link> : <button onClick={onClick} className={`primary-button ${className}`}>{content}</button>; }
export function GhostButton({ href, children, onClick, className = "" }: { href?: string; children: ReactNode; onClick?: () => void; className?: string }) { const content = <>{children}<ArrowUpRight size={16} /></>; return href ? <Link href={href} className={`ghost-button ${className}`}>{content}</Link> : <button onClick={onClick} className={`ghost-button ${className}`}>{content}</button>; }
export function ChoiceButton({ children, selected, onClick }: { children: ReactNode; selected?: boolean; onClick?: () => void }) { return <button className={`choice-button ${selected ? "is-selected" : ""}`} onClick={onClick}><span className="choice-radio">{selected ? "✓" : ""}</span><span>{children}</span></button>; }
export function ProgressTrack({ value, tone = "orange" }: { value: number; tone?: "orange" | "olive" }) { return <div className="progress-track"><span className={`progress-fill ${tone}`} style={{ width: `${value}%` }} /></div>; }
export function TimerRing({ seconds, total }: { seconds: number; total: number }) { const progress = Math.max(0, Math.min(1, seconds / total)); return <span className="timer-ring" style={{ background: `conic-gradient(var(--orange) ${progress * 360}deg, rgba(255,255,255,.12) 0deg)` }}><span>{seconds}</span></span>; }
export function BackLink({ href = "/", label = "Back to Learners Park" }: { href?: string; label?: string }) { return <Link href={href} className="back-link">← {label}</Link>; }
export function ScoreBar({ label, value, tone = "olive" }: { label: string; value: number; tone?: "olive" | "orange" | "steel" }) { return <div className="score-bar-wrap"><div className="score-bar-label"><span>{label}</span><strong>{value}%</strong></div><div className="score-bar"><span className={`score-bar-fill ${tone}`} style={{ width: `${value}%` }} /></div></div>; }
export function PhasePill({ children = "Phase 1" }: { children?: ReactNode }) { return <span className="phase-pill">{children}</span>; }
export function AccessNote() { return <p className="access-note">On-device results · private by default · keyboard friendly</p>; }
export function MiniStat({ label, value }: { label: string; value: string }) { return <div className="mini-stat"><strong>{value}</strong><small>{label}</small></div>; }
export function StatusChip({ children, tone = "olive" }: { children: ReactNode; tone?: "olive" | "orange" | "steel" }) { return <span className={`status-chip ${tone}`}>{children}</span>; }
export function ArrowLink({ href, children }: { href: string; children: ReactNode }) { return <Link href={href} className="arrow-link">{children}<ArrowUpRight size={15} /></Link>; }
export function TestimonialCard({ children }: { children: ReactNode }) { return <div className="testimonial-card">{children}</div>; }
export function Avatar({ initials }: { initials: string }) { return <span className="avatar">{initials}</span>; }
export function TrustMark() { return <span className="trust-mark"><ShieldCheck size={14} /> private practice</span>; }
export function OptionIndex({ children }: { children: ReactNode }) { return <span className="option-index">{children}</span>; }
export function Counter({ current, total }: { current: number; total: number }) { return <span className="counter">{String(current).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>; }
export function AnsweredDot({ state }: { state: "answered" | "current" | "unvisited" }) { return <span className={`answered-dot ${state}`} />; }
export function ReportMetric({ label, value }: { label: string; value: string }) { return <div className="report-metric"><small>{label}</small><strong>{value}</strong></div>; }
export function RestartButton({ onClick }: { onClick: () => void }) { return <button onClick={onClick} className="restart-button">Start again</button>; }
export function PrintLink() { return <button className="print-link" onClick={() => window.print()}>Print debrief</button>; }
export function SectionRule({ label }: { label: string }) { return <div className="section-rule"><span>{label}</span></div>; }
export function Callout({ title, children }: { title: string; children: ReactNode }) { return <aside className="callout"><strong>{title}</strong><p>{children}</p></aside>; }
export function DotLegend({ label, color }: { label: string; color: string }) { return <span className="dot-legend"><span style={{ background: color }} />{label}</span>; }
export function BadgeText({ children, tone = "sand" }: { children: ReactNode; tone?: "sand" | "orange" | "dark" }) { return <span className={`badge-text ${tone}`}>{children}</span>; }
export function CardArrow() { return <span className="card-arrow"><ArrowUpRight size={15} /></span>; }
export function QuoteMark() { return <span className="quote-mark">“</span>; }
export function Spinner() { return <span className="spinner" aria-hidden="true" />; }
export { navItems };
export default SiteHeader;
export const trustCopy = "Learners Park is an independent practice platform. It is not affiliated with the Indian Armed Forces, DIPR, or any Selection Board.";
export const officialLinks = [{ label: "Indian Army", href: "https://joinindianarmy.nic.in" }, { label: "Indian Air Force", href: "https://careerairforce.nic.in" }, { label: "Indian Navy", href: "https://joinindiannavy.gov.in" }];
