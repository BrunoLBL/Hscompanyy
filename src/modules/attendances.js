import { icon } from '../utils/icons.js';
import { formatDate } from '../utils/helpers.js';
import { getAttendances, saveAttendance, deleteAttendance, getPatients, saveTransaction, saveClinicalRecord, getAppointments, saveAppointment, getData, saveTreatment } from './store.js';
import { openModal, closeAllModals } from '../components/modal.js';
import { toast } from '../components/toast.js';

export function renderAttendances(container) {
  const attendances = getAttendances();
  
  container.innerHTML = `
    <div class="page-title-bar">
      <div><h2>Atendimentos em Aberto</h2><p>Gerencie os pacientes aguardando ou em atendimento na clínica</p></div>
      <button class="btn btn-primary" id="newAttendanceBtn">${icon('plus', 16)} Iniciar Atendimento</button>
    </div>
    
    <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
      ${attendances.length === 0 ? `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          ${icon('activity', 48)}
          <h3 style="margin-top: 16px;">Nenhum atendimento em aberto</h3>
          <p>Clique em "Iniciar Atendimento" para registrar um paciente na clínica.</p>
        </div>
      ` : attendances.map(a => `
        <div class="card" style="display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <h3 style="font-size:1.1rem; font-weight:700;">${a.patientName}</h3>
            <span class="status-badge status-pending" style="font-size:0.7rem;">Em Andamento</span>
          </div>
          <div style="font-size:0.85rem; color:var(--text-muted); display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; align-items:center; gap:6px;">${icon('clock', 14)} Iniciado às ${new Date(a.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            <div style="display:flex; align-items:center; gap:6px;">${icon('user', 14)} ${a.dentist || 'Recepção'}</div>
            <div style="display:flex; align-items:center; gap:6px;">${icon('fileText', 14)} ${a.procedure}</div>
            <div style="display:flex; align-items:center; gap:6px;">${icon('dollar', 14)} R$ ${Number(a.value).toFixed(2).replace('.', ',')}</div>
          </div>
          <div style="margin-top:auto; display:flex; gap:8px; padding-top:12px; border-top:1px solid var(--border-color);">
             <button class="btn btn-secondary btn-sm" onclick="location.hash='#/prontuario/${a.patientId}'">${icon('eye',14)} Prontuário</button>
             <button class="btn btn-primary btn-sm finish-btn" style="flex:1" data-id="${a.id}">${icon('check', 14)} Concluir</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelector('#newAttendanceBtn').addEventListener('click', () => openNewAttendanceModal(container));
  
  container.querySelectorAll('.finish-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      finishAttendance(id, container);
    });
  });
}

