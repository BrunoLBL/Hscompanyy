import { icon } from '../utils/icons.js';
import { formatCurrency, formatDate, formatDateTime, formatPhone, formatCPF, getInitials, getAge } from '../utils/helpers.js';
import { getPatient, getClinicalRecords, saveClinicalRecord, getPhotos, savePhoto, deletePhoto, getTreatments, saveTreatment, getAppointments, getTransactions, getOdontogram, saveOdontogram, getDocuments, saveDocument, deleteDocument, getData } from '../modules/store.js';
import { navigate } from '../modules/router.js';
import { openModal, closeAllModals } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { openPatientForm } from './patients.js';

let currentTab = 'dados';

export function renderPatientRecord(container, patientId) {
  const p = getPatient(patientId);
  if (!p) { container.innerHTML = '<div class="empty-state"><h3>Paciente não encontrado</h3></div>'; return; }

  const records = getClinicalRecords(patientId);
  const photos = getPhotos(patientId);
  const treatments = getTreatments(patientId);
  const appointments = getAppointments().filter(a => a.patientId === patientId);
  const transactions = getTransactions().filter(t => t.patientId === patientId);
  const totalPaid = transactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((s, t) => s + (Number(t.amount)||0), 0);
  const totalPending = transactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((s, t) => s + (Number(t.amount)||0), 0);
  const documents = getDocuments(patientId);

  container.innerHTML = `
    <div style="margin-bottom:20px">
      <button class="btn btn-secondary btn-sm" onclick="location.hash='#/pacientes'">${icon('arrowLeft',16)} Voltar</button>
    </div>
    <div class="card" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <div class="patient-avatar" style="width:72px;height:72px;font-size:1.4rem">${getInitials(p.name)}</div>
        <div style="flex:1">
          <h2 style="font-size:1.4rem;font-weight:700;margin-bottom:2px">${p.name}</h2>
          <div style="display:flex;gap:16px;flex-wrap:wrap;color:var(--text-secondary);font-size:.82rem">
            ${p.birth ? `<span>${getAge(p.birth)} anos</span>` : ''}
            ${p.phone ? `<span>${formatPhone(p.phone)}</span>` : ''}
            ${p.email ? `<span>${p.email}</span>` : ''}
          </div>
          <div style="margin-top:8px;display:flex;gap:6px">
            <span class="status-badge status-${p.status}">${p.status === 'active' ? 'Ativo' : 'Inativo'}</span>
            ${(p.tags||[]).map(t => `<span style="background:var(--primary-bg);color:var(--primary);padding:3px 10px;border-radius:12px;font-size:.72rem;font-weight:600">${t}</span>`).join('')}
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" id="editPatientBtn">${icon('edit',14)} Editar</button>
          <button class="btn btn-primary btn-sm" onclick="location.hash='#/agenda'">${icon('calendar',14)} Agendar</button>
        </div>
      </div>
    </div>

    <div class="tabs" id="recordTabs">
      <button class="tab-btn ${currentTab==='dados'?'active':''}" data-tab="dados">Dados Pessoais</button>
      <button class="tab-btn ${currentTab==='historico'?'active':''}" data-tab="historico">Histórico Clínico</button>
      <button class="tab-btn ${currentTab==='odontograma'?'active':''}" data-tab="odontograma">Odontograma</button>
      <button class="tab-btn ${currentTab==='fotos'?'active':''}" data-tab="fotos">Fotos (${photos.length})</button>
      <button class="tab-btn ${currentTab==='documentos'?'active':''}" data-tab="documentos">Documentos (${documents.length})</button>
      <button class="tab-btn ${currentTab==='tratamentos'?'active':''}" data-tab="tratamentos">Tratamentos</button>
      <button class="tab-btn ${currentTab==='financeiro'?'active':''}" data-tab="financeiro">Financeiro</button>
      <button class="tab-btn ${currentTab==='agendamentos'?'active':''}" data-tab="agendamentos">Agendamentos</button>
    </div>
    <div id="tabContent"></div>
  `;

  document.getElementById('editPatientBtn').onclick = () => { openPatientForm(p); };

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
    const tc = document.getElementById('tabContent');
    switch (currentTab) {
      case 'dados': renderDados(tc, p); break;
      case 'historico': renderHistorico(tc, patientId, records); break;
      case 'odontograma': renderOdontogramTab(tc, patientId); break;
      case 'fotos': renderFotos(tc, patientId, photos); break;
      case 'documentos': renderDocumentos(tc, patientId, documents); break;
      case 'tratamentos': renderTratamentos(tc, patientId, treatments); break;
      case 'financeiro': renderFinanceiro(tc, transactions, totalPaid, totalPending); break;
      case 'agendamentos': renderAgendamentos(tc, appointments); break;
    }
  }
  renderTab();
}

