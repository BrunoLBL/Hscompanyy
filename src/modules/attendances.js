import { icon } from '../utils/icons.js';
import { formatDate, escapeHTML, isNoShow } from '../utils/helpers.js';
import { getAttendances, saveAttendance, getPatients, getAppointments, saveAppointment, getData, completeAttendanceProcess, savePatient } from './store.js';
import { openModal, closeAllModals } from '../components/modal.js';
import { toast } from '../components/toast.js';

export function renderAttendances(container) {
  const attendances = getAttendances();

  // ─── Dashboard do Dia: agendamentos de hoje por status ───
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAppts = getAppointments().filter(a => a.date === todayStr);
  const confirmedAppts = todayAppts.filter(a => a.status === 'confirmed');
  const pendingAppts = todayAppts.filter(a => a.status === 'pending');
  const completedAppts = todayAppts.filter(a => a.status === 'completed');

  const todayFormatted = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  container.innerHTML = `
    <div class="page-title-bar">
      <div><h2>Atendimentos em Aberto</h2><p>Gerencie os pacientes aguardando ou em atendimento na clínica</p></div>
      <button class="btn btn-primary" id="newAttendanceBtn">${icon('plus', 16)} Iniciar Atendimento</button>
    </div>

    <!-- ─── Dashboard do Dia ─── -->
    <div class="att-dashboard-section">
      <div class="att-dashboard-header">
        <div class="att-dashboard-header-left">
          <div class="att-dashboard-icon-wrap">
            ${icon('calendar', 22)}
          </div>
          <div>
            <h3 class="att-dashboard-title">Painel do Dia</h3>
            <p class="att-dashboard-subtitle">${todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1)} · ${todayAppts.length} agendamento${todayAppts.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div class="att-dashboard-cards">
        <div class="att-dash-card att-dash-card--confirmed" id="dashCardConfirmed" role="button" tabindex="0" title="Ver pacientes confirmados">
          <div class="att-dash-card__icon-ring att-dash-card__icon-ring--confirmed">
            ${icon('check', 24)}
          </div>
          <div class="att-dash-card__count">${confirmedAppts.length}</div>
          <div class="att-dash-card__label">Confirmados</div>
          <div class="att-dash-card__hint">Clique para ver detalhes</div>
        </div>

        <div class="att-dash-card att-dash-card--pending" id="dashCardPending" role="button" tabindex="0" title="Ver pacientes pendentes">
          <div class="att-dash-card__icon-ring att-dash-card__icon-ring--pending">
            ${icon('clock', 24)}
          </div>
          <div class="att-dash-card__count">${pendingAppts.length}</div>
          <div class="att-dash-card__label">Pendentes</div>
          <div class="att-dash-card__hint">Clique para ver detalhes</div>
        </div>

        <div class="att-dash-card att-dash-card--completed" id="dashCardCompleted" role="button" tabindex="0" title="Ver pacientes concluídos">
          <div class="att-dash-card__icon-ring att-dash-card__icon-ring--completed">
            ${icon('activity', 24)}
          </div>
          <div class="att-dash-card__count">${completedAppts.length}</div>
          <div class="att-dash-card__label">Concluídos</div>
          <div class="att-dash-card__hint">Clique para ver detalhes</div>
        </div>
      </div>
    </div>
    <!-- ─── Fim Dashboard ─── -->

    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
      ${attendances.length === 0 ? `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          ${icon('activity', 48)}
          <h3 style="margin-top: 16px;">Nenhum atendimento em aberto</h3>
          <p>Clique em "Iniciar Atendimento" para registrar um paciente na clínica.</p>
        </div>
      ` : attendances.map(a => `
        <div class="card" style="display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <h3 style="font-size:1.1rem; font-weight:700;">${escapeHTML(a.patientName)}</h3>
            <span class="status-badge status-pending" style="font-size:0.7rem;">Em Andamento</span>
          </div>
          <div style="font-size:0.85rem; color:var(--text-muted); display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; align-items:center; gap:6px;">${icon('clock', 14)} Iniciado às ${new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div style="display:flex; align-items:center; gap:6px;">${icon('user', 14)} ${escapeHTML(a.dentist || 'Recepção')}</div>
            <div style="display:flex; align-items:center; gap:6px;">${icon('fileText', 14)} ${escapeHTML(a.procedure)}</div>
            <div style="display:flex; align-items:center; gap:6px;">${icon('dollar', 14)} R$ ${Number(a.value).toFixed(2).replace('.', ',')}</div>
          </div>
          <div style="margin-top:auto; display:flex; gap:8px; padding-top:12px; border-top:1px solid var(--border-color);">
             <button class="btn btn-secondary btn-sm" onclick="location.hash='#/prontuario/${a.patientId}'">${icon('eye', 14)} Prontuário</button>
             <button class="btn btn-primary btn-sm finish-btn" style="flex:1" data-id="${a.id}">${icon('check', 14)} Concluir</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // ─── Dashboard card click handlers ───
  container.querySelector('#dashCardConfirmed').addEventListener('click', () => {
    openDashboardPopup('Confirmados', confirmedAppts, 'confirmed');
  });
  container.querySelector('#dashCardPending').addEventListener('click', () => {
    openDashboardPopup('Pendentes', pendingAppts, 'pending');
  });
  container.querySelector('#dashCardCompleted').addEventListener('click', () => {
    openDashboardPopup('Concluídos', completedAppts, 'completed');
  });

  container.querySelector('#newAttendanceBtn').addEventListener('click', () => openNewAttendanceModal(container));

  container.querySelectorAll('.finish-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      finishAttendance(id, container);
    });
  });
}

