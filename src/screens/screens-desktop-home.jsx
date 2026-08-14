// ⛔ STYLE RULES ENFORCED — see data-colorsfonts.jsx header before editing colours, sizes, or spacing.
// C.gold/C.rose/C.sage = background accent ONLY. Badges = bdg() only.
import React, { useState } from 'react'
import { C, D, sans, disp } from '../data-colorsfonts.jsx'
import RecordScreen       from './screens-record.jsx'
import AppointmentsScreen from './screens-appointments.jsx'
import MedsScreen         from './screens-meds.jsx'
import FamilyScreen       from './screens-family.jsx'
import SettingsScreen     from './screens-settings.jsx'
import BriefScreen        from './screens-brief.jsx'
import UpgradeScreen      from './screens-upgrade.jsx'
import { LOGO, BG_BANNER } from '../data-colorsfonts.jsx'

const CARD = { background:'#fff', border:`1px solid ${C.rule}`, borderRadius:14, boxShadow:'0 1px 4px rgba(0,0,0,.05)' }

// ── Shared helpers ────────────────────────────────────────────────────────
const ENTRY_CONDS = {
  'BP Check':['Hypertension'],'Amlodipine increased':['Hypertension'],
  'Blood panel':['Diabetes','Kidney Disease','Hypertension'],
  'Nephrology':['Kidney Disease'],'Furosemide added':['Heart Failure'],
  'Metformin stopped':['Diabetes','Kidney Disease'],
  'Dad seemed confused after dinner':['Cognitive / Neuro'],
  'Swollen ankles noticed':['Heart Failure','Kidney Disease'],
  'Cardiology visit':['Prostate Cancer'],
}
const CONDITIONS = [
  { name:'Kidney',   condKey:'Kidney Disease',  unit:'eGFR',     color:'#C7785E', status:'Keep an eye',   page:'meds' },
  { name:'Prostate', condKey:'Prostate Cancer', unit:'PSA',      color:'#B5532A', status:'Active monitor', page:'meds' },
  { name:'Diabetes', condKey:'Diabetes',        unit:'HbA1c',    color:'#7C9E88', status:'Stable',         page:'meds' },
  { name:'BP',       condKey:'Hypertension',    unit:'Home avg', color:'#7C9E88', status:'Stable',         page:'meds' },
]
const COND_TAGS = ['Hypertension','Kidney Disease','Diabetes','Prostate Cancer','Heart Failure','Cognitive / Neuro','General']
const todayKey  = (() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
const DEMO_TODAY = new Date('2026-08-03')

const SEED_TASKS = (D.tasks) || [
  { id:'t1', text:'Did ankle swelling improve after Furosemide change?', condTag:'Heart Failure',  dueDate:'2026-08-14', done:false, createdBy:'Nic' },
  { id:'t2', text:'Ask Dr Yeo about PSA trend at Cardiology visit',      condTag:'Prostate Cancer', dueDate:'2026-08-14', done:false, createdBy:'Jun' },
  { id:'t3', text:'Check if Metformin alternative prescribed yet',        condTag:'Diabetes',        dueDate:'2026-08-17', done:false, createdBy:'Nic' },
]

// ── Derive time slots from freq — a med appears at EVERY slot it belongs to ─
// The caregiver thinks "8am pills", "12pm pills" — not med names.
// A "Twice daily" med appears in BOTH its morning AND evening slot.
const SLOT_ORDER = ["8:00 AM","12:00 PM","6:00 PM","9:00 PM","As needed"]

function freqToSlots(m) {
  const primary = m.time || "8:00 AM"
  const f = (m.freq||"").toLowerCase()
  if (f.includes("twice") || f.includes("2x")) {
    const SECOND = { "8:00 AM":"8:00 PM", "12:00 PM":"8:00 PM" }
    return [primary, SECOND[primary] || "8:00 PM"]
  }
  if (f.includes("3x") || f.includes("three times")) return ["8:00 AM","12:00 PM","8:00 PM"]
  if (f.includes("every 2 weeks") || f.includes("weekly") || f.includes("monthly")) return ["As needed"]
  return [primary]
}

function buildMedSlots(meds) {
  const slotMap = {}
  meds.forEach(m => {
    freqToSlots(m).forEach(slot => {
      if (!slotMap[slot]) slotMap[slot] = []
      slotMap[slot].push(m)
    })
  })
  const allSlots = [...SLOT_ORDER, ...Object.keys(slotMap).filter(s => !SLOT_ORDER.includes(s))]
  return allSlots.filter(s => slotMap[s]).map(s => ({ slot:s, meds:slotMap[s] }))
}

function latestFor(condKey) {
  return D.entries
    .filter(e => !e.upcoming && e.value && (ENTRY_CONDS[e.title]||[]).includes(condKey))
    .sort((a,b) => b.sortKey.localeCompare(a.sortKey))[0] || null
}

// ════════════════════════════════════════════════════════════════════════════
// LEFT SIDEBAR — calm welcome + full meds checklist + tasks + family
// ════════════════════════════════════════════════════════════════════════════
function LeftSidebar({ toast, openLog, goTo }) {
  const [medState,   setMedState]   = useState({})
  const [tasks,      setTasks]      = useState(SEED_TASKS)
  const [addingTask, setAddingTask] = useState(false)
  const [newText,    setNewText]    = useState('')
  const [newTag,     setNewTag]     = useState('General')
  const [newDate,    setNewDate]    = useState(todayKey)

  const isTaken    = m => medState[m.name] !== undefined ? medState[m.name] : m.taken
  const confirmMed = m => setMedState(s => ({ ...s, [m.name]: !isTaken(m) }))
  const medSlots   = buildMedSlots(D.meds)
  const doneCount  = D.meds.filter(m => isTaken(m)).length
  const totalMeds  = D.meds.length
  const allDone    = doneCount === totalMeds

  const todayTasks = tasks.filter(t => !t.done && t.dueDate <= todayKey)
  const addTask    = () => {
    if (!newText.trim()) return
    setTasks(ts => [...ts, { id:`t${Date.now()}`, text:newText.trim(), condTag:newTag, dueDate:newDate, done:false, createdBy:'Nic' }])
    setNewText(''); setNewTag('General'); setNewDate(todayKey); setAddingTask(false)
  }
  const doneTask = id => setTasks(ts => ts.map(t => t.id===id ? {...t, done:true} : t))

  const now    = new Date()
  const hour   = now.getHours()
  const greet  = hour >= 17 ? 'Good evening' : hour >= 12 ? 'Good afternoon' : 'Good morning'
  const emoji  = hour >= 17 ? '🌙' : hour >= 12 ? '⛅' : '☀️'

  return (
    <div style={{ width:280, flexShrink:0, height:'100%', overflowY:'auto', borderRight:`1px solid ${C.rule}`, display:'flex', flexDirection:'column' }}>

      {/* ── Welcome — calm, breathing, no data ── */}
      <div style={{ flexShrink:0, position:'relative', overflow:'hidden', minHeight:200,
        background:'#FAF6F1' }}>
        <div style={{ position:'relative', zIndex:1, padding:'28px 24px 24px' }}>
          <div style={{ ...sans, fontSize:13, fontWeight:500, color:C.ink3, marginBottom:4 }}>{greet},</div>
          <div style={{ ...sans, fontSize:30, fontWeight:800, color:C.clay, letterSpacing:'-0.03em', lineHeight:1.05, marginBottom:12 }}>Nic {emoji}</div>
          <div style={{ ...sans, fontSize:14, color:C.ink2, lineHeight:1.6 }}>Here's where<br/>Dad's care stands today.</div>
        </div>
      </div>

      {/* ── Log CTA ── */}
      <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.rule}`, flexShrink:0 }}>
        <button onClick={openLog} style={{ width:'100%', height:44, background:C.clay, border:'none', borderRadius:10,
          display:'flex', alignItems:'center', justifyContent:'center', gap:9, cursor:'pointer',
          boxShadow:`0 3px 12px rgba(199,120,94,.28)` }}>
          <i className="ph ph-microphone" style={{ fontSize:16, color:'rgba(255,255,255,.85)' }} />
          <span style={{ ...sans, fontSize:14, fontWeight:700, color:'#fff' }}>Log an update</span>
        </button>
      </div>

      {/* ── Meds checklist ── */}
      {/* ── Meds checklist — slot-first, pill-count-first ── */}
      <div style={{ padding:'20px 20px 0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ ...sans, fontSize:11, fontWeight:700, color:C.ink3, textTransform:'uppercase', letterSpacing:'0.1em' }}>Medications today</div>
          <span style={{ ...sans, fontSize:12, fontWeight:600, color: allDone ? '#5A7A5A' : C.clay }}>
            {doneCount}/{totalMeds} done
          </span>
        </div>
        <div style={{ border:`1px solid ${C.rule}`, borderRadius:11, overflow:'hidden', background:'#fff' }}>
          {medSlots.map((g, gi) => {
            const slotAllDone = g.meds.every(m => isTaken(m))
            const slotDone    = g.meds.filter(m => isTaken(m)).length
            return (
              <div key={`${g.slot}-${gi}`}>
                {/* ── Slot header: TIME · N pills · Confirm all ── */}
                <div style={{
                  display:'flex', alignItems:'center', gap:8, padding:'8px 13px 7px',
                  background: slotAllDone ? 'rgba(90,122,90,.06)' : C.surf,
                  borderBottom:`1px solid ${C.rule}`,
                  borderTop: gi > 0 ? `1px solid ${C.rule}` : 'none',
                }}>
                  <i className="ph ph-clock" style={{ fontSize:11, color: slotAllDone ? '#5A7A5A' : C.clay, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ ...sans, fontSize:12, fontWeight:700, color: slotAllDone ? '#5A7A5A' : C.ink }}>
                      {g.slot}
                    </span>
                    <span style={{ ...sans, fontSize:11, color:C.ink4, marginLeft:6 }}>
                      · {g.meds.length} {g.meds.length === 1 ? 'pill' : 'pills'}
                    </span>
                  </div>
                  {/* Confirm all button for this slot */}
                  {!slotAllDone ? (
                    <button onClick={() => g.meds.forEach(m => { if (!isTaken(m)) confirmMed(m) })}
                      style={{ ...sans, fontSize:10, fontWeight:700, color:C.clay, background:C.clayT,
                        border:'none', borderRadius:20, padding:'3px 9px', cursor:'pointer', flexShrink:0 }}>
                      All done
                    </button>
                  ) : (
                    <span style={{ ...sans, fontSize:10, fontWeight:700, color:'#5A7A5A' }}>✓ Done</span>
                  )}
                </div>
                {/* ── Individual pills ── */}
                {g.meds.map((m, i) => {
                  const taken = isTaken(m)
                  return (
                    <div key={`${m.name}-${g.slot}`} onClick={() => confirmMed(m)} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'9px 13px',
                      borderBottom: i < g.meds.length-1 ? `1px solid ${C.rule}` : 'none',
                      cursor:'pointer', background: taken ? 'rgba(90,122,90,.03)' : '#fff',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = taken ? 'rgba(90,122,90,.07)' : C.surf}
                      onMouseLeave={e => e.currentTarget.style.background = taken ? 'rgba(90,122,90,.03)' : '#fff'}>
                      {/* Check circle */}
                      <div style={{ width:19, height:19, borderRadius:'50%', flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        border: taken ? 'none' : `1.5px solid ${C.rule}`,
                        background: taken ? '#5A7A5A' : '#fff', transition:'all .12s' }}>
                        {taken && <i className="ph ph-check" style={{ fontSize:9, color:'#fff' }} />}
                      </div>
                      {/* Pill icon */}
                      <i className="ph ph-pill" style={{ fontSize:13, color: taken ? C.ink4 : '#B8860B', flexShrink:0 }} />
                      {/* Name + dose */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ ...sans, fontSize:12, fontWeight:500,
                          color: taken ? C.ink4 : C.ink,
                          textDecoration: taken ? 'line-through' : 'none',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {m.name}
                        </div>
                        <div style={{ ...sans, fontSize:10, color:C.ink4 }}>{m.dose}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
          {/* Footer */}
          <div style={{ padding:'8px 13px', background: allDone ? 'rgba(90,122,90,.06)' : C.surf,
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ ...sans, fontSize:11, color: allDone ? '#5A7A5A' : C.ink4, fontWeight: allDone ? 600 : 400 }}>
              {allDone ? '🎉 All confirmed for today' : `${totalMeds - doneCount} meds still to confirm`}
            </span>
            <button onClick={() => goTo('meds')} style={{ ...sans, fontSize:11, fontWeight:600,
              color:C.clay, background:'none', border:'none', cursor:'pointer', padding:0 }}>Full list →</button>
          </div>
        </div>
      </div>

      {/* ── Tasks ── */}
      <div style={{ padding:'20px 20px 0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ ...sans, fontSize:11, fontWeight:700, color:C.ink3, textTransform:'uppercase', letterSpacing:'0.1em' }}>
            My tasks
            {todayTasks.length > 0 && (
              <span style={{ ...sans, fontSize:10, fontWeight:700, color:'#fff', background:C.clay,
                borderRadius:20, padding:'1px 6px', marginLeft:6 }}>{todayTasks.length}</span>
            )}
          </div>
          <button onClick={() => setAddingTask(v => !v)} style={{ ...sans, fontSize:11, fontWeight:600,
            color:C.clay, background:'none', border:'none', cursor:'pointer', padding:0 }}>
            {addingTask ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {addingTask && (
          <div style={{ border:`1px solid ${C.rule}`, borderRadius:10, padding:'12px 13px', background:'#fff', marginBottom:10 }}>
            <textarea value={newText} onChange={e => setNewText(e.target.value)}
              placeholder="What to follow up on?" rows={2} autoFocus
              style={{ ...sans, fontSize:12, color:C.ink, background:C.surf, border:`1px solid ${C.rule}`,
                borderRadius:7, padding:'7px 9px', width:'100%', outline:'none', resize:'none',
                boxSizing:'border-box', marginBottom:8, lineHeight:1.5 }} />
            <div style={{ display:'flex', gap:6, marginBottom:8 }}>
              <select value={newTag} onChange={e => setNewTag(e.target.value)}
                style={{ ...sans, fontSize:11, color:C.ink, background:'#fff', border:`1px solid ${C.rule}`,
                  borderRadius:7, padding:'5px 8px', flex:1, outline:'none' }}>
                {COND_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                style={{ ...sans, fontSize:11, color:C.ink, background:'#fff', border:`1px solid ${C.rule}`,
                  borderRadius:7, padding:'5px 8px', flex:1, outline:'none' }} />
            </div>
            <button onClick={addTask} style={{ width:'100%', ...sans, fontSize:12, fontWeight:700,
              color:'#fff', background:C.clay, border:'none', borderRadius:7, padding:'7px 0', cursor:'pointer' }}>
              Save task
            </button>
          </div>
        )}

        <div style={{ border:`1px solid ${C.rule}`, borderRadius:11, overflow:'hidden', background:'#fff' }}>
          {todayTasks.length === 0
            ? <div style={{ padding:'13px', ...sans, fontSize:12, color:C.ink4, lineHeight:1.5 }}>
                No tasks due today
              </div>
            : todayTasks.map((t, i) => (
              <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:9, padding:'11px 13px',
                borderBottom: i < todayTasks.length-1 ? `1px solid ${C.rule}` : 'none' }}>
                <button onClick={() => doneTask(t.id)} style={{ width:18, height:18, borderRadius:'50%',
                  border:`2px solid ${C.clay}`, background:'#fff', cursor:'pointer', flexShrink:0, marginTop:2, padding:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ ...sans, fontSize:12, fontWeight:500, color:C.ink, lineHeight:1.4, marginBottom:4 }}>{t.text}</div>
                  <span style={{ ...sans, fontSize:10, fontWeight:600, color:C.clay, background:C.clayT,
                    padding:'1px 6px', borderRadius:20 }}>{t.condTag}</span>
                  {t.dueDate < todayKey && (
                    <span style={{ ...sans, fontSize:10, fontWeight:600, color:'#B83232', background:'#FEF2F2',
                      padding:'1px 6px', borderRadius:20, marginLeft:4 }}>Overdue</span>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Family ── */}
      <div style={{ padding:'20px 20px 20px', flexShrink:0 }}>
        <div style={{ ...sans, fontSize:11, fontWeight:700, color:C.ink3, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Family</div>
        <div style={{ border:`1px solid ${C.rule}`, borderRadius:11, overflow:'hidden', background:'#fff' }}>
          {D.family.map((f, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 13px',
              borderBottom: i < D.family.length-1 ? `1px solid ${C.rule}` : 'none' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:C.clayT,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ ...sans, fontSize:12, fontWeight:700, color:C.clay }}>{f.init||f.name[0]}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ ...sans, fontSize:13, fontWeight:500, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                <div style={{ ...sans, fontSize:11, color:C.ink3 }}>{f.rel}</div>
              </div>
              <div style={{ width:7, height:7, borderRadius:'50%', background: f.online ? '#5A7A5A' : C.surf2, flexShrink:0 }} />
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// CENTRE COLUMN — next appointment (hero) + care log feed
// ════════════════════════════════════════════════════════════════════════════
function HomeCentre({ toast, goTo }) {
  const upcoming = D.entries.filter(e => e.upcoming).sort((a,b) => a.sortKey.localeCompare(b.sortKey))
  const next     = upcoming[0]
  const feed     = D.entries.filter(e => !e.upcoming && e.loggedBy).sort((a,b) => b.sortKey.localeCompare(a.sortKey)).slice(0,6)

  const daysLeft = next
    ? Math.max(0, Math.round((new Date(next.sortKey) - DEMO_TODAY) / 86400000))
    : null

  const CAT_ICONS = { visit:'ph-calendar-check', medication:'ph-pill', test:'ph-flask',
    reading:'ph-chart-line-up', observation:'ph-eye', incident:'ph-warning', document:'ph-file-text' }
  const CAT_COLORS = { visit:C.clay, medication:'#B8860B', test:C.blue,
    reading:'#7B4EAB', observation:'#5A7A5A', incident:'#C0392B', document:C.ink3 }
  const CAT_BGS = { visit:C.clayT, medication:C.goldT, test:C.blueT,
    reading:'#F3E8FF', observation:C.sageT, incident:'#FEF2F2', document:C.surf2 }

  return (
    <div style={{ flex:1, minWidth:0, height:'100%', overflowY:'auto', padding:'32px 36px 48px', display:'flex', flexDirection:'column', gap:32 }}>

      {/* ── Next appointment — hero card ── */}
      {next ? (
        <div>
          <div style={{ ...sans, fontSize:11, fontWeight:700, color:C.ink4, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>Next appointment</div>
          <div style={{ background:`linear-gradient(135deg, ${C.clayT} 0%, rgba(199,120,94,.08) 100%)`,
            border:`1px solid rgba(199,120,94,.2)`, borderRadius:18, padding:'28px 30px',
            boxShadow:'0 2px 16px rgba(199,120,94,.08)' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:20, marginBottom:20 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ ...sans, fontSize:24, fontWeight:800, color:C.ink, letterSpacing:'-0.02em', lineHeight:1.2, marginBottom:8 }}>{next.title}</div>
                <div style={{ ...sans, fontSize:15, color:C.ink3, marginBottom:4 }}>{next.time} · {next.loc}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ ...sans, fontSize:11, fontWeight:700, color:C.clay, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>
                  {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft} days`}
                </div>
                <div style={{ ...disp, fontSize:28, fontWeight:800, color:C.clay, lineHeight:1 }}>{next.date}</div>
                <div style={{ ...sans, fontSize:13, fontWeight:600, color:C.clay }}>{next.mon}</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {next.assignee
                ? <span style={{ ...sans, fontSize:13, fontWeight:600, color:'#5A7A5A', background:'rgba(90,122,90,.12)',
                    padding:'6px 14px', borderRadius:20 }}>
                    <i className="ph ph-user-check" style={{ marginRight:5, fontSize:12 }} />{next.assignee}
                  </span>
                : <button onClick={() => toast('Assign family member')} style={{ ...sans, fontSize:13, fontWeight:600,
                    color:C.ink3, background:'rgba(255,255,255,.7)', border:`1.5px dashed ${C.rule}`,
                    padding:'6px 14px', borderRadius:20, cursor:'pointer' }}>Assign someone →</button>
              }
              <button onClick={() => goTo('brief')} style={{ ...sans, fontSize:13, fontWeight:700, color:'#fff',
                background:C.clay, border:'none', borderRadius:20, padding:'6px 18px', cursor:'pointer',
                boxShadow:'0 2px 8px rgba(199,120,94,.3)', display:'flex', alignItems:'center', gap:6 }}>
                <i className="ph ph-notepad" style={{ fontSize:13 }} /> Prepare brief
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...CARD, padding:'28px 30px', display:'flex', alignItems:'center', gap:16 }}>
          <i className="ph ph-calendar-plus" style={{ fontSize:28, color:C.clay }} />
          <div>
            <div style={{ ...sans, fontSize:16, fontWeight:600, color:C.ink, marginBottom:4 }}>No upcoming appointments</div>
            <button onClick={() => toast('Add appointment')} style={{ ...sans, fontSize:13, fontWeight:600, color:C.clay, background:'none', border:'none', cursor:'pointer', padding:0 }}>Add one →</button>
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      <div style={{ height:1, background:C.rule, flexShrink:0 }} />

      {/* ── Recent care log feed ── */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ ...sans, fontSize:11, fontWeight:700, color:C.ink4, textTransform:'uppercase', letterSpacing:'0.1em' }}>Recent care log</div>
          <button onClick={() => goTo('record')} style={{ ...sans, fontSize:13, fontWeight:600, color:C.clay, background:'none', border:'none', cursor:'pointer', padding:0 }}>All entries →</button>
        </div>

        {feed.length === 0 ? (
          <div style={{ ...CARD, padding:'32px', textAlign:'center' }}>
            <i className="ph ph-note-pencil" style={{ fontSize:32, color:C.rule, display:'block', marginBottom:12 }} />
            <div style={{ ...sans, fontSize:14, color:C.ink4, marginBottom:4 }}>No entries logged yet</div>
            <div style={{ ...sans, fontSize:12, color:C.ink4 }}>Tap "Log an update" to add the first one</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:0, border:`1px solid ${C.rule}`, borderRadius:14, overflow:'hidden', background:'#fff' }}>
            {feed.map((e, i) => {
              const catKey  = e.cat2 || 'observation'
              const icon    = CAT_ICONS[catKey] || 'ph-note'
              const iconCol = CAT_COLORS[catKey] || C.ink3
              const iconBg  = CAT_BGS[catKey] || C.surf
              const init    = e.loggedBy?.slice(0,1).toUpperCase() || '?'
              return (
                <div key={i} onClick={() => goTo('record')} style={{
                  display:'flex', alignItems:'center', gap:14, padding:'16px 22px',
                  borderBottom: i < feed.length-1 ? `1px solid ${C.rule}` : 'none',
                  cursor:'pointer', transition:'background .1s',
                }}
                  onMouseEnter={el => el.currentTarget.style.background = C.surf}
                  onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                  {/* Category icon */}
                  <div style={{ width:36, height:36, borderRadius:'50%', background:iconBg,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <i className={`ph ${icon}`} style={{ fontSize:16, color:iconCol }} />
                  </div>
                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ ...sans, fontSize:14, fontWeight:600, color:C.ink, marginBottom:3,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.title}</div>
                    {e.summary && (
                      <div style={{ ...sans, fontSize:12, color:C.ink3, marginBottom:3,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.summary}</div>
                    )}
                    <div style={{ ...sans, fontSize:12, color:C.ink4 }}>
                      <span style={{ color:C.clay, fontWeight:600 }}>{e.loggedBy}</span> · {e.date} {e.mon}
                    </div>
                  </div>
                  <i className="ph ph-caret-right" style={{ fontSize:14, color:C.rule, flexShrink:0 }} />
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// RIGHT PANEL — mini calendar (dots + click-to-filter) → appointment list
//               + health snapshot if values exist
// ════════════════════════════════════════════════════════════════════════════
function RightPanel({ toast, goTo }) {
  const [selectedDate, setSelectedDate] = useState(null) // 'YYYY-MM-DD' or null = show all

  const upcoming   = D.entries.filter(e => e.upcoming).sort((a,b) => a.sortKey.localeCompare(b.sortKey))
  const healthCards = CONDITIONS.map(c => {
    const e = latestFor(c.condKey)
    return e ? { ...c, latest:e } : null
  }).filter(Boolean)

  // Calendar
  const now   = new Date()
  const cy    = now.getFullYear(), cm = now.getMonth(), cToday = now.getDate()
  const pad   = n => String(n).padStart(2,'0')
  const firstDay    = new Date(cy, cm, 1).getDay()
  const daysInMonth = new Date(cy, cm+1, 0).getDate()
  const monthLabel  = now.toLocaleDateString('en-GB', { month:'long', year:'numeric' })

  // Which days have appointments
  const apptDaySet = new Set(
    upcoming.map(e => { const d = new Date(e.sortKey); return d.getDate() })
  )

  const cells = []
  for (let i=0; i<firstDay; i++) cells.push(null)
  for (let d=1; d<=daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const handleDayClick = (d) => {
    if (!d) return
    const key = `${cy}-${pad(cm+1)}-${pad(d)}`
    setSelectedDate(prev => prev === key ? null : key)
  }

  // Filter appointments by selected date
  const shownAppts = selectedDate
    ? upcoming.filter(e => e.sortKey === selectedDate)
    : upcoming

  const selDay = selectedDate ? parseInt(selectedDate.split('-')[2]) : null
  const selLabel = selectedDate
    ? new Date(selectedDate).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
    : null

  return (
    <div style={{ width:268, flexShrink:0, borderLeft:`1px solid ${C.rule}`, overflowY:'auto',
      display:'flex', flexDirection:'column', padding:'28px 20px 40px', gap:24 }}>

      {/* ── Mini calendar ── */}
      <div style={{ ...CARD, padding:'16px 14px 12px' }}>
        <div style={{ ...sans, fontSize:11, fontWeight:700, color:C.ink3, textAlign:'center',
          marginBottom:10, letterSpacing:'0.05em' }}>{monthLabel.toUpperCase()}</div>

        {/* Day headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
          {['S','M','T','W','T','F','S'].map((d,i) => (
            <div key={i} style={{ ...sans, fontSize:9, fontWeight:600, color:C.ink4,
              textAlign:'center', paddingBottom:4 }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', rowGap:2 }}>
          {cells.map((d, i) => {
            const isToday = d === cToday
            const isSel   = d === selDay
            const hasDot  = d && apptDaySet.has(d)
            return (
              <div key={i} onClick={() => handleDayClick(d)}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingBottom:2, cursor: d ? 'pointer' : 'default' }}>
                <div style={{
                  width:26, height:26, borderRadius:7,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: isSel ? C.clay : isToday ? C.ink : 'transparent',
                  transition:'background .12s',
                }}>
                  <span style={{ ...sans, fontSize:12,
                    fontWeight: isToday || isSel ? 700 : 400,
                    color: isSel || isToday ? '#fff' : d ? C.ink : 'transparent',
                  }}>{d || ''}</span>
                </div>
                {/* Appointment dot */}
                {hasDot ? (
                  <div style={{ width:4, height:4, borderRadius:'50%', marginTop:1,
                    background: isSel ? C.clay : isToday ? C.ink3 : C.clay, opacity: isSel || isToday ? 0 : 1 }} />
                ) : <div style={{ height:5 }} />}
              </div>
            )
          })}
        </div>

        {/* Active filter label */}
        {selectedDate && (
          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.rule}`,
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ ...sans, fontSize:11, fontWeight:600, color:C.clay }}>
              Showing {selLabel}
            </span>
            <button onClick={() => setSelectedDate(null)}
              style={{ ...sans, fontSize:11, color:C.ink3, background:'none', border:'none', cursor:'pointer', padding:0 }}>
              Show all
            </button>
          </div>
        )}
      </div>

      {/* ── Appointment list — filtered by calendar click ── */}
      <div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ ...sans, fontSize:11, fontWeight:700, color:C.ink4, textTransform:'uppercase', letterSpacing:'0.1em' }}>
            {selectedDate ? `On ${selLabel}` : 'Upcoming'}
          </div>
          {!selectedDate && (
            <button onClick={() => goTo('appointments')} style={{ ...sans, fontSize:12, fontWeight:600, color:C.clay, background:'none', border:'none', cursor:'pointer', padding:0 }}>All →</button>
          )}
        </div>

        {shownAppts.length === 0 ? (
          <div style={{ ...CARD, padding:'18px 16px', ...sans, fontSize:13, color:C.ink4, textAlign:'center' }}>
            Nothing on this day
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {shownAppts.map((a, i) => {
              const dLeft = Math.max(0, Math.round((new Date(a.sortKey) - DEMO_TODAY) / 86400000))
              return (
                <div key={i} style={{ ...CARD, padding:'14px 16px' }}>
                  {/* Date badge + title */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
                    <div style={{ width:38, flexShrink:0, textAlign:'center',
                      background: a.next ? C.clay : C.surf, borderRadius:9, padding:'6px 0' }}>
                      <div style={{ ...disp, fontSize:15, fontWeight:700, color:a.next?'#fff':C.ink, lineHeight:1 }}>{a.date}</div>
                      <div style={{ ...sans, fontSize:9, fontWeight:600, color:a.next?'rgba(255,255,255,.7)':C.ink3,
                        textTransform:'uppercase', marginTop:1 }}>{a.mon}</div>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ ...sans, fontSize:14, fontWeight:700, color:C.ink, lineHeight:1.3, marginBottom:3 }}>{a.title}</div>
                      <div style={{ ...sans, fontSize:12, color:C.ink3 }}>{[a.time, a.loc].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                  {/* Footer: countdown + assignee */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ ...sans, fontSize:11, fontWeight:600, color:C.clay, background:C.clayT,
                      padding:'2px 8px', borderRadius:20 }}>
                      {dLeft === 0 ? 'Today' : dLeft === 1 ? 'Tomorrow' : `In ${dLeft} days`}
                    </span>
                    {a.assignee
                      ? <span style={{ ...sans, fontSize:11, fontWeight:600, color:'#5A7A5A',
                          background:'rgba(90,122,90,.1)', padding:'2px 8px', borderRadius:20 }}>
                          {a.assignee}
                        </span>
                      : <button onClick={() => toast('Assign')} style={{ ...sans, fontSize:11, fontWeight:600,
                          color:C.ink3, background:C.surf, border:`1px dashed ${C.rule}`,
                          padding:'2px 8px', borderRadius:20, cursor:'pointer' }}>Assign</button>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Health snapshot — only if values exist ── */}
      {healthCards.length > 0 && (
        <div>
          <div style={{ ...sans, fontSize:11, fontWeight:700, color:C.ink4, textTransform:'uppercase',
            letterSpacing:'0.1em', marginBottom:12 }}>Health snapshot</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {healthCards.map((c, i) => (
              <div key={i} onClick={() => goTo(c.page)} style={{ ...CARD, padding:'13px 14px', cursor:'pointer',
                position:'relative', overflow:'hidden', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:c.color, borderRadius:'14px 0 0 14px' }} />
                <div style={{ flex:1, minWidth:0, paddingLeft:4 }}>
                  <div style={{ ...sans, fontSize:11, color:C.ink3, marginBottom:2 }}>{c.name}</div>
                  <div style={{ ...sans, fontSize:18, fontWeight:700, color:c.color, lineHeight:1, letterSpacing:'-0.02em' }}>{c.latest.value}</div>
                  <div style={{ ...sans, fontSize:10, color:C.ink4, marginTop:1 }}>{c.unit} · {c.latest.date} {c.latest.mon}</div>
                </div>
                <span style={{ ...sans, fontSize:10, fontWeight:700, color:c.color, background:`${c.color}18`,
                  padding:'2px 7px', borderRadius:20, flexShrink:0 }}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// ── Page Header Banner ────────────────────────────────────────────────────
const PAGE_TITLES = { record:'Record', appointments:'Appointments', meds:'Health', family:'Family circle', settings:'Settings', brief:'Appointment brief', upgrade:'Upgrade', conditions:'Health' }
function PageHeader({ page }) {
  const title    = PAGE_TITLES[page]
  if (!title) return null
  const eyebrows  = { meds:'Medications & Conditions', record:'Care history', appointments:'Upcoming', family:'Together', brief:'Before the visit', conditions:'Medications & Conditions' }
  const subtitles = { record:'47 entries', appointments:'2 upcoming', meds:'Everything in one place.', settings:'Preferences',
    family:`${['No one added yet','One person carrying this','Two people carrying this','Three people carrying this'][D.family?.length] || `${D.family?.length} people`}`,
    brief:'12 weeks of care, gathered for your next visit.', upgrade:'Plans', conditions:'Everything in one place.' }
  return (
    <div style={{ flexShrink:0, position:'relative', backgroundImage:`url(${BG_BANNER})`,
      backgroundSize:'cover', backgroundPosition:'center bottom', backgroundRepeat:'no-repeat', minHeight:100 }}>

      <div style={{ position:'relative', zIndex:1, padding:'22px 28px 20px', display:'flex', flexDirection:'column', gap:4 }}>
        {eyebrows[page] && <span style={{ ...sans, fontSize:11, fontWeight:700, color:C.clay, textTransform:'uppercase', letterSpacing:'0.08em' }}>{eyebrows[page]}</span>}
        <span style={{ ...sans, fontSize:30, fontWeight:700, color:C.ink, lineHeight:1.1 }}>{title}</span>
        {subtitles[page] && <span style={{ ...sans, fontSize:13, color:C.ink3, marginTop:2 }}>{subtitles[page]}</span>}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────
export default function DesktopHome({ page, goTo, toast, openLog, deepLink, onDeepLinkConsumed }) {
  const subScreens = { record:RecordScreen, appointments:AppointmentsScreen, meds:MedsScreen, family:FamilyScreen, settings:SettingsScreen, brief:BriefScreen, upgrade:UpgradeScreen, conditions:MedsScreen }
  const FULL_BLEED = new Set(['record','appointments','meds','conditions'])

  return (
    <div style={{ display:'flex', height:'calc(100vh - 56px)', overflow:'hidden' }}>

      {/* ── LEFT SIDEBAR ── */}
      <LeftSidebar toast={toast} openLog={openLog} goTo={goTo} />

      {/* ── MAIN CONTENT ── */}
      {page === 'home'
        ? <HomeCentre toast={toast} goTo={goTo} />
        : (() => {
            const Screen = subScreens[page]
            return Screen
              ? <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
                  {FULL_BLEED.has(page)
                    ? <Screen toast={toast} desktop={true} goTo={goTo} pageHeader={<PageHeader page={page} />} deepLink={deepLink} onDeepLinkConsumed={onDeepLinkConsumed} initialTab={page==='conditions'?'conditions':'medications'} />
                    : <>
                        <PageHeader page={page} />
                        <div style={{ flex:1, padding:'28px 32px 40px', overflowY:'auto', boxSizing:'border-box' }}>
                          <Screen toast={toast} desktop={true} goTo={goTo} deepLink={deepLink} onDeepLinkConsumed={onDeepLinkConsumed} />
                        </div>
                      </>
                  }
                </div>
              : null
          })()
      }

      {/* ── RIGHT PANEL — home only ── */}
      {page === 'home' && <RightPanel toast={toast} goTo={goTo} />}

    </div>
  )
}
