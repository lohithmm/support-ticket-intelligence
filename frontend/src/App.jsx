import { useState, useEffect } from "react";
import { api } from "./services/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(d) {
  if (!d) return "—";
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}
function formatSla(mins) {
  if (mins == null) return "—";
  if (mins < 0) return `Breached ${Math.abs(Math.round(mins))}m ago`;
  if (mins < 60) return `${Math.round(mins)}m left`;
  return `${Math.round(mins / 60)}h left`;
}

// ── Badges ────────────────────────────────────────────────────────────────────
function PriorityBadge({ p }) {
  const cfg = { CRITICAL:"bg-red-100 text-red-700 border border-red-200", HIGH:"bg-orange-100 text-orange-700 border border-orange-200", MEDIUM:"bg-amber-100 text-amber-700 border border-amber-200", LOW:"bg-slate-100 text-slate-600 border border-slate-200" };
  const dot = { CRITICAL:"bg-red-500", HIGH:"bg-orange-500", MEDIUM:"bg-amber-500", LOW:"bg-slate-400" };
  return <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${cfg[p]||cfg.LOW}`}><span className={`w-1.5 h-1.5 rounded-full ${dot[p]||dot.LOW}`}/>{p}</span>;
}
function StatusBadge({ s }) {
  const cfg = { OPEN:"bg-blue-100 text-blue-700 border border-blue-200", IN_PROGRESS:"bg-violet-100 text-violet-700 border border-violet-200", RESOLVED:"bg-emerald-100 text-emerald-700 border border-emerald-200", CLOSED:"bg-slate-100 text-slate-500 border border-slate-200" };
  const dot = { OPEN:"bg-blue-500 animate-pulse", IN_PROGRESS:"bg-violet-500 animate-pulse", RESOLVED:"bg-emerald-500", CLOSED:"bg-slate-400" };
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${cfg[s]||cfg.CLOSED}`}><span className={`w-1.5 h-1.5 rounded-full ${dot[s]||dot.CLOSED}`}/>{s?.replace("_"," ")}</span>;
}
function SlaBadge({ risk, mins, large }) {
  if (!risk || risk==="GREEN") return <span className={`inline-flex items-center gap-1 ${large?"text-sm":"text-xs"} text-emerald-600 font-semibold`}><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Within SLA</span>;
  const cfg = { BREACHED:"bg-red-600 text-white font-bold", RED:"bg-red-100 text-red-700 border border-red-200 font-bold", AMBER:"bg-amber-100 text-amber-700 border border-amber-200 font-semibold" };
  return <span className={`inline-flex items-center gap-1.5 ${large?"text-sm px-3 py-1.5":"text-xs px-2.5 py-1"} rounded-lg ${cfg[risk]||cfg.RED}`}>{risk==="BREACHED"?"🔴":"🕐"} {formatSla(mins)}</span>;
}

const CAT_ICON  = { BILLING:"💳", TECHNICAL:"⚙️", ACCESS:"🔐", PERFORMANCE:"⚡", OTHER:"📋" };
const PRI_LEFT  = { CRITICAL:"bg-red-500", HIGH:"bg-orange-500", MEDIUM:"bg-amber-400", LOW:"bg-slate-300" };
const AGENTS    = ["Sam Lee","Priya Singh","Dev Team","Ops Team","Mobile Team","Billing Team","Unassigned"];
const TEAMS     = ["Identity & Access","Billing","Platform Engineering","Platform Ops","Mobile Engineering"];
const STATUSES  = ["OPEN","IN_PROGRESS","RESOLVED","CLOSED"];
const PRIORITIES= ["CRITICAL","HIGH","MEDIUM","LOW"];
const CATEGORIES= ["TECHNICAL","BILLING","ACCESS","PERFORMANCE","OTHER"];