function renderDados(tc, p) {
  tc.innerHTML = `<div class="card"><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">Nome Completo</label><span style="font-weight:600">${p.name}</span></div>
    <div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">CPF</label><span>${formatCPF(p.cpf)||'-'}</span></div>
    <div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">Telefone</label><span>${formatPhone(p.phone)||'-'}</span></div>
    <div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">Email</label><span>${p.email||'-'}</span></div>
    <div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">Data de Nascimento</label><span>${formatDate(p.birth)||'-'} ${p.birth?'('+getAge(p.birth)+' anos)':''}</span></div>
    <div><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">Gênero</label><span>${p.gender==='M'?'Masculino':p.gender==='F'?'Feminino':p.gender||'-'}</span></div>
    <div style="grid-column:span 2"><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">Endereço</label><span>${p.address||'-'}</span></div>
    <div style="grid-column:span 2"><label style="font-size:.75rem;color:var(--text-muted);display:block;margin-bottom:2px">Observações</label><span>${p.notes||'Nenhuma observação'}</span></div>
  </div></div>`;
}

function renderHistorico(tc, patientId, records) {
  tc.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:16px">
    <button class="btn btn-primary btn-sm" id="addRecordBtn">${icon('plus',14)} Novo Registro</button>
  </div>
  ${records.length === 0 ? '<div class="card"><div class="empty-state"><h3>Nenhum registro clínico</h3></div></div>' : `
  <div class="card"><div class="timeline">
    ${records.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(r => `
      <div class="timeline-item">
        <div class="t-date">${formatDateTime(r.date)}</div>
        <div class="t-title">${r.procedure} ${r.tooth?'(Dente '+r.tooth+')':''}</div>
        <div class="t-desc">${r.dentist} — ${r.notes||''}</div>
      </div>
    `).join('')}
  </div></div>`}`;

  document.getElementById('addRecordBtn')?.addEventListener('click', () => {
    const modal = openModal({
      title: 'Novo Registro Clínico', content: `
        <div class="form-row">
          <div class="form-group"><label>Procedimento</label><input type="text" id="recProc"/></div>
          <div class="form-group"><label>Dente (opcional)</label><input type="text" id="recTooth" placeholder="Ex: 36"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Dentista</label>
            <select id="recDentist"><option>Dra. Helena Souza</option><option>Dr. Ricardo Mendes</option></select></div>
          <div class="form-group"><label>Data</label><input type="datetime-local" id="recDate" value="${new Date().toISOString().slice(0,16)}"/></div>
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
  const odontoData = getOdontogram(patientId);
  const conditions = { healthy:'#E8F5E9', cavity:'#E74C3C', filling:'#1E6FD9', crown:'#F5A623', missing:'#9E9E9E', implant:'#9B59B6', rootCanal:'#E91E63' };
  const condLabels = { healthy:'Saudável', cavity:'Cárie', filling:'Restauração', crown:'Coroa', missing:'Ausente', implant:'Implante', rootCanal:'Canal' };
  let selectedCondition = 'cavity';

  function renderOdonto() {
    const upperTeeth = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
    const lowerTeeth = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

    function toothSVG(num) {
      const data = odontoData[num] || {};
      const faces = ['top','right','bottom','left','center'];
      const colors = faces.map(f => conditions[data[f] || 'healthy']);
      return `<g class="tooth" data-tooth="${num}">
        <polygon points="5,0 35,0 30,10 10,10" fill="${colors[0]}" stroke="#ccc" stroke-width="1" data-face="top"/>
        <polygon points="35,0 40,5 40,35 35,30 30,10" fill="${colors[1]}" stroke="#ccc" stroke-width="1" data-face="right"/>
        <polygon points="10,30 30,30 35,40 5,40" fill="${colors[2]}" stroke="#ccc" stroke-width="1" data-face="bottom"/>
        <polygon points="0,5 5,0 10,10 10,30 5,40 0,35" fill="${colors[3]}" stroke="#ccc" stroke-width="1" data-face="left"/>
        <rect x="10" y="10" width="20" height="20" fill="${colors[4]}" stroke="#ccc" stroke-width="1" data-face="center"/>
        <text class="tooth-number" x="20" y="54" font-size="9">${num}</text>
      </g>`;
    }

    tc.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
          <h4 style="font-weight:600">Odontograma</h4>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${Object.entries(condLabels).map(([k,v]) => `
              <button class="btn btn-sm ${selectedCondition===k?'btn-primary':'btn-secondary'}" data-cond="${k}" style="font-size:.72rem;padding:5px 10px;${selectedCondition!==k?'background:'+conditions[k]+';border-color:'+conditions[k]:''}">
                ${v}
              </button>`).join('')}
          </div>
        </div>
        <div class="odontogram-wrap">
          <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:4px">Superior</div>
          <svg viewBox="0 0 ${upperTeeth.length*48} 60" width="${upperTeeth.length*48}" style="max-width:100%">
            ${upperTeeth.map((t,i) => `<g transform="translate(${i*48},0)">${toothSVG(t)}</g>`).join('')}
          </svg>
          <div style="width:100%;border-top:2px dashed var(--border);margin:8px 0"></div>
          <svg viewBox="0 0 ${lowerTeeth.length*48} 60" width="${lowerTeeth.length*48}" style="max-width:100%">
            ${lowerTeeth.map((t,i) => `<g transform="translate(${i*48},0)">${toothSVG(t)}</g>`).join('')}
          </svg>
          <div style="font-size:.75rem;color:var(--text-muted);margin-top:4px">Inferior</div>
        </div>
      </div>`;

    // Condition selector
    tc.querySelectorAll('[data-cond]').forEach(btn => {
      btn.addEventListener('click', () => { selectedCondition = btn.dataset.cond; renderOdonto(); });
    });

    // Tooth click
    tc.querySelectorAll('.tooth polygon, .tooth rect').forEach(el => {
      el.addEventListener('click', (e) => {
        const toothG = e.target.closest('.tooth');
        const num = parseInt(toothG.dataset.tooth);
        const face = e.target.dataset.face;
        if (!odontoData[num]) odontoData[num] = {};
        odontoData[num][face] = odontoData[num][face] === selectedCondition ? 'healthy' : selectedCondition;
        saveOdontogram(patientId, odontoData);
        renderOdonto();
      });
      el.style.cursor = 'pointer';
    });
  }
  renderOdonto();
}

function renderFotos(tc, patientId, photos) {
  tc.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="btn btn-primary btn-sm" id="addPhotoBtn">${icon('camera',14)} Adicionar Fotos</button>
      <input type="file" id="photoInput" accept="image/*" multiple style="display:none"/>
    </div>
    ${photos.length === 0 ? '<div class="card"><div class="empty-state"><h3>Nenhuma foto</h3><p>Adicione fotos clínicas do paciente</p></div></div>' : `
    <div class="photo-grid">
      ${photos.map(ph => `
        <div class="photo-card">
          <img src="${ph.data}" alt="${ph.category||'Foto'}"/>
          <div class="photo-overlay">
            <span>${ph.category||'Foto'} · ${formatDate(ph.createdAt)}</span>
          </div>
        </div>
      `).join('')}
    </div>`}`;

  document.getElementById('addPhotoBtn')?.addEventListener('click', () => document.getElementById('photoInput').click());
  document.getElementById('photoInput')?.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        savePhoto({ patientId, data: ev.target.result, category: 'Clínica', name: file.name });
        toast.success('Foto adicionada!');
        renderFotos(tc, patientId, getPhotos(patientId));
      };
      reader.readAsDataURL(file);
    });
  });
}

