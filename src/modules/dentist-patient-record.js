import { icon } from '../utils/icons.js';
import { formatDate, formatDateTime, formatPhone, formatCPF, getInitials, getAge, escapeHTML, localDateTimeStr, compressImage } from '../utils/helpers.js';
import { getPatient, getClinicalRecords, saveClinicalRecord, getPhotos, savePhoto, getOdontogram, saveOdontogram } from '../modules/store.js';
import { navigate } from '../modules/router.js';
import { toast } from '../components/toast.js';
import { openModal, closeAllModals } from '../components/modal.js';
import { renderOdontogramModule } from '../components/odontogram.js';

let currentTab = 'dados';

export function renderDentistPatientRecord(container, patientId) {
  const p = getPatient(patientId);
  if (!p) {
    container.innerHTML = '<div class="empty-state"><h3>Paciente não encontrado</h3></div>';
    return;
  }

  const records = getClinicalRecords(patientId);
  const photos = getPhotos(patientId);

  container.innerHTML = `
    <div style="min-height:100vh;background:var(--bg);display:flex;flex-direction:column;">
      <!-- Header -->
      <header style="background:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);box-shadow:0 2px 10px rgba(0,0,0,0.02);">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="btn btn-secondary btn-sm" id="backToPortalBtn">${icon('arrowLeft', 16)} Voltar ao Portal</button>
          <div>
            <h1 style="font-size:1.1rem;font-weight:700;margin:0;">Prontuário do Paciente</h1>
            <div style="font-size:0.8rem;color:var(--text-secondary);">Visualização do Dentista</div>
          </div>
        </div>
      </header>

      <!-- Patient Info -->
      <div style="padding:20px;max-width:1200px;margin:0 auto;width:100%;">
        <div class="card" style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
            <div class="patient-avatar" style="width:60px;height:60px;font-size:1.2rem">${getInitials(p.name)}</div>
            <div>
              <h2 style="font-size:1.3rem;font-weight:700;margin-bottom:2px">${escapeHTML(p.name)}</h2>
              <div style="display:flex;gap:16px;flex-wrap:wrap;color:var(--text-secondary);font-size:.82rem">
                ${p.birth ? `<span>${getAge(p.birth)} anos</span>` : ''}
                ${p.phone ? `<span>${formatPhone(p.phone)}</span>` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs (only clinical relevant ones) -->
        <div class="tabs" id="dentistRecordTabs">
          <button class="tab-btn ${currentTab==='dados'?'active':''}" data-tab="dados">Dados Pessoais</button>
          <button class="tab-btn ${currentTab==='historico'?'active':''}" data-tab="historico">Histórico Clínico</button>
          <button class="tab-btn ${currentTab==='odontograma'?'active':''}" data-tab="odontograma">Odontograma</button>
          <button class="tab-btn ${currentTab==='fotos'?'active':''}" data-tab="fotos">Fotos (${photos.length})</button>
        </div>
        <div id="dentistTabContent"></div>
      </div>
    </div>
  `;

  document.getElementById('backToPortalBtn').onclick = () => {
    navigate('/portal');
  };

  // Tab switching
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab();
    });
  });

  function renderTab() {
    const tc = document.getElementById('dentistTabContent');
    switch (currentTab) {
      case 'dados': renderDados(tc, p); break;
      case 'historico': renderHistorico(tc, patientId, records); break;
      case 'odontograma': renderOdontogramTab(tc, patientId); break;
      case 'fotos': renderFotos(tc, patientId, photos); break;
    }
  }
  renderTab();
}

function renderDados(tc, p) {
  tc.innerHTML = `<div class="card"><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">Nome Completo</label><span style="font-weight:600">${escapeHTML(p.name)}</span></div>
    <div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">CPF</label><span>${formatCPF(p.cpf)||'-'}</span></div>
    <div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">Telefone</label><span>${formatPhone(p.phone)||'-'}</span></div>
    <div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">Data de Nascimento</label><span>${formatDate(p.birth)||'-'} ${p.birth?'('+getAge(p.birth)+' anos)':''}</span></div>
    <div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">Gênero</label><span>${p.gender==='M'?'Masculino':p.gender==='F'?'Feminino':p.gender||'-'}</span></div>
    <div style="grid-column:span 2"><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">Observações</label><span>${escapeHTML(p.notes||'Nenhuma observação')}</span></div>
  </div></div>`;
}

