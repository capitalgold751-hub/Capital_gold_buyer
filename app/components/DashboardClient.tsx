"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CurrentUser = { displayName: string; email: string; role: "admin" | "staff" };
type RateRow = { id:string; karat:string; pricePerGram:number; marketPricePerGram:number|null; adjustmentPercent:number; source:string; isAutomatic:boolean; isPublished:boolean; updatedBy:string; updatedAt:string };
type RateHistoryRow = RateRow & { historyId:string; rateId:string; trigger:"automatic"|"manual" };
type RateHealth = { status:null|{ status:"healthy"|"failed"; lastAttemptAt:string|null; lastSuccessAt:string|null; lastFailureAt:string|null; lastError:string; source:string; consecutiveFailures:number }; stale:boolean; staleHours:number; lastSuccessAt:string|null };
type EnquiryRow = { id:string; name:string; phone:string; branch:string; source:string; status:string; createdAt:string };
type LeadRow = { id:string; name:string; phone:string; email:string; source:string; branch:string; status:string; priority:string; assignedTo:string; assignedName:string; notes:string; nextFollowUp:string|null; createdAt:string; updatedAt:string };
type AppointmentRow = { id:string; leadId:string; name:string; phone:string; email:string; branch:string; appointmentDate:string; timeSlot:string; status:string; assignedTo:string; assignedName:string; customerNote:string; staffNote:string; createdAt:string; updatedAt:string };
type BranchRow = { id:string; name:string; slug:string; address:string; phone:string; email:string; businessHours:string; mapsUrl:string; isActive:boolean; createdAt:string; updatedAt:string };
type BlogRow = { id:string; title:string; slug:string; excerpt:string; content:string; category:string; status:string; metaTitle:string; metaDescription:string; publishedAt:string|null; createdAt:string; updatedAt:string };
type StaffRow = { id:string; email:string; name:string; role:string; isActive:boolean; lastLoginAt:string|null; createdAt:string; updatedAt:string };
type NotificationRow = { id:string; type:string; title:string; message:string; entityId:string; isRead:boolean; createdAt:string };
type AuditRow = { id:string; actorEmail:string; action:string; entityType:string; entityId:string; details:string; createdAt:string };
type AnalyticsRow = { id:string; eventName:string; sessionId:string; pagePath:string; referrerHost:string; campaign:string; createdAt:string };
type GoldSettings = { id:string; emailAlertsEnabled:boolean; alertEmails:string[]; whatsappAlertsEnabled:boolean; whatsappNumber:string; staleHours:number; alertCooldownHours:number; automaticSyncEnabled:boolean; indicativeAdjustmentPercent:number; updatedAt:string; updatedBy:string };
type DashboardData = {
  generatedAt: string;
  currentUser: CurrentUser;
  stats: Record<string, number>;
  rates: RateRow[];
  rateHealth: RateHealth;
  rateHistory: RateHistoryRow[];
  goldSettings: GoldSettings | null;
  enquiries: EnquiryRow[];
  leads: LeadRow[];
  appointments: AppointmentRow[];
  branches: BranchRow[];
  blogs: BlogRow[];
  staff: StaffRow[];
  notifications: NotificationRow[];
  auditLogs: AuditRow[];
  analytics: AnalyticsRow[];
};

const adminTabs = ["Overview", "Leads", "Appointments", "Gold Rates", "Analytics", "Reports", "Branches", "Blog CMS", "Staff", "Settings", "Audit Logs", "Security"];
const staffTabs = ["Overview", "Leads", "Appointments", "Security"];
const leadStatuses = ["new", "contacted", "interested", "appointment_scheduled", "converted", "closed"];
const appointmentStatuses = ["pending", "approved", "completed", "cancelled", "no_show"];

