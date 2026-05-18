import { icon } from '../utils/icons.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';
import { getPatients, getAppointments, getTransactions, getInventory } from '../modules/store.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

let charts = [];

export function renderReports(container) {
  charts.forEach(c => c.destroy()); charts = [];
  const patients = getPatients();
  const appointments = getAppointments();
  const transactions = getTransactions();
  const now = new Date();

  // Stats
  const totalPatients = patients.length;
  const activePatients = patients.filter(p => p.status === 'active').length;
  const totalAppts = appointments.length;
  const completedAppts = appointments.filter(a => a.status === 'completed').length;
  const cancelledAppts = appointments.filter(a => a.status === 'cancelled').length;
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  container.innerHTML = `
    <div class="page-title-bar">
      <div><h2>Relatórios</h2><p>Análise completa da clínica</p></div>
    </div>

    <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
      <div class="card kpi-card"><div class="kpi-icon" style="background:rgba(30,111,217,.1);color:var(--primary)">${icon('users',20)}</div>
        <div class="kpi-info"><h3>${totalPatients}</h3><span>Total Pacientes</span></div></div>
      <div class="card kpi-card"><div class="kpi-icon" style="background:rgba(0,196,140,.1);color:var(--accent)">${icon('calendar',20)}</div>
        <div class="kpi-info"><h3>${totalAppts}</h3><span>Total Consultas</span></div></div>
      <div class="card kpi-card"><div class="kpi-icon" style="background:rgba(245,166,35,.1);color:var(--accent-warn)">${icon('check',20)}</div>
        <div class="kpi-info"><h3>${completedAppts > 0 ? Math.round(completedAppts/totalAppts*100) : 0}%</h3><span>Taxa Conclusão</span></div></div>
      <div class="card kpi-card"><div class="kpi-icon" style="background:rgba(0,196,140,.1);color:var(--accent)">${icon('dollar',20)}</div>
        <div class="kpi-info"><h3>${formatCurrency(totalIncome - totalExpense)}</h3><span>Lucro Total</span></div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div class="card chart-card"><h4>Novos Pacientes por Mês</h4><div class="chart-canvas-wrap"><canvas id="rpPatientsChart"></canvas></div></div>
      <div class="card chart-card"><h4>Consultas por Status</h4><div class="chart-canvas-wrap"><canvas id="rpApptChart"></canvas></div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <div class="card chart-card"><h4>Receita vs Despesa Mensal</h4><div class="chart-canvas-wrap"><canvas id="rpRevenueChart"></canvas></div></div>
      <div class="card chart-card"><h4>Procedimentos Mais Realizados</h4><div class="chart-canvas-wrap"><canvas id="rpProcChart"></canvas></div></div>
    </div>

    <div class="card">
      <h4 style="font-weight:600;margin-bottom:16px">Balanço por Paciente</h4>
      <table class="data-table"><thead><tr><th>Paciente</th><th>Receitas</th><th>Nº Consultas</th><th>Última Consulta</th></tr></thead>
      <tbody>${patients.filter(p=>p.status==='active').slice(0,15).map(p => {
        const pTx = transactions.filter(t => t.patientId === p.id && t.type === 'income');
        const pAppts = appointments.filter(a => a.patientId === p.id);
        const lastAppt = pAppts.sort((a,b) => new Date(b.date)-new Date(a.date))[0];
        return `<tr><td style="font-weight:600;cursor:pointer" onclick="location.hash='#/prontuario/${p.id}'">${p.name}</td>
          <td style="font-weight:600;color:var(--accent)">${formatCurrency(pTx.reduce((s,t)=>s+t.amount,0))}</td>
          <td>${pAppts.length}</td><td>${lastAppt ? formatDate(lastAppt.date) : '-'}</td></tr>`;
      }).join('')}</tbody></table>
    </div>
  `;

  // Patients per month chart
  const pMonths = []; const pCounts = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    pMonths.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
    pCounts.push(patients.filter(p => { const cd = new Date(p.createdAt); return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear(); }).length);
  }
  const c1 = document.getElementById('rpPatientsChart');
  if (c1) charts.push(new Chart(c1, { type: 'bar', data: { labels: pMonths, datasets: [{ label: 'Novos', data: pCounts, backgroundColor: 'rgba(30,111,217,.6)', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.04)' } }, x: { grid: { display: false } } } } }));

  // Appointments by status
  const c2 = document.getElementById('rpApptChart');
  if (c2) charts.push(new Chart(c2, { type: 'doughnut', data: { labels: ['Concluídas','Confirmadas','Pendentes','Canceladas'],
    datasets: [{ data: [completedAppts, appointments.filter(a=>a.status==='confirmed').length, appointments.filter(a=>a.status==='pending').length, cancelledAppts],
      backgroundColor: ['#1E6FD9','#00C48C','#F5A623','#E74C3C'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { family: 'Inter', size: 11 } } } } } }));

  // Revenue chart
  const rMonths = []; const rInc = []; const rExp = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    rMonths.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
    const mt = transactions.filter(t => { const td = new Date(t.date); return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear(); });
    rInc.push(mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
    rExp.push(mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  }
  const c3 = document.getElementById('rpRevenueChart');
  if (c3) charts.push(new Chart(c3, { type: 'line', data: { labels: rMonths,
    datasets: [{ label: 'Receita', data: rInc, borderColor: '#00C48C', tension: .4, borderWidth: 2, fill: false },
      { label: 'Despesa', data: rExp, borderColor: '#E74C3C', tension: .4, borderWidth: 2, fill: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
      scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.04)' } }, x: { grid: { display: false } } } } }));

  // Procedures chart
  const procs = {};
  appointments.filter(a => a.status === 'completed').forEach(a => { procs[a.procedure] = (procs[a.procedure] || 0) + 1; });
  const sorted = Object.entries(procs).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const c4 = document.getElementById('rpProcChart');
  if (c4) charts.push(new Chart(c4, { type: 'bar', data: { labels: sorted.map(s => s[0]),
    datasets: [{ data: sorted.map(s => s[1]), backgroundColor: ['#1E6FD9','#00C48C','#F5A623','#9B59B6','#E91E63','#1ABC9C'], borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.04)' } }, y: { grid: { display: false } } } } }));
}