function renderHistorico(tc, patientId, records) {
  tc.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:16px">
    <button class="btn btn-primary btn-sm" id="addRecordBtnDentist">${icon('plus',14)} Novo Registro</button>
  </div>
  ${records.length === 0 ? '<div class="card"><div class="empty-state"><h3>Nenhum registro clínico</h3></div></div>' : `
  <div class="card"><div class="timeline">
    ${records.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(r => `
      <div class="timeline-item">
        <div class="t-date">${formatDateTime(r.date)}</div>
        <div class="t-title">${escapeHTML(r.procedure)} ${r.tooth?'(Dente '+escapeHTML(r.tooth)+')':''}</div>
        <div class="t-desc">${escapeHTML(r.dentist)} — ${escapeHTML(r.notes||'')}</div>
      </div>
    `).join('')}
  </div></div>`}`;

  document.getElementById('addRecordBtnDentist')?.addEventListener('click', () => {
    const dentistName = sessionStorage.getItem('dentist_portal_user') || 'Dentista';
    const modal = openModal({
      title: 'Novo Registro Clínico', content: `
        <div class="form-row">
          <div class="form-group"><label>Procedimento</label><input type="text" id="recProc"/></div>
          <div class="form-group"><label>Dente (opcional)</label><input type="text" id="recTooth" placeholder="Ex: 36"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Dentista</label><input type="text" id="recDentist" value="${escapeHTML(dentistName)}" readonly style="background:var(--bg-lighter)"/></div>
          <div class="form-group"><label>Data</label><input type="datetime-local" id="recDate" value="${localDateTimeStr()}"/></div>
        </div>
        <div class="form-group"><label>Observações</label><textarea id="recNotes" rows="3"></textarea></div>
      `, footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Cancelar</button>
        <button class="btn btn-primary" id="saveRecBtn">Salvar</button>`
    });
    modal.querySelector('#saveRecBtn').onclick = () => {
      const proc = modal.querySelector('#recProc').value.trim();
      if (!proc) { toast.error('Procedimento é obrigatório'); return; }
      saveClinicalRecord({ patientId, procedure: proc, tooth: modal.querySelector('#recTooth').value.trim(),
        dentist: modal.querySelector('#recDentist').value, date: new Date(modal.querySelector('#recDate').value).toISOString(),
        notes: modal.querySelector('#recNotes').value.trim() });
      closeAllModals(); toast.success('Registro salvo!');
      renderHistorico(tc, patientId, getClinicalRecords(patientId));
    };
  });
}

function renderOdontogramTab(tc, patientId) {
  renderOdontogramModule(tc, patientId);
}

function renderFotos(tc, patientId, photos) {
  tc.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="btn btn-primary btn-sm" id="addPhotoBtnDentist">${icon('camera',14)} Adicionar Fotos</button>
      <input type="file" id="photoInputDentist" accept="image/*" multiple style="display:none"/>
    </div>
    ${photos.length === 0 ? '<div class="card"><div class="empty-state"><h3>Nenhuma foto</h3><p>Adicione fotos clínicas do paciente</p></div></div>' : `
    <div class="photo-grid">
      ${photos.map(ph => `
        <div class="photo-card">
          <img src="${ph.data}" alt="${escapeHTML(ph.category||'Foto')}"/>
          <div class="photo-overlay">
            <span>${escapeHTML(ph.category||'Foto')} · ${formatDate(ph.createdAt)}</span>
          </div>
        </div>
      `).join('')}
    </div>`}`;

  document.getElementById('addPhotoBtnDentist')?.addEventListener('click', () => document.getElementById('photoInputDentist').click());
  document.getElementById('photoInputDentist')?.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(async (file) => {
      try {
        const compressed = await compressImage(file, 1200, 0.78);
        savePhoto({ patientId, data: compressed, category: 'Clínica', name: file.name });
        toast.success('Foto adicionada!');
        renderFotos(tc, patientId, getPhotos(patientId));
      } catch {
        toast.error('Erro ao processar imagem');
      }
    });
  });
}
