import { icon } from '../utils/icons.js';
import { getData, exportData, importData, resetStore, getCurrentUser, forceSync, lastSyncTime, syncStatus } from '../modules/store.js';
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
        <div class="form-group"><label>Dentistas (um por linha)</label>
          <textarea id="clinicDentists" rows="4">${(settings.dentists||[]).join('\n')}</textarea></div>
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

  // ─── Salvar configurações ───────────────────────────────────────────
  document.getElementById('saveSettings').onclick = () => {
    data.settings = {
      ...settings,
      dentists: document.getElementById('clinicDentists').value.split('\n').map(s=>s.trim()).filter(Boolean)
    };
    if (isAdmin) {
      data.settings.clinicName = document.getElementById('clinicName').value;
    }
    localStorage.setItem('hscorp_data', JSON.stringify(data));
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
            localStorage.setItem('hscorp_data', JSON.stringify(data));
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
