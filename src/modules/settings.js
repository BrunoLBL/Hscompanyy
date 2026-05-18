import { icon } from '../utils/icons.js';
import { getData, exportData, importData, resetStore } from '../modules/store.js';
import { toast } from '../components/toast.js';

export function renderSettings(container) {
  const data = getData();
  const settings = data.settings || {};

  container.innerHTML = `
    <div class="page-title-bar">
      <div><h2>Configurações</h2><p>Configurações do sistema</p></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="card">
        <h4 style="font-weight:600;margin-bottom:16px">${icon('settings',18)} Dados da Clínica</h4>
        <div class="form-group"><label>Nome da Clínica</label><input type="text" id="clinicName" value="${settings.clinicName||'HS Corp'}"/></div>
        <div class="form-group"><label>Dentistas (um por linha)</label>
          <textarea id="clinicDentists" rows="4">${(settings.dentists||[]).join('\n')}</textarea></div>
        <button class="btn btn-primary btn-sm" id="saveSettings">${icon('check',14)} Salvar</button>
      </div>
      <div class="card">
        <h4 style="font-weight:600;margin-bottom:16px">${icon('download',18)} Backup & Restauração</h4>
        <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:16px">Exporte seus dados para backup ou importe dados de um backup anterior.</p>
        <div style="display:flex;gap:10px;margin-bottom:16px">
          <button class="btn btn-primary btn-sm" id="exportBtn">${icon('download',14)} Exportar Dados</button>
          <button class="btn btn-secondary btn-sm" id="importBtn">${icon('upload',14)} Importar Dados</button>
          <input type="file" id="importFile" accept=".json" style="display:none"/>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:16px">
          <h4 style="font-weight:600;margin-bottom:12px;color:var(--accent-danger)">${icon('trash',18)} Zona de Perigo</h4>
          <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:12px">Limpar todos os dados irá remover pacientes, agendamentos, financeiro e estoque.</p>
          <button class="btn btn-danger btn-sm" id="clearBtn">${icon('trash',14)} Limpar Todos os Dados</button>
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

  document.getElementById('saveSettings').onclick = () => {
    data.settings = {
      ...settings,
      clinicName: document.getElementById('clinicName').value,
      dentists: document.getElementById('clinicDentists').value.split('\n').map(s=>s.trim()).filter(Boolean)
    };
    localStorage.setItem('hscorp_data', JSON.stringify(data));
    toast.success('Configurações salvas!');
  };

  document.getElementById('exportBtn').onclick = () => { exportData(); toast.success('Backup exportado!'); };
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