function renderTratamentos(tc, patientId, treatments) {
  tc.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="btn btn-primary btn-sm" id="addTreatBtn">${icon('plus',14)} Novo Tratamento</button>
    </div>
    ${treatments.length === 0 ? '<div class="card"><div class="empty-state"><h3>Nenhum tratamento</h3></div></div>' : `
    <div style="display:flex;flex-direction:column;gap:12px">
      ${treatments.map(t => `
        <div class="card" style="display:flex;align-items:center;gap:16px">
          <div style="flex:1">
            <div style="font-weight:600;margin-bottom:4px">${t.procedure}</div>
            <div style="font-size:.8rem;color:var(--text-secondary)">${t.dentist} · Início: ${formatDate(t.startDate)}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
              <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${(t.completedSessions/t.totalSessions)*100}%;background:var(--primary);border-radius:3px;transition:width .3s"></div>
              </div>
              <span style="font-size:.75rem;font-weight:600;color:var(--text-secondary)">${t.completedSessions}/${t.totalSessions}</span>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700;color:var(--primary)">${formatCurrency(t.value)}</div>
            <div style="font-size:.75rem;color:var(--accent)">Pago: ${formatCurrency(t.paid)}</div>
            ${t.value - t.paid > 0 ? `<div style="font-size:.75rem;color:var(--accent-danger)">Restante: ${formatCurrency(t.value - t.paid)}</div>` : ''}
            <span class="status-badge status-${t.status === 'completed' ? 'completed' : 'pending'}" style="margin-top:4px">
              ${t.status === 'completed' ? 'Concluído' : t.status === 'in_progress' ? 'Em andamento' : 'Pendente'}</span>
          </div>
        </div>
      `).join('')}
    </div>`}`;

  document.getElementById('addTreatBtn')?.addEventListener('click', () => {
    const modal = openModal({ title: 'Novo Tratamento', content: `
      <div class="form-group"><label>Procedimento</label><input type="text" id="trProc"/></div>
      <div class="form-row">
        <div class="form-group"><label>Total de Sessões</label><input type="number" id="trSess" value="1" min="1"/></div>
        <div class="form-group"><label>Valor Total (R$)</label><input type="number" id="trValue" step="0.01"/></div>
      </div>
      <div class="form-group"><label>Dentista</label>
        <select id="trDentist"><option>Dra. Helena Souza</option><option>Dr. Ricardo Mendes</option></select></div>
    `, footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Cancelar</button>
      <button class="btn btn-primary" id="saveTrBtn">Salvar</button>` });
    modal.querySelector('#saveTrBtn').onclick = () => {
      saveTreatment({ patientId, procedure: modal.querySelector('#trProc').value, totalSessions: +modal.querySelector('#trSess').value,
        completedSessions: 0, value: +modal.querySelector('#trValue').value, paid: 0, dentist: modal.querySelector('#trDentist').value,
        status: 'in_progress', startDate: new Date().toISOString() });
      closeAllModals(); toast.success('Tratamento criado!');
      renderTratamentos(tc, patientId, getTreatments(patientId));
    };
  });
}

