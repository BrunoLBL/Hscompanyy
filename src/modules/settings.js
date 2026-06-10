import { icon } from '../utils/icons.js';
import { getData, exportData, importData, resetStore, getCurrentUser, forceSync, lastSyncTime, syncStatus, saveAll, trackDeletion, flushSync, getLoggedUser, getUsers, saveUser, deleteUser, getSystemLogs, addLog } from '../modules/store.js';
import { generateId } from '../utils/helpers.js';
import { toast } from '../components/toast.js';
import { openModal, closeAllModals } from '../components/modal.js';

export function renderSettings(container) {
  const data = getData();
  const settings = data.settings || {};
  const loggedUser = getLoggedUser();
  const isAdmin = loggedUser?.role === 'admin';

  const syncTimeStr = lastSyncTime 
    ? new Date(lastSyncTime).toLocaleString('pt-BR') 
    : 'Nunca';

  const syncBadge = syncStatus === 'success' 
    ? '<span style="color: var(--accent-success); font-weight: 600;">✅ Sincronizado</span>'
    : syncStatus === 'error'
    ? '<span style="color: var(--accent-danger); font-weight: 600;">❌ Erro na sync</span>'
    : syncStatus === 'syncing'
    ? '<span style="color: var(--accent-warn); font-weight: 600;">⏳ Sincronizando...</span>'
    : '<span style="color: var(--text-muted);">—</span>';

  container.innerHTML = `
    <div class="page-title-bar">
      <div><h2>Configurações</h2><p>Configurações do sistema</p></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="card">
        <h4 style="font-weight:600;margin-bottom:16px">${icon('settings',18)} Dados da Clínica</h4>
        ${isAdmin ? `<div class="form-group"><label>Nome da Clínica</label><input type="text" id="clinicName" value="${settings.clinicName||'HS Corp'}"/></div>` : ''}
        <div class="form-group">
          <label>Dentistas Cadastrados</label>
          <div id="dentistsList" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;"></div>
          <div style="display:flex;gap:8px;">
            <input type="text" id="newDentistName" placeholder="Nome do dentista..." style="flex:1;">
            <select id="newDentistType" class="input" style="width:130px;">
              <option value="fixo">Fixo</option>
              <option value="freelancer">Freelancer</option>
            </select>
            <button class="btn btn-secondary btn-sm" id="addDentistBtn">${icon('plus', 14)} Adicionar</button>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" id="saveSettings">${icon('check',14)} Salvar</button>
      </div>

      <div class="card">
        <h4 style="font-weight:600;margin-bottom:16px">💾 Sincronização de Dados</h4>
        <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:16px">
          Os dados são salvos automaticamente no disco do computador para proteção contra perda.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.85rem;margin-bottom:16px;padding:12px;background:var(--bg);border-radius:var(--radius-sm);">
          <div><span style="color:var(--text-muted)">Status:</span> ${syncBadge}</div>
          <div><span style="color:var(--text-muted)">Última sync:</span> ${syncTimeStr}</div>
          <div><span style="color:var(--text-muted)">Armazenamento:</span> ~${(JSON.stringify(data).length/1024).toFixed(1)} KB</div>
          <div><span style="color:var(--text-muted)">Pacientes:</span> ${data.patients?.length||0}</div>
        </div>
        <button class="btn btn-primary btn-sm" id="forceSyncBtn">💾 Forçar Sincronização</button>
      </div>

      <div class="card">
        <h4 style="font-weight:600;margin-bottom:16px">${icon('download',18)} Backup & Restauração</h4>
        <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:16px">Exporte seus dados para backup ou importe dados de um backup anterior.</p>
        <div style="display:flex;gap:10px;margin-bottom:16px">
          <button class="btn btn-primary btn-sm" id="exportBtn">${icon('download',14)} Exportar Dados</button>
          <button class="btn ${isAdmin ? 'btn-secondary' : 'btn-disabled'} btn-sm" id="importBtn" ${!isAdmin ? 'disabled title="Apenas Administradores podem importar dados"' : ''}>${icon('upload',14)} Importar Dados</button>
          ${isAdmin ? `<input type="file" id="importFile" accept=".json" style="display:none"/>` : ''}
        </div>

      </div>

      <div class="card">
        <h4 style="font-weight:600;margin-bottom:16px">📋 Backups Automáticos</h4>
        <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:16px">
          O sistema cria backups diários automaticamente. Mantenha os últimos 30 dias.
        </p>
        <div id="backups-list" style="font-size:.85rem;color:var(--text-muted);">
          Carregando backups...
        </div>
      </div>
    </div>

    ${isAdmin ? `
    <!-- Gerenciar Usuários -->
    <div class="card" style="margin-top:20px">
      <h4 style="font-weight:600;margin-bottom:16px">👥 Gerenciar Usuários e Permissões</h4>
      <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:16px">Gerencie as credenciais e permissões de acesso de cada usuário do sistema.</p>
      <div id="usersList" style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;"></div>
      <button class="btn btn-primary btn-sm" id="addUserBtn">${icon('plus', 14)} Adicionar Usuário</button>
    </div>

    <!-- Log do Sistema -->
    <div class="card" style="margin-top:20px">
      <h4 style="font-weight:600;margin-bottom:16px">📝 Log do Sistema</h4>
      <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:16px">Histórico de alterações realizadas por cada usuário.</p>
      <button class="btn btn-secondary btn-sm" id="viewLogsBtn">${icon('list', 14)} Ver Log Completo</button>
    </div>
    ` : ''}

    <div class="card" style="margin-top:20px">
      <h4 style="font-weight:600;margin-bottom:12px">Sobre o Sistema</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:.85rem">
        <div><span style="color:var(--text-muted)">Sistema:</span> HS Corp — Gestão Odontológica</div>
        <div><span style="color:var(--text-muted)">Versão:</span> 2.0.0</div>
        <div><span style="color:var(--text-muted)">Pacientes:</span> ${data.patients?.length||0}</div>
        <div><span style="color:var(--text-muted)">Agendamentos:</span> ${data.appointments?.length||0}</div>
        <div><span style="color:var(--text-muted)">Transações:</span> ${data.transactions?.length||0}</div>
        <div><span style="color:var(--text-muted)">Armazenamento:</span> ~${(JSON.stringify(data).length/1024).toFixed(1)} KB</div>
      </div>
    </div>
  `;

  // ─── Dentistas ───────────────────────────────────────────
  let currentDentists = [...(settings.dentists || [])];

  function resizeImage(file, maxWidth, maxHeight) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) { height = Math.round(height * (maxWidth / width)); width = maxWidth; }
          } else {
            if (height > maxHeight) { width = Math.round(width * (maxHeight / height)); height = maxHeight; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderDentistsList() {
    const listEl = document.getElementById('dentistsList');
    if (!listEl) return;
    listEl.innerHTML = currentDentists.map(d => {
      const typeLabel = d.type === 'freelancer' ? 'Freelancer' : 'Fixo';
      const typeColor = d.type === 'freelancer' ? 'var(--accent-warn)' : 'var(--accent-info)';
      return `
      <div class="dentist-item" data-id="${d.id}" style="display:flex;align-items:center;gap:12px;padding:8px;background:var(--bg-lighter);border:1px solid var(--border);border-radius:var(--radius-sm);">
        <div style="position:relative;width:40px;height:40px;border-radius:50%;background:var(--border);overflow:hidden;flex-shrink:0;">
          ${d.photo ? `<img src="${d.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--text-muted);font-weight:bold;">${d.name.charAt(0)}</div>`}
          <label style="position:absolute;bottom:0;right:0;background:var(--primary);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="Alterar foto">
            ${icon('edit', 10)}
            <input type="file" class="dentist-photo-input" data-id="${d.id}" accept="image/*" style="display:none;">
          </label>
        </div>
        <div style="flex:1;">
          <div style="font-weight:600;display:flex;align-items:center;gap:8px;">
            ${d.name}
            <span style="font-size:0.7rem;padding:2px 6px;border-radius:10px;background:${typeColor};color:#fff;">${typeLabel}</span>
          </div>
        </div>
        <button class="btn btn-icon btn-danger btn-sm remove-dentist-btn" data-id="${d.id}" title="Remover dentista">${icon('trash', 14)}</button>
      </div>
      `;
    }).join('');

    listEl.querySelectorAll('.remove-dentist-btn').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.dataset.id;
        currentDentists = currentDentists.filter(d => d.id !== id);
        trackDeletion(data, id); // Registra a deleção no histórico
        renderDentistsList();
      };
    });

    listEl.querySelectorAll('.dentist-photo-input').forEach(input => {
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const id = e.target.dataset.id;
        try {
          const base64 = await resizeImage(file, 120, 120);
          const idx = currentDentists.findIndex(d => d.id === id);
          if (idx >= 0) currentDentists[idx].photo = base64;
          renderDentistsList();
        } catch (err) {
          toast.error('Erro ao processar imagem');
        }
      };
    });
  }

  const addBtn = container.querySelector('#addDentistBtn');
  if (addBtn) {
    addBtn.onclick = () => {
      const input = container.querySelector('#newDentistName');
      const typeInput = container.querySelector('#newDentistType');
      const name = input.value.trim();
      if (!name) return;
      currentDentists.push({ id: generateId(), name, photo: null, type: typeInput.value });
      input.value = '';
      renderDentistsList();
    };
  }

  // Initial render
  renderDentistsList();

  // ─── Salvar configurações ───────────────────────────────────────────
  document.getElementById('saveSettings').onclick = () => {
    data.settings = {
      ...settings,
      dentists: currentDentists
    };
    if (isAdmin) {
      data.settings.clinicName = document.getElementById('clinicName').value;
    }
    saveAll(data);
    addLog('update', 'settings', null, 'Configurações da clínica atualizadas');
    toast.success('Configurações salvas!');
  };

  // ─── Forçar sincronização ───────────────────────────────────────────
  document.getElementById('forceSyncBtn').onclick = async () => {
    const btn = document.getElementById('forceSyncBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Sincronizando...';
    
    const result = await forceSync();
    
    if (result.success) {
      toast.success(`Dados sincronizados com sucesso!`);
      btn.textContent = '✅ Sincronizado!';
    } else {
      toast.error('Erro ao sincronizar: ' + result.error);
      btn.textContent = '❌ Erro';
    }
    
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 Forçar Sincronização';
    }, 3000);
  };

  // ─── Exportar / Importar ────────────────────────────────────────────
  document.getElementById('exportBtn').onclick = () => { exportData(); toast.success('Backup exportado!'); };
  
  if (isAdmin) {
    document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
    document.getElementById('importFile').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (importData(ev.target.result)) { 
          toast.success('Sincronizando importação...');
          await flushSync();
          toast.success('Dados importados! Recarregando...'); 
          setTimeout(() => location.reload(), 500); 
        }
        else toast.error('Arquivo inválido');
      };
      reader.readAsText(file);
    };


    // ─── Gerenciar Usuários ─────────────────────────────────────────────
    renderUsersList();
    
    document.getElementById('addUserBtn').addEventListener('click', () => openUserForm());

    // ─── Log do Sistema ─────────────────────────────────────────────────
    document.getElementById('viewLogsBtn').addEventListener('click', () => openLogsModal());
  }

  // ─── Carregar lista de backups ──────────────────────────────────────
  loadBackupsList();
}

