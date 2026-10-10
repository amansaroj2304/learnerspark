import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ArrowUpRight, BookOpen, FileText, Newspaper, ShieldCheck, Target } from "lucide-react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import OPAM from "./pages/OPAM";
import CSSS from "./pages/CSSS";
import Founder from "./pages/Founder";
import AdminConsole from "./pages/AdminConsole";
import NotFound from "./pages/NotFound";
import { PageShell, SiteFooter, SiteHeader, SectionEyebrow } from "./components/SiteChrome";

type ContentPageProps = {
  eyebrow: string;
  title: string;
  body: string;
  icon: typeof BookOpen;
  cards: Array<{ label: string; title: string; body: string }>;
  action: { href: string; label: string };
};

function ContentPage({ eyebrow, title, body, icon: Icon, cards, action }: ContentPageProps) {
  return <PageShell><SiteHeader /><main className="content-page"><section className="content-page-hero"><div className="container"><SectionEyebrow>{eyebrow}</SectionEyebrow><h1>{title}</h1><p>{body}</p><a className="primary-button content-page-action" href={action.href}>{action.label}<ArrowUpRight size={16} /></a></div></section><section className="content-page-body"><div className="container"><div className="content-page-intro"><div><Icon size={26} /><h2>Useful preparation, without a dead end.</h2></div><p>Choose a focused starting point. Each room is designed to give you a clear next action rather than another placeholder screen.</p></div><div className="content-card-grid">{cards.map((card) => <article className="content-card" key={card.title}><span>{card.label}</span><h3>{card.title}</h3><p>{card.body}</p><ArrowUpRight size={18} /></article>)}</div></div></section><section className="content-page-note"><div className="container"><ShieldCheck size={17} /><p>Original practice content, independent guidance, and no promise of official selection or prediction.</p></div></section></main><SiteFooter /></PageShell>;
}
function Router() {
  // make sure to consider if you need authentication for certain routes
  return <Switch><Route path="/" component={Home} /><Route path="/opam" component={OPAM} /><Route path="/csss" component={CSSS} /><Route path="/founder" component={Founder} /><Route path="/admin/dashboard"><AdminConsole section="dashboard" /></Route><Route path="/admin/students"><AdminConsole section="students" /></Route><Route path="/admin/tests"><AdminConsole section="tests" /></Route><Route path="/admin/questions"><AdminConsole section="questions" /></Route><Route path="/admin"><AdminConsole section="dashboard" /></Route><Route path="/tests"><ContentPage eyebrow="WRITTEN PRACTICE · NEXT REP" title="Written practice, without the guesswork." body="Build a steadier base for NDA, CDS, AFCAT, and other defence-entry papers with short, focused practice blocks." icon={FileText} action={{ href: "/csss", label: "Start with CSSS" }} cards={[{ label: "FOUNDATION", title: "Reasoning patterns", body: "Work through analogy, coding, series, and visual pattern habits before the clock gets loud." }, { label: "LANGUAGE", title: "Expression drills", body: "Sharpen comprehension, vocabulary, and the clarity you bring into an interview or group task." }, { label: "ROUTINE", title: "A repeatable study loop", body: "Pick one block, review the mistake, and return with a narrower target for the next attempt." }]} /></Route><Route path="/briefs"><ContentPage eyebrow="FIELD BRIEFS · DAILY SIGNAL" title="Briefs that become speaking points." body="Turn current events into concise, defensible points for group discussion, interview answers, and everyday awareness." icon={Newspaper} action={{ href: "/founder", label: "Contact a mentor" }} cards={[{ label: "READ", title: "One issue, clearly framed", body: "Start with the context, identify the trade-off, and separate a useful point from a loud opinion." }, { label: "THINK", title: "Defence and national affairs", body: "Build a habit of connecting technology, security, society, and service without memorising speeches." }, { label: "SPEAK", title: "A 60-second response", body: "Practise a short opening, one supporting fact, and a balanced close you can actually deliver." }]} /></Route><Route path="/guides"><ContentPage eyebrow="FIELD GUIDES · BETWEEN ATTEMPTS" title="Guides for the work between attempts." body="Use practical mentor notes to understand Stage 1, OLQs, PIQ, psychology tests, and the habits that make preparation sustainable." icon={BookOpen} action={{ href: "/csss", label: "Practise the battery" }} cards={[{ label: "STAGE 1", title: "What the screening gate tests", body: "Understand speed, attention, memory, language, and the discipline of following the task exactly." }, { label: "OLQs", title: "Read qualities as behaviours", body: "Replace performance with observation: notice what you already do and choose one behaviour to strengthen." }, { label: "DEBRIEF", title: "Make the next attempt smarter", body: "Review patterns honestly, choose a small adjustment, and return to practice with a measurable focus." }]} /></Route><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /><Analytics /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