function renderFinanceiro(tc, transactions, totalPaid, totalPending) {
  tc.innerHTML = `
    <div class="financial-summary">
      <div class="card fin-card income"><h3>${formatCurrency(totalPaid)}</h3><span>Total Pago</span></div>
      <div class="card fin-card expense"><h3>${formatCurrency(totalPending)}</h3><span>Pendente</span></div>
      <div class="card fin-card balance"><h3>${formatCurrency(totalPaid + totalPending)}</h3><span>Total Geral</span></div>
    </div>
    <div class="card">
      ${transactions.length === 0 ? '<div class="empty-state"><h3>Nenhuma transação</h3></div>' : `
      <table class="data-table"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Método</th><th>Status</th></tr></thead>
      <tbody>${transactions.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t => `
        <tr><td>${formatDate(t.date)}</td><td>${t.description}</td>
        <td style="font-weight:600;color:${t.type==='income'?'var(--accent)':'var(--accent-danger)'}">${t.type==='income'?'+':'−'} ${formatCurrency(t.amount)}</td>
        <td>${t.method||'-'}</td><td><span class="status-badge status-${t.status==='paid'?'completed':'pending'}">${t.status==='paid'?'Pago':'Pendente'}</span></td></tr>
      `).join('')}</tbody></table>`}
    </div>`;
}

function renderAgendamentos(tc, appointments) {
  tc.innerHTML = `<div class="card">
    ${appointments.length === 0 ? '<div class="empty-state"><h3>Nenhum agendamento</h3></div>' : `
    <table class="data-table"><thead><tr><th>Data</th><th>Hora</th><th>Procedimento</th><th>Dentista</th><th>Status</th></tr></thead>
    <tbody>${appointments.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(a => `
      <tr><td>${formatDate(a.date)}</td><td>${a.time}</td><td>${a.procedure}</td><td>${a.dentist}</td>
      <td><span class="status-badge status-${a.status}">${a.status==='confirmed'?'Confirmado':a.status==='completed'?'Concluído':a.status==='cancelled'?'Cancelado':'Pendente'}</span></td></tr>
    `).join('')}</tbody></table>`}
  </div>`;
}