// ─── Render Users List ─────────────────────────────────────────────
function renderUsersList() {
  const listEl = document.getElementById('usersList');
  if (!listEl) return;
  
  const users = getUsers();
  const allPerms = ['dashboard','atendimentos','pacientes','agenda','financeiro','estoque','relatorios','configuracoes','whatsapp','dentistas'];
  const permLabels = {
    dashboard: 'Dashboard', atendimentos: 'Atendimentos', pacientes: 'Pacientes',
    agenda: 'Agenda', financeiro: 'Financeiro', estoque: 'Estoque',
    relatorios: 'Relatórios', configuracoes: 'Configurações', whatsapp: 'WhatsApp', dentistas: 'Dentistas'
  };

  listEl.innerHTML = users.map(u => {
    const roleBadge = u.role === 'admin' ? '<span style="background:#6366f1;color:#fff;padding:2px 8px;border-radius:10px;font-size:.7rem;">Admin</span>'
      : u.role === 'recepcao' ? '<span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:10px;font-size:.7rem;">Recepção</span>'
      : '<span style="background:#10b981;color:#fff;padding:2px 8px;border-radius:10px;font-size:.7rem;">Dentista</span>';
    
    const permStr = (u.permissions || []).filter(p => p !== 'portal').map(p => permLabels[p] || p).join(', ') || (u.role === 'dentista' ? 'Portal do Dentista' : '-');
    
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-lighter);border:1px solid var(--border);border-radius:var(--radius-sm);">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0;">
          ${u.name.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;display:flex;align-items:center;gap:8px;margin-bottom:2px;">
            ${u.name} ${roleBadge}
          </div>
          <div style="font-size:.75rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${permStr}
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm edit-user-btn" data-id="${u.id}" title="Editar">${icon('edit', 14)}</button>
          ${u.role !== 'admin' ? `<button class="btn btn-danger btn-sm del-user-btn" data-id="${u.id}" title="Excluir">${icon('trash', 14)}</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.edit-user-btn').forEach(btn => {
    btn.onclick = () => {
      const user = users.find(u => u.id === btn.dataset.id);
      if (user) openUserForm(user);
    };
  });

  listEl.querySelectorAll('.del-user-btn').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Excluir este usuário?')) {
        deleteUser(btn.dataset.id);
        addLog('delete', 'user', btn.dataset.id, 'Usuário excluído');
        toast.success('Usuário excluído');
        renderUsersList();
      }
    };
  });
}

function openUserForm(user = null) {
  const isEdit = !!user;
  const allPerms = ['dashboard','atendimentos','pacientes','agenda','financeiro','estoque','relatorios','configuracoes','whatsapp','dentistas'];
  const permLabels = {
    dashboard: 'Dashboard', atendimentos: 'Atendimentos', pacientes: 'Pacientes',
    agenda: 'Agenda', financeiro: 'Financeiro', estoque: 'Estoque',
    relatorios: 'Relatórios', configuracoes: 'Configurações', whatsapp: 'WhatsApp', dentistas: 'Dentistas'
  };
  const data = getData();
  const dentists = data.settings?.dentists || [];

  const u = user || { name: '', role: 'recepcao', password: '', permissions: ['dashboard','atendimentos','pacientes','agenda','estoque','configuracoes','whatsapp','dentistas'], dentistId: null };

  const modal = openModal({
    title: isEdit ? `Editar Usuário: ${u.name}` : 'Novo Usuário',
    size: 'lg',
    content: `
      <div class="form-row">
        <div class="form-group"><label>Nome *</label><input type="text" id="userName" value="${u.name}" /></div>
        <div class="form-group"><label>Tipo</label>
          <select id="userRole">
            <option value="admin" ${u.role==='admin'?'selected':''}>Administrador</option>
            <option value="recepcao" ${u.role==='recepcao'?'selected':''}>Recepção</option>
            <option value="dentista" ${u.role==='dentista'?'selected':''}>Dentista</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>${isEdit ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label><input type="text" id="userPassword" value="${isEdit ? '' : u.password}" placeholder="${isEdit ? 'Manter atual' : 'Digite a senha'}" /></div>
        <div class="form-group" id="dentistLinkGroup" style="display:${u.role==='dentista'?'block':'none'};">
          <label>Vincular ao Dentista</label>
          <select id="userDentistId">
            <option value="">Nenhum</option>
            ${dentists.map(d => `<option value="${d.id}" ${u.dentistId===d.id?'selected':''}>${d.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group" id="permsGroup" style="display:${u.role==='dentista'?'none':'block'};">
        <label>Permissões de Acesso</label>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:8px;">
          ${allPerms.map(p => `
            <label style="display:flex;align-items:center;gap:6px;font-size:.85rem;cursor:pointer;padding:6px 10px;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);">
              <input type="checkbox" class="perm-check" value="${p}" ${(u.permissions||[]).includes(p)?'checked':''} />
              ${permLabels[p]}
            </label>
          `).join('')}
        </div>
      </div>
    `,
    footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Cancelar</button>
      <button class="btn btn-primary" id="saveUserBtn">${isEdit ? 'Salvar Alterações' : 'Cadastrar'}</button>`
  });

  // Toggle dentist/perms visibility
  modal.querySelector('#userRole').onchange = (e) => {
    const isDentist = e.target.value === 'dentista';
    modal.querySelector('#dentistLinkGroup').style.display = isDentist ? 'block' : 'none';
    modal.querySelector('#permsGroup').style.display = isDentist ? 'none' : 'block';
  };

  modal.querySelector('#saveUserBtn').onclick = () => {
    const name = modal.querySelector('#userName').value.trim();
    const role = modal.querySelector('#userRole').value;
    const password = modal.querySelector('#userPassword').value;
    const dentistId = modal.querySelector('#userDentistId')?.value || null;

    if (!name) { toast.error('Nome é obrigatório'); return; }
    if (!isEdit && !password) { toast.error('Senha é obrigatória'); return; }
    
    if (role === 'dentista' && !dentistId) {
      toast.error('É obrigatório vincular a um dentista cadastrado');
      return;
    }

    let permissions;
    if (role === 'dentista') {
      permissions = ['portal'];
    } else if (role === 'admin') {
      permissions = [...allPerms];
    } else {
      permissions = Array.from(modal.querySelectorAll('.perm-check:checked')).map(cb => cb.value);
    }

    const userData = {
      ...u,
      name,
      role,
      permissions,
      dentistId: role === 'dentista' ? dentistId : null
    };
    if (password) userData.password = password;

    saveUser(userData);
    addLog(isEdit ? 'update' : 'create', 'user', userData.id, `${isEdit ? 'Editou' : 'Criou'} usuário: ${name}`);
    closeAllModals();
    toast.success(isEdit ? 'Usuário atualizado!' : 'Usuário cadastrado!');
    renderUsersList();
  };
}

// ─── Log Modal ─────────────────────────────────────────────
function openLogsModal() {
  const logs = getSystemLogs().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  const actionLabels = {
    create: '➕ Criou', update: '✏️ Editou', delete: '🗑️ Excluiu',
    login: '🔑 Login', logout: '🚪 Logout', complete: '✅ Concluiu'
  };
  const entityLabels = {
    patient: 'Paciente', appointment: 'Agendamento', transaction: 'Transação',
    attendance: 'Atendimento', inventory: 'Estoque', user: 'Usuário',
    settings: 'Configurações', notification: 'Notificação', document: 'Documento'
  };

  openModal({
    title: '📝 Log do Sistema',
    size: 'lg',
    content: `
      <div style="max-height:500px;overflow-y:auto;">
        ${logs.length === 0 ? '<p style="text-align:center;color:var(--text-muted);padding:20px;">Nenhum registro no log.</p>' : `
        <table class="data-table" style="font-size:.82rem;">
          <thead style="position:sticky;top:0;z-index:1;">
            <tr>
              <th>Data/Hora</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            ${logs.slice(0, 200).map(l => `
              <tr>
                <td style="white-space:nowrap;">${new Date(l.timestamp).toLocaleString('pt-BR')}</td>
                <td style="font-weight:500;">${l.userName}</td>
                <td>${actionLabels[l.action] || l.action}</td>
                <td>${entityLabels[l.entity] || l.entity}</td>
                <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${l.description}">${l.description}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        `}
      </div>
    `,
    footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Fechar</button>`
  });
}

async function loadBackupsList() {
  const listEl = document.getElementById('backups-list');
  if (!listEl) return;

  try {
    const res = await fetch('/api/data/backups');
    if (!res.ok) throw new Error('Servidor indisponível');
    const { backups } = await res.json();

    if (backups.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;">Nenhum backup encontrado ainda. O primeiro será criado automaticamente amanhã.</p>';
      return;
    }

    listEl.innerHTML = `
      <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);">
        <table class="data-table" style="font-size:.82rem;">
          <thead style="position:sticky;top:0;">
            <tr>
              <th>Data</th>
              <th>Tamanho</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${backups.map(b => `
              <tr>
                <td>${b.date}</td>
                <td>${b.size}</td>
                <td><button class="btn btn-secondary btn-sm restore-backup-btn" data-file="${b.name}" style="padding:4px 8px;font-size:.75rem;">Restaurar</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll('.restore-backup-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const filename = e.target.dataset.file;
        if (!confirm(`Restaurar backup de ${filename}? Os dados atuais serão substituídos.`)) return;
        
        try {
          const res = await fetch('/api/data/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
          });
          
          if (res.ok) {
            const { data } = await res.json();
            saveAll(data);
            toast.success('Backup restaurado! Recarregando...');
            setTimeout(() => location.reload(), 1000);
          } else {
            const err = await res.json();
            toast.error(err.error || 'Erro ao restaurar');
          }
        } catch (err) {
          toast.error('Erro ao contatar o servidor');
        }
      });
    });
  } catch (err) {
    listEl.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;">Servidor indisponível. Inicie o sistema com o <code>iniciar.bat</code> para ver backups.</p>';
  }
}