// ── Inline Select ─────────────────────────────────────────────────────────────
function InlineSelect({ value, options, onChange, label, colorFn }) {
  const [editing, setEditing] = useState(false);
  if (editing) return (
    <select autoFocus value={value} onBlur={()=>setEditing(false)}
      onChange={e=>{onChange(e.target.value);setEditing(false);}}
      className="text-xs border border-indigo-300 rounded-lg px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 font-semibold cursor-pointer shadow-sm">
      {options.map(o=><option key={o} value={o}>{o.replace("_"," ")}</option>)}
    </select>
  );
  return (
    <button onClick={()=>setEditing(true)} title={`Edit ${label}`}
      className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity">
      {colorFn ? colorFn(value) : <span className="text-xs font-semibold text-slate-700">{value?.replace("_"," ")}</span>}
      <span className="text-slate-300 group-hover:text-indigo-400 text-xs transition-colors">✎</span>
    </button>
  );
}

// ── New Ticket Modal ──────────────────────────────────────────────────────────
function NewTicketModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title:"", description:"", category:"TECHNICAL", priority:"MEDIUM", customerName:"", customerEmail:"", companyName:"", customerPlan:"PRO", assignedAgent:"Unassigned" });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const validate = () => {
    const e = {};
    if (!form.title.trim())       e.title       = "Title is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.customerName.trim())e.customerName= "Customer name is required";
    if (!form.customerEmail.trim()|| !form.customerEmail.includes("@")) e.customerEmail = "Valid email required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const ticket = await api.createTicket(form);
      onCreate(ticket);
      onClose();
    } catch(e) { console.error(e); setSaving(false); }
  };

  const Field = ({ label, k, type="text", placeholder="", as="input", opts=[] }) => (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
      {as==="select"
        ? <select value={form[k]} onChange={e=>set(k,e.target.value)} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 font-medium">
            {opts.map(o=><option key={o} value={o}>{o.replace("_"," ")}</option>)}
          </select>
        : as==="textarea"
        ? <textarea value={form[k]} onChange={e=>set(k,e.target.value)} rows={3} placeholder={placeholder}
            className={`w-full text-sm border rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none font-medium ${errors[k]?"border-red-300":"border-slate-200 focus:border-indigo-400"}`}/>
        : <input type={type} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={placeholder}
            className={`w-full text-sm border rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium ${errors[k]?"border-red-300":"border-slate-200 focus:border-indigo-400"}`}/>
      }
      {errors[k] && <p className="text-xs text-red-500 mt-1 font-medium">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"/>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-white rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-lg shadow-md shadow-indigo-500/20">🎫</div>
            <div>
              <h2 className="text-lg font-black text-slate-900">New Ticket</h2>
              <p className="text-xs text-slate-500 font-medium">SLA deadline is set automatically by priority</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors">✕</button>
        </div>

        <div className="px-7 py-6 space-y-5">
          {/* Issue */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Issue</p>
            <Field label="Title *" k="title" placeholder="e.g. Cannot login to customer portal"/>
            <Field label="Description *" k="description" as="textarea" placeholder="Describe the issue in detail..."/>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Category" k="category" as="select" opts={CATEGORIES}/>
              <Field label="Priority" k="priority" as="select" opts={PRIORITIES}/>
              <Field label="Assigned Agent" k="assignedAgent" as="select" opts={AGENTS}/>
            </div>
          </div>

          {/* Customer */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Customer</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Customer Name *" k="customerName" placeholder="Alice Johnson"/>
              <Field label="Customer Email *" k="customerEmail" type="email" placeholder="alice@acme.com"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company" k="companyName" placeholder="Acme Corp"/>
              <Field label="Plan" k="customerPlan" as="select" opts={["FREE","PRO","ENTERPRISE"]}/>
            </div>
          </div>

          {/* SLA preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200">
            <span className="text-indigo-600 font-bold text-sm">⏱</span>
            <p className="text-xs text-indigo-700 font-semibold">
              SLA deadline: <span className="font-black">
                {form.priority==="CRITICAL"?"4 hours":form.priority==="HIGH"?"8 hours":form.priority==="LOW"?"48 hours":"24 hours"}
              </span> from now based on {form.priority} priority
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-7 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
          <button onClick={onClose} className="text-sm px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="text-sm px-6 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-2">
            {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Creating…</> : "✦ Create Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Duplicate Banner ──────────────────────────────────────────────────────────
function DuplicateBanner({ ticket, onConfirm, onDismiss, onRescan }) {
  const [candidates, setCandidates] = useState([]);
  const [scanning,   setScanning]   = useState(false);

  useEffect(() => {
    if (ticket.potentialDuplicate && !ticket.duplicateDismissed) {
      setCandidates([]);
    }
  }, [ticket]);

  const rescan = async () => {
    setScanning(true);
    try {
      const results = await api.getDuplicates(ticket.id);
      setCandidates(results);
      if (onRescan) onRescan(results);
    } catch(e) { console.error(e); }
    setScanning(false);
  };

  if (ticket.duplicateDismissed) return null;

  if (ticket.duplicateConfirmed) return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-orange-50 border border-orange-200 mb-4">
      <span className="text-lg">🔁</span>
      <div>
        <p className="text-sm font-bold text-orange-800">Confirmed Duplicate</p>
        <p className="text-xs text-orange-600 font-medium">
          Duplicate of <span className="font-mono font-black">{ticket.duplicateOfTicket}</span>
        </p>
      </div>
    </div>
  );

  const hasFlaggedMatch = ticket.potentialDuplicate && ticket.duplicateOfTicket;
  const showCandidates  = candidates.length > 0;

  if (!hasFlaggedMatch && !showCandidates) return (
    <div className="flex items-center justify-between px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
      <div className="flex items-center gap-2">
        <span>🔁</span>
        <span className="text-xs text-slate-500 font-semibold">No duplicates detected</span>
      </div>
      <button onClick={rescan} disabled={scanning}
        className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5">
        {scanning ? <><span className="w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin"/>Scanning…</> : "↻ Rescan"}
      </button>
    </div>
  );

  const itemsToShow = showCandidates
    ? candidates
    : [{ ticketNumber: ticket.duplicateOfTicket, score: ticket.duplicateSimilarityScore, title: "" }];

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 mb-4 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-amber-200">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🔁</span>
          <div>
            <p className="text-sm font-bold text-amber-900">Potential Duplicate Detected</p>
            <p className="text-xs text-amber-700 font-medium">{itemsToShow.length} similar open ticket(s) found · similarity ≥ 82%</p>
          </div>
        </div>
        <button onClick={rescan} disabled={scanning}
          className="text-xs px-3 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-800 font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5">
          {scanning ? <><span className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin"/>Scanning…</> : "↻ Rescan"}
        </button>
      </div>
      <div className="p-4 space-y-2">
        {itemsToShow.map((c, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white border border-amber-200">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 flex-shrink-0">{c.ticketNumber}</span>
              {c.title && <span className="text-xs text-slate-600 font-medium truncate">{c.title}</span>}
              {c.score && <span className="text-xs font-black text-amber-700 flex-shrink-0">{(c.score * 100).toFixed(0)}% match</span>}
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-3">
              <button onClick={()=>onConfirm(c.ticketNumber)}
                className="text-xs px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors">✓ Confirm</button>
              <button onClick={onDismiss}
                className="text-xs px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors">✕ Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Panel ──────────────────────────────────────────────────────────────────
function AiPanel({ title, icon, onGenerate, loading, done, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-base shadow-sm">{icon}</div>
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          {done && <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">✓ Done</span>}
        </div>
        <button onClick={onGenerate} disabled={loading}
          className={`text-sm px-4 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${done?"bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200":"bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"} disabled:opacity-40 disabled:cursor-not-allowed`}>
          {loading?<><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Generating…</>:done?"↻ Redo":"✨ Generate"}
        </button>
      </div>
      <div className="p-5 min-h-[80px]">
        {loading&&<div className="flex items-center gap-3"><div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full bg-indigo-400" style={{animation:"bounce 1s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div><span className="text-sm text-slate-400 italic">llama3.2 is thinking…</span></div>}
        {!loading&&!done&&<p className="text-sm text-slate-400">Click Generate to run AI analysis on this ticket.</p>}
        {!loading&&done&&children}
      </div>
    </div>
  );
}

// ── Ticket Detail Page ────────────────────────────────────────────────────────
function TicketDetailPage({ ticket: initialTicket, onBack, onTicketUpdated }) {
  const [ticket, setTicket]       = useState(initialTicket);
  const [summary, setSummary]     = useState(null);
  const [similar, setSimilar]     = useState(null);
  const [resolution, setResolution]= useState(null);
  const [draft, setDraft]         = useState(null);
  const [loading, setLoading]     = useState({});
  const [copied, setCopied]       = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState(null);
  const [notes, setNotes]         = useState({ internal: ticket.internalNotes||"", resolution: ticket.resolutionNotes||"" });

  const run = async (key, apiFn, setter) => {
    setLoading(l=>({...l,[key]:true}));
    try { setter(await apiFn(ticket.id)); } catch(e) { console.error(e); }
    setLoading(l=>({...l,[key]:false}));
  };

  const updateField = async (field, value) => {
    setSaving(true);
    try {
      const updated = await api.updateTicket(ticket.id, { [field]: value });
      setTicket(updated);
      onTicketUpdated(updated);
      setSaveMsg("Saved");
      setTimeout(()=>setSaveMsg(null), 2000);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      const updated = await api.updateTicket(ticket.id, { internalNotes: notes.internal, resolutionNotes: notes.resolution });
      setTicket(updated);
      onTicketUpdated(updated);
      setSaveMsg("Notes saved");
      setTimeout(()=>setSaveMsg(null), 2000);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const copyDraft = () => { navigator.clipboard.writeText(draft); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  const handleConfirmDuplicate = async (ofTicket) => {
    try {
      const updated = await api.confirmDuplicate(ticket.id, ofTicket);
      setTicket(updated);
      onTicketUpdated(updated);
    } catch(e) { console.error(e); }
  };

  const handleDismissDuplicate = async () => {
    try {
      const updated = await api.dismissDuplicate(ticket.id);
      setTicket(updated);
      onTicketUpdated(updated);
    } catch(e) { console.error(e); }
  };
  const barColor  = PRI_LEFT[ticket.priority] || "bg-slate-300";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <div className={`h-[3px] w-full ${barColor} flex-shrink-0`}/>

      {/* Header */}
      <div className="flex-shrink-0 px-8 py-5 border-b border-slate-200 bg-white shadow-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 mb-4 group transition-colors font-medium">
          <span className="group-hover:-translate-x-1 transition-transform inline-block">←</span>
          Back to Dashboard
          <span className="text-slate-300 mx-1">/</span>
          <span className="font-mono text-slate-400">{ticket.ticketNumber}</span>
        </button>

        <div className="flex items-start justify-between gap-8">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">{ticket.ticketNumber}</span>

              {/* Editable Priority */}
              <InlineSelect value={ticket.priority} options={PRIORITIES} label="priority"
                onChange={v=>updateField("priority",v)} colorFn={v=><PriorityBadge p={v}/>}/>

              {/* Editable Status */}
              <InlineSelect value={ticket.status} options={STATUSES} label="status"
                onChange={v=>updateField("status",v)} colorFn={v=><StatusBadge s={v}/>}/>

              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-medium">{CAT_ICON[ticket.category]} {ticket.category}</span>
              {ticket.escalated && <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-lg font-bold">🚨 Escalated</span>}
              {ticket.potentialDuplicate && !ticket.duplicateDismissed && (
                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${ticket.duplicateConfirmed ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                  🔁 {ticket.duplicateConfirmed ? "Duplicate" : "Possible Duplicate"}
                </span>
              )}

              {/* Save indicator */}
              {saving && <span className="text-xs text-indigo-500 font-semibold flex items-center gap-1"><span className="w-3 h-3 border border-indigo-300 border-t-indigo-600 rounded-full animate-spin"/>Saving…</span>}
              {saveMsg && <span className="text-xs text-emerald-600 font-bold">✓ {saveMsg}</span>}
            </div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">{ticket.title}</h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">{ticket.companyName} · {ticket.customerName} · {timeAgo(ticket.createdAt)}</p>
          </div>

          <div className="flex-shrink-0 bg-white border border-slate-200 rounded-2xl px-6 py-4 text-center shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-bold">SLA Status</p>
            <SlaBadge risk={ticket.slaRisk} mins={ticket.minutesUntilSla} large/>
            {ticket.slaPolicy && <p className="text-xs text-slate-400 mt-2 font-medium">{ticket.slaPolicy}</p>}
          </div>
        </div>

        <div className="flex gap-1 mt-5">
          {[["details","📋 Details"],["ai","🤖 AI Actions"]].map(([val,label])=>(
            <button key={val} onClick={()=>setActiveTab(val)}
              className={`text-sm px-5 py-2 rounded-xl font-semibold transition-all ${activeTab===val?"bg-indigo-600 text-white shadow-md shadow-indigo-500/20":"text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab==="details" && (
          <div className="max-w-5xl mx-auto px-8 py-6 grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-4">
              <DuplicateBanner
                ticket={ticket}
                onConfirm={handleConfirmDuplicate}
                onDismiss={handleDismissDuplicate}
                onRescan={()=>{}}
              />
              <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Description</p>
                <p className="text-sm text-slate-700 leading-relaxed">{ticket.description}</p>
              </div>

              {/* Editable Internal Notes */}
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">🔒 Internal Notes</p>
                  <button onClick={saveNotes} disabled={saving}
                    className="text-xs px-3 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-800 font-bold transition-colors disabled:opacity-50">
                    {saving?"Saving…":"Save Notes"}
                  </button>
                </div>
                <textarea value={notes.internal} onChange={e=>setNotes(n=>({...n,internal:e.target.value}))} rows={3}
                  placeholder="Add internal notes visible only to the support team..."
                  className="w-full text-sm text-amber-800 bg-transparent border border-amber-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none placeholder-amber-400 font-medium"/>
              </div>

              {/* Editable Resolution Notes */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">✓ Resolution Notes</p>
                  <button onClick={saveNotes} disabled={saving}
                    className="text-xs px-3 py-1 rounded-lg bg-emerald-200 hover:bg-emerald-300 text-emerald-800 font-bold transition-colors disabled:opacity-50">
                    {saving?"Saving…":"Save Notes"}
                  </button>
                </div>
                <textarea value={notes.resolution} onChange={e=>setNotes(n=>({...n,resolution:e.target.value}))} rows={3}
                  placeholder="Describe how this ticket was resolved..."
                  className="w-full text-sm text-emerald-800 bg-transparent border border-emerald-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none placeholder-emerald-400 font-medium"/>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Customer</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-black text-white shadow-md shadow-indigo-500/20">
                    {ticket.customerName?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{ticket.customerName}</p>
                    <p className="text-xs text-slate-500">{ticket.companyName}</p>
                  </div>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="text-slate-700 font-medium truncate ml-2 max-w-[140px]">{ticket.customerEmail}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Plan</span>
                    <span className={`font-bold px-2 py-0.5 rounded-lg text-xs ${ticket.customerPlan==="ENTERPRISE"?"bg-violet-100 text-violet-700 border border-violet-200":ticket.customerPlan==="PRO"?"bg-blue-100 text-blue-700 border border-blue-200":"bg-slate-100 text-slate-600 border border-slate-200"}`}>{ticket.customerPlan}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Agent</p>
                <div className="mb-3">
                  <InlineSelect value={ticket.assignedAgent||"Unassigned"} options={AGENTS} label="agent"
                    onChange={v=>updateField("assignedAgent",v)}
                    colorFn={v=>(
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-sm ${v==="Unassigned"?"bg-slate-300":"bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20"}`}>
                          {v==="Unassigned"?"?":v.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-slate-800">{v}</span>
                      </div>
                    )}/>
                </div>
                {ticket.agentTeam && <p className="text-xs text-slate-500 mt-2">{ticket.agentTeam}</p>}
                <p className="text-xs text-slate-500 mt-1">SLA: <span className="text-slate-700 font-semibold">{ticket.slaPolicy}</span></p>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Timeline</p>
                <div className="space-y-2.5 text-xs">
                  {[["Created",ticket.createdAt],["First Response",ticket.firstResponseAt],["Resolved",ticket.resolvedAt]].filter(([,v])=>v).map(([label,val])=>(
                    <div key={label} className="flex justify-between">
                      <span className="text-slate-500">{label}</span>
                      <span className="text-slate-700 font-semibold">{new Date(val).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {ticket.reopenCount>0 && <div className="flex justify-between"><span className="text-slate-500">Reopened</span><span className="text-orange-600 font-bold">{ticket.reopenCount}×</span></div>}
                </div>
              </div>

              {ticket.tags && (
                <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(typeof ticket.tags==="string"?ticket.tags.split(","):ticket.tags).map((tag,i)=>(
                      <span key={i} className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg font-medium">{tag.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab==="ai" && (
          <div className="max-w-3xl mx-auto px-8 py-6 space-y-4">
            <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-lg shadow-md shadow-indigo-500/20">🤖</div>
              <div><p className="text-sm font-bold text-indigo-900">AI-Powered Analysis</p><p className="text-xs text-indigo-600">Powered by llama3.2 · Qdrant RAG · Generate each panel independently</p></div>
            </div>
            <AiPanel title="Ticket Summary" icon="🤖" onGenerate={()=>run("summary",api.summariseTicket,d=>setSummary(d.summary))} loading={loading.summary} done={!!summary}>
              <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
            </AiPanel>
            <AiPanel title="Similar Resolved Tickets" icon="🔍" onGenerate={()=>run("similar",api.getSimilarTickets,setSimilar)} loading={loading.similar} done={!!similar}>
              {similar?.length===0&&<p className="text-sm text-slate-400 italic">No similar tickets found in knowledge base.</p>}
              <div className="space-y-3">
                {similar?.map((t,i)=>(
                  <div key={i} className="rounded-xl bg-slate-50 border border-slate-200 p-4 hover:border-indigo-300 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">{t.ticketNumber}</span>
                      <span className="text-xs text-slate-500 font-medium">{t.category} · {t.priority}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mb-2">{t.title}</p>
                    {t.resolutionNotes&&<div className="flex gap-2 bg-emerald-50 rounded-lg p-2.5 border border-emerald-200"><span className="text-emerald-600 flex-shrink-0 font-bold">✓</span><p className="text-xs text-emerald-800 leading-relaxed">{t.resolutionNotes}</p></div>}
                  </div>
                ))}
              </div>
            </AiPanel>
            <AiPanel title="Resolution Suggester" icon="💡" onGenerate={()=>run("resolution",api.getResolution,setResolution)} loading={loading.resolution} done={!!resolution}>
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">{resolution?.suggestion}</pre>
              {resolution?.similarTickets?.length>0&&(
                <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold">Based on:</span>
                  {resolution.similarTickets.map((t,i)=><span key={i} className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">{t.ticketNumber}</span>)}
                </div>
              )}
            </AiPanel>
            <AiPanel title="Draft Client Response" icon="✉️" onGenerate={()=>run("draft",api.draftResponse,d=>setDraft(d.draft))} loading={loading.draft} done={!!draft}>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-3 font-mono text-xs">{draft}</div>
              <button onClick={copyDraft} className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5 transition-colors">{copied?"✓ Copied!":"📋 Copy to clipboard"}</button>
            </AiPanel>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ tickets, onSelectTicket, onNewTicket }) {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort,   setSort]   = useState("sla");

  const FILTERS = [{label:"All",value:"ALL"},{label:"Open",value:"OPEN"},{label:"In Progress",value:"IN_PROGRESS"},{label:"Critical",value:"CRITICAL"},{label:"SLA Risk",value:"SLA_RISK"},{label:"Escalated",value:"ESCALATED"}];

  const filtered = tickets
    .filter(t=>{
      if(filter==="OPEN")return t.status==="OPEN";
      if(filter==="IN_PROGRESS")return t.status==="IN_PROGRESS";
      if(filter==="CRITICAL")return t.priority==="CRITICAL";
      if(filter==="SLA_RISK")return["RED","AMBER","BREACHED"].includes(t.slaRisk);
      if(filter==="ESCALATED")return t.escalated;
      return true;
    })
    .filter(t=>!search||t.title?.toLowerCase().includes(search.toLowerCase())||t.ticketNumber?.toLowerCase().includes(search.toLowerCase())||t.customerName?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{
      if(sort==="sla"){const o={BREACHED:0,RED:1,AMBER:2,GREEN:3};return(o[a.slaRisk]??3)-(o[b.slaRisk]??3);}
      if(sort==="priority"){const o={CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3};return(o[a.priority]??3)-(o[b.priority]??3);}
      return new Date(b.createdAt)-new Date(a.createdAt);
    });

  const stats = [
    {label:"Total",value:tickets.length,icon:"📊",bg:"bg-white",text:"text-slate-800",border:"border-slate-200"},
    {label:"Open",value:tickets.filter(t=>t.status==="OPEN").length,icon:"🔵",bg:"bg-blue-50",text:"text-blue-700",border:"border-blue-200"},
    {label:"In Progress",value:tickets.filter(t=>t.status==="IN_PROGRESS").length,icon:"🟣",bg:"bg-violet-50",text:"text-violet-700",border:"border-violet-200"},
    {label:"Critical",value:tickets.filter(t=>t.priority==="CRITICAL").length,icon:"🔴",bg:"bg-red-50",text:"text-red-700",border:"border-red-200"},
    {label:"SLA At Risk",value:tickets.filter(t=>["RED","AMBER","BREACHED"].includes(t.slaRisk)).length,icon:"⚠️",bg:"bg-amber-50",text:"text-amber-700",border:"border-amber-200"},
    {label:"Escalated",value:tickets.filter(t=>t.escalated).length,icon:"🚨",bg:"bg-orange-50",text:"text-orange-700",border:"border-orange-200"},
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats */}
      <div className="flex-shrink-0 grid grid-cols-6 gap-3 px-6 py-4 border-b border-slate-200 bg-white">
        {stats.map((s,i)=>(
          <div key={i} className={`rounded-2xl border ${s.border} ${s.bg} px-4 py-3 hover:shadow-md transition-shadow cursor-default`}>
            <span className="text-xl">{s.icon}</span>
            <p className={`text-2xl font-black mt-1 ${s.text}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-2 px-6 py-3 border-b border-slate-200 bg-white">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tickets, customers..."
            className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 w-56 transition-all font-medium"/>
        </div>
        <div className="flex gap-1">
          {FILTERS.map(f=>(
            <button key={f.value} onClick={()=>setFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${filter===f.value?"bg-indigo-600 text-white shadow-md shadow-indigo-500/20":"bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={sort} onChange={e=>setSort(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-indigo-400 cursor-pointer font-semibold">
          <option value="sla">Sort: SLA Risk</option>
          <option value="priority">Sort: Priority</option>
          <option value="newest">Sort: Newest</option>
        </select>
        <button onClick={onNewTicket}
          className="ml-auto flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all">
          ＋ New Ticket
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-white border-b border-slate-200 shadow-sm">
              {["","Ticket","Issue","Priority","Status","SLA","Agent","Age",""].map((h,i)=>(
                <th key={i} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ticket,idx)=>{
              const bar = PRI_LEFT[ticket.priority]||"bg-slate-300";
              const rowBg = idx%2===0?"bg-white":"bg-slate-50/80";
              return (
                <tr key={ticket.id} onClick={()=>onSelectTicket(ticket)}
                  className={`border-b border-slate-100 cursor-pointer transition-all relative group ${rowBg} hover:bg-indigo-50/50 hover:border-indigo-100`}>
                  <td className="w-1 p-0 relative"><div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${bar} opacity-30 group-hover:opacity-100 transition-all`}/></td>
                  <td className="px-4 py-3.5 whitespace-nowrap"><span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">{ticket.ticketNumber}</span></td>
                  <td className="px-4 py-3.5 max-w-sm">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-900 leading-snug mb-1 line-clamp-1 transition-colors">{ticket.title}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 font-medium">{CAT_ICON[ticket.category]} {ticket.category}</span>
                      <span className="text-slate-300 text-xs">·</span>
                      <span className="text-xs text-slate-500">{ticket.companyName}</span>
                      {ticket.escalated&&<span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-md font-bold">🚨</span>}
                      {ticket.potentialDuplicate && !ticket.duplicateDismissed && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold border ${ticket.duplicateConfirmed ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                          🔁
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap"><PriorityBadge p={ticket.priority}/></td>
                  <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge s={ticket.status}/></td>
                  <td className="px-4 py-3.5 whitespace-nowrap"><SlaBadge risk={ticket.slaRisk} mins={ticket.minutesUntilSla}/></td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {ticket.assignedAgent&&ticket.assignedAgent!=="Unassigned"
                      ?<div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-black text-white shadow-sm">{ticket.assignedAgent.charAt(0)}</div><span className="text-xs text-slate-700 font-semibold">{ticket.assignedAgent}</span></div>
                      :<span className="text-xs text-slate-400 italic">Unassigned</span>
                    }
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap"><span className="font-mono text-xs text-slate-400 font-medium">{timeAgo(ticket.createdAt)}</span></td>
                  <td className="px-4 py-3.5"><span className="text-slate-300 group-hover:text-indigo-500 transition-colors text-sm font-bold">→</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length===0&&<div className="text-center py-20"><p className="text-4xl mb-3">🎫</p><p className="text-sm text-slate-400 font-medium">No tickets match your filter</p></div>}
      </div>

      <div className="flex-shrink-0 flex items-center justify-between px-6 py-2.5 border-t border-slate-200 bg-white">
        <span className="text-xs text-slate-500 font-medium"><span className="text-slate-800 font-bold">{filtered.length}</span> of {tickets.length} tickets</span>
        <span className="text-xs text-slate-400 font-medium">Sorted by {sort}</span>
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header() {
  return (
    <header className="flex-shrink-0 flex items-center justify-between px-6 h-14 border-b border-slate-200 bg-white shadow-sm z-40">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-base shadow-lg shadow-indigo-500/25">🎫</div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-sm"/>
        </div>
        <div>
          <h1 className="text-sm font-black text-slate-900 tracking-tight">SupportIQ</h1>
          <p className="text-xs text-slate-500 font-medium">Ticket Intelligence Platform</p>
        </div>
      </div>
      <div className="flex items-center gap-5">
        {[["bg-emerald-400","llama3.2"],["bg-blue-400","Qdrant RAG"],["bg-violet-500","Ollama"]].map(([bg,label])=>(
          <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <span className={`w-2 h-2 rounded-full ${bg} animate-pulse shadow-sm`}/>{label}
          </span>
        ))}
      </div>
    </header>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tickets,    setTickets]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [showModal,  setShowModal]  = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(()=>{
    api.getAllTickets()
      .then(data=>{setTickets(data);setLoading(false);})
      .catch(()=>{setError("Cannot connect to backend on port 8080.");setLoading(false);});
  },[]);

  const handleTicketUpdated = (updated) => {
    setTickets(ts=>ts.map(t=>t.id===updated.id?updated:t));
    if(selected?.id===updated.id) setSelected(updated);
  };

  const handleTicketCreated = (ticket) => {
    setTickets(ts=>[ticket, ...ts]);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden">
      <Header/>
      {error&&<div className="mx-6 mt-4 rounded-2xl bg-red-50 border border-red-200 px-5 py-3 text-sm text-red-700 font-semibold flex-shrink-0">⚠️ {error}</div>}
      {loading?(
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"/>
            <p className="text-sm text-slate-500 font-semibold">Loading tickets…</p>
          </div>
        </div>
      ):selected?(
        <TicketDetailPage ticket={selected} onBack={()=>setSelected(null)} onTicketUpdated={handleTicketUpdated}/>
      ):(
        <Dashboard tickets={tickets} onSelectTicket={setSelected} onNewTicket={()=>setShowModal(true)}/>
      )}
      {showModal&&<NewTicketModal onClose={()=>setShowModal(false)} onCreate={handleTicketCreated}/>}
    </div>
  );
}