export function DashboardClient({ initialUser, signOutHref }: { initialUser: CurrentUser; signOutHref: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const lastShownNotification = useRef("");
  const tabs = initialUser.role === "admin" ? adminTabs : staffTabs;

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/dashboard?section=${encodeURIComponent(activeTab)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load dashboard.");
      setData(payload); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load dashboard."); }
    finally { if (!quiet) setLoading(false); }
  }, [activeTab]);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(firstLoad);
  }, [refresh]);
  useEffect(() => {
    const item = data?.notifications?.[0];
    if (!item || lastShownNotification.current === item.id || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    lastShownNotification.current = item.id;
    new Notification(item.title, { body: item.message, icon: "/icons/icon-192.png", tag: item.id });
  }, [data?.notifications]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3500); return () => window.clearTimeout(timer); }, [toast]);

  async function action(body: Record<string, unknown>, message = "Updated successfully") {
    const key = String(body.action || "action") + String(body.id || ""); setBusy(key);
    try {
      const response = await fetch("/api/dashboard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Update failed.");
      setToast(message); await refresh(true);
      if (payload.sessionExpired) window.setTimeout(() => window.location.assign("/login"), 900);
    } catch (e) { setToast(e instanceof Error ? e.message : "Update failed."); } finally { setBusy(""); }
  }

  const filteredLeads = useMemo(() => {
    const needle = search.trim().toLowerCase(); if (!needle || !data) return data?.leads || [];
    return data.leads.filter((lead) => [lead.name, lead.phone, lead.status, lead.source, lead.branch].some((value) => String(value).toLowerCase().includes(needle)));
  }, [data, search]);

  return <main className="dashboard-shell" aria-busy={loading}>
    <aside className={sidebarOpen ? "dashboard-sidebar open" : "dashboard-sidebar"}>
      <div className="dashboard-brand"><Image src="/icons/icon-192.png" width={46} height={46} alt=""/><span>Capital <strong>Gold</strong><small>Business Command Center</small></span></div>
      <nav>{tabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => { setActiveTab(tab); setSidebarOpen(false); }}><span>{tabIcon(tab)}</span>{tab}{tab === "Leads" && data?.stats.newLeads ? <b>{data.stats.newLeads}</b> : null}</button>)}</nav>
      <div className="sidebar-user"><span>{initialUser.displayName.slice(0,1).toUpperCase()}</span><div><strong>{initialUser.displayName}</strong><small>{initialUser.role}</small></div></div>
      <div className="sidebar-session"><Link href="/" className="back-site">← View public website</Link><a href={signOutHref} className="dashboard-signout">Sign out securely</a></div>
    </aside>
    <section className="dashboard-main">
      <header className="dashboard-topbar"><button className="dashboard-menu" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Open dashboard navigation">☰</button><div><p>Capital Gold Buyers · protected workspace</p><h1>{activeTab}</h1></div><div className="dashboard-actions"><span className={`dashboard-role-chip ${initialUser.role}`}>{initialUser.role}</span><button onClick={async () => { if (typeof Notification !== "undefined") { await Notification.requestPermission(); setToast("Browser notifications preference updated."); } }}>Enable alerts</button><button onClick={() => refresh()} disabled={loading}>{loading ? <span className="loading-spinner" aria-hidden="true" /> : "↻"} Refresh</button><a href={signOutHref} className="topbar-signout" aria-label="Sign out of dashboard">Sign out</a><div className="notification-bell" aria-label={`${data?.stats.unreadNotifications || 0} unread notifications`}>♦{data?.stats.unreadNotifications ? <b>{data.stats.unreadNotifications}</b> : null}</div></div></header>
      <div className="dashboard-content">
        {loading && <div className="dashboard-loading" role="status" aria-live="polite"><div className="dashboard-loader-mark"><span /><strong>CG</strong></div><div><h2>Loading command center</h2><p>Securing the latest rates, leads and appointments…</p></div><div className="dashboard-loader-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div></div>}
        {error && <div className="dashboard-error">{error}<button onClick={() => refresh()}>Retry</button></div>}
        {data && !loading && <>
          {activeTab === "Overview" && <Overview data={data} setTab={setActiveTab} role={initialUser.role} />}
          {activeTab === "Leads" && <Leads data={data} leads={filteredLeads} search={search} setSearch={setSearch} action={action} busy={busy} role={initialUser.role}/>} 
          {activeTab === "Appointments" && <Appointments data={data} action={action} busy={busy} role={initialUser.role}/>} 
          {activeTab === "Gold Rates" && <Rates data={data} action={action} busy={busy} isAdmin={initialUser.role === "admin"}/>} 
          {activeTab === "Analytics" && <Analytics data={data}/>} 
          {activeTab === "Branches" && <Branches data={data} action={action} isAdmin={initialUser.role === "admin"}/>} 
          {activeTab === "Blog CMS" && <BlogCms data={data} action={action} isAdmin={initialUser.role === "admin"}/>} 
          {activeTab === "Staff" && initialUser.role === "admin" && <Staff data={data} action={action}/>} 
          {activeTab === "Settings" && initialUser.role === "admin" && <Settings data={data} action={action} busy={busy}/>}
          {activeTab === "Reports" && initialUser.role === "admin" && <Reports data={data}/>}
          {activeTab === "Audit Logs" && initialUser.role === "admin" && <AuditLogs data={data}/>}
          {activeTab === "Security" && <Security data={data} role={initialUser.role} action={action}/>} 
        </>}
      </div>
    </section>
    {toast && <div className="dashboard-toast">{toast}</div>}
  </main>;
}

