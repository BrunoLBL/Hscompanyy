import { icon } from '../utils/icons.js';
import { formatCurrency, formatDate, isToday } from '../utils/helpers.js';
import { getPatients, getAppointments, getTransactions, getInventory } from '../modules/store.js';
import { navigate } from '../modules/router.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

let charts = [];

function destroyCharts() { charts.forEach(c => c.destroy()); charts = []; }

export function renderDashboard(container) {
  destroyCharts();
  const patients = getPatients();
  const appointments = getAppointments();
  const transactions = getTransactions();
  const inventory = getInventory();
  
  const activePatients = patients.filter(p => p.status === 'active').length;
  const todayAppts = appointments.filter(a => isToday(a.date) && a.status !== 'cancelled');
  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lowStock = inventory.filter(i => i.qty <= i.minQty).length;
  
  const pendingPayments = transactions.filter(t => t.status === 'pending').length;

  container.innerHTML = `
    <div class="page-title-bar">
      <div><h2>Dashboard</h2><p>Visão geral da sua clínica</p></div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-secondary btn-sm" onclick="location.hash='#/relatorios'">${icon('chart',16)} Relatórios</button>
      </div>
    </div>
    
    <div class="kpi-grid">
      <div class="card kpi-card">
        <div class="kpi-icon" style="background:rgba(30,111,217,.1);color:var(--primary)">${icon('users',24)}</div>
        <div class="kpi-info"><h3>${activePatients}</h3><span>Pacientes Ativos</span>
          <div class="kpi-trend up">${icon('trendUp',14)} +${Math.floor(Math.random()*5+2)} este mês</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon" style="background:rgba(0,196,140,.1);color:var(--accent)">${icon('calendar',24)}</div>
        <div class="kpi-info"><h3>${todayAppts.length}</h3><span>Consultas Hoje</span>
          <div class="kpi-trend up">${icon('clock',14)} ${todayAppts.filter(a=>a.status==='confirmed').length} confirmadas</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon" style="background:rgba(245,166,35,.1);color:var(--accent-warn)">${icon('dollar',24)}</div>
        <div class="kpi-info"><h3>${formatCurrency(monthIncome)}</h3><span>Receita do Mês</span>
          <div class="kpi-trend ${monthIncome>monthExpense?'up':'down'}">${icon(monthIncome>monthExpense?'trendUp':'trendDown',14)} Lucro: ${formatCurrency(monthIncome-monthExpense)}</div>
        </div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-icon" style="background:rgba(231,76,60,.1);color:var(--accent-danger)">${icon('alertCircle',24)}</div>
        <div class="kpi-info"><h3>${lowStock + pendingPayments}</h3><span>Alertas</span>
          <div class="kpi-trend down">${lowStock} estoque · ${pendingPayments} pgto</div>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="card chart-card"><h4>Fluxo de Caixa — Últimos 6 Meses</h4><div class="chart-canvas-wrap"><canvas id="cashFlowChart"></canvas></div></div>
      <div class="card chart-card"><h4>Receita por Categoria</h4><div class="chart-canvas-wrap"><canvas id="categoryChart"></canvas></div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="card">
        <h4 style="font-size:.95rem;font-weight:600;margin-bottom:16px">Consultas de Hoje</h4>
        ${todayAppts.length === 0 ? '<div class="empty-state"><p>Nenhuma consulta agendada para hoje</p></div>' : `
        <div style="display:flex;flex-direction:column;gap:8px">
          ${todayAppts.sort((a,b)=>a.time.localeCompare(b.time)).slice(0,6).map(a => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:var(--radius-sm);background:var(--bg);cursor:pointer" 
                 onclick="location.hash='#/prontuario/${a.patientId}'">
              <div style="font-weight:700;color:var(--primary);min-width:50px;font-size:.85rem">${a.time}</div>
              <div style="flex:1">
                <div style="font-weight:600;font-size:.85rem">${a.patientName}</div>
                <div style="font-size:.75rem;color:var(--text-muted)">${a.procedure} · ${a.dentist}</div>
              </div>
              <span class="status-badge status-${a.status}">${a.status==='confirmed'?'Confirmado':a.status==='pending'?'Pendente':'Concluído'}</span>
            </div>
          `).join('')}
        </div>`}
      </div>
      <div class="card">
        <h4 style="font-size:.95rem;font-weight:600;margin-bottom:16px">Alertas & Lembretes</h4>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${lowStock > 0 ? `<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:var(--radius-sm);background:rgba(231,76,60,.06);cursor:pointer" onclick="location.hash='#/estoque'">
            <div style="color:var(--accent-danger)">${icon('alertCircle',18)}</div>
            <div><div style="font-weight:600;font-size:.82rem;color:var(--accent-danger)">${lowStock} itens com estoque baixo</div>
            <div style="font-size:.72rem;color:var(--text-muted)">Verifique o estoque e faça a reposição</div></div>
          </div>` : ''}
          ${pendingPayments > 0 ? `<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:var(--radius-sm);background:rgba(245,166,35,.06);cursor:pointer" onclick="location.hash='#/financeiro'">
            <div style="color:var(--accent-warn)">${icon('clock',18)}</div>
            <div><div style="font-weight:600;font-size:.82rem;color:var(--accent-warn)">${pendingPayments} pagamentos pendentes</div>
            <div style="font-size:.72rem;color:var(--text-muted)">Revise os pagamentos em aberto</div></div>
          </div>` : ''}
          <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:var(--radius-sm);background:rgba(30,111,217,.06)">
            <div style="color:var(--primary)">${icon('calendar',18)}</div>
            <div><div style="font-weight:600;font-size:.82rem">Próxima semana</div>
            <div style="font-size:.72rem;color:var(--text-muted)">${appointments.filter(a=>{const d=new Date(a.date);const diff=(d-now)/(864e5);return diff>0&&diff<=7&&a.status!=='cancelled'}).length} consultas agendadas</div></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Cash Flow Chart
  const months = [];
  const incomes = [];
  const expenses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
    const mt = transactions.filter(t => {
      const td = new Date(t.date);
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    });
    incomes.push(mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
    expenses.push(mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  }

  const ctx1 = document.getElementById('cashFlowChart');
  if (ctx1) {
    charts.push(new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Receitas', data: incomes, backgroundColor: 'rgba(30,111,217,.7)', borderRadius: 6, barPercentage: .4 },
          { label: 'Despesas', data: expenses, backgroundColor: 'rgba(231,76,60,.6)', borderRadius: 6, barPercentage: .4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { family: 'Inter', size: 12 } } } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k', font: { family: 'Inter' } }, grid: { color: 'rgba(0,0,0,.04)' } }, x: { grid: { display: false }, ticks: { font: { family: 'Inter' } } } }
      }
    }));
  }

  // Category Chart
  const cats = {};
  thisMonth.filter(t => t.type === 'income').forEach(t => { cats[t.description] = (cats[t.description] || 0) + t.amount; });
  const catLabels = Object.keys(cats).slice(0, 6);
  const catValues = catLabels.map(k => cats[k]);
  const catColors = ['#1E6FD9', '#00C48C', '#F5A623', '#E74C3C', '#9B59B6', '#1ABC9C'];

  const ctx2 = document.getElementById('categoryChart');
  if (ctx2) {
    charts.push(new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{ data: catValues, backgroundColor: catColors, borderWidth: 0, hoverOffset: 8 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 10, font: { family: 'Inter', size: 11 } } } }
      }
    }));
  }
}
