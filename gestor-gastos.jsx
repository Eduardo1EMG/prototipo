import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";

// ── CONSTANTES ────────────────────────────────────────────────────────────────
const CARDS = [
  { id:"bbva_deb",  label:"BBVA Sueldo", type:"débito",  color:"#00A3E0", bank:"BBVA" },
  { id:"bcp_deb",   label:"BCP",         type:"débito",  color:"#E8643A", bank:"BCP" },
  { id:"ibk_deb",   label:"Interbank",   type:"débito",  color:"#2B7FE0", bank:"Interbank" },
  { id:"rip_deb",   label:"Ripley",      type:"débito",  color:"#C0392B", bank:"Ripley" },
  { id:"fal_deb",   label:"Falabella",   type:"débito",  color:"#1E8449", bank:"Falabella" },
  { id:"bbva_cred", label:"BBVA",        type:"crédito", color:"#0077B6", bank:"BBVA" },
  { id:"rip_cred",  label:"Ripley",      type:"crédito", color:"#9B1D20", bank:"Ripley" },
  { id:"fal_cred",  label:"Falabella",   type:"crédito", color:"#27AE60", bank:"Falabella" },
  { id:"prex",      label:"Prexpe",      type:"virtual", color:"#9B6DFF", bank:"Prexpe" },
  { id:"tri",       label:"Tri",         type:"virtual", color:"#FF6B9D", bank:"Tri" },
];

const DEFAULT_DATES = {
  bbva_cred:{ cierre:25, pago:28 },
  rip_cred: { cierre:25, pago:28 },
  fal_cred: { cierre:25, pago:28 },
};

const DEFAULT_BALANCES = {
  bbva_deb: { saldoActual:0, lineaTotal:0 }, bcp_deb:  { saldoActual:0, lineaTotal:0 },
  ibk_deb:  { saldoActual:0, lineaTotal:0 }, rip_deb:  { saldoActual:0, lineaTotal:0 },
  fal_deb:  { saldoActual:0, lineaTotal:0 }, bbva_cred:{ saldoActual:0, lineaTotal:0 },
  rip_cred: { saldoActual:0, lineaTotal:0 }, fal_cred: { saldoActual:0, lineaTotal:0 },
  prex:     { saldoActual:0, lineaTotal:0 }, tri:      { saldoActual:0, lineaTotal:0 },
};

const CATEGORIES   = ["Comida","Transporte","Internet","Pasajes","Conciertos","Salidas / Bar","Perfumes","Senderismo","Viajes","Equipamiento","Salud","Ropa","Suscripciones","Otros"];
const CAT_GROUPS   = { fijos:["Comida","Transporte","Internet","Pasajes"], ocio:["Conciertos","Salidas / Bar","Perfumes","Senderismo","Viajes"], otros:["Equipamiento","Salud","Ropa","Suscripciones","Otros"] };
const CAT_COLORS   = ["#E8643A","#2B7FE0","#FFB347","#38BDF8","#9B6DFF","#FF6B9D","#C8A2C8","#00C9A7","#F59E0B","#E879F9","#4ADE80","#F472B6","#FB923C","#94A3B8"];
const CAT_ICONS    = ["🍔","🚌","📶","🎟","🎵","🍻","🌸","🥾","✈️","🖥️","💊","👕","📱","📦"];

const BANKS_OPTIONS = ["BBVA","BCP","Interbank","Ripley","Falabella","Scotiabank","BanBif","Financiera Oh!","Compartamos","CrediScotia","Otra financiera"];

const DEFAULT_PROJECTS = [
  { id:"indep", name:"Independizarme", goal:15000, saved:0, color:"#38BDF8", icon:"🏠",
    note:"Depósito 1 mes + garantía + muebles básicos + mudanza", cuotasRecom:12 },
  { id:"auto",  name:"Mi Auto",        goal:25000, saved:0, color:"#F59E0B", icon:"🚗",
    note:"Cuota inicial (20-30%) + SOAT + tarjeta de propiedad + revisión técnica", cuotasRecom:18 },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getWeekLabel(date) {
  const d = new Date(date), day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - day + (day===0?-6:1));
  return `${mon.getDate().toString().padStart(2,"0")}/${(mon.getMonth()+1).toString().padStart(2,"0")}`;
}
function getLastNWeeks(n) {
  const weeks=[], now=new Date();
  for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i*7); weeks.push(getWeekLabel(d)); }
  return [...new Set(weeks)];
}
function daysUntilDay(d) {
  const now=new Date(), t=new Date(now.getFullYear(),now.getMonth(),d);
  if(t<=now) t.setMonth(t.getMonth()+1);
  return Math.ceil((t-now)/86400000);
}
function urgencyColor(days){ return days<=3?"#FF4D4D":days<=7?"#FFB347":"#00C9A7"; }
function scoreColor(pct){ return pct<=30?"#00C9A7":pct<=60?"#FFB347":pct<=80?"#FF8C42":"#FF4D4D"; }
function fmt(n){ return (n||0).toLocaleString("es-PE",{minimumFractionDigits:2}); }