function renderDocumentos(tc, patientId, documents) {
  const docTypes = ['RG', 'CPF', 'Contrato', 'Receita', 'Atestado', 'Laudo', 'Radiografia', 'Termo de Consentimento', 'Outro'];
  
  // Agrupa documentos por tipo
  const grouped = {};
  documents.forEach(doc => {
    const type = doc.type || 'Outro';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(doc);
  });

  tc.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="btn btn-primary btn-sm" id="addDocBtn">${icon('plus',14)} Adicionar Documento</button>
      <input type="file" id="docFileInput" accept="image/*,.pdf" style="display:none"/>
    </div>
    ${documents.length === 0 ? `
      <div class="card">
        <div class="empty-state">
          <h3>Nenhum documento</h3>
          <p>Adicione documentos como RG, CPF, contratos, receitas, laudos, etc.</p>
        </div>
      </div>
    ` : `
      <div style="display:flex;flex-direction:column;gap:20px;">
        ${Object.entries(grouped).map(([type, docs]) => `
          <div class="card">
            <h4 style="font-weight:600;margin-bottom:16px;display:flex;align-items:center;gap:8px;color:var(--primary);">
              ${icon('fileText', 16)} ${type}
              <span style="font-size:.75rem;background:var(--primary-bg);padding:2px 8px;border-radius:10px;font-weight:500;">${docs.length}</span>
            </h4>
            <div class="doc-grid">
              ${docs.map(doc => {
                const isPdf = doc.mimeType === 'application/pdf';
                return `
                  <div class="doc-card">
                    <div class="doc-card-preview" data-view="${doc.id}">
                      ${isPdf ? `
                        <div class="doc-pdf-icon">
                          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          <span>PDF</span>
                        </div>
                      ` : `
                        <img src="${doc.data}" alt="${doc.name}" style="width:100%;height:100%;object-fit:cover;"/>
                      `}
                    </div>
                    <div class="doc-card-info">
                      <span class="doc-card-name" title="${doc.name}">${doc.name}</span>
                      <span class="doc-card-date">${formatDate(doc.createdAt)}</span>
                    </div>
                    <div class="doc-card-actions">
                      <button class="btn btn-icon btn-secondary btn-sm doc-view-btn" data-id="${doc.id}" title="Visualizar">${icon('eye', 14)}</button>
                      <button class="btn btn-icon btn-danger btn-sm doc-del-btn" data-id="${doc.id}" title="Excluir">${icon('trash', 14)}</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;

  // Adicionar documento
  let selectedDocType = 'Outro';
  document.getElementById('addDocBtn')?.addEventListener('click', () => {
    const modal = openModal({
      title: 'Adicionar Documento',
      content: `
        <div class="form-group" style="margin-bottom:16px;">
          <label>Tipo de Documento</label>
          <select id="docType" class="input">
            ${docTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Arquivo (PDF ou Imagem)</label>
          <input type="file" id="docFileModal" accept="image/*,.pdf" class="input" />
        </div>
      `,
      footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Cancelar</button>
        <button class="btn btn-primary" id="saveDocBtn">Salvar</button>`
    });

    modal.querySelector('#saveDocBtn').onclick = () => {
      const file = modal.querySelector('#docFileModal').files[0];
      const docType = modal.querySelector('#docType').value;
      if (!file) { toast.error('Selecione um arquivo'); return; }

      const reader = new FileReader();
      reader.onload = (ev) => {
        saveDocument({
          patientId,
          type: docType,
          name: file.name,
          data: ev.target.result,
          mimeType: file.type
        });
        closeAllModals();
        toast.success('Documento adicionado!');
        renderDocumentos(tc, patientId, getDocuments(patientId));
      };
      reader.readAsDataURL(file);
    };
  });

  // Visualizar documento
  tc.querySelectorAll('.doc-view-btn, [data-view]').forEach(el => {
    el.onclick = (e) => {
      const docId = e.currentTarget.dataset.id || e.currentTarget.dataset.view;
      const doc = documents.find(d => d.id === docId);
      if (!doc) return;
      
      if (doc.mimeType === 'application/pdf') {
        // Abre PDF em nova aba
        const win = window.open();
        win.document.write(`<iframe src="${doc.data}" style="width:100%;height:100%;border:none;" frameborder="0"></iframe>`);
      } else {
        // Abre imagem em modal fullscreen
        openModal({
          title: doc.name,
          size: 'lg',
          content: `<div style="text-align:center;"><img src="${doc.data}" style="max-width:100%;max-height:70vh;border-radius:8px;"/></div>`,
          footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Fechar</button>`
        });
      }
    };
  });

  // Excluir documento
  tc.querySelectorAll('.doc-del-btn').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Excluir este documento?')) {
        deleteDocument(btn.dataset.id);
        toast.success('Documento excluído!');
        renderDocumentos(tc, patientId, getDocuments(patientId));
      }
    };
  });
}