// ─── Popup do Dashboard: lista de pacientes por status ───
function openDashboardPopup(title, appointments, statusKey) {
  const statusColors = {
    confirmed: { bg: 'rgba(0,196,140,.08)', border: '#00C48C', text: '#00C48C', label: 'Confirmado' },
    pending:   { bg: 'rgba(245,166,35,.08)', border: '#F5A623', text: '#D4880F', label: 'Pendente' },
    completed: { bg: 'rgba(30,111,217,.08)', border: '#1E6FD9', text: '#1E6FD9', label: 'Concluído' }
  };
  const sc = statusColors[statusKey] || statusColors.pending;

  const statusIcon = statusKey === 'confirmed' ? icon('check', 20) : statusKey === 'completed' ? icon('activity', 20) : icon('clock', 20);

  const modal = openModal({
    title: `Pacientes — ${title} Hoje`,
    size: 'lg',
    content: `
      <div class="att-popup-header-bar" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:${sc.bg};border-radius:var(--radius);margin-bottom:20px;border:1px solid ${sc.border}20;">
        <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:${sc.border}18;color:${sc.text};">
          ${statusIcon}
        </div>
        <div>
          <div style="font-weight:700;font-size:1rem;color:${sc.text};">${appointments.length} ${title}</div>
          <div style="font-size:.8rem;color:var(--text-secondary);">Agendamentos para hoje · ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>
      ${appointments.length === 0 ? `
        <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
          ${icon('calendar', 40)}
          <p style="margin-top:12px;font-size:.9rem;">Nenhum agendamento ${title.toLowerCase()} para hoje.</p>
        </div>
      ` : `
        <div class="att-popup-patient-list">
          ${appointments.sort((a, b) => a.time.localeCompare(b.time)).map(a => `
            <div class="att-popup-patient-item" data-patient-id="${a.patientId}">
              <div class="att-popup-patient-avatar">${escapeHTML(a.patientName).charAt(0).toUpperCase()}</div>
              <div class="att-popup-patient-info">
                <a href="#/prontuario/${a.patientId}" class="att-popup-patient-name">${escapeHTML(a.patientName)}</a>
                <div class="att-popup-patient-details">
                  <span>${icon('clock', 12)} ${a.time}</span>
                  <span>${icon('fileText', 12)} ${escapeHTML(a.procedure)}</span>
                  <span>${icon('user', 12)} ${escapeHTML(a.dentist)}</span>
                </div>
              </div>
              ${isNoShow(a, new Date()) ? `<span class="status-badge status-cancelled" style="font-size:.7rem;flex-shrink:0;">Faltou</span>` : `<span class="status-badge status-${a.status}" style="font-size:.7rem;flex-shrink:0;">${sc.label}</span>`}
            </div>
          `).join('')}
        </div>
      `}
    `,
    footer: `
      <button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Fechar</button>
    `
  });

  // Clicking a patient name navigates to profile and closes modal
  modal.querySelectorAll('.att-popup-patient-name').forEach(link => {
    link.addEventListener('click', () => {
      closeAllModals();
    });
  });
}