function tabIcon(tab: string) { return ({ Overview:"◫", Leads:"◎", Appointments:"▣", "Gold Rates":"₹", Analytics:"⌁", Reports:"▤", Branches:"⌖", "Blog CMS":"✎", Staff:"♙", Settings:"⚙", "Audit Logs":"◉", Security:"◇" } as Record<string,string>)[tab]; }
function nice(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function when(value: string) { return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
function exportCsv(filename: string, rows: Array<Record<string, string | number | boolean | null>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const protect = (value: unknown) => { const raw = String(value ?? ""); const safe = /^[=+@-]/.test(raw) ? `'${raw}` : raw; return `"${safe.replaceAll('"', '""')}"`; };
  const csv = [headers.map(protect).join(","), ...rows.map((row) => headers.map((header) => protect(row[header])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type:"text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

function Overview({ data, setTab, role }: { data: DashboardData; setTab: (tab:string)=>void; role: "admin" | "staff" }) {
  const cards = [["Total leads",data.stats.totalLeads,"Leads"],["New leads",data.stats.newLeads,"Leads"],["Rate enquiries",data.stats.rateEnquiries,"Leads"],["Upcoming visits",data.stats.upcomingAppointments,"Appointments"],["Conversions",data.stats.convertedLeads,"Leads"],role === "admin" ? ["Unique visitors",data.stats.uniqueVisitors,"Analytics"] : ["Pending bookings",data.stats.pendingAppointments,"Appointments"]];
  const today = data.generatedAt.slice(0, 10);
  const overdueFollowUps = data.leads.filter((lead) => lead.nextFollowUp && lead.nextFollowUp.slice(0, 10) <= today && !["converted", "closed"].includes(lead.status)).length;
  return <><section className="dashboard-command-hero"><div><p>Today&apos;s business pulse</p><h2>Turn every enquiry into a trusted branch visit.</h2><span>Prioritize fresh prospects, respond quickly and keep every promised follow-up visible.</span></div><div className="command-hero-metrics"><button onClick={() => setTab("Leads")}><small>New lead queue</small><strong>{data.stats.newLeads}</strong><em>Open CRM →</em></button><button onClick={() => setTab("Appointments")}><small>Pending appointments</small><strong>{data.stats.pendingAppointments}</strong><em>Review bookings →</em></button><button onClick={() => setTab("Leads")} className={overdueFollowUps ? "attention" : ""}><small>Due / overdue follow-ups</small><strong>{overdueFollowUps}</strong><em>{overdueFollowUps ? "Needs attention →" : "Queue is clear"}</em></button></div></section><div className="kpi-grid">{cards.map(([label,value,tab]) => <button key={String(label)} onClick={() => setTab(String(tab))}><span>{label}</span><strong>{value}</strong><small>View details →</small></button>)}</div><div className="dashboard-grid"><section className="dashboard-panel"><div className="panel-title"><div><p>Live activity</p><h2>Latest enquiries</h2></div><button onClick={() => setTab("Leads")}>View all</button></div><div className="activity-list">{data.notifications.slice(0,6).map((item) => <article key={item.id}><span className={`activity-type ${item.type}`}>{item.type === "rate_enquiry" ? "₹" : item.type === "appointment" ? "▣" : "◎"}</span><div><strong>{item.title}</strong><p>{item.message}</p><small>{when(item.createdAt)}</small></div>{!item.isRead && <b>New</b>}</article>)}</div></section><section className="dashboard-panel"><div className="panel-title"><div><p>Pipeline</p><h2>Lead status</h2></div></div><div className="pipeline-list">{leadStatuses.map((status) => { const count = data.leads.filter((lead) => lead.status === status).length; const percent = data.leads.length ? Math.round(count/data.leads.length*100) : 0; return <div key={status}><span><strong>{nice(status)}</strong><b>{count}</b></span><i><em style={{width:`${percent}%`}}/></i></div>; })}</div></section></div></>;
}

function Analytics({ data }: { data:DashboardData }) {
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(data.generatedAt); date.setDate(date.getDate() - (6-index)); return date.toISOString().slice(0,10); });
  const daily = days.map((day) => ({ day, views: data.analytics.filter((event) => event.eventName === "page_view" && event.createdAt.startsWith(day)).length, leads: data.leads.filter((lead) => lead.createdAt.startsWith(day)).length }));
  const maximum = Math.max(1, ...daily.map((item) => item.views));
  const sources = Array.from(new Set(data.analytics.map((event) => event.campaign))).map((campaign) => ({ campaign, count: data.analytics.filter((event) => event.campaign === campaign).length })).sort((a,b)=>b.count-a.count).slice(0,8);
  const events = ["gold_rate_unlocked", "calculator_used", "appointment_requested", "contact_submitted", "click_call", "click_whatsapp"].map((eventName) => ({ eventName, count: data.analytics.filter((event) => event.eventName === eventName).length }));
  return <><div className="kpi-grid analytics-kpis"><button><span>Page views</span><strong>{data.stats.pageViews}</strong><small>Consent-based events</small></button><button><span>Unique sessions</span><strong>{data.stats.uniqueVisitors}</strong><small>Anonymous first-party</small></button><button><span>Rate conversions</span><strong>{events[0].count}</strong><small>Rate unlocks</small></button><button><span>Appointment leads</span><strong>{data.appointments.length}</strong><small>Requests submitted</small></button></div><div className="dashboard-grid"><section className="dashboard-panel"><div className="panel-title"><div><p>Last seven days</p><h2>Traffic & lead trend</h2></div></div><div className="bar-chart">{daily.map((item)=><div key={item.day}><i style={{height:`${Math.max(5,item.views/maximum*100)}%`}}><b>{item.views}</b></i><em style={{height:`${Math.max(3,item.leads/maximum*100)}%`}}/><span>{new Date(item.day).toLocaleDateString("en-IN",{weekday:"short"})}</span></div>)}</div><div className="chart-legend"><span><i/>Page views</span><span><i/>Leads</span></div></section><section className="dashboard-panel"><div className="panel-title"><div><p>Acquisition</p><h2>Campaign sources</h2></div></div><div className="source-list">{sources.length? sources.map((item)=><div key={item.campaign}><span>{item.campaign}</span><strong>{item.count}</strong></div>):<p>No consented traffic data yet.</p>}</div><div className="panel-title analytics-events-title"><div><p>Conversion events</p><h2>Key actions</h2></div></div><div className="source-list">{events.map((item)=><div key={item.eventName}><span>{nice(item.eventName)}</span><strong>{item.count}</strong></div>)}</div></section></div></>;
}

function Leads({ data, leads, search, setSearch, action, busy, role }: { data:DashboardData; leads:LeadRow[]; search:string; setSearch:(v:string)=>void; action:(b:Record<string,unknown>,m?:string)=>Promise<void>; busy:string; role:"admin"|"staff" }) {
  const activeStaff = data.staff.filter((person) => person.role === "staff" && person.isActive);
  return <section className="dashboard-panel full-panel"><div className="panel-title"><div><p>{role === "admin" ? "Central CRM & assignment" : "My assigned follow-ups"}</p><h2>{role === "admin" ? "Leads, enquiries & ownership" : "Customers assigned to me"}</h2></div><div className="panel-tools"><input className="dashboard-search" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name, phone or status"/>{role === "admin" && <button onClick={()=>exportCsv("capital-gold-leads.csv",leads.map((lead)=>({Name:lead.name,Phone:lead.phone,Email:lead.email,Source:lead.source,Branch:lead.branch,Status:lead.status,AssignedTo:lead.assignedTo,FollowUp:lead.nextFollowUp,Created:lead.createdAt})))}>Export CSV</button>}<button onClick={()=>window.print()}>Print/PDF</button></div></div><div className="table-wrap lead-table-wrap"><table><thead><tr><th>Customer</th><th>Source</th><th>Status</th><th>{role === "admin" ? "Assign staff" : "Owner"}</th><th>Next follow-up</th><th>Follow-up note</th><th>Updated</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td><strong>{lead.name}</strong><a href={`tel:${lead.phone}`}>{lead.phone}</a><small>{lead.branch}</small></td><td><span className="source-pill">{nice(lead.source)}</span><small className={`priority-label ${lead.priority}`}>{nice(lead.priority)}</small></td><td><select defaultValue={lead.status} onChange={(e)=>action({action:"update_lead",id:lead.id,status:e.target.value,notes:lead.notes,nextFollowUp:lead.nextFollowUp},"Lead status updated")}>{leadStatuses.map((status)=><option key={status} value={status}>{nice(status)}</option>)}</select></td><td>{role === "admin" ? <select value={lead.assignedTo || ""} onChange={(e)=>action({action:"assign_lead",id:lead.id,assignedTo:e.target.value},e.target.value ? "Lead assigned to staff" : "Lead returned to admin queue")}><option value="">Admin queue / unassigned</option>{activeStaff.map((person)=><option key={person.email} value={person.email}>{person.name}</option>)}</select> : <span className="assigned-staff-pill">{lead.assignedName || data.currentUser.displayName}</span>}</td><td><input type="datetime-local" defaultValue={lead.nextFollowUp?.slice(0,16)||""} onChange={(e)=>action({action:"update_lead",id:lead.id,status:lead.status,notes:lead.notes,nextFollowUp:e.target.value},"Follow-up time updated")}/></td><td><textarea className="lead-note-field" defaultValue={lead.notes} rows={3} onBlur={(e)=>e.target.value!==lead.notes&&action({action:"update_lead",id:lead.id,status:lead.status,notes:e.target.value,nextFollowUp:lead.nextFollowUp},"Follow-up note saved")}/></td><td><small>{when(lead.updatedAt)}</small>{busy.endsWith(lead.id) && <em>Saving…</em>}</td></tr>)}</tbody></table>{!leads.length && <div className="dashboard-empty"><strong>No leads in this queue.</strong><span>{role === "admin" ? "New website enquiries will appear here automatically." : "Admin has not assigned any follow-ups to this account."}</span></div>}</div></section>;
}

function Appointments({ data, action, busy, role }: { data:DashboardData; action:(b:Record<string,unknown>,m?:string)=>Promise<void>; busy:string; role:"admin"|"staff" }) {
  const activeStaff = data.staff.filter((person) => person.role === "staff" && person.isActive);
  return <><div className="workflow-banner"><div><strong>{role === "admin" ? "Admin appointment queue" : "My appointment follow-ups"}</strong><span>{role === "admin" ? "Every public booking arrives here first. Assign an owner before confirmation." : "Only appointments assigned to your staff account are shown."}</span></div><b>{data.appointments.length}</b></div><div className="appointment-admin-grid">{data.appointments.map((item) => <article className="dashboard-panel appointment-admin-card" key={item.id}><div><span className={`status-pill ${item.status}`}>{nice(item.status)}</span><small>{item.appointmentDate} • {item.timeSlot}</small></div><h3>{item.name}</h3><a href={`tel:${item.phone}`}>{item.phone}</a><p>{item.branch}</p>{item.customerNote && <blockquote>{item.customerNote}</blockquote>}{role === "admin" && <label>Assign follow-up<select value={item.assignedTo || ""} onChange={(e)=>action({action:"assign_appointment",id:item.id,assignedTo:e.target.value},e.target.value ? "Appointment assigned" : "Appointment returned to admin queue")}><option value="">Admin queue / unassigned</option>{activeStaff.map((person)=><option key={person.email} value={person.email}>{person.name}</option>)}</select></label>}<label>Status<select defaultValue={item.status} onChange={(e)=>action({action:"update_appointment",id:item.id,status:e.target.value,staffNote:item.staffNote},"Appointment updated")}>{appointmentStatuses.map((status)=><option key={status} value={status}>{nice(status)}</option>)}</select></label><label>Staff follow-up note<textarea defaultValue={item.staffNote} onBlur={(e)=>e.target.value!==item.staffNote&&action({action:"update_appointment",id:item.id,status:item.status,staffNote:e.target.value},"Appointment note saved")}/></label>{busy.endsWith(item.id)&&<small>Saving…</small>}</article>)}</div>{!data.appointments.length && <div className="dashboard-panel dashboard-empty"><strong>No appointments in this queue.</strong><span>{role === "admin" ? "New public booking requests appear automatically." : "Admin has not assigned an appointment to you."}</span></div>}</>;
}

function RateSparkline({ rows }: { rows: RateHistoryRow[] }) {
  const values = [...rows].reverse().map((row)=>row.pricePerGram);
  if (values.length < 2) return <div className="rate-chart-empty">Rate history will appear after the next updates.</div>;
  const min=Math.min(...values), max=Math.max(...values), span=Math.max(1,max-min);
  const points=values.map((value,index)=>`${(index/(values.length-1))*100},${38-((value-min)/span)*32}`).join(" ");
  return <svg className="rate-sparkline" viewBox="0 0 100 42" preserveAspectRatio="none" role="img" aria-label="Recent rate trend"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>;
}

function Rates({ data, action, busy, isAdmin }: { data:DashboardData; action:(b:Record<string,unknown>,m?:string)=>Promise<void>; busy:string; isAdmin:boolean }) {
  const health=data.rateHealth;
  return <>
    <div className={`rate-health-banner ${health.stale || health.status?.status==="failed" ? "warning" : "healthy"}`}>
      <div><strong>{health.stale ? "Rates need attention" : health.status?.status==="failed" ? "Last sync failed — fallback active" : "Gold-rate system healthy"}</strong><span>Last successful update: {health.lastSuccessAt ? when(health.lastSuccessAt) : "Not recorded"} · stale limit {health.staleHours} hours</span>{health.status?.lastError && <small>{health.status.lastError}</small>}</div>
      <b>{health.stale || health.status?.status==="failed" ? "!" : "✓"}</b>
    </div>
    <div className="admin-notice rate-sync-toolbar"><div><strong>Market-linked indicative buying rates</strong><span>Admin controls the indicative percentage, automatic sync and alert recipients below.</span></div>{isAdmin && <button className="dashboard-primary" disabled={busy === "sync_live_rates"} onClick={()=>action({action:"sync_live_rates"},"Live market rates synchronized")}>{busy === "sync_live_rates" ? "Syncing…" : "Sync now from GoldAPI"}</button>}</div>
    {isAdmin && data.goldSettings && <form className="dashboard-panel admin-form gold-settings-form" onSubmit={(event)=>{event.preventDefault();const form=new FormData(event.currentTarget);void action({action:"save_gold_settings",emailAlertsEnabled:form.get("emailAlertsEnabled")==="on",alertEmails:form.get("alertEmails"),whatsappAlertsEnabled:form.get("whatsappAlertsEnabled")==="on",whatsappNumber:form.get("whatsappNumber"),staleHours:Number(form.get("staleHours")),alertCooldownHours:Number(form.get("alertCooldownHours")),automaticSyncEnabled:form.get("automaticSyncEnabled")==="on",indicativeAdjustmentPercent:Number(form.get("indicativeAdjustmentPercent"))},"Gold-rate settings saved");}}><div className="panel-title"><div><p>Admin-controlled configuration</p><h2>Indicative price & alert settings</h2></div></div><label className="switch-row"><input name="automaticSyncEnabled" type="checkbox" defaultChecked={data.goldSettings.automaticSyncEnabled}/> Automatic GoldAPI sync enabled</label><label>Indicative buying percentage<input name="indicativeAdjustmentPercent" type="number" min="50" max="110" step="0.1" defaultValue={data.goldSettings.indicativeAdjustmentPercent}/><small>Example: 95 means indicative buying rate = 95% of the calculated market rate.</small></label><label className="switch-row"><input name="emailAlertsEnabled" type="checkbox" defaultChecked={data.goldSettings.emailAlertsEnabled}/> Email alerts on sync failure/stale rates</label><label>Admin alert emails<input name="alertEmails" type="text" defaultValue={data.goldSettings.alertEmails.join(", ")} placeholder="admin@example.com, owner@example.com"/></label><label className="switch-row"><input name="whatsappAlertsEnabled" type="checkbox" defaultChecked={data.goldSettings.whatsappAlertsEnabled}/> WhatsApp admin alerts</label><label>WhatsApp admin number<input name="whatsappNumber" type="tel" defaultValue={data.goldSettings.whatsappNumber} placeholder="919876543210"/><small>Country code required; enter digits only.</small></label><label>Stale after hours<input name="staleHours" type="number" min="1" max="168" defaultValue={data.goldSettings.staleHours}/></label><label>Alert cooldown hours<input name="alertCooldownHours" type="number" min="1" max="72" defaultValue={data.goldSettings.alertCooldownHours}/></label><p className="form-hint">SMTP/Resend and WhatsApp access-token credentials remain protected in .env.local. Dashboard stores only alert preferences and recipients.</p><button className="dashboard-primary" disabled={busy==="save_gold_settings"}>{busy==="save_gold_settings"?"Saving…":"Save price & alert settings"}</button></form>}
    <div className="rate-admin-grid">{data.rates.map((rate)=>{const history=data.rateHistory.filter((row)=>row.karat===rate.karat).slice(0,30); const previous=history[1]?.pricePerGram; const change=previous ? rate.pricePerGram-previous : 0; return <form className="dashboard-panel rate-admin-card" key={rate.id} onSubmit={(e)=>{e.preventDefault();const form=new FormData(e.currentTarget);action({action:"update_rate",id:rate.id,pricePerGram:Number(form.get("price")),source:form.get("source"),isPublished:form.get("published")==="on"},`${rate.karat} rate published`);}}><div className="rate-card-heading"><span>{rate.karat}</span><em className={change>0?"up":change<0?"down":""}>{change ? `${change>0?"+":""}₹${change}` : "No change"}</em></div><div className="rate-origin"><b>{rate.isAutomatic ? "API synced" : "Manual"}</b><small>{rate.marketPricePerGram ? `Market ₹${Math.round(rate.marketPricePerGram).toLocaleString("en-IN")}/g · adjustment ${rate.adjustmentPercent}%` : "Custom buying rate"}</small></div><RateSparkline rows={history}/><label>Price per gram<input name="price" type="number" min="1" step="1" defaultValue={rate.pricePerGram} disabled={!isAdmin}/></label><label>
  Source
  <select
    name="source"
    defaultValue={rate.source}
    disabled={!isAdmin}
  >
    <option value="Manual">Manual</option>
    <option value="GoldAPI">GoldAPI</option>
  </select>
</label><label className="switch-row"><input name="published" type="checkbox" defaultChecked={rate.isPublished} disabled={!isAdmin}/> Published</label><small>Last update: {when(rate.updatedAt)} by {rate.updatedBy}</small>{isAdmin&&<button className="dashboard-primary" disabled={busy===`update_rate${rate.id}`}>{busy===`update_rate${rate.id}` ? "Publishing…" : "Publish manual rate"}</button>}</form>})}</div>
    <section className="dashboard-panel rate-history-panel"><div className="panel-title"><div><p>MongoDB audit trail</p><h2>Recent rate updates</h2></div></div><div className="table-wrap"><table><thead><tr><th>Time</th><th>Karat</th><th>Buying rate</th><th>Market rate</th><th>Mode</th><th>Updated by</th></tr></thead><tbody>{data.rateHistory.slice(0,30).map((row)=><tr key={row.historyId}><td>{when(row.updatedAt)}</td><td><strong>{row.karat}</strong></td><td>₹{row.pricePerGram.toLocaleString("en-IN")}/g</td><td>{row.marketPricePerGram ? `₹${row.marketPricePerGram.toLocaleString("en-IN")}/g` : "—"}</td><td><span className={`status-pill ${row.trigger}`}>{nice(row.trigger)}</span></td><td>{row.updatedBy}</td></tr>)}</tbody></table>{!data.rateHistory.length&&<div className="dashboard-empty"><strong>No rate history yet.</strong><span>Automatic and manual updates will be recorded here.</span></div>}</div></section>
  </>;
}


function Branches({ data, action, isAdmin }: { data:DashboardData; action:(b:Record<string,unknown>,m?:string)=>Promise<void>; isAdmin:boolean }) {
  const emptyBranch: BranchRow = { id:"", name:"", slug:"", address:"", phone:"", email:"", businessHours:"", mapsUrl:"", isActive:true, createdAt:"", updatedAt:"" };
  const [editing, setEditing] = useState<BranchRow>(emptyBranch);

  function edit(branch?: BranchRow) {
    setEditing(branch || emptyBranch);
    window.setTimeout(() => document.getElementById("branch-editor")?.scrollIntoView({ behavior:"smooth", block:"start" }), 0);
  }

  return <div className="blog-admin-layout">
    <section className="dashboard-panel">
      <div className="panel-title"><div><p>Branch network</p><h2>Locations</h2></div>{isAdmin && <button onClick={()=>edit()}>Add branch</button>}</div>
      <div className="blog-admin-list">{data.branches.map((branch)=><article key={branch.id}>
        <div><strong>{branch.name}</strong><small>{branch.address}</small><em>{branch.phone} · {branch.businessHours}</em></div>
        <span className={`status-pill ${branch.isActive ? "published" : "draft"}`}>{branch.isActive ? "Active" : "Inactive"}</span>
        {isAdmin && <button onClick={()=>edit(branch)}>Edit</button>}
      </article>)}</div>
      {!data.branches.length && <div className="dashboard-empty"><strong>No branches added.</strong><span>Create the first business location using the form.</span></div>}
    </section>
    {isAdmin && <form id="branch-editor" className="dashboard-panel admin-form" onSubmit={(event)=>{event.preventDefault();const form=new FormData(event.currentTarget);void action({action:"save_branch",id:editing.id,name:form.get("name"),slug:form.get("slug"),address:form.get("address"),phone:form.get("phone"),email:form.get("email"),businessHours:form.get("businessHours"),mapsUrl:form.get("mapsUrl"),isActive:form.get("isActive")==="on"},editing.id?"Branch updated":"Branch created");setEditing(emptyBranch);}}>
      <div className="panel-title"><div><p>Admin editor</p><h2>{editing.id ? "Edit branch" : "Add branch"}</h2></div></div>
      <label>Branch name<input name="name" key={`name-${editing.id}`} defaultValue={editing.name} required/></label>
      <label>Slug<input name="slug" key={`slug-${editing.id}`} defaultValue={editing.slug} placeholder="hindupur"/></label>
      <label>Address<textarea name="address" key={`address-${editing.id}`} defaultValue={editing.address} rows={4} required/></label>
      <div className="form-grid"><label>Phone<input name="phone" key={`phone-${editing.id}`} defaultValue={editing.phone} required/></label><label>Email<input name="email" type="email" key={`email-${editing.id}`} defaultValue={editing.email}/></label></div>
      <label>Business hours<input name="businessHours" key={`hours-${editing.id}`} defaultValue={editing.businessHours} placeholder="Mon–Sat, 9:00 AM–7:00 PM" required/></label>
      <label>Google Maps URL<input name="mapsUrl" type="url" key={`maps-${editing.id}`} defaultValue={editing.mapsUrl} required/></label>
      <label className="switch-row"><input name="isActive" type="checkbox" key={`active-${editing.id}`} defaultChecked={editing.isActive}/> Active and visible</label>
      <div className="panel-tools"><button className="dashboard-primary">{editing.id ? "Save branch" : "Create branch"}</button>{editing.id && <button type="button" onClick={()=>setEditing(emptyBranch)}>Cancel</button>}</div>
    </form>}
  </div>;
}

function BlogCms({ data, action, isAdmin }: { data:DashboardData; action:(b:Record<string,unknown>,m?:string)=>Promise<void>; isAdmin:boolean }) {
  return <div className="blog-admin-layout"><section className="dashboard-panel"><div className="panel-title"><div><p>Content library</p><h2>Articles</h2></div></div><div className="blog-admin-list">{data.blogs.map((post)=><article key={post.id}><div><span>{post.category}</span><h3>{post.title}</h3><p>{post.excerpt}</p></div><b className={`status-pill ${post.status}`}>{nice(post.status)}</b></article>)}</div></section>{isAdmin&&<form className="dashboard-panel admin-form" onSubmit={(e)=>{e.preventDefault();const form=new FormData(e.currentTarget);action({action:"save_blog",...Object.fromEntries(form.entries())},"Article saved");e.currentTarget.reset();}}><div className="panel-title"><div><p>SEO content</p><h2>New article</h2></div></div><label>Title<input name="title" required/></label><label>Category<input name="category" defaultValue="Gold Education"/></label><label>Excerpt<textarea name="excerpt" required/></label><label>Article content<textarea name="content" rows={8} required/></label><label>Meta title<input name="metaTitle"/></label><label>Meta description<textarea name="metaDescription"/></label><label>Status<select name="status"><option value="draft">Draft</option><option value="published">Published</option></select></label><button className="dashboard-primary">Save article</button></form>}</div>;
}

function Staff({ data, action }: { data:DashboardData; action:(b:Record<string,unknown>,m?:string)=>Promise<void> }) {
  return <div className="staff-layout"><section className="dashboard-panel"><div className="panel-title"><div><p>Role-based access control</p><h2>Team members</h2></div></div><div className="staff-list">{data.staff.map((person)=><StaffMember key={person.email} person={person} action={action}/>)}</div></section><form className="dashboard-panel admin-form" onSubmit={(e)=>{e.preventDefault();const form=new FormData(e.currentTarget);action({action:"add_staff",...Object.fromEntries(form.entries())},"Staff account created");e.currentTarget.reset();}}><div className="panel-title"><div><p>Secure account creation</p><h2>Add staff</h2></div></div><label>Name<input name="name" minLength={2} required/></label><label>Login email<input name="email" type="email" autoComplete="off" required/></label><label>Temporary password<input name="temporaryPassword" type="password" autoComplete="new-password" minLength={12} required/></label><label>Role<select name="role"><option value="staff">Staff</option><option value="admin">Administrator</option></select></label><p className="form-hint">Use at least 12 characters with uppercase, lowercase, number and special character. Send the temporary password through a separate secure channel and ask the user to change it after login.</p><button className="dashboard-primary">Create team account</button></form></div>;
}

function StaffMember({ person, action }: { person: StaffRow; action:(b:Record<string,unknown>,m?:string)=>Promise<void> }) {
  const [temporaryPassword, setTemporaryPassword] = useState("");
  return <article><span>{person.name.slice(0,1).toUpperCase()}</span><div><strong>{person.name}</strong><small>{person.email} • {person.role} • {person.isActive ? "active" : "disabled"}</small><em>{person.lastLoginAt ? `Last login ${when(person.lastLoginAt)}` : "No successful login yet"}</em></div><div className="staff-account-actions"><input value={temporaryPassword} onChange={(event)=>setTemporaryPassword(event.target.value)} type="password" minLength={12} placeholder="New temporary password" aria-label={`Temporary password for ${person.name}`}/><button disabled={temporaryPassword.length < 12} onClick={()=>{void action({action:"reset_staff_password",email:person.email,temporaryPassword},"Temporary password reset");setTemporaryPassword("");}}>Reset password</button><button onClick={()=>action({action:"toggle_staff",email:person.email,isActive:!person.isActive},person.isActive?"Staff access disabled":"Staff access enabled")}>{person.isActive?"Disable":"Enable"}</button></div></article>;
}

function Settings({ data, action, busy }: { data:DashboardData; action:(b:Record<string,unknown>,m?:string)=>Promise<void>; busy:string }) {
  const settings=data.goldSettings;
  if (!settings) return <div className="dashboard-panel dashboard-empty"><strong>Settings unavailable.</strong><span>Refresh the dashboard or verify MongoDB setup.</span></div>;
  return <><div className="settings-hero"><div><p>Central administration</p><h2>Business, pricing and notification settings</h2><span>Configure operational preferences here. API secrets remain protected in environment variables.</span></div><b>ADMIN ONLY</b></div><form className="dashboard-panel admin-form gold-settings-form" onSubmit={(event)=>{event.preventDefault();const form=new FormData(event.currentTarget);void action({action:"save_gold_settings",emailAlertsEnabled:form.get("emailAlertsEnabled")==="on",alertEmails:form.get("alertEmails"),whatsappAlertsEnabled:form.get("whatsappAlertsEnabled")==="on",whatsappNumber:form.get("whatsappNumber"),staleHours:Number(form.get("staleHours")),alertCooldownHours:Number(form.get("alertCooldownHours")),automaticSyncEnabled:form.get("automaticSyncEnabled")==="on",indicativeAdjustmentPercent:Number(form.get("indicativeAdjustmentPercent"))},"Settings saved");}}><div className="panel-title"><div><p>Gold rate engine</p><h2>Indicative pricing</h2></div></div><label className="switch-row"><input name="automaticSyncEnabled" type="checkbox" defaultChecked={settings.automaticSyncEnabled}/> Enable automatic GoldAPI sync</label><label>Indicative buying percentage<input name="indicativeAdjustmentPercent" type="number" min="50" max="110" step="0.1" defaultValue={settings.indicativeAdjustmentPercent}/><small>Displayed buying rate = calculated market rate × this percentage.</small></label><div className="panel-title"><div><p>Failure and stale-rate alerts</p><h2>Email & WhatsApp alerts</h2></div></div><label className="switch-row"><input name="emailAlertsEnabled" type="checkbox" defaultChecked={settings.emailAlertsEnabled}/> Enable email alerts</label><label>Admin recipients<input name="alertEmails" defaultValue={settings.alertEmails.join(", ")} placeholder="owner@example.com, admin@example.com"/></label><button type="button" onClick={()=>action({action:"test_email_alert"},"Test email requested")}>Send test email</button><label className="switch-row"><input name="whatsappAlertsEnabled" type="checkbox" defaultChecked={settings.whatsappAlertsEnabled}/> Enable WhatsApp alerts</label><label>Admin WhatsApp number<input name="whatsappNumber" defaultValue={settings.whatsappNumber} placeholder="919876543210"/></label><button type="button" onClick={()=>action({action:"test_whatsapp_alert"},"Test WhatsApp message requested")}>Send test WhatsApp</button><div className="form-grid"><label>Stale after hours<input name="staleHours" type="number" min="1" max="168" defaultValue={settings.staleHours}/></label><label>Alert cooldown hours<input name="alertCooldownHours" type="number" min="1" max="72" defaultValue={settings.alertCooldownHours}/></label></div><p className="form-hint">Required secrets: GOLDAPI_KEY, SMTP/Resend credentials, WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.</p><button className="dashboard-primary" disabled={busy==="save_gold_settings"}>{busy==="save_gold_settings"?"Saving…":"Save all settings"}</button></form><section className="dashboard-panel"><div className="panel-title"><div><p>Integration health</p><h2>Configuration checklist</h2></div></div><div className="security-grid"><article><h3>MongoDB</h3><p>Connected through the server-side database adapter.</p></article><article><h3>GoldAPI</h3><p>Use Sync Now in Gold Rates to validate the API key and quota.</p></article><article><h3>Email</h3><p>Configure SMTP or Resend in .env.local/Vercel.</p></article><article><h3>WhatsApp</h3><p>Configure Meta Cloud API token and phone-number ID.</p></article></div></section></>;
}

function Reports({ data }: { data:DashboardData }) {
  return <><div className="settings-hero"><div><p>Exports</p><h2>Business reports</h2><span>Download operational data for daily review, branch follow-up and management reporting.</span></div></div><div className="kpi-grid"><button onClick={()=>exportCsv("capital-gold-leads.csv",data.leads as unknown as Array<Record<string,string|number|boolean|null>>)}><span>CRM report</span><strong>{data.leads.length}</strong><small>Download leads CSV</small></button><button onClick={()=>exportCsv("capital-gold-appointments.csv",data.appointments as unknown as Array<Record<string,string|number|boolean|null>>)}><span>Appointment report</span><strong>{data.appointments.length}</strong><small>Download appointments CSV</small></button><button onClick={()=>exportCsv("capital-gold-rates.csv",data.rates as unknown as Array<Record<string,string|number|boolean|null>>)}><span>Current rates</span><strong>{data.rates.length}</strong><small>Download rates CSV</small></button><button onClick={()=>exportCsv("capital-gold-rate-history.csv",data.rateHistory as unknown as Array<Record<string,string|number|boolean|null>>)}><span>Rate audit history</span><strong>{data.rateHistory.length}</strong><small>Download history CSV</small></button></div></>;
}

function AuditLogs({ data }: { data:DashboardData }) {
  return <section className="dashboard-panel audit-panel"><div className="panel-title"><div><p>Administrator activity</p><h2>Audit logs</h2></div></div><div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>{data.auditLogs.map(log=><tr key={log.id}><td>{when(log.createdAt)}</td><td>{log.actorEmail}</td><td>{nice(log.action)}</td><td>{log.entityType}</td><td>{log.details}</td></tr>)}</tbody></table>{!data.auditLogs.length&&<div className="dashboard-empty"><strong>No audit events yet.</strong><span>New administrative changes will be recorded here.</span></div>}</div></section>;
}

function Security({ data, role, action }: { data:DashboardData; role:string; action:(b:Record<string,unknown>,m?:string)=>Promise<void> }) {
  return <><div className="security-grid">{[["MongoDB sessions","MongoDB-backed accounts use signed, revocable HTTP-only session cookies with server-side role verification."],["Least privilege","Staff can read and update only leads and appointments assigned to their account."],["Input protection","Validated fields, explicit consent, honeypot checks, same-origin checks and server-memory rate limits."],["Auditability","Login, rate, lead, appointment and access changes are available through controlled MongoDB records when enabled."],["Password safety","Passwords are salted and hashed with scrypt; session versions revoke sessions after password or access changes."],["PWA privacy","Static assets may be cached; dashboard responses and customer personal data are never stored by the service worker."]].map(([title,text])=><article className="dashboard-panel" key={title}><span>◇</span><h3>{title}</h3><p>{text}</p></article>)}</div><form className="dashboard-panel admin-form password-form" onSubmit={(event)=>{event.preventDefault();const form=new FormData(event.currentTarget);void action({action:"change_password",currentPassword:form.get("currentPassword"),newPassword:form.get("newPassword")},"Password changed. Please sign in again.");}}><div className="panel-title"><div><p>Account security</p><h2>Change my password</h2></div></div><div className="form-grid"><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required/></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required/></label></div><p className="form-hint">Changing your password revokes every existing session for this account.</p><button className="dashboard-primary">Change password & sign out</button></form>{role==="admin"&&<section className="dashboard-panel audit-panel"><div className="panel-title"><div><p>Immutable activity</p><h2>Recent audit log</h2></div></div><div className="audit-list">{data.auditLogs.map((log)=><article key={log.id}><span>{log.action}</span><strong>{log.entityType}</strong><p>{log.actorEmail}</p><small>{when(log.createdAt)}</small></article>)}</div></section>}</>;
}
