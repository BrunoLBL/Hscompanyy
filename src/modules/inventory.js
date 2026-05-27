import { icon } from '../utils/icons.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';
import { getInventory, saveInventoryItem, deleteInventoryItem, getInventoryNotifications, dismissInventoryNotification } from '../modules/store.js';
import { openModal, closeAllModals } from '../components/modal.js';
import { toast } from '../components/toast.js';

export function renderInventory(container) {
  const inventory = getInventory();
  const lowStock = inventory.filter(i => i.qty <= i.minQty);
  const expiringSoon = inventory.filter(i => {
    if (!i.expiry) return false;
    const diff = (new Date(i.expiry) - new Date()) / (864e5);
    return diff >= 0 && diff <= 90;
  });

  container.innerHTML = `
    <div class="page-title-bar">
      <div><h2>Estoque</h2><p>${inventory.length} itens cadastrados</p></div>
      <button class="btn btn-primary" id="addItemBtn">${icon('plus',16)} Novo Item</button>
    </div>

    ${(() => {
      const notifs = getInventoryNotifications().filter(n => n.status === 'pending');
      if (notifs.length === 0) return '';
      return `<div class="card" style="margin-bottom:20px;border-left:4px solid var(--accent-warn);">
        <h4 style="color:var(--accent-warn);font-size:.9rem;margin-bottom:12px;">🔔 Notificações dos Dentistas (${notifs.length})</h4>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${notifs.map(n => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(245,166,35,.06);border-radius:8px;">
              <div>
                <div style="font-weight:600;font-size:.85rem;">${n.message}</div>
                <div style="font-size:.75rem;color:var(--text-muted);">${new Date(n.createdAt).toLocaleString('pt-BR')}</div>
              </div>
              <button class="btn btn-secondary btn-sm dismiss-notif" data-id="${n.id}">Dispensar</button>
            </div>
          `).join('')}
        </div>
      </div>`;
    })()}

    ${lowStock.length > 0 ? `<div class="card" style="margin-bottom:20px;border-left:4px solid var(--accent-danger)">
      <h4 style="color:var(--accent-danger);font-size:.9rem;margin-bottom:8px">${icon('alertCircle',16)} Estoque Baixo (${lowStock.length} itens)</h4>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${lowStock.map(i => `<span style="background:rgba(231,76,60,.08);color:var(--accent-danger);padding:4px 12px;border-radius:8px;font-size:.78rem;font-weight:500">${i.name}: ${i.qty}/${i.minQty}</span>`).join('')}</div>
    </div>` : ''}

    <div class="card">
      <table class="data-table">
        <thead><tr><th>Produto</th><th>Categoria</th><th>Qtd</th><th>Mín</th><th>Unidade</th><th>Custo Unit.</th><th>Validade</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          ${inventory.map(i => {
            const isLow = i.qty <= i.minQty;
            const isExpiring = i.expiry && (new Date(i.expiry) - new Date()) / 864e5 <= 90;
            const isExpired = i.expiry && new Date(i.expiry) < new Date();
            return `<tr>
              <td style="font-weight:600">${i.name}</td>
              <td>${i.category}</td>
              <td style="font-weight:700;color:${isLow?'var(--accent-danger)':'var(--text)'}">${i.qty}</td>
              <td style="color:var(--text-muted)">${i.minQty}</td>
              <td>${i.unit}</td>
              <td>${formatCurrency(i.cost)}</td>
              <td>${i.expiry ? `<span style="color:${isExpired?'var(--accent-danger)':isExpiring?'var(--accent-warn)':'var(--text)'}">${formatDate(i.expiry)}</span>` : '-'}</td>
              <td>${isExpired ? '<span class="status-badge status-cancelled">Vencido</span>' : isLow ? '<span class="status-badge status-pending">Baixo</span>' : '<span class="status-badge status-active">OK</span>'}</td>
              <td><div class="action-cell">
                <button title="Editar" data-edit="${i.id}">${icon('edit',14)}</button>
                <button title="Excluir" data-del="${i.id}">${icon('trash',14)}</button>
              </div></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById('addItemBtn').onclick = () => openItemForm(null, container);
  container.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
    const item = inventory.find(i => i.id === b.dataset.edit);
    if (item) openItemForm(item, container);
  });
  container.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (confirm('Excluir item?')) { deleteInventoryItem(b.dataset.del); toast.success('Item excluído'); renderInventory(container); }
  });
  container.querySelectorAll('.dismiss-notif').forEach(b => b.onclick = () => {
    dismissInventoryNotification(b.dataset.id);
    toast.success('Notificação dispensada');
    renderInventory(container);
  });
}

function openItemForm(item, parentContainer) {
  const isEdit = !!item;
  const i = item || { name:'',category:'Material',qty:0,minQty:0,unit:'unidade',cost:0,expiry:'' };
  const modal = openModal({
    title: isEdit ? 'Editar Item' : 'Novo Item',
    content: `
      <div class="form-group"><label>Nome do Produto *</label><input type="text" id="invName" value="${i.name}"/></div>
      <div class="form-row">
        <div class="form-group"><label>Categoria</label>
          <select id="invCat"><option ${i.category==='Material'?'selected':''}>Material</option><option ${i.category==='Descartável'?'selected':''}>Descartável</option><option ${i.category==='Instrumento'?'selected':''}>Instrumento</option><option ${i.category==='Medicamento'?'selected':''}>Medicamento</option><option ${i.category==='Outro'?'selected':''}>Outro</option></select></div>
        <div class="form-group"><label>Unidade</label><input type="text" id="invUnit" value="${i.unit}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Quantidade Atual</label><input type="number" id="invQty" value="${i.qty}" min="0"/></div>
        <div class="form-group"><label>Quantidade Mínima</label><input type="number" id="invMin" value="${i.minQty}" min="0"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Custo Unitário (R$)</label><input type="number" id="invCost" step="0.01" value="${i.cost}"/></div>
        <div class="form-group"><label>Validade</label><input type="date" id="invExp" value="${i.expiry||''}"/></div>
      </div>
    `,
    footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Cancelar</button>
      <button class="btn btn-primary" id="saveInvBtn">${isEdit?'Salvar':'Cadastrar'}</button>`
  });

  modal.querySelector('#saveInvBtn').onclick = () => {
    const name = modal.querySelector('#invName').value.trim();
    if (!name) { toast.error('Nome é obrigatório'); return; }
    saveInventoryItem({ ...i, name, category: modal.querySelector('#invCat').value, unit: modal.querySelector('#invUnit').value,
      qty: +modal.querySelector('#invQty').value, minQty: +modal.querySelector('#invMin').value,
      cost: +modal.querySelector('#invCost').value, expiry: modal.querySelector('#invExp').value || null });
    closeAllModals(); toast.success(isEdit ? 'Item atualizado!' : 'Item cadastrado!'); renderInventory(parentContainer);
  };
}