function openNewAttendanceModal(parentContainer) {
  const patients = getPatients().filter(p => p.status === 'active');
  const procedures = ['Avaliação', 'Limpeza', 'Restauração', 'Extração', 'Canal', 'Clareamento', 'Implante', 'Ortodontia', 'Prótese', 'Raio-X', 'Manutenção', 'Harmonização', 'Outro'];
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
                    <h4 style="font-weight:600;margin-bottom:4px;">${a.time} - ${escapeHTML(a.patientName)}</h4>
                    <div style="font-size:.8rem;color:var(--text-muted);">${escapeHTML(a.procedure)} · ${escapeHTML(a.dentist)}</div>
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
            <div id="patientSelectWrapper" style="flex:1; display:block;">
              <select id="attPatient" style="width:100%;">
                <option value="">Selecione um paciente cadastrado...</option>
                ${patients.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('')}
              </select>
            </div>
            <div id="patientInputWrapper" style="flex:1; display:none;">
              <input type="text" id="attPatientName" placeholder="Nome do paciente avulso" style="width:100%;" />
            </div>
            <button class="btn btn-secondary" id="toggleAvulsoModeBtn" type="button">${icon('user', 16)} Avulso</button>
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
    
    if (isAvulsoMode) {
      modal.querySelector('#toggleAvulsoModeBtn').click();
    }
    
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

  let isAvulsoMode = false;
  modal.querySelector('#toggleAvulsoModeBtn').addEventListener('click', (e) => {
    isAvulsoMode = !isAvulsoMode;
    const selectWrap = modal.querySelector('#patientSelectWrapper');
    const inputWrap = modal.querySelector('#patientInputWrapper');
    const btn = e.currentTarget;
    if (isAvulsoMode) {
      selectWrap.style.display = 'none';
      inputWrap.style.display = 'block';
      btn.innerHTML = `${icon('list', 16)} Lista`;
      btn.classList.replace('btn-secondary', 'btn-primary');
    } else {
      selectWrap.style.display = 'block';
      inputWrap.style.display = 'none';
      btn.innerHTML = `${icon('user', 16)} Avulso`;
      btn.classList.replace('btn-primary', 'btn-secondary');
    }
  });

  modal.querySelector('#startAttBtn').addEventListener('click', () => {
    let patientId = modal.querySelector('#attPatient').value;
    let patientName = '';
    const procedure = modal.querySelector('#attProc').value;
    const value = modal.querySelector('#attValue').value;
    const dentist = modal.querySelector('#attDentist').value;

    if (isAvulsoMode) {
      patientName = modal.querySelector('#attPatientName').value.trim();
      if (!patientName || !procedure || !value) {
        toast.error('Preencha todos os campos obrigatórios (Nome, Procedimento e Valor)');
        return;
      }
      const newPatient = savePatient({ 
        name: patientName, 
        status: 'active',
        tags: ['Avulso'],
        notes: 'Cadastrado automaticamente via atendimento avulso.'
      });
      patientId = newPatient.id;
    } else {
      if (!patientId || !procedure || !value) {
        toast.error('Preencha todos os campos obrigatórios (Paciente, Procedimento e Valor)');
        return;
      }
      const patient = patients.find(p => p.id === patientId);
      patientName = patient ? patient.name : 'Desconhecido';
    }

    saveAttendance({
      patientId,
      patientName: patientName,
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

  // Utiliza a função centralizada de fechamento
  if (completeAttendanceProcess(id, 0)) {
    toast.success('Atendimento concluído e financeiro atualizado!');
    renderAttendances(parentContainer);
  }
}