// ── COMPONENTES PEQUEÑOS ──────────────────────────────────────────────────────
function StatBox({ label, value, color="#E8E8F0" }) {
  return (
    <div style={{ background:"#12121A", borderRadius:10, padding:"8px 10px" }}>
      <div style={{ fontSize:10, color:"#666", marginBottom:3, letterSpacing:.5 }}>{label}</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color }}>{value}</div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [txns,        setTxns]        = useState([]);
  const [loans,       setLoans]       = useState([]);
  const [budgets,     setBudgets]     = useState([]);
  const [projects,    setProjects]    = useState(DEFAULT_PROJECTS);
  const [activeTab,   setActiveTab]   = useState("resumen");
  const [showVirtual,    setShowVirtual]    = useState(false);
  const [cardTypeFilter, setCardTypeFilter] = useState("todos"); // "todos" | "débito" | "crédito" | "virtual"
  const [graphBankFilter,setGraphBankFilter]= useState("todos"); // "todos" | bank name
  const [editingDates,  setEditingDates]  = useState(null);
  const [editingBal,    setEditingBal]    = useState(null);
  const [cardDates,     setCardDates]     = useState(DEFAULT_DATES);
  const [cardBalances,  setCardBalances]  = useState(DEFAULT_BALANCES);

  const [events,       setEvents]       = useState([]);
  const [showEventForm,setShowEventForm] = useState(false);

  // modals
  const [showTxnForm,    setShowTxnForm]    = useState(false);
  const [showLoanForm,   setShowLoanForm]   = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);

  // forms
  const TODAY = new Date().toISOString().split("T")[0];
  const [txnForm,  setTxnForm]  = useState({ cardId:"bbva_cred", amount:"", category:"Comida", desc:"", type:"gasto", date:TODAY });
  const [loanForm, setLoanForm] = useState({ name:"", bank:"BBVA", amount:"", cuotas:6, cuotaMonto:"", startDate:TODAY, cardId:"", isExternal:false });
  const [budgetForm, setBudgetForm] = useState({ name:"", amount:"", preferredCuotas:6, category:"Otros", cardId:"" });
  const [eventForm,  setEventForm]  = useState({ name:"", type:"Viaje", amount:"", fechaCompra:"", fechaEvento:"", note:"", cardId:"" });

  // ── TRANSACTIONS ────────────────────────────────────────────────────────────
  function addTxn() {
    const amt = parseFloat(txnForm.amount);
    if (!amt || amt <= 0) return;
    setTxns(p => [...p, { ...txnForm, id:Date.now(), amount:amt, week:getWeekLabel(txnForm.date) }]);
    setTxnForm(f => ({ ...f, amount:"", desc:"" }));
    setShowTxnForm(false);
  }
  const deleteTxn = id => setTxns(p => p.filter(t => t.id !== id));

  // ── LOANS ───────────────────────────────────────────────────────────────────
  function addLoan() {
    const amt=parseFloat(loanForm.amount), cuot=parseFloat(loanForm.cuotaMonto);
    if (!loanForm.name || !amt || !cuot) return;
    const n=parseInt(loanForm.cuotas);
    const installments = Array.from({length:n},(_,i)=>{
      const d=new Date(loanForm.startDate); d.setMonth(d.getMonth()+i);
      return { num:i+1, due:d.toISOString().split("T")[0], paid:false };
    });
    setLoans(p => [...p, { ...loanForm, id:Date.now(), amount:amt, cuotaMonto:cuot, cuotas:n, installments }]);
    setLoanForm({ name:"", bank:"BBVA", amount:"", cuotas:6, cuotaMonto:"", startDate:TODAY, cardId:"", isExternal:false });
    setShowLoanForm(false);
  }
  const toggleInstallment = (loanId, num) =>
    setLoans(p => p.map(l => l.id===loanId ? { ...l, installments:l.installments.map(i => i.num===num?{...i,paid:!i.paid}:i) } : l));
  const deleteLoan = id => setLoans(p => p.filter(l => l.id !== id));

  // ── BUDGETS ─────────────────────────────────────────────────────────────────
  function addBudget() {
    const amt = parseFloat(budgetForm.amount);
    if (!budgetForm.name || !amt || amt<=0) return;
    setBudgets(p => [...p, { ...budgetForm, id:Date.now(), amount:amt, cuotas:parseInt(budgetForm.preferredCuotas)||6 }]);
    setBudgetForm({ name:"", amount:"", preferredCuotas:6, category:"Otros", cardId:"" });
    setShowBudgetForm(false);
  }
  const deleteBudget = id => setBudgets(p => p.filter(b => b.id !== id));

  // ── EVENTS ──────────────────────────────────────────────────────────────────
  const EVENT_TYPES = [
    { type:"Viaje",    icon:"✈️",  color:"#38BDF8" },
    { type:"Concierto",icon:"🎵",  color:"#9B6DFF" },
    { type:"Salida",   icon:"🍻",  color:"#FF6B9D" },
    { type:"Senderismo",icon:"🥾", color:"#00C9A7" },
    { type:"Otro",     icon:"📌",  color:"#FFB347" },
  ];
  function addEvent() {
    if (!eventForm.name || !eventForm.amount) return;
    setEvents(p => [...p, { ...eventForm, id:Date.now(), amount:parseFloat(eventForm.amount)||0 }]);
    setEventForm({ name:"", type:"Viaje", amount:"", fechaCompra:"", fechaEvento:"", note:"", cardId:"" });
    setShowEventForm(false);
  }
  const deleteEvent = id => setEvents(p => p.filter(e => e.id !== id));
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    return diff;
  }
  function daysBadgeColor(days) {
    if (days === null) return "#555";
    if (days < 0)  return "#666";
    if (days <= 7) return "#FF4D4D";
    if (days <= 30) return "#FFB347";
    return "#00C9A7";
  }

  // ── PROJECTS ────────────────────────────────────────────────────────────────
  const updateProjectSaved = (id, val) =>
    setProjects(p => p.map(pr => pr.id===id ? { ...pr, saved:Math.max(0,parseFloat(val)||0) } : pr));

  // ── COMPUTED ────────────────────────────────────────────────────────────────
  const weeks = getLastNWeeks(8);

  const cardTotals = useMemo(() => CARDS.map(c => ({
    ...c,
    gastos:  txns.filter(t=>t.cardId===c.id&&(t.type==="gasto"||t.type==="retiro")).reduce((a,t)=>a+t.amount,0),
    retiros: txns.filter(t=>t.cardId===c.id&&t.type==="retiro").reduce((a,t)=>a+t.amount,0),
    pagos:   txns.filter(t=>t.cardId===c.id&&t.type==="pago").reduce((a,t)=>a+t.amount,0),
  })), [txns]);

  // filteredTxns: for graphs — filter by selected bank
  const filteredTxns = graphBankFilter==="todos" ? txns : txns.filter(t => {
    const card = CARDS.find(c=>c.id===t.cardId);
    return card && card.bank===graphBankFilter;
  });

  const totalGastos = txns.filter(t=>t.type==="gasto"||t.type==="retiro").reduce((a,t)=>a+t.amount,0);
  const totalPagos  = txns.filter(t=>t.type==="pago").reduce((a,t)=>a+t.amount,0);

  // Score crediticio estimado (promedio de uso de líneas de crédito)
  const scoreData = useMemo(() => {
    const credCards = CARDS.filter(c=>c.type==="crédito");
    const items = credCards.map(c => {
      const bal = cardBalances[c.id]||{saldoActual:0,lineaTotal:0};
      const ct  = cardTotals.find(x=>x.id===c.id);
      const usado = bal.saldoActual + (ct.gastos - ct.pagos);
      const pct = bal.lineaTotal>0 ? Math.min(100, Math.round((usado/bal.lineaTotal)*100)) : null;
      return { name:c.bank, pct, color:c.color };
    }).filter(x=>x.pct!==null);
    const avg = items.length ? Math.round(items.reduce((a,x)=>a+x.pct,0)/items.length) : null;
    return { items, avg };
  }, [cardBalances, cardTotals]);

  const weeklyBar = useMemo(() => weeks.map(w => ({
    semana:w,
    Gastos: filteredTxns.filter(t=>t.week===w&&(t.type==="gasto"||t.type==="retiro")).reduce((a,t)=>a+t.amount,0),
    Pagos:  filteredTxns.filter(t=>t.week===w&&t.type==="pago").reduce((a,t)=>a+t.amount,0),
  })), [filteredTxns, weeks]);

  const pieData = useMemo(() => {
    const map={};
    filteredTxns.filter(t=>t.type==="gasto"||t.type==="retiro").forEach(t=>{ map[t.category]=(map[t.category]||0)+t.amount; });
    return Object.entries(map).map(([name,value])=>({ name, value }));
  }, [filteredTxns]);

  const lineData = useMemo(() => weeks.map(w => ({
    semana:w,
    Total: filteredTxns.filter(t=>t.week===w&&(t.type==="gasto"||t.type==="retiro")).reduce((a,t)=>a+t.amount,0),
  })), [filteredTxns, weeks]);

  const recentTxns = [...txns].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,15);
  const BANKS_LIST = [...new Set(CARDS.filter(c=>c.type!=="virtual").map(c=>c.bank))];
  const visibleCards = CARDS.filter(c => {
    if (c.type==="virtual" && !showVirtual) return false;
    if (cardTypeFilter==="todos") return true;
    return c.type === cardTypeFilter;
  });

  // Simulador de presupuesto: qué tarjetas pueden cubrir el monto y a cuántas cuotas
  function getBudgetOptions(budget) {
    const maxCuotas = parseInt(budget.cuotas) || 6;
    // Genera opciones de cuotas: de 1 a maxCuotas (destacando 3 y 6)
    const cuotaOptions = Array.from({length: maxCuotas}, (_, i) => i + 1);
    const results = [];
    CARDS.filter(c => c.type === "crédito").forEach(c => {
      const bal = cardBalances[c.id] || { saldoActual:0, lineaTotal:0 };
      const ct  = cardTotals.find(x => x.id === c.id);
      const disponible = Math.max(0, bal.lineaTotal - bal.saldoActual - (ct.gastos - ct.pagos));
      if (disponible >= budget.amount && bal.lineaTotal > 0) {
        results.push({ card:c, disponible, cuotaOptions, restante: disponible - budget.amount });
      }
    });
    // También incluir débito si saldo cubre el total
    CARDS.filter(c => c.type === "débito").forEach(c => {
      const bal = cardBalances[c.id] || { saldoActual:0, lineaTotal:0 };
      const ct  = cardTotals.find(x => x.id === c.id);
      const disponible = Math.max(0, bal.saldoActual - ct.gastos);
      if (disponible >= budget.amount && bal.saldoActual > 0) {
        results.push({ card:c, disponible, cuotaOptions:[1], restante: disponible - budget.amount, isDebit:true });
      }
    });
    return results;
  }

  // ── RENDER CARD ──────────────────────────────────────────────────────────────
  function renderCard(card) {
    const ct     = cardTotals.find(c => c.id === card.id);
    const bal    = cardBalances[card.id] || { saldoActual:0, lineaTotal:0 };
    const dates  = cardDates[card.id];
    const isEB   = editingBal   === card.id;
    const isED   = editingDates === card.id;
    const gastosNetos = ct.gastos - ct.pagos;
    const disponible  = card.type==="crédito"
      ? Math.max(0, bal.lineaTotal - bal.saldoActual - gastosNetos)
      : Math.max(0, bal.saldoActual - ct.gastos);
    const usado = card.type==="crédito" ? bal.saldoActual + gastosNetos : ct.gastos;
    const base  = card.type==="crédito" ? bal.lineaTotal : bal.saldoActual;
    const pct   = base > 0 ? Math.min(100, Math.round((usado/base)*100)) : 0;
    const bc    = pct>=85 ? "#FF4D4D" : pct>=60 ? "#FFB347" : "#00C9A7";
    return (
      <div key={card.id} style={{ background:"#1A1A24", borderLeft:`4px solid ${card.color}`, border:`1px solid ${card.color}18`, borderRadius:14, padding:"15px 16px", marginBottom:10 }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700 }}>
              {card.bank} <span style={{ color:card.color }}>·</span> {card.label!==card.bank ? card.label : card.type}
            </div>
            <span className="chip" style={{ background:`${card.color}22`, color:card.color, marginTop:4 }}>{card.type}</span>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, color:"#E8643A", fontWeight:700, letterSpacing:.5 }}>GASTADO</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800 }}>S/ {fmt(ct.gastos)}</div>
            {card.type==="crédito" && ct.pagos>0 &&
              <div style={{ fontSize:11, color:"#00C9A7" }}>Pag: S/ {fmt(ct.pagos)}</div>}
          </div>
        </div>

        {/* Saldo / línea */}
        <div style={{ marginTop:12, paddingTop:11, borderTop:"1px solid #222230" }}>
          {!isEB ? (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:card.type==="crédito"?"1fr 1fr 1fr":"1fr 1fr", gap:8, marginBottom:10 }}>
                {card.type==="crédito" &&
                  <StatBox label="LÍNEA TOTAL" value={bal.lineaTotal>0 ? `S/ ${fmt(bal.lineaTotal)}` : "—"} />}
                <StatBox
                  label={card.type==="crédito" ? "DEUDA ACTUAL" : "SALDO ACTUAL"}
                  value={bal.saldoActual>0 ? `S/ ${fmt(bal.saldoActual)}` : "—"}
                  color={card.type==="crédito" ? "#FFB347" : "#E8E8F0"} />
                <StatBox label="DISPONIBLE" value={base>0 ? `S/ ${fmt(disponible)}` : "—"} color={base>0 ? bc : "#555"} />
                {ct.retiros > 0 && <StatBox label="RETIROS" value={`S/ ${fmt(ct.retiros)}`} color="#FFB347" />}
              </div>
              {base > 0 && (
                <div>
                  <div style={{ background:"#2A2A38", borderRadius:5, height:7, overflow:"hidden" }}>
                    <div style={{ background:bc, borderRadius:5, height:7, width:`${pct}%`, transition:"width .5s" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#555", marginTop:4 }}>
                    <span>Usado <b style={{ color:"#888" }}>{pct}%</b></span>
                    <span style={{ color:bc, fontWeight:600 }}>
                      {pct>=85 ? "⚠️ Límite alto" : pct>=60 ? "👀 Moderado" : "✅ Saludable"}
                    </span>
                  </div>
                </div>
              )}
              {base===0 && <div style={{ fontSize:12, color:"#444", fontStyle:"italic" }}>Toca editar para ingresar tu saldo →</div>}
              <button className="btn-s" style={{ marginTop:10 }} onClick={() => setEditingBal(card.id)}>
                ✏️ Actualizar{card.type==="crédito" ? " saldo / línea" : " saldo"}
              </button>
            </div>
          ) : (
            <div style={{ display:"grid", gap:9 }}>
              {card.type==="crédito" && (
                <div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>Línea total asignada (S/)</div>
                  <input className="inp" type="number" min="0" placeholder="ej. 5000" style={{ padding:"9px 12px" }}
                    value={bal.lineaTotal||""}
                    onChange={e => setCardBalances(cb => ({...cb, [card.id]:{...cb[card.id], lineaTotal:parseFloat(e.target.value)||0}}))} />
                </div>
              )}
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>
                  {card.type==="crédito" ? "Deuda actual (lo que debes hoy) (S/)" : "Saldo actual en cuenta (S/)"}
                </div>
                <input className="inp" type="number" min="0" placeholder="ej. 1200" style={{ padding:"9px 12px" }}
                  value={bal.saldoActual||""}
                  onChange={e => setCardBalances(cb => ({...cb, [card.id]:{...cb[card.id], saldoActual:parseFloat(e.target.value)||0}}))} />
                {card.type!=="crédito" && <div style={{ fontSize:11, color:"#555", marginTop:3 }}>💡 Actualiza cada vez que cobres o hagas un depósito</div>}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn-g" style={{ flex:1, padding:"8px" }} onClick={() => setEditingBal(null)}>Cancelar</button>
                <button className="btn-p" style={{ flex:2, padding:"8px" }} onClick={() => setEditingBal(null)}>Guardar</button>
              </div>
            </div>
          )}
        </div>

        {/* Fechas crédito */}
        {card.type==="crédito" && dates && (
          <div style={{ marginTop:11, paddingTop:11, borderTop:"1px solid #222230" }}>
            {!isED ? (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                <span className="dbadge" style={{ background:"#E8643A18", color:"#E8643A" }}>✂️ Cierre: día {dates.cierre}</span>
                <span className="dbadge" style={{ background:`${urgencyColor(daysUntilDay(dates.pago))}18`, color:urgencyColor(daysUntilDay(dates.pago)) }}>
                  💳 Pago: día {dates.pago} · {daysUntilDay(dates.pago)}d
                </span>
                <button className="btn-s" onClick={() => setEditingDates(card.id)}>Editar fechas</button>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:8, alignItems:"end" }}>
                <div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>Día cierre</div>
                  <input className="inp" type="number" min="1" max="31" style={{ padding:"8px 10px" }} value={dates.cierre}
                    onChange={e => setCardDates(cd => ({...cd, [card.id]:{...cd[card.id], cierre:parseInt(e.target.value)||1}}))} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>Día límite pago</div>
                  <input className="inp" type="number" min="1" max="31" style={{ padding:"8px 10px" }} value={dates.pago}
                    onChange={e => setCardDates(cd => ({...cd, [card.id]:{...cd[card.id], pago:parseInt(e.target.value)||1}}))} />
                </div>
                <button className="btn-p" style={{ padding:"8px 12px", fontSize:13 }} onClick={() => setEditingDates(null)}>OK</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  // ── ESTILOS BASE ─────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#1A1A24}::-webkit-scrollbar-thumb{background:#3A3A50;border-radius:2px}
    .tab-btn{background:none;border:none;color:#888;cursor:pointer;padding:10px 13px;font-family:'DM Sans',sans-serif;font-size:12.5px;font-weight:500;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap}
    .tab-btn.active{color:#E8643A;border-color:#E8643A}
    .chip{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.5px}
    .btn-p{background:#E8643A;color:#fff;border:none;border-radius:10px;padding:11px 22px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:background .2s}
    .btn-p:hover{background:#C94A20}
    .btn-g{background:transparent;border:1px solid #3A3A50;color:#aaa;border-radius:10px;padding:10px 18px;font-family:'DM Sans',sans-serif;font-size:13px;cursor:pointer;transition:all .2s}
    .btn-g:hover{border-color:#E8643A;color:#E8643A}
    .btn-s{background:transparent;border:1px solid #3A3A50;color:#aaa;border-radius:8px;padding:5px 11px;font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;transition:all .2s}
    .btn-s:hover{border-color:#E8643A;color:#E8643A}
    .inp{background:#1E1E2A;border:1px solid #2E2E3E;color:#E8E8F0;border-radius:10px;padding:10px 14px;font-family:'DM Sans',sans-serif;font-size:14px;width:100%;outline:none;transition:border .2s}
    .inp:focus{border-color:#E8643A} .inp option{background:#1E1E2A}
    .card{background:#1A1A24;border:1px solid #2A2A38;border-radius:16px;padding:18px}
    .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(5px);z-index:100;display:flex;align-items:flex-end;justify-content:center;padding:16px}
    .modal{background:#1A1A24;border:1px solid #2E2E3E;border-radius:20px 20px 14px 14px;padding:26px 22px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto}
    .tog{position:relative;display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#888}
    .tog input{display:none} .tog-t{width:36px;height:20px;background:#2E2E3E;border-radius:10px;transition:background .2s;position:relative}
    .tog input:checked+.tog-t{background:#9B6DFF}
    .tog-t::after{content:'';position:absolute;width:14px;height:14px;background:#fff;border-radius:50%;top:3px;left:3px;transition:transform .2s}
    .tog input:checked+.tog-t::after{transform:translateX(16px)}
    .cuota-dot{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;flex-shrink:0;border:2px solid transparent}
    .cuota-dot.paid{background:#00C9A722;border-color:#00C9A7;color:#00C9A7}
    .cuota-dot.unpaid{background:#2A2A38;border-color:#3A3A50;color:#666}
    .cuota-dot.unpaid:hover{border-color:#E8643A;color:#E8643A}
    .dbadge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600}
    .section-title{font-size:11px;color:#666;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px}
  `;

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight:"100vh", background:"#0F0F14", color:"#E8E8F0", fontFamily:"'DM Sans',sans-serif", paddingBottom:80 }}>
      <style>{css}</style>

      <div style={{ padding:"26px 18px 0", maxWidth:640, margin:"0 auto" }}>

        {/* ── HEADER ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, letterSpacing:"-0.5px" }}>
              Mi <span style={{ color:"#E8643A" }}>Cartera</span>
            </div>
            <div style={{ fontSize:12, color:"#555", marginTop:3 }}>Semana del {getWeekLabel(new Date())}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn-g" style={{ padding:"9px 12px", fontSize:12 }} onClick={() => setShowBudgetForm(true)}>🎯 Presupuesto</button>
            <button className="btn-g" style={{ padding:"9px 12px", fontSize:12 }} onClick={() => setShowLoanForm(true)}>🏦 Préstamo</button>
            <button className="btn-p" onClick={() => setShowTxnForm(true)} style={{ borderRadius:50, width:42, height:42, padding:0, fontSize:20 }}>+</button>
          </div>
        </div>

        {/* ── KPIs + SCORE ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:18 }}>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:10, color:"#E8643A", fontWeight:700, letterSpacing:.8, textTransform:"uppercase", marginBottom:5 }}>Gastado</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>S/ {fmt(totalGastos)}</div>
          </div>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:10, color:"#00C9A7", fontWeight:700, letterSpacing:.8, textTransform:"uppercase", marginBottom:5 }}>Pagado</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }}>S/ {fmt(totalPagos)}</div>
          </div>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:10, color:"#9B6DFF", fontWeight:700, letterSpacing:.8, textTransform:"uppercase", marginBottom:5 }}>Score</div>
            {scoreData.avg !== null ? (
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:scoreColor(scoreData.avg) }}>
                  {scoreData.avg<=30?"🟢":scoreData.avg<=60?"🟡":"🔴"} {100-scoreData.avg}
                </div>
                <div style={{ fontSize:10, color:"#555", marginTop:2 }}>uso {scoreData.avg}%</div>
              </div>
            ) : <div style={{ fontSize:12, color:"#444", marginTop:4 }}>sin datos</div>}
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ borderBottom:"1px solid #2A2A38", marginBottom:18, display:"flex", overflowX:"auto" }}>
          {[["resumen","📊 Resumen"],["tarjetas","💳 Tarjetas"],["presupuesto","🎯 Presupuesto"],["eventos","📅 Eventos"],["proyectos","🚀 Proyectos"],["prestamos","🏦 Préstamos"],["graficas","📈 Gráficas"],["historial","🗂 Historial"]].map(([k,l]) => (
            <button key={k} className={`tab-btn${activeTab===k?" active":""}`} onClick={() => setActiveTab(k)}>{l}</button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════
            RESUMEN
        ════════════════════════════════════════════════════════ */}
        {activeTab==="resumen" && (
          <div>
            {scoreData.avg !== null && (
              <div className="card" style={{ marginBottom:14, padding:16 }}>
                <div className="section-title">Score crediticio estimado</div>
                <div style={{ fontSize:12, color:"#888", marginBottom:10 }}>
                  Basado en % de uso de tus líneas de crédito. Menos del 30% = saludable.
                </div>
                {scoreData.items.map(item => (
                  <div key={item.name} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                      <span style={{ color:"#aaa" }}>{item.name}</span>
                      <span style={{ color:scoreColor(item.pct), fontWeight:600 }}>{item.pct}% usado</span>
                    </div>
                    <div style={{ background:"#2A2A38", borderRadius:4, height:6 }}>
                      <div style={{ background:scoreColor(item.pct), borderRadius:4, height:6, width:`${item.pct}%`, transition:"width .5s" }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:10, fontSize:12, color:scoreColor(scoreData.avg), fontWeight:600 }}>
                  Promedio de uso: {scoreData.avg}% — {scoreData.avg<=30?"✅ Excelente, sigue así":scoreData.avg<=60?"👍 Moderado, reduciendo bien":"⚠️ Alto, continúa reduciendo"}
                </div>
              </div>
            )}
            <div className="card" style={{ marginBottom:14 }}>
              <div className="section-title">Gastos vs pagos semanales</div>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={weeklyBar} barSize={11} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fill:"#555", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"#555", fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:"#1A1A24", border:"1px solid #2E2E3E", borderRadius:10, fontSize:12 }} cursor={{ fill:"rgba(232,100,58,.06)" }} />
                  <Bar dataKey="Gastos" fill="#E8643A" radius={[4,4,0,0]} />
                  <Bar dataKey="Pagos"  fill="#00C9A7" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {txns.length===0 && (
              <div style={{ textAlign:"center", padding:"30px 0", color:"#444" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>💳</div>
                <div style={{ fontSize:13 }}>Sin movimientos aún. Pulsa <span style={{ color:"#E8643A" }}>+</span> para agregar.</div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            TARJETAS
        ════════════════════════════════════════════════════════ */}
        {activeTab==="tarjetas" && (
          <div>
            {/* Filter bar */}
            <div style={{ display:"flex", gap:7, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
              {["todos","débito","crédito"].map(f => (
                <button key={f} onClick={()=>setCardTypeFilter(f)}
                  style={{ background:cardTypeFilter===f?"#E8643A":"#1E1E2A",
                    border:`1px solid ${cardTypeFilter===f?"#E8643A":"#2E2E3E"}`,
                    color:cardTypeFilter===f?"#fff":"#888", borderRadius:20,
                    padding:"5px 14px", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s", textTransform:"capitalize" }}>
                  {f==="todos"?"Todas":f==="débito"?"💳 Débito":"💳 Crédito"}
                </button>
              ))}
              <label className="tog" style={{ marginLeft:"auto" }}>
                <input type="checkbox" checked={showVirtual} onChange={e=>setShowVirtual(e.target.checked)} />
                <span className="tog-t" /> Virtuales
              </label>
            </div>
            {/* Section labels */}
            {cardTypeFilter==="todos" && ["débito","crédito",...(showVirtual?["virtual"]:[])].map(type => {
              const group = visibleCards.filter(c=>c.type===type);
              if(!group.length) return null;
              return (
                <div key={type}>
                  <div style={{ fontSize:10, color:"#555", fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8, marginTop:4, paddingLeft:2 }}>
                    {type==="débito"?"── Débito ──":type==="crédito"?"── Crédito ──":"── Virtuales ──"}
                  </div>
                  {group.map(card => renderCard(card))}
                </div>
              );
            })}
            {cardTypeFilter!=="todos" && visibleCards.map(card => renderCard(card))}

          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            PRESUPUESTO
        ════════════════════════════════════════════════════════ */}
        {activeTab==="presupuesto" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div className="section-title" style={{ marginBottom:0 }}>Mis presupuestos</div>
              <button className="btn-p" style={{ padding:"8px 16px", fontSize:13 }} onClick={()=>setShowBudgetForm(true)}>+ Nuevo</button>
            </div>

            {budgets.length===0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#444" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🎯</div>
                <div style={{ fontSize:13, marginBottom:16 }}>Define un presupuesto y el sistema te dice qué tarjeta puede cubrirlo y a cuántas cuotas.</div>
                <button className="btn-p" onClick={()=>setShowBudgetForm(true)}>Crear presupuesto</button>
              </div>
            ) : budgets.map(b => {
              const opts = getBudgetOptions(b);
              const catIdx = CATEGORIES.indexOf(b.category);
              return (
                <div key={b.id} className="card" style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700 }}>
                        {CAT_ICONS[catIdx]||"📦"} {b.name}
                      </div>
                      <div style={{ fontSize:12, color:"#888", marginTop:3 }}>{b.category} · máx {b.cuotas} cuotas</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:"#E8643A" }}>S/ {fmt(b.amount)}</div>
                      <button className="btn-s" style={{ marginTop:6, color:"#E8643A", borderColor:"#E8643A22" }} onClick={()=>deleteBudget(b.id)}>🗑</button>
                    </div>
                  </div>

                  {opts.length===0 ? (
                    <div style={{ background:"#FF4D4D12", border:"1px solid #FF4D4D22", borderRadius:10, padding:"12px 14px", fontSize:13, color:"#FF8080" }}>
                      ⚠️ Ninguna tarjeta tiene saldo suficiente. Actualiza tus líneas/saldos en la pestaña Tarjetas.
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize:11, color:"#666", marginBottom:8, letterSpacing:.5 }}>OPCIONES DE PAGO</div>
                      <div style={{ display:"grid", gap:10 }}>
                        {opts.map(opt => (
                          <div key={opt.card.id} style={{ background:"#12121A", borderLeft:`3px solid ${opt.card.color}`, borderRadius:12, padding:"13px 14px" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                              <div>
                                <span style={{ fontWeight:700, fontSize:13 }}>{opt.card.bank} {opt.card.label!==opt.card.bank?opt.card.label:""}</span>
                                <span className="chip" style={{ background:`${opt.card.color}22`, color:opt.card.color, marginLeft:7 }}>{opt.card.type}</span>
                              </div>
                              <span style={{ fontSize:11, color:"#00C9A7", fontWeight:600 }}>S/ {fmt(opt.disponible)} disp.</span>
                            </div>

                            {opt.isDebit ? (
                              /* Débito: pago único */
                              <div style={{ background:`${opt.card.color}14`, border:`1px solid ${opt.card.color}28`, borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
                                <div style={{ fontSize:11, color:"#888", marginBottom:3 }}>Pago único · débito</div>
                                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, color:opt.card.color }}>S/ {fmt(b.amount)}</div>
                                <div style={{ fontSize:10, color:"#555", marginTop:2 }}>Te quedan S/ {fmt(opt.restante)}</div>
                              </div>
                            ) : (
                              /* Crédito: grilla de cuotas 1 → maxCuotas */
                              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7 }}>
                                {opt.cuotaOptions.map(n => {
                                  const isHighlight = n===3||n===6;
                                  return (
                                    <div key={n} style={{
                                      background: isHighlight ? `${opt.card.color}20` : "#1A1A24",
                                      border: `1px solid ${isHighlight ? opt.card.color+"44" : "#2A2A38"}`,
                                      borderRadius:8, padding:"8px 6px", textAlign:"center",
                                      position:"relative"
                                    }}>
                                      {isHighlight && <div style={{ position:"absolute", top:-7, left:"50%", transform:"translateX(-50%)", background:opt.card.color, color:"#fff", fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:10 }}>{n===3?"✦ rec.":"máx"}</div>}
                                      <div style={{ fontSize:10, color:"#777", marginBottom:2 }}>{n}c</div>
                                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:800, color: isHighlight ? opt.card.color : "#ccc" }}>S/{fmt(b.amount/n)}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            EVENTOS
        ════════════════════════════════════════════════════════ */}
        {activeTab==="eventos" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div className="section-title" style={{ marginBottom:0 }}>Eventos planeados</div>
              <button className="btn-p" style={{ padding:"8px 16px", fontSize:13 }} onClick={()=>setShowEventForm(true)}>+ Agregar</button>
            </div>

            {events.length===0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#444" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>📅</div>
                <div style={{ fontSize:13, marginBottom:16, lineHeight:1.6 }}>
                  Agrega viajes, conciertos, salidas…<br/>
                  Verás cuándo comprar y cuánto falta para el evento.
                </div>
                <button className="btn-p" onClick={()=>setShowEventForm(true)}>Agregar evento</button>
              </div>
            ) : (
              <div>
                {/* Sort by fechaEvento ascending */}
                {[...events].sort((a,b)=> (a.fechaEvento||"9999") > (b.fechaEvento||"9999") ? 1 : -1).map(ev => {
                  const et       = EVENT_TYPES.find(t=>t.type===ev.type) || EVENT_TYPES[4];
                  const card     = CARDS.find(c=>c.id===ev.cardId);
                  const dCompra  = daysUntil(ev.fechaCompra);
                  const dEvento  = daysUntil(ev.fechaEvento);
                  const opts     = ev.amount > 0 ? getBudgetOptions({amount:ev.amount, cuotas:6}) : [];
                  return (
                    <div key={ev.id} className="card" style={{ marginBottom:12, borderLeft:`4px solid ${et.color}` }}>
                      {/* Header */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                        <div>
                          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700 }}>
                            {et.icon} {ev.name}
                          </div>
                          {ev.note && <div style={{ fontSize:12, color:"#666", marginTop:2 }}>{ev.note}</div>}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, color:et.color }}>
                            S/ {fmt(ev.amount)}
                          </div>
                          <button className="btn-s" style={{ color:"#E8643A", borderColor:"#E8643A22", padding:"3px 8px" }} onClick={()=>deleteEvent(ev.id)}>✕</button>
                        </div>
                      </div>

                      {/* Date badges */}
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                        {ev.fechaCompra && (
                          <div style={{ background:`${daysBadgeColor(dCompra)}18`, border:`1px solid ${daysBadgeColor(dCompra)}44`, borderRadius:20, padding:"5px 12px" }}>
                            <div style={{ fontSize:10, color:"#666", marginBottom:1 }}>🛒 Comprar antes de</div>
                            <div style={{ fontSize:12, fontWeight:700, color:daysBadgeColor(dCompra) }}>
                              {ev.fechaCompra}
                              {dCompra !== null && (
                                <span style={{ fontWeight:400, marginLeft:6 }}>
                                  {dCompra < 0 ? "vencido" : dCompra===0 ? "¡hoy!" : `${dCompra}d`}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {ev.fechaEvento && (
                          <div style={{ background:`${daysBadgeColor(dEvento)}18`, border:`1px solid ${daysBadgeColor(dEvento)}44`, borderRadius:20, padding:"5px 12px" }}>
                            <div style={{ fontSize:10, color:"#666", marginBottom:1 }}>{et.icon} Fecha del evento</div>
                            <div style={{ fontSize:12, fontWeight:700, color:daysBadgeColor(dEvento) }}>
                              {ev.fechaEvento}
                              {dEvento !== null && (
                                <span style={{ fontWeight:400, marginLeft:6 }}>
                                  {dEvento < 0 ? "pasado" : dEvento===0 ? "¡hoy!" : `en ${dEvento}d`}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Linked card */}
                      {card && (
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                          <span style={{ fontSize:11, color:"#555" }}>Pagar con:</span>
                          <span className="chip" style={{ background:`${card.color}22`, color:card.color }}>{card.bank} {card.type}</span>
                        </div>
                      )}

                      {/* Payment options */}
                      {ev.amount > 0 && opts.length > 0 && (
                        <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #222230" }}>
                          <div style={{ fontSize:10, color:"#555", marginBottom:7, letterSpacing:.5 }}>OPCIONES DE PAGO DISPONIBLES</div>
                          <div style={{ display:"grid", gap:7 }}>
                            {opts.slice(0,2).map(opt => (
                              <div key={opt.card.id} style={{ background:"#12121A", borderLeft:`3px solid ${opt.card.color}`, borderRadius:10, padding:"9px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                <div>
                                  <span style={{ fontSize:12, fontWeight:700 }}>{opt.card.bank}</span>
                                  <span className="chip" style={{ background:`${opt.card.color}22`, color:opt.card.color, marginLeft:6 }}>{opt.card.type}</span>
                                </div>
                                <div style={{ display:"flex", gap:8 }}>
                                  {opt.isDebit ? (
                                    <span style={{ fontSize:12, color:opt.card.color, fontWeight:700 }}>S/ {fmt(ev.amount)} único</span>
                                  ) : [3,6].map(n => (
                                    <div key={n} style={{ background:`${opt.card.color}18`, borderRadius:8, padding:"4px 9px", textAlign:"center" }}>
                                      <div style={{ fontSize:10, color:"#666" }}>{n}c</div>
                                      <div style={{ fontSize:12, fontWeight:800, color:opt.card.color }}>S/{fmt(ev.amount/n)}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {ev.amount > 0 && opts.length===0 && (
                        <div style={{ marginTop:8, fontSize:12, color:"#FF8080", background:"#FF4D4D10", borderRadius:8, padding:"8px 10px" }}>
                          ⚠️ Sin tarjeta con saldo suficiente · actualiza tus líneas en Tarjetas
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            PROYECTOS
        ════════════════════════════════════════════════════════ */}
        {activeTab==="proyectos" && (
          <div>
            <div className="section-title">Metas a largo plazo</div>
            {projects.map(pr => {
              const pct = pr.goal>0 ? Math.min(100,Math.round((pr.saved/pr.goal)*100)) : 0;
              const remaining = Math.max(0, pr.goal - pr.saved);
              return (
                <div key={pr.id} className="card" style={{ marginBottom:14, borderLeft:`4px solid ${pr.color}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800 }}>{pr.name}</div>
                      <div style={{ fontSize:12, color:"#666", marginTop:3 }}>{pr.note}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:pr.color }}>{pct}%</div>
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
                    <StatBox label="META" value={`S/ ${fmt(pr.goal)}`} />
                    <StatBox label="AHORRADO" value={`S/ ${fmt(pr.saved)}`} color={pr.color} />
                    <StatBox label="FALTA" value={`S/ ${fmt(remaining)}`} color={remaining>0?"#FFB347":"#00C9A7"} />
                  </div>

                  <div style={{ background:"#2A2A38", borderRadius:8, height:10, overflow:"hidden", marginBottom:6 }}>
                    <div style={{ background:`linear-gradient(90deg, ${pr.color}99, ${pr.color})`, borderRadius:8, height:10, width:`${pct}%`, transition:"width .6s" }} />
                  </div>
                  <div style={{ fontSize:11, color:"#555", marginBottom:12 }}>
                    {pct===0?"Aún sin ahorros registrados":pct<50?"Vas por buen camino 🚀":pct<100?"¡Ya vas por la mitad! 💪":"🎉 ¡Meta alcanzada!"}
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, alignItems:"end" }}>
                    <div>
                      <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>Actualizar monto ahorrado (S/)</div>
                      <input className="inp" type="number" min="0" style={{ padding:"9px 12px" }}
                        value={pr.saved||""} placeholder="0.00"
                        onChange={e=>updateProjectSaved(pr.id, e.target.value)} />
                    </div>
                    <div>
                      <div style={{ fontSize:11, color:"#888", marginBottom:4 }}>Meta (S/)</div>
                      <input className="inp" type="number" min="0" style={{ padding:"9px 12px" }}
                        value={pr.goal||""}
                        onChange={e=>setProjects(p=>p.map(x=>x.id===pr.id?{...x,goal:parseFloat(e.target.value)||0}:x))} />
                    </div>
                  </div>

                  {/* Simulador de ahorro mensual */}
                  {remaining > 0 && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #222230" }}>
                      <div style={{ fontSize:11, color:"#666", marginBottom:8, letterSpacing:.5 }}>¿CUÁNTO AHORRAR POR MES?</div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7 }}>
                        {[6,12,18,24].map(meses => {
                          const isRecom = meses === (pr.cuotasRecom||12);
                          return (
                            <div key={meses} style={{ background:"#12121A", border:`1px solid ${isRecom ? pr.color+"88" : pr.color+"22"}`, borderRadius:10, padding:"9px 8px", textAlign:"center", position:"relative" }}>
                              {isRecom && <div style={{ position:"absolute", top:-7, left:"50%", transform:"translateX(-50%)", background:pr.color, color:"#fff", fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:10 }}>ideal</div>}
                              <div style={{ fontSize:10, color:"#666", marginBottom:3 }}>{meses}m</div>
                              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:800, color: isRecom ? pr.color : "#bbb" }}>
                                S/{fmt(remaining/meses)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontSize:11, color:"#555", marginTop:8 }}>
                        💡 Separa este monto de tu BBVA Sueldo cada mes en cuanto cobres
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            PRÉSTAMOS
        ════════════════════════════════════════════════════════ */}
        {activeTab==="prestamos" && (
          <div>
            {loans.length===0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#444" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🏦</div>
                <div style={{ fontSize:13, marginBottom:16 }}>No hay préstamos registrados.</div>
                <button className="btn-p" onClick={()=>setShowLoanForm(true)}>+ Agregar préstamo</button>
              </div>
            ) : loans.map(loan => {
              const paid = loan.installments.filter(i=>i.paid).length;
              const pct  = Math.round((paid/loan.cuotas)*100);
              const card = CARDS.find(c=>c.id===loan.cardId);
              return (
                <div key={loan.id} className="card" style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700 }}>{loan.name}</div>
                      <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
                        {loan.isExternal?"🏢":"🏦"} {loan.bank}
                        {card && <span style={{ marginLeft:8, color:card.color }}>· {card.bank} {card.type}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800 }}>S/ {fmt(loan.amount)}</div>
                      <div style={{ fontSize:12, color:"#888" }}>S/ {fmt(loan.cuotaMonto)}/mes</div>
                    </div>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#888", marginBottom:5 }}>
                      <span>{paid} de {loan.cuotas} cuotas</span>
                      <span style={{ color:"#00C9A7", fontWeight:600 }}>{pct}%</span>
                    </div>
                    <div style={{ background:"#2A2A38", borderRadius:4, height:6 }}>
                      <div style={{ background:"#00C9A7", borderRadius:4, height:6, width:`${pct}%`, transition:"width .4s" }} />
                    </div>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:10 }}>
                    {loan.installments.map(inst => (
                      <div key={inst.num} className={`cuota-dot ${inst.paid?"paid":"unpaid"}`}
                        onClick={()=>toggleInstallment(loan.id,inst.num)} title={`Cuota ${inst.num} · ${inst.due}`}>
                        {inst.num}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:"#444", marginTop:6 }}>Toca una cuota para marcarla pagada</div>
                  <button className="btn-s" style={{ marginTop:10, color:"#E8643A", borderColor:"#E8643A22" }} onClick={()=>deleteLoan(loan.id)}>🗑 Eliminar</button>
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            GRÁFICAS
        ════════════════════════════════════════════════════════ */}
        {activeTab==="graficas" && (
          <div>
            {/* Bank filter pills */}
            <div style={{ display:"flex", gap:7, marginBottom:14, flexWrap:"wrap" }}>
              {["todos", ...BANKS_LIST].map(b => (
                <button key={b} onClick={()=>setGraphBankFilter(b)}
                  style={{ background:graphBankFilter===b?"#9B6DFF":"#1E1E2A",
                    border:`1px solid ${graphBankFilter===b?"#9B6DFF":"#2E2E3E"}`,
                    color:graphBankFilter===b?"#fff":"#888", borderRadius:20,
                    padding:"5px 14px", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>
                  {b==="todos"?"Todos los bancos":b}
                </button>
              ))}
            </div>
            {graphBankFilter!=="todos" && (
              <div style={{ fontSize:11, color:"#9B6DFF", marginBottom:10, fontWeight:600 }}>
                Mostrando solo: {graphBankFilter} · {filteredTxns.filter(t=>t.type==="gasto").length} movimientos
              </div>
            )}
            <div className="card" style={{ marginBottom:14 }}>
              <div className="section-title">Tendencia de gastos</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2A" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fill:"#555", fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:"#555", fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:"#1A1A24", border:"1px solid #2E2E3E", borderRadius:10, fontSize:12 }} />
                  <Line type="monotone" dataKey="Total" stroke="#E8643A" strokeWidth={2.5} dot={{ fill:"#E8643A", r:4 }} activeDot={{ r:6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card" style={{ marginBottom:14 }}>
              <div className="section-title">Por categoría</div>
              {pieData.length===0
                ? <div style={{ textAlign:"center", color:"#444", fontSize:13, padding:"20px 0" }}>Sin datos aún</div>
                : <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {pieData.map((e,i) => <Cell key={i} fill={CAT_COLORS[CATEGORIES.indexOf(e.name)]||"#888"} />)}
                      </Pie>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11, color:"#aaa" }} />
                      <Tooltip contentStyle={{ background:"#1A1A24", border:"1px solid #2E2E3E", borderRadius:10, fontSize:12 }} formatter={v=>`S/ ${fmt(v)}`} />
                    </PieChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            HISTORIAL
        ════════════════════════════════════════════════════════ */}
        {activeTab==="historial" && (
          <div>
            {recentTxns.length===0
              ? <div style={{ textAlign:"center", padding:"40px 0", color:"#444", fontSize:13 }}>Sin movimientos.</div>
              : recentTxns.map(t => {
                  const card = CARDS.find(c=>c.id===t.cardId);
                  const ci = CATEGORIES.indexOf(t.category);
                  return (
                    <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:12, background:"#1A1A24", border:"1px solid #222232", marginBottom:8 }}>
                      <div style={{ width:34, height:34, borderRadius:10, background:`${card.color}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>
                        {t.type==="pago"?"✅":CAT_ICONS[ci]||"💳"}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.desc||t.category}</div>
                        <div style={{ fontSize:11, color:"#555", marginTop:1 }}>{card.bank} {card.type} · {t.date}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:t.type==="pago"?"#00C9A7":t.type==="retiro"?"#FFB347":"#E8643A" }}>
                          {t.type==="pago"?"+":t.type==="retiro"?"🏧 ":"-"}S/ {fmt(t.amount)}
                        </div>
                        <span className="chip" style={{ background:`${card.color}18`, color:card.color }}>{t.category}</span>
                      </div>
                      <button onClick={()=>deleteTxn(t.id)} style={{ background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:15, padding:4 }}>✕</button>
                    </div>
                  );
                })
            }
          </div>
        )}
      </div>

      {/* ════ MODAL GASTO ════ */}
      {showTxnForm && (
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setShowTxnForm(false)}>
          <div className="modal">
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, marginBottom:18 }}>Nuevo movimiento</div>
            <div style={{ display:"grid", gap:11 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Tipo</div>
                  <select className="inp" value={txnForm.type} onChange={e=>setTxnForm(f=>({...f,type:e.target.value}))}>
                    <option value="gasto">💸 Gasto</option>
                    <option value="pago">✅ Pago</option>
                    <option value="retiro">🏧 Retiro</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Monto (S/)</div>
                  <input className="inp" type="number" placeholder="0.00" value={txnForm.amount} onChange={e=>setTxnForm(f=>({...f,amount:e.target.value}))} />
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Tarjeta</div>
                <select className="inp" value={txnForm.cardId} onChange={e=>setTxnForm(f=>({...f,cardId:e.target.value}))}>
                  {CARDS.map(c=><option key={c.id} value={c.id}>{c.bank} — {c.label} ({c.type})</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Categoría</div>
                <select className="inp" value={txnForm.category} onChange={e=>setTxnForm(f=>({...f,category:e.target.value}))}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{CAT_ICONS[CATEGORIES.indexOf(c)]} {c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Descripción (opcional)</div>
                <input className="inp" type="text" placeholder="ej. Concierto Coldplay" value={txnForm.desc} onChange={e=>setTxnForm(f=>({...f,desc:e.target.value}))} />
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Fecha</div>
                <input className="inp" type="date" value={txnForm.date} onChange={e=>setTxnForm(f=>({...f,date:e.target.value}))} />
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:18 }}>
              <button className="btn-g" style={{ flex:1 }} onClick={()=>setShowTxnForm(false)}>Cancelar</button>
              <button className="btn-p" style={{ flex:2 }} onClick={addTxn}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL PRÉSTAMO ════ */}
      {showLoanForm && (
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setShowLoanForm(false)}>
          <div className="modal">
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, marginBottom:18 }}>Nuevo préstamo</div>
            <div style={{ display:"grid", gap:11 }}>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Nombre / Concepto</div>
                <input className="inp" type="text" placeholder="ej. Préstamo personal BCP" value={loanForm.name} onChange={e=>setLoanForm(f=>({...f,name:e.target.value}))} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Monto total (S/)</div>
                  <input className="inp" type="number" placeholder="0.00" value={loanForm.amount} onChange={e=>setLoanForm(f=>({...f,amount:e.target.value}))} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Cuota mensual (S/)</div>
                  <input className="inp" type="number" placeholder="0.00" value={loanForm.cuotaMonto} onChange={e=>setLoanForm(f=>({...f,cuotaMonto:e.target.value}))} />
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>N° cuotas (máx 6 recomendado)</div>
                  <input className="inp" type="number" min="1" max="36" value={loanForm.cuotas} onChange={e=>setLoanForm(f=>({...f,cuotas:e.target.value}))} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Primera cuota</div>
                  <input className="inp" type="date" value={loanForm.startDate} onChange={e=>setLoanForm(f=>({...f,startDate:e.target.value}))} />
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Entidad</div>
                <select className="inp" value={loanForm.bank} onChange={e=>setLoanForm(f=>({...f,bank:e.target.value}))}>
                  {BANKS_OPTIONS.map(b=><option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Vincular a tarjeta (opcional)</div>
                <select className="inp" value={loanForm.cardId} onChange={e=>setLoanForm(f=>({...f,cardId:e.target.value}))}>
                  <option value="">— Sin vincular —</option>
                  {CARDS.map(c=><option key={c.id} value={c.id}>{c.bank} — {c.label} ({c.type})</option>)}
                </select>
              </div>
              <label className="tog">
                <input type="checkbox" checked={loanForm.isExternal} onChange={e=>setLoanForm(f=>({...f,isExternal:e.target.checked}))} />
                <span className="tog-t" />
                <span style={{ marginLeft:4 }}>Financiera / banco tercero</span>
              </label>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:18 }}>
              <button className="btn-g" style={{ flex:1 }} onClick={()=>setShowLoanForm(false)}>Cancelar</button>
              <button className="btn-p" style={{ flex:2 }} onClick={addLoan}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL EVENTO ════ */}
      {showEventForm && (
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setShowEventForm(false)}>
          <div className="modal">
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, marginBottom:4 }}>Nuevo evento</div>
            <div style={{ fontSize:12, color:"#666", marginBottom:16 }}>Viaje, concierto, salida… con fechas de compra y del evento.</div>
            <div style={{ display:"grid", gap:11 }}>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Nombre</div>
                <input className="inp" type="text" placeholder="ej. Viaje a Cusco, Coldplay Lima…"
                  value={eventForm.name} onChange={e=>setEventForm(f=>({...f,name:e.target.value}))} />
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:7 }}>Tipo</div>
                <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                  {EVENT_TYPES.map(et => (
                    <button key={et.type} onClick={()=>setEventForm(f=>({...f,type:et.type}))}
                      style={{ background:eventForm.type===et.type?et.color+"33":"#1E1E2A",
                        border:`1px solid ${eventForm.type===et.type?et.color:"#2E2E3E"}`,
                        color:eventForm.type===et.type?et.color:"#888",
                        borderRadius:20, padding:"5px 13px", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>
                      {et.icon} {et.type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Monto (S/)</div>
                <input className="inp" type="number" placeholder="ej. 95"
                  value={eventForm.amount} onChange={e=>setEventForm(f=>({...f,amount:e.target.value}))} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>🛒 Fecha límite de compra</div>
                  <input className="inp" type="date"
                    value={eventForm.fechaCompra} onChange={e=>setEventForm(f=>({...f,fechaCompra:e.target.value}))} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>📅 Fecha del evento</div>
                  <input className="inp" type="date"
                    value={eventForm.fechaEvento} onChange={e=>setEventForm(f=>({...f,fechaEvento:e.target.value}))} />
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Tarjeta (opcional)</div>
                <select className="inp" value={eventForm.cardId} onChange={e=>setEventForm(f=>({...f,cardId:e.target.value}))}>
                  <option value="">— Sin asignar —</option>
                  {CARDS.map(c=><option key={c.id} value={c.id}>{c.bank} — {c.label} ({c.type})</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Nota (opcional)</div>
                <input className="inp" type="text" placeholder="ej. Pasaje ida y vuelta, incluye hospedaje…"
                  value={eventForm.note} onChange={e=>setEventForm(f=>({...f,note:e.target.value}))} />
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:18 }}>
              <button className="btn-g" style={{ flex:1 }} onClick={()=>setShowEventForm(false)}>Cancelar</button>
              <button className="btn-p" style={{ flex:2 }} onClick={addEvent}>Guardar evento</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL PRESUPUESTO ════ */}
      {showBudgetForm && (
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setShowBudgetForm(false)}>
          <div className="modal">
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, marginBottom:4 }}>Planificar gasto</div>
            <div style={{ fontSize:12, color:"#666", marginBottom:16 }}>El sistema verá qué tarjeta puede cubrirlo y te mostrará las opciones de cuotas.</div>
            <div style={{ display:"grid", gap:11 }}>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>¿En qué vas a gastar?</div>
                <input className="inp" type="text" placeholder="ej. Mochila para trekking, Concierto, Laptop…"
                  value={budgetForm.name} onChange={e=>setBudgetForm(f=>({...f,name:e.target.value}))} />
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Monto estimado (S/)</div>
                <input className="inp" type="number" placeholder="ej. 2000"
                  value={budgetForm.amount} onChange={e=>setBudgetForm(f=>({...f,amount:e.target.value}))} />
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:8 }}>Máximo de cuotas aceptable</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7 }}>
                  {[1,3,4,5,6].map(n => (
                    <div key={n}
                      onClick={()=>setBudgetForm(f=>({...f,preferredCuotas:n}))}
                      style={{ background: budgetForm.preferredCuotas===n ? "#E8643A" : "#1E1E2A",
                        border:`1px solid ${budgetForm.preferredCuotas===n?"#E8643A":"#2E2E3E"}`,
                        borderRadius:10, padding:"10px 6px", textAlign:"center", cursor:"pointer", transition:"all .2s" }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800 }}>{n}</div>
                      <div style={{ fontSize:10, color: budgetForm.preferredCuotas===n?"#fff":"#666" }}>cuota{n>1?"s":""}</div>
                      {n===1 && <div style={{ fontSize:9, color: budgetForm.preferredCuotas===n?"#ffe":"#00C9A7", marginTop:2, fontWeight:700 }}>contado</div>}
                      {n===3 && <div style={{ fontSize:9, color: budgetForm.preferredCuotas===n?"#ffe":"#E8643A", marginTop:2, fontWeight:700 }}>antes</div>}
                      {n===6 && <div style={{ fontSize:9, color: budgetForm.preferredCuotas===n?"#ffe":"#FFB347", marginTop:2, fontWeight:700 }}>actual</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#888", marginBottom:5 }}>Categoría</div>
                <select className="inp" value={budgetForm.category} onChange={e=>setBudgetForm(f=>({...f,category:e.target.value}))}>
                  <optgroup label="— Gastos fijos —">
                    {["Comida","Transporte","Internet","Pasajes"].map(c=><option key={c} value={c}>{CAT_ICONS[CATEGORIES.indexOf(c)]} {c}</option>)}
                  </optgroup>
                  <optgroup label="— Ocio —">
                    {["Conciertos","Salidas / Bar","Perfumes","Senderismo","Viajes"].map(c=><option key={c} value={c}>{CAT_ICONS[CATEGORIES.indexOf(c)]} {c}</option>)}
                  </optgroup>
                  <optgroup label="— Otros —">
                    {["Equipamiento","Salud","Ropa","Suscripciones","Otros"].map(c=><option key={c} value={c}>{CAT_ICONS[CATEGORIES.indexOf(c)]} {c}</option>)}
                  </optgroup>
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:18 }}>
              <button className="btn-g" style={{ flex:1 }} onClick={()=>setShowBudgetForm(false)}>Cancelar</button>
              <button className="btn-p" style={{ flex:2 }} onClick={addBudget}>Ver opciones</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
