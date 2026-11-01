/*
 * Add the deployed Google Apps Script /exec URL below.
 * The API uses JSONP so it can be called from a static GitHub Pages site.
 */
const API_URL = "https://script.google.com/macros/s/AKfycbzPTaCkB_WrJ-oGA4a7jno3tLF2bSpfCTIDCCiQS2vWf1aapXbBPgI_7BFYR4NM2TZ9/exec";
const state = { rows: [], location: "", process: "", month: "", nationality: "", status: "", search: "" };
const $ = id => document.getElementById(id);
const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value + (String(value).length === 10 ? "T00:00:00" : ""));
  return Number.isNaN(d.getTime()) ? null : d;
}
function statusFor(dateValue) {
  const d = parseDate(dateValue);
  if (!d) return "No expiry date";
  const today = new Date(); today.setHours(0,0,0,0);
  const days = Math.ceil((d - today) / 86400000);
  if (days < 0) return "Expired";
  if (days <= 30) return "Expiring soon";
  return "Valid";
}
function fmtDate(value) {
  const d = parseDate(value);
  return d ? `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}` : "—";
}
function monthKey(value) {
  const d = parseDate(value);
  return d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}` : "";
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function uniqueSorted(values) { return [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b)); }
function countBy(rows, field) {
  const map = new Map(); rows.forEach(r => map.set(r[field] || "Not assigned",(map.get(r[field] || "Not assigned")||0)+1)); return map;
}
function getFilteredRows() {
  const q = state.search.trim().toLowerCase();
  return state.rows.filter(r => {
    const st = statusFor(r.expiryDate);
    const hay = [r.name,r.id,r.wps,r.process].join(" ").toLowerCase();
    return (!state.location || (r.location || "Not assigned") === state.location)
      && (!state.process || r.process === state.process)
      && (!state.nationality || r.nationality === state.nationality)
      && (!state.status || st === state.status)
      && (!state.month || monthKey(r.expiryDate) === state.month)
      && (!q || hay.includes(q));
  });
}
function renderMonthCards() {
  const counts = countBy(state.rows.filter(r=>r.expiryDate), "expiryMonth");
  const entries = [...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  const max = Math.max(1,...entries.map(x=>x[1]));
  $("monthCards").innerHTML = entries.map(([key,count]) => {
    const [year,month] = key.split("-");
    const label = `${monthNames[Number(month)-1]} ${year}`;
    return `<button class="month-card ${state.month===key?"selected":""}" data-month="${key}">
      <strong>${count}</strong><span>${label}</span><div class="meter"><i style="width:${count/max*100}%"></i></div></button>`;
  }).join("");
  $("monthCards").querySelectorAll("[data-month]").forEach(btn=>btn.addEventListener("click",()=>{
    state.month = state.month===btn.dataset.month ? "" : btn.dataset.month; render();
  }));
}
function renderChips(containerId, values, field, allLabel) {
  const counts = countBy(state.rows, field);
  const total = state.rows.length;
  const list = [["",allLabel,total],...values.map(v=>[v,v,counts.get(v)||0])];
  $(containerId).innerHTML = list.map(([value,label,count]) =>
    `<button class="chip ${state[field]===value?"active":""}" data-value="${escapeHtml(value)}">${escapeHtml(label)} <b>${count}</b></button>`
  ).join("");
  $(containerId).querySelectorAll("[data-value]").forEach(btn=>btn.addEventListener("click",()=>{
    state[field]=btn.dataset.value; render();
  }));
}
function renderSelects() {
  const current = $("nationalitySelect").value;
  $("nationalitySelect").innerHTML = '<option value="">All nationalities</option>' +
    uniqueSorted(state.rows.map(r=>r.nationality)).map(v=>`<option>${escapeHtml(v)}</option>`).join("");
  $("nationalitySelect").value = state.nationality || current || "";
}
function renderTable(rows) {
  $("tableBody").innerHTML = rows.length ? rows.map(r=>{
    const st=statusFor(r.expiryDate);
    const cls=st==="Expired"?"expired":st==="Expiring soon"?"soon":st==="Valid"?"valid":"unknown";
    const statusText=st==="Expired" ? `Expired ${Math.abs(Math.ceil((parseDate(r.expiryDate)-new Date())/86400000))}d ago` :
      st==="Expiring soon" ? `Expires in ${Math.ceil((parseDate(r.expiryDate)-new Date())/86400000)}d` : st;
    return `<tr>
      <td>${escapeHtml(r.id)}</td><td class="name">${escapeHtml(r.name)}</td><td class="process">${escapeHtml(r.process)}</td>
      <td>${escapeHtml(r.position)}</td><td>${escapeHtml(r.wps)}</td><td>${escapeHtml(r.fNo)}</td>
      <td>${escapeHtml(r.maxThickness)}</td><td>${escapeHtml(r.odLimit)}</td><td>${escapeHtml(r.nationality)}</td>
      <td>${escapeHtml(r.location || "Not assigned")}</td><td>${fmtDate(r.expiryDate)}</td>
      <td><span class="status ${cls}">${escapeHtml(statusText)}</span></td></tr>`;
  }).join("") : '<tr><td colspan="12" class="empty">No matching qualifications found.</td></tr>';
}
function render() {
  const rows=getFilteredRows();
  const uniqueWelders=new Set(state.rows.map(r=>`${r.id}|${r.name}`)).size;
  const expired=state.rows.filter(r=>statusFor(r.expiryDate)==="Expired").length;
  const soon=state.rows.filter(r=>statusFor(r.expiryDate)==="Expiring soon").length;
  $("summary").textContent=`${uniqueWelders} welders · ${expired} expired · ${soon} expiring within 30 days. Tap a month to filter.`;
  renderMonthCards();
  renderChips("locationFilters",uniqueSorted(state.rows.map(r=>r.location||"Not assigned")),"location","All");
  renderChips("processFilters",uniqueSorted(state.rows.map(r=>r.process)),"process","All");
  renderSelects();
  $("resultCount").textContent=`${rows.length} of ${state.rows.length} qualifications`;
  $("exportCount").textContent=rows.length;
  renderTable(rows);
}
function fetchData() {
  if (!API_URL.startsWith("https://script.google.com/")) {
    $("notice").textContent="Setup required: paste your deployed Apps Script /exec URL into script.js.";
    $("notice").className="notice error"; return;
  }
  $("refreshBtn").disabled=true; $("notice").textContent="Refreshing data from Google Sheets…"; $("notice").className="notice";
  const callback="welderDashboardCallback";
  window[callback]=(payload)=>{
    delete window[callback]; script.remove();
    $("refreshBtn").disabled=false;
    if (!payload || !payload.ok) { $("notice").textContent=payload?.error||"Could not load spreadsheet data."; $("notice").className="notice error"; return; }
    state.rows=payload.rows.map(r=>({...r,expiryMonth:monthKey(r.expiryDate)}));
    $("notice").textContent=`Live data loaded · ${payload.rows.length} qualifications · Source updated ${new Date(payload.generatedAt).toLocaleString()}`;
    $("notice").className="notice";
    $("lastUpdated").textContent=new Date().toLocaleString();
    render();
  };
  const script=document.createElement("script");
  script.src=`${API_URL}?callback=${callback}&_=${Date.now()}`;
  script.onerror=()=>{delete window[callback];script.remove();$("refreshBtn").disabled=false;$("notice").textContent="Could not load live data. Check the Apps Script deployment URL and access settings.";$("notice").className="notice error";};
  document.body.appendChild(script);
}
function exportCsv() {
  const rows=getFilteredRows();
  const cols=[["ID #","id"],["Name","name"],["Process","process"],["Position","position"],["WPS #","wps"],["F No.","fNo"],["Max. thickness","maxThickness"],["OD limit","odLimit"],["Nationality","nationality"],["Location","location"],["Expiry date","expiryDate"],["Status",""]];
  const csv=[cols.map(c=>c[0]),...rows.map(r=>cols.map(c=>c[1]===""?statusFor(r.expiryDate):(r[c[1]]??"")))]
    .map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="welder-qualifications.csv";a.click();URL.revokeObjectURL(a.href);
}
$("refreshBtn").addEventListener("click",fetchData);
$("clearBtn").addEventListener("click",()=>{Object.assign(state,{location:"",process:"",month:"",nationality:"",status:"",search:""});$("searchInput").value="";$("statusSelect").value="";$("nationalitySelect").value="";render();});
$("exportBtn").addEventListener("click",exportCsv);
$("searchInput").addEventListener("input",e=>{state.search=e.target.value;render();});
$("nationalitySelect").addEventListener("change",e=>{state.nationality=e.target.value;render();});
$("statusSelect").addEventListener("change",e=>{state.status=e.target.value;render();});
fetchData();
