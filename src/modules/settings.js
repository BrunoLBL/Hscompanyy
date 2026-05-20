import { icon } from '../utils/icons.js';
import { getData, exportData, importData, resetStore, getCurrentUser, forceSync, lastSyncTime, syncStatus, saveAll } from '../modules/store.js';
import { generateId } from '../utils/helpers.js';
import { toast } from '../components/toast.js';

export function renderSettings(container) {
  const data = getData();
  const settings = data.settings || {};
  const currentUser = getCurrentUser();
  const isAdmin = currentUser === 'Administrador';

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
        ${isAdmin ? `
        <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:16px">
          <h4 style="font-weight:600;margin-bottom:12px;color:var(--accent-danger)">${icon('trash',18)} Zona de Perigo</h4>
          <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:12px">Limpar todos os dados irá remover pacientes, agendamentos, financeiro e estoque.</p>
          <button class="btn btn-danger btn-sm" id="clearBtn">${icon('trash',14)} Limpar Todos os Dados</button>
        </div>` : ''}
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

    <div class="card" style="margin-top:20px">
      <h4 style="font-weight:600;margin-bottom:12px">Sobre o Sistema</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:.85rem">
        <div><span style="color:var(--text-muted)">Sistema:</span> HS Corp — Gestão Odontológica</div>
        <div><span style="color:var(--text-muted)">Versão:</span> 1.0.0</div>
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
    listEl.innerHTML = currentDentists.map(d => `
      <div class="dentist-item" data-id="${d.id}" style="display:flex;align-items:center;gap:12px;padding:8px;background:var(--bg-lighter);border:1px solid var(--border);border-radius:var(--radius-sm);">
        <div style="position:relative;width:40px;height:40px;border-radius:50%;background:var(--border);overflow:hidden;flex-shrink:0;">
          ${d.photo ? `<img src="${d.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--text-muted);font-weight:bold;">${d.name.charAt(0)}</div>`}
          <label style="position:absolute;bottom:0;right:0;background:var(--primary);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="Alterar foto">
            ${icon('edit', 10)}
            <input type="file" class="dentist-photo-input" data-id="${d.id}" accept="image/*" style="display:none;">
          </label>
        </div>
        <div style="flex:1;font-weight:600;">${d.name}</div>
        <button class="btn btn-icon btn-danger btn-sm remove-dentist-btn" data-id="${d.id}" title="Remover dentista">${icon('trash', 14)}</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.remove-dentist-btn').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.dataset.id;
        currentDentists = currentDentists.filter(d => d.id !== id);
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
      const name = input.value.trim();
      if (!name) return;
      currentDentists.push({ id: generateId(), name, photo: null });
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
    toast.success('Configurações salvas!');
  };

  // ─── Forçar sincronização ───────────────────────────────────────────
  document.getElementById('forceSyncBtn').onclick = async () => {
    const btn = document.getElementById('forceSyncBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Sincronizando...';
    
    const result = await forceSync();
    
    if (result.success) {
      toast.success(`Dados sincronizados com sucesso! (${result.size})`);
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
      reader.onload = (ev) => {
        if (importData(ev.target.result)) { toast.success('Dados importados! Recarregando...'); setTimeout(() => location.reload(), 1000); }
        else toast.error('Arquivo inválido');
      };
      reader.readAsText(file);
    };
    document.getElementById('clearBtn').onclick = () => {
      if (confirm('ATENÇÃO: Isso irá apagar TODOS os dados. Deseja continuar?')) {
        resetStore();
        toast.success('Dados limpos! Recarregando...');
        setTimeout(() => location.reload(), 1000);
      }
    };
  }

  // ─── Carregar lista de backups ──────────────────────────────────────
  loadBackupsList();
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