function openNewAttendanceModal(parentContainer) {
  const patients = getPatients().filter(p => p.status === 'active');
  const procedures = ['Avaliação','Limpeza','Restauração','Extração','Canal','Clareamento','Implante','Ortodontia','Prótese','Raio-X','Manutenção','Harmonização','Outro'];
  const todayAppts = getAppointments().filter(a => a.date === new Date().toISOString().slice(0, 10) && !['completed', 'cancelled'].includes(a.status));
  const dentists = getData().settings?.dentists || [];

  const modal = openModal({
    title: 'Iniciar Atendimento',
    content: `
      <div class="tabs" style="margin-bottom:16px;">
        <button class="tab-btn active" id="tabAgendados">Agendados de Hoje</button>
        <button class="tab-btn" id="tabAvulso">Novo (Avulso)</button>
      </div>

      <div id="contentAgendados">
        ${todayAppts.length === 0 ? `<p style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:20px 0;">Não há agendamentos pendentes para hoje.</p>` : `
          <div style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;">
            ${todayAppts.map(a => `
              <div class="card" style="padding:12px;cursor:pointer;border:1px solid var(--border);" onclick="startScheduledAppt('${a.id}')">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <h4 style="font-weight:600;margin-bottom:4px;">${a.time} - ${a.patientName}</h4>
                    <div style="font-size:.8rem;color:var(--text-muted);">${a.procedure} · ${a.dentist}</div>
                  </div>
                  <button class="btn btn-primary btn-sm">Iniciar</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <div id="contentAvulso" style="display:none;">
        <div class="form-group" style="margin-bottom:16px;">
          <label>Paciente *</label>
          <div style="display:flex; gap:8px;">
            <select id="attPatient" style="flex:1;">
              <option value="">Selecione um paciente cadastrado...</option>
              ${patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
            <button class="btn btn-secondary" id="registerNewPatientBtn" type="button">${icon('plus', 16)} Cadastrar</button>
          </div>
        </div>
        <div class="form-row" style="margin-bottom:16px;">
          <div class="form-group">
            <label>Procedimento *</label>
            <select id="attProc">
              <option value="">Selecione...</option>
              ${procedures.map(p => `<option value="${p}">${p}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Dentista *</label>
            <select id="attDentist">
              <option value="Recepção">Nenhum (Recepção)</option>
              ${dentists.map(d => `<option value="${d.name}">${d.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Valor Cobrado (R$) *</label>
          <input type="number" id="attValue" step="0.01" min="0" placeholder="0,00" />
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Cancelar</button>
      <button class="btn btn-primary" id="startAttBtn" style="display:none;">Iniciar Atendimento</button>
    `
  });

  const tabAgendados = modal.querySelector('#tabAgendados');
  const tabAvulso = modal.querySelector('#tabAvulso');
  const contentAgendados = modal.querySelector('#contentAgendados');
  const contentAvulso = modal.querySelector('#contentAvulso');
  const startAttBtn = modal.querySelector('#startAttBtn');

  tabAgendados.onclick = () => {
    tabAgendados.classList.add('active'); tabAvulso.classList.remove('active');
    contentAgendados.style.display = 'block'; contentAvulso.style.display = 'none';
    startAttBtn.style.display = 'none';
  };
  tabAvulso.onclick = () => {
    tabAvulso.classList.add('active'); tabAgendados.classList.remove('active');
    contentAvulso.style.display = 'block'; contentAgendados.style.display = 'none';
    startAttBtn.style.display = 'block';
  };

  window.startScheduledAppt = (id) => {
    const appt = todayAppts.find(a => a.id === id);
    if (!appt) return;
    
    modal.querySelector('#attPatient').value = appt.patientId;
    modal.querySelector('#attProc').value = appt.procedure;
    
    const dentistSelect = modal.querySelector('#attDentist');
    if (dentistSelect.querySelector(`option[value="${appt.dentist}"]`)) {
      dentistSelect.value = appt.dentist;
    }
    
    modal.dataset.appointmentId = appt.id;
    
    tabAvulso.onclick();
    toast.info('Preencha o valor para iniciar.');
    modal.querySelector('#attValue').focus();
  };

  modal.querySelector('#registerNewPatientBtn').addEventListener('click', () => {
    closeAllModals();
    window.location.hash = '#/pacientes';
  });

  modal.querySelector('#startAttBtn').addEventListener('click', () => {
    const patientId = modal.querySelector('#attPatient').value;
    const procedure = modal.querySelector('#attProc').value;
    const value = modal.querySelector('#attValue').value;
    const dentist = modal.querySelector('#attDentist').value;

    if (!patientId || !procedure || !value) {
      toast.error('Preencha todos os campos obrigatórios (Paciente, Procedimento e Valor)');
      return;
    }

    const patient = patients.find(p => p.id === patientId);

    saveAttendance({
      patientId,
      patientName: patient.name,
      procedure,
      value: Number(value),
      dentist
    });
    
    if (modal.dataset.appointmentId) {
      const appt = todayAppts.find(a => a.id === modal.dataset.appointmentId);
      if (appt) saveAppointment({ ...appt, status: 'completed' });
    }

    closeAllModals();
    toast.success('Atendimento iniciado!');
    renderAttendances(parentContainer);
  });
}

function finishAttendance(id, parentContainer) {
  const attendance = getAttendances().find(a => a.id === id);
  if (!attendance) return;

  if (!confirm('Deseja concluir este atendimento? O valor será lançado no financeiro.')) return;

  // Lança o financeiro (income, pago)
  saveTransaction({
    type: 'income',
    date: new Date().toISOString().slice(0, 10),
    amount: attendance.value,
    description: attendance.procedure,
    category: 'Procedimento',
    patientId: attendance.patientId,
    patientName: attendance.patientName,
    method: 'PIX', // Padrão
    status: 'paid'
  });

  // Adiciona ao Prontuário / Histórico Clínico
  saveClinicalRecord({
    patientId: attendance.patientId,
    date: new Date().toISOString(),
    procedure: attendance.procedure,
    dentist: attendance.dentist || 'Recepção', // Agora puxa o dentista correto
    notes: 'Realizado e concluído no atendimento.',
    tooth: null
  });

  // Salva também como um tratamento concluído para registrar a produção financeira do dentista
  saveTreatment({
    patientId: attendance.patientId,
    procedure: attendance.procedure,
    totalSessions: 1,
    completedSessions: 1,
    value: attendance.value,
    paid: attendance.value,
    dentist: attendance.dentist || 'Recepção',
    status: 'completed',
    startDate: new Date().toISOString()
  });

  // Remove da lista de atendimentos em aberto
  deleteAttendance(id);

  toast.success('Atendimento concluído e financeiro atualizado!');
  renderAttendances(parentContainer);
}
