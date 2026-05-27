import { getData, getInventory, saveInventoryItem, saveInventoryNotification, addLog } from './store.js';
import { icon } from '../utils/icons.js';
import { toast } from '../components/toast.js';

let categoryFilter = 'all';

export function renderDentistInventory(container) {
  const data = getData();
  const dentists = data.settings?.dentists || [];
  const loggedDentistName = sessionStorage.getItem('dentist_portal_user');

  if (!loggedDentistName) {
    renderLogin(container, dentists);
  } else {
    renderPanel(container, loggedDentistName);
  }
}

function renderLogin(container, dentists) {
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;">
      <div class="card" style="max-width:400px;width:100%;text-align:center;padding:40px 30px;box-shadow:0 20px 40px rgba(0,0,0,0.15);border-radius:20px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:16px;margin-bottom:20px;">
          ${icon('package', 32)}
        </div>
        <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:8px;">Estoque Dentista</h2>
        <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:30px;">
          Gerencie o uso de materiais do consultório.
        </p>
        
        <div class="form-group" style="text-align:left;margin-bottom:16px;">
          <label>Selecione seu perfil</label>
          <select id="invPortalDentistSelect" class="input">
            <option value="">Selecione...</option>
            ${dentists.map(d => `<option value="${d.name}">${d.name}</option>`).join('')}
          </select>
        </div>
        
        <div class="form-group" style="text-align:left;margin-bottom:24px;">
          <label>Senha de Acesso</label>
          <input type="password" id="invPortalPassword" class="input" placeholder="Digite a senha" />
        </div>
        
        <button class="btn btn-primary" id="invPortalLoginBtn" style="width:100%;padding:12px;font-size:1rem;background:linear-gradient(135deg,#667eea,#764ba2);border:none;">Entrar</button>
      </div>
    </div>
  `;

  document.getElementById('invPortalLoginBtn').onclick = () => {
    const dentist = document.getElementById('invPortalDentistSelect').value;
    const pwd = document.getElementById('invPortalPassword').value;
    if (!dentist) { toast.error('Selecione seu perfil.'); return; }
    
    // Verifica senha do usuário
    const users = getData().settings?.users || [];
    const user = users.find(u => u.name === dentist);
    const validPwd = user ? user.password : '123';
    if (pwd !== validPwd) { toast.error('Senha incorreta.'); return; }

    sessionStorage.setItem('dentist_portal_user', dentist);
    toast.success(`Bem-vindo(a), ${dentist}!`);
    renderDentistInventory(container);
  };

  document.getElementById('invPortalPassword').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') document.getElementById('invPortalLoginBtn').click();
  });
}

function renderPanel(container, dentistName) {
  const inventory = getInventory();
  
  // Categorias disponíveis
  const categories = [...new Set(inventory.map(i => i.category))].sort();
  
  // Filtrar
  let filtered = inventory;
  if (categoryFilter !== 'all') {
    filtered = inventory.filter(i => i.category === categoryFilter);
  }

  container.innerHTML = `
    <div style="min-height:100vh;background:var(--bg);display:flex;flex-direction:column;">
      <!-- Header -->
      <header style="background:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);box-shadow:0 2px 10px rgba(0,0,0,0.02);flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;">
            ${icon('package', 20)}
          </div>
          <div>
            <h1 style="font-size:1.1rem;font-weight:700;margin:0;">Estoque</h1>
            <div style="font-size:0.8rem;color:var(--text-secondary);">Portal do Dentista</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <a href="#/portal" class="btn btn-secondary btn-sm">${icon('activity', 14)} Portal</a>
          <div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:0.9rem;">
            <div style="width:32px;height:32px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;">
              ${dentistName.charAt(0)}
            </div>
            <span style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${dentistName}</span>
          </div>
          <button class="btn btn-secondary btn-sm" id="invPortalLogoutBtn">${icon('logOut', 14)} Sair</button>
        </div>
      </header>

      <!-- Filtros -->
      <div style="padding:16px 20px 0;max-width:1200px;margin:0 auto;width:100%;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
          <button class="btn btn-sm ${categoryFilter==='all'?'btn-primary':'btn-secondary'}" data-cat="all">Todos</button>
          ${categories.map(c => `
            <button class="btn btn-sm ${categoryFilter===c?'btn-primary':'btn-secondary'}" data-cat="${c}">${c}</button>
          `).join('')}
        </div>
      </div>

      <!-- Grid de Cards -->
      <main style="flex:1;padding:0 20px 20px;max-width:1200px;margin:0 auto;width:100%;overflow-y:auto;">
        ${filtered.length === 0 ? `
          <div style="text-align:center;padding:60px 20px;">
            <div style="color:var(--text-muted);margin-bottom:16px;">${icon('package', 48)}</div>
            <h3 style="font-size:1.2rem;font-weight:600;margin-bottom:8px;">Nenhum item encontrado</h3>
          </div>
        ` : `
          <div class="dentist-inv-grid">
            ${filtered.map(item => {
              const isLow = item.qty <= item.minQty;
              return `
              <div class="dentist-inv-card ${isLow ? 'dentist-inv-card-low' : ''}">
                <div class="dentist-inv-card-header">
                  <span class="dentist-inv-card-cat">${item.category}</span>
                  ${isLow ? `<span class="dentist-inv-card-alert">⚠ Baixo</span>` : ''}
                </div>
                <h3 class="dentist-inv-card-name">${item.name}</h3>
                <div class="dentist-inv-card-qty">
                  <span class="dentist-inv-card-qty-num ${isLow ? 'low' : ''}">${item.qty}</span>
                  <span class="dentist-inv-card-qty-unit">${item.unit}</span>
                </div>
                <div class="dentist-inv-card-actions">
                  <button class="dentist-inv-btn-remove" data-id="${item.id}" title="Remover quantidade">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Remover
                  </button>
                  <button class="dentist-inv-btn-notify" data-id="${item.id}" data-name="${item.name}" title="Notificar Recepção">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    Notificar
                  </button>
                </div>
              </div>
              `;
            }).join('')}
          </div>
        `}
      </main>
    </div>
  `;

  // Logout
  document.getElementById('invPortalLogoutBtn').onclick = () => {
    sessionStorage.removeItem('dentist_portal_user');
    renderDentistInventory(container);
  };

  // Category filter
  container.querySelectorAll('[data-cat]').forEach(btn => {
    btn.onclick = () => {
      categoryFilter = btn.dataset.cat;
      renderPanel(container, dentistName);
    };
  });

  // Remove quantity
  container.querySelectorAll('.dentist-inv-btn-remove').forEach(btn => {
    btn.onclick = () => {
      const itemId = btn.dataset.id;
      const item = inventory.find(i => i.id === itemId);
      if (!item) return;

      const qtyStr = prompt(`Quantas unidades de "${item.name}" deseja remover?\n\nQuantidade atual: ${item.qty} ${item.unit}`, '1');
      if (qtyStr === null) return;
      const qty = parseInt(qtyStr);
      if (isNaN(qty) || qty <= 0) { toast.error('Quantidade inválida'); return; }
      if (qty > item.qty) { toast.error('Quantidade maior que o disponível!'); return; }

      saveInventoryItem({ ...item, qty: item.qty - qty });
      addLog('update', 'inventory', item.id, `${dentistName} removeu ${qty}x ${item.name} do estoque`);
      toast.success(`${qty}x ${item.name} removido(s) do estoque`);
      renderPanel(container, dentistName);
    };
  });

  // Notify reception
  container.querySelectorAll('.dentist-inv-btn-notify').forEach(btn => {
    btn.onclick = () => {
      const itemId = btn.dataset.id;
      const itemName = btn.dataset.name;
      
      if (!confirm(`Enviar notificação para recontagem de "${itemName}"?`)) return;

      saveInventoryNotification({
        itemId,
        itemName,
        type: 'recount',
        requestedBy: dentistName,
        message: `${dentistName} solicitou recontagem de "${itemName}"`
      });
      addLog('create', 'notification', itemId, `${dentistName} solicitou recontagem de ${itemName}`);
      toast.success('Notificação enviada para a recepção!');
    };
  });
}
