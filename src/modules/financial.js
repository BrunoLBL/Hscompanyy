import { icon } from '../utils/icons.js';
import { formatCurrency, formatDate, escapeHTML } from '../utils/helpers.js';
import { getTransactions, saveTransaction, deleteTransaction, getPatients } from '../modules/store.js';
import { openModal, closeAllModals } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

let charts = [];
let filterType = 'all';
let filterPeriod = 'month';
let filterStatus = 'all';
let currentPage = 1;

export function renderFinancial(container) {
  charts.forEach(c => c.destroy()); charts = [];
  const transactions = getTransactions();
  const now = new Date();

  // Filter by period
  let filtered = [...transactions];
  // Get today's date in Brasilia timezone (America/Sao_Paulo) using formatToParts for reliable YYYY-MM-DD
  const _bParts = new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const brasiliaDateStr = `${_bParts.find(p=>p.type==='year').value}-${_bParts.find(p=>p.type==='month').value}-${_bParts.find(p=>p.type==='day').value}`;
  if (filterPeriod === 'day') {
    filtered = filtered.filter(t => t.date && t.date === brasiliaDateStr);
  } else if (filterPeriod === 'month') {
    const currentMonthStr = brasiliaDateStr.substring(0, 7);
    filtered = filtered.filter(t => t.date && t.date.startsWith(currentMonthStr));
  } else if (filterPeriod === 'week') {
    const [bYear, bMonth, bDay] = brasiliaDateStr.split('-').map(Number);
    const today = new Date(bYear, bMonth - 1, bDay);
    const day = today.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1; // Segunda-feira
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - diffToMonday);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Domingo
    
    const startStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
    const endStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`;
    
    filtered = filtered.filter(t => t.date && t.date >= startStr && t.date <= endStr);
  }
  if (filterType !== 'all') filtered = filtered.filter(t => t.type === filterType);
  if (filterStatus !== 'all') filtered = filtered.filter(t => t.status === filterStatus);

  // Sorting strictly newest to oldest
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const itemsPerPage = 25;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
  const pageData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  container.innerHTML = `
    <div class="page-title-bar">
      <div><h2>Financeiro</h2><p>Controle financeiro da clínica</p></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" id="addIncomeBtn">${icon('trendUp',16)} Receita</button>
        <button class="btn btn-danger" id="addExpenseBtn">${icon('trendDown',16)} Despesa</button>
      </div>
    </div>

    <div class="financial-summary">
      <div class="card fin-card income"><span>Receitas</span><h3>${formatCurrency(totalIncome)}</h3></div>
      <div class="card fin-card expense"><span>Despesas</span><h3>${formatCurrency(totalExpense)}</h3></div>
      <div class="card fin-card balance"><span>Saldo</span><h3>${formatCurrency(balance)}</h3></div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px">
      <div class="card chart-card"><h4>Fluxo de Caixa Mensal</h4><div class="chart-canvas-wrap"><canvas id="finFlowChart"></canvas></div></div>
      <div class="card chart-card"><h4>Despesas por Categoria</h4><div class="chart-canvas-wrap"><canvas id="finCatChart"></canvas></div></div>
    </div>

    <div class="card">
      <div class="list-header">
        <h4 style="font-weight:600">Lançamentos</h4>
        <div class="filter-group">
          <select id="finPeriod">
            <option value="all" ${filterPeriod==='all'?'selected':''}>Todo período</option>
            <option value="month" ${filterPeriod==='month'?'selected':''}>Este mês</option>
            <option value="week" ${filterPeriod==='week'?'selected':''}>Esta semana</option>
            <option value="day" ${filterPeriod==='day'?'selected':''}>Hoje</option>
          </select>
          <select id="finType">
            <option value="all" ${filterType==='all'?'selected':''}>Todos Tipos</option>
            <option value="income" ${filterType==='income'?'selected':''}>Receitas</option>
            <option value="expense" ${filterType==='expense'?'selected':''}>Despesas</option>
          </select>
          <select id="finStatus">
            <option value="all" ${filterStatus==='all'?'selected':''}>Todos Status</option>
            <option value="paid" ${filterStatus==='paid'?'selected':''}>Pagos</option>
            <option value="pending" ${filterStatus==='pending'?'selected':''}>Pendentes</option>
          </select>
        </div>
      </div>
      ${filtered.length===0?'<div class="empty-state"><h3>Nenhum lançamento</h3></div>':`
      <table class="data-table"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Paciente</th><th>Método</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${pageData.map(t=>`
        <tr>
          <td>${formatDate(t.date)}</td>
          <td style="font-weight:500">${escapeHTML(t.description)}</td>
          <td><span style="font-size:.78rem">${escapeHTML(t.category||'-')}</span></td>
          <td>${t.patientName?`<span style="cursor:pointer;color:var(--primary)" onclick="location.hash='#/prontuario/${t.patientId}'">${escapeHTML(t.patientName)}</span>`:'-'}</td>
          <td style="font-size:.82rem">${t.method||'-'}</td>
          <td style="font-weight:700;color:${t.type==='income'?'var(--accent)':'var(--accent-danger)'}">${t.type==='income'?'+':'−'} ${formatCurrency(t.amount)}</td>
          <td><span class="status-badge status-${t.status==='paid'?'completed':'pending'}">${t.status==='paid'?'Pago':'Pendente'}</span></td>
          <td><div class="action-cell">
            ${t.status!=='paid'?`<button title="Confirmar pagamento" data-confirm="${t.id}" style="color:var(--accent);border-color:var(--accent)">${icon('check',14)}</button>`:''}
            <button title="Excluir" data-del="${t.id}">${icon('trash',14)}</button>
          </div></td>
        </tr>`).join('')}</tbody></table>
        
        ${totalPages > 1 ? `
        <div style="display:flex; justify-content:center; gap:8px; padding: 16px;">
          <button class="btn btn-sm btn-secondary" id="finPrevPage" ${currentPage===1?'disabled':''}>Anterior</button>
          ${Array.from({length: totalPages}, (_, i) => i + 1).map(p => `
            <button class="btn btn-sm ${currentPage===p?'btn-primary':'btn-secondary'}" data-page="${p}">${p}</button>
          `).join('')}
          <button class="btn btn-sm btn-secondary" id="finNextPage" ${currentPage===totalPages?'disabled':''}>Próxima</button>
        </div>
        ` : ''}
      `}
    </div>
  `;

  // Events
  document.getElementById('addIncomeBtn').onclick = () => openTransactionForm('income', container);
  document.getElementById('addExpenseBtn').onclick = () => openTransactionForm('expense', container);
  document.getElementById('finPeriod').onchange = e => { filterPeriod = e.target.value; currentPage = 1; renderFinancial(container); };
  document.getElementById('finType').onchange = e => { filterType = e.target.value; currentPage = 1; renderFinancial(container); };
  document.getElementById('finStatus').onchange = e => { filterStatus = e.target.value; currentPage = 1; renderFinancial(container); };
  
  if (document.getElementById('finPrevPage')) {
    document.getElementById('finPrevPage').onclick = () => { currentPage--; renderFinancial(container); };
    document.getElementById('finNextPage').onclick = () => { currentPage++; renderFinancial(container); };
    container.querySelectorAll('[data-page]').forEach(b => b.onclick = (e) => { currentPage = parseInt(e.target.dataset.page); renderFinancial(container); });
  }

  container.querySelectorAll('[data-confirm]').forEach(b => b.onclick = () => {
    if (confirm('Confirmar pagamento deste lançamento?')) {
      const tx = getTransactions().find(t => t.id === b.dataset.confirm);
      if (tx) {
        tx.status = 'paid';
        saveTransaction(tx);
        toast.success('Pagamento confirmado!');
        renderFinancial(container);
      }
    }
  });

  container.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (confirm('Excluir lançamento?')) { deleteTransaction(b.dataset.del); toast.success('Excluído'); renderFinancial(container); }
  });

  // Charts
  const months = []; const incArr = []; const expArr = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mt = transactions.filter(t => t.date && t.date.startsWith(monthStr));
    incArr.push(mt.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
    expArr.push(mt.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  }

  const ctx1 = document.getElementById('finFlowChart');
  if (ctx1) {
    charts.push(new Chart(ctx1, {
      type: 'line', data: {
        labels: months,
        datasets: [
          { label: 'Receitas', data: incArr, borderColor: '#00C48C', backgroundColor: 'rgba(0,196,140,.1)', fill: true, tension: .4, borderWidth: 2 },
          { label: 'Despesas', data: expArr, borderColor: '#E74C3C', backgroundColor: 'rgba(231,76,60,.1)', fill: true, tension: .4, borderWidth: 2 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { family: 'Inter', size: 11 } } } },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.04)' } }, x: { grid: { display: false } } } }
    }));
  }

  const cats = {};
  transactions.filter(t => t.type === 'expense').forEach(t => { cats[t.category || 'Outros'] = (cats[t.category || 'Outros'] || 0) + t.amount; });
  const ctx2 = document.getElementById('finCatChart');
  if (ctx2) {
    charts.push(new Chart(ctx2, {
      type: 'doughnut', data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: ['#1E6FD9','#E74C3C','#F5A623','#9B59B6','#1ABC9C','#E91E63'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { family: 'Inter', size: 11 } } } } }
    }));
  }
}

function openTransactionForm(type, parentContainer) {
  const patients = getPatients();
  const cats = type === 'income' ? ['Procedimento','Convênio','Outros'] : ['Material','Aluguel','Salário','Marketing','Manutenção','Equipamento','Outros'];
  const methods = ['PIX','Cartão Crédito','Cartão Débito','Dinheiro','Boleto','Convênio'];

  const modal = openModal({
    title: type === 'income' ? 'Nova Receita' : 'Nova Despesa',
    content: `
      <div class="form-row">
        <div class="form-group"><label>Valor (R$) *</label><input type="number" id="txAmount" step="0.01" min="0"/></div>
        <div class="form-group"><label>Data *</label><input type="date" id="txDate" value="${new Date().toISOString().slice(0,10)}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Descrição *</label><input type="text" id="txDesc"/></div>
        <div class="form-group"><label>Categoria</label>
          <select id="txCat">${cats.map(c => `<option>${c}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Forma de Pagamento</label>
          <select id="txMethod">${methods.map(m => `<option>${m}</option>`).join('')}</select></div>
        ${type === 'income' ? `<div class="form-group"><label>Paciente</label>
          <select id="txPatient"><option value="">Nenhum</option>${patients.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('')}</select></div>` : '<div></div>'}
      </div>
      <div class="form-group"><label>Status</label>
        <select id="txStatus"><option value="paid">Pago</option><option value="pending">Pendente</option></select></div>
    `,
    footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Cancelar</button>
      <button class="btn btn-primary" id="saveTxBtn">Salvar</button>`
  });

  modal.querySelector('#saveTxBtn').onclick = () => {
    const amount = +modal.querySelector('#txAmount').value;
    if (!amount) { toast.error('Informe o valor'); return; }
    const patientEl = modal.querySelector('#txPatient');
    const patientId = patientEl ? patientEl.value : null;
    const patient = patientId ? patients.find(p => p.id === patientId) : null;
    saveTransaction({
      type, amount, date: modal.querySelector('#txDate').value,
      description: modal.querySelector('#txDesc').value || (type === 'income' ? 'Receita' : 'Despesa'),
      category: modal.querySelector('#txCat').value,
      method: modal.querySelector('#txMethod').value,
      patientId, patientName: patient ? patient.name : null,
      status: modal.querySelector('#txStatus').value
    });
    closeAllModals(); toast.success('Lançamento salvo!'); renderFinancial(parentContainer);
  };
}
