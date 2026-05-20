import { icon } from '../utils/icons.js';
import { formatDate, isToday, generateId } from '../utils/helpers.js';
import { getAppointments, saveAppointment, deleteAppointment, getPatients, getData } from '../modules/store.js';
import { openModal, closeAllModals } from '../components/modal.js';
import { toast } from '../components/toast.js';

let viewDate = new Date();
let viewMode = 'month';
let filterDentist = 'all';

export function renderScheduling(container) {
  const data = getData();
  const dentists = data.settings?.dentists || [];
  let appointments = getAppointments();
  
  if (filterDentist !== 'all') {
    appointments = appointments.filter(a => a.dentist === filterDentist);
  }

  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div class="page-title-bar">
      <div><h2>Agendamento</h2><p>Gerencie as consultas da clínica</p></div>
      <button class="btn btn-primary" id="newApptBtn">${icon('plus',16)} Nova Consulta</button>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn btn-icon btn-secondary" id="prevMonth">${icon('chevronLeft',18)}</button>
          <h3 style="font-size:1.1rem;font-weight:700;text-transform:capitalize;min-width:180px;text-align:center">${monthName}</h3>
          <button class="btn btn-icon btn-secondary" id="nextMonth">${icon('chevronRight',18)}</button>
          <button class="btn btn-secondary btn-sm" id="todayBtn">Hoje</button>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <select id="dentistFilter" class="form-group" style="margin-bottom:0;padding:4px 8px;border-radius:var(--radius-sm);border:1px solid var(--border);">
            <option value="all" ${filterDentist === 'all' ? 'selected' : ''}>Todos os Dentistas</option>
            ${dentists.map(d => `<option value="${d.name}" ${filterDentist === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}
          </select>
          <div style="display:flex;gap:4px">
            ${['month','week'].map(v => `<button class="btn btn-sm ${viewMode===v?'btn-primary':'btn-secondary'}" data-view="${v}">${v==='month'?'Mês':'Semana'}</button>`).join('')}
          </div>
        </div>
      </div>
      <div id="calendarView"></div>
    </div>
  `;

  container.querySelector('#prevMonth').onclick = () => { viewDate = new Date(y, m - 1, 1); renderScheduling(container); };
  container.querySelector('#nextMonth').onclick = () => { viewDate = new Date(y, m + 1, 1); renderScheduling(container); };
  container.querySelector('#todayBtn').onclick = () => { viewDate = new Date(); renderScheduling(container); };
  container.querySelector('#newApptBtn').onclick = () => openApptForm(null, container);
  container.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { viewMode = b.dataset.view; renderScheduling(container); }));
  
  const filterEl = container.querySelector('#dentistFilter');
  if (filterEl) {
    filterEl.addEventListener('change', (e) => {
      filterDentist = e.target.value;
      renderScheduling(container);
    });
  }

  const calView = document.getElementById('calendarView');

  if (viewMode === 'month') {
    renderMonthView(calView, appointments, y, m, container);
  } else {
    renderWeekView(calView, appointments, container);
  }
}

function renderMonthView(calView, appointments, y, m, parentContainer) {
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrev = new Date(y, m, 0).getDate();
  const today = new Date();

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let html = '<div class="calendar-grid">';
  days.forEach(d => { html += `<div class="calendar-header-cell">${d}</div>`; });

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="calendar-cell other-month"><span class="day-num">${daysInPrev - i}</span></div>`;
  }

  const dentistsData = getData().settings?.dentists || [];

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayAppts = appointments.filter(a => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
    const isTodayClass = (today.getFullYear() === y && today.getMonth() === m && today.getDate() === d) ? ' today' : '';

    html += `<div class="calendar-cell${isTodayClass}" data-date="${dateStr}">
      <span class="day-num">${d}</span>
      ${dayAppts.slice(0, 3).map(a => {
        const dentistObj = dentistsData.find(dt => dt.name === a.dentist);
        const photoHtml = (dentistObj && dentistObj.photo) 
          ? `<img src="${dentistObj.photo}" style="width:16px;height:16px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:4px;">` 
          : '';
        return `<div class="cal-event ${a.status}" data-id="${a.id}" title="${a.time} - ${a.patientName}: ${a.procedure}">
          <div style="display:flex;align-items:center;">${photoHtml}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.time} ${a.patientName.split(' ')[0]}</span></div>
        </div>`;
      }).join('')}
      ${dayAppts.length > 3 ? `<div class="cal-more-btn" data-date="${dateStr}" style="font-size:.65rem;color:var(--text-muted);padding:2px 6px;margin-top:2px;cursor:pointer;background:var(--bg-lighter);border-radius:var(--radius-sm);text-align:center;" title="Ver todos os agendamentos deste dia">+${dayAppts.length - 3} mais</div>` : ''}
    </div>`;
  }

  // Fill remaining
  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="calendar-cell other-month"><span class="day-num">${i}</span></div>`;
  }
  html += '</div>';
  calView.innerHTML = html;

  // Event clicks
  calView.querySelectorAll('.cal-event').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const appt = appointments.find(a => a.id === el.dataset.id);
      if (appt) openApptDetail(appt, parentContainer);
    });
  });

  calView.querySelectorAll('.cal-more-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dateStr = btn.dataset.date;
      const dayAppts = appointments.filter(a => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
      openDayAppointmentsModal(dateStr, dayAppts, parentContainer);
    });
  });

  calView.querySelectorAll('.calendar-cell:not(.other-month)').forEach(cell => {
    cell.addEventListener('dblclick', () => {
      openApptForm({ date: cell.dataset.date }, parentContainer);
    });
  });
}

function renderWeekView(calView, appointments, parentContainer) {
  const startOfWeek = new Date(viewDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const dentistsData = getData().settings?.dentists || [];

  calView.innerHTML = `
    <div style="overflow-x:auto">
      <table class="data-table" style="min-width:800px">
        <thead><tr><th style="width:60px">Hora</th>
          ${days.map(d => `<th style="text-align:center;${isToday(d)?'color:var(--primary);font-weight:700':''}">
            ${d.toLocaleDateString('pt-BR', { weekday: 'short' })} ${d.getDate()}/${d.getMonth()+1}
          </th>`).join('')}
        </tr></thead>
        <tbody>
          ${hours.map(h => `<tr>
            <td style="font-weight:600;color:var(--text-muted);font-size:.8rem;vertical-align:top">${String(h).padStart(2, '0')}:00</td>
            ${days.map(d => {
              const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              const hourAppts = appointments.filter(a => a.date === dateStr && parseInt(a.time) === h);
              return `<td style="position:relative;min-height:50px;padding:4px">
                ${hourAppts.map(a => {
                  const dentistObj = dentistsData.find(dt => dt.name === a.dentist);
                  const photoHtml = (dentistObj && dentistObj.photo) 
                    ? `<img src="${dentistObj.photo}" style="width:16px;height:16px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:4px;">` 
                    : '';
                  return `<div class="cal-event ${a.status}" data-id="${a.id}" style="margin-bottom:2px;display:flex;align-items:center;">
                    ${photoHtml}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.time} ${a.patientName.split(' ')[0]}</span>
                  </div>`;
                }).join('')}
              </td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  calView.querySelectorAll('.cal-event').forEach(el => {
    el.addEventListener('click', () => {
      const appt = appointments.find(a => a.id === el.dataset.id);
      if (appt) openApptDetail(appt, parentContainer);
    });
  });
}

function openApptDetail(appt, parentContainer) {
  const statusLabels = { confirmed: 'Confirmado', pending: 'Pendente', completed: 'Concluído', cancelled: 'Cancelado' };
  const patient = getPatients().find(p => p.id === appt.patientId);
  const waLink = patient && patient.phone ? `https://wa.me/55${patient.phone.replace(/\D/g, '')}` : '#';

  const modal = openModal({
    title: 'Detalhes da Consulta',
    content: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div><label style="font-size:.75rem;color:var(--text-muted)">Paciente</label><p style="font-weight:600">${appt.patientName}</p></div>
        <div><label style="font-size:.75rem;color:var(--text-muted)">Procedimento</label><p style="font-weight:600">${appt.procedure}</p></div>
        <div><label style="font-size:.75rem;color:var(--text-muted)">Data</label><p>${formatDate(appt.date)}</p></div>
        <div><label style="font-size:.75rem;color:var(--text-muted)">Horário</label><p>${appt.time} (${appt.duration}min)</p></div>
        <div><label style="font-size:.75rem;color:var(--text-muted)">Dentista</label><p>${appt.dentist}</p></div>
        <div><label style="font-size:.75rem;color:var(--text-muted)">Status</label><p><span class="status-badge status-${appt.status}">${statusLabels[appt.status]}</span></p></div>
      </div>`,
    footer: `
      <button class="btn btn-danger btn-sm" id="delAppt">${icon('trash',14)} Excluir</button>
      <div style="flex:1"></div>
      ${patient && patient.phone ? `<a href="${waLink}" target="_blank" class="btn btn-sm" style="background:#25D366;color:#fff;text-decoration:none">${icon('check',14)} WhatsApp</a>` : ''}
      ${appt.status !== 'completed' ? `<button class="btn btn-secondary btn-sm" id="completeAppt">${icon('check',14)} Concluir</button>` : ''}
      ${appt.status === 'pending' ? `<button class="btn btn-primary btn-sm" id="confirmAppt">${icon('check',14)} Confirmar</button>` : ''}
      <button class="btn btn-secondary btn-sm" onclick="location.hash='#/prontuario/${appt.patientId}'">${icon('eye',14)} Ver Prontuário</button>
    `
  });

  modal.querySelector('#delAppt')?.addEventListener('click', () => {
    if (confirm('Excluir esta consulta?')) { deleteAppointment(appt.id); closeAllModals(); toast.success('Consulta excluída'); renderScheduling(parentContainer); }
  });
  modal.querySelector('#confirmAppt')?.addEventListener('click', () => {
    saveAppointment({ ...appt, status: 'confirmed' }); closeAllModals(); toast.success('Consulta confirmada!'); renderScheduling(parentContainer);
  });
  modal.querySelector('#completeAppt')?.addEventListener('click', () => {
    saveAppointment({ ...appt, status: 'completed' }); closeAllModals(); toast.success('Consulta concluída!'); renderScheduling(parentContainer);
  });
}

function openApptForm(defaults = {}, parentContainer) {
  const patients = getPatients().filter(p => p.status === 'active');
  const procedures = ['Avaliação','Limpeza','Restauração','Extração','Canal','Clareamento','Implante','Ortodontia','Prótese','Raio-X','Manutenção','Harmonização','Outro'];
  const today = new Date().toISOString().slice(0, 10);
  const dentists = getData().settings?.dentists || [];

  const modal = openModal({
    title: 'Nova Consulta', size: 'lg',
    content: `
      <div class="form-row">
        <div class="form-group"><label>Paciente *</label>
          <select id="apptPatient"><option value="">Selecione...</option>
            ${patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Procedimento *</label>
          <select id="apptProc"><option value="">Selecione...</option>
            ${procedures.map(p => `<option>${p}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Data *</label><input type="date" id="apptDate" value="${defaults.date || today}"/></div>
        <div class="form-group"><label>Horário *</label><input type="time" id="apptTime" value="09:00"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Duração (min)</label>
          <select id="apptDur"><option>30</option><option>45</option><option selected>60</option><option>90</option><option>120</option></select></div>
        <div class="form-group"><label>Dentista *</label>
          <select id="apptDentist">
            ${dentists.length === 0 ? '<option value="">Sem dentistas cadastrados</option>' : ''}
            ${dentists.map(d => `<option value="${d.name}">${d.name}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-group"><label>Observações</label><textarea id="apptNotes" rows="2"></textarea></div>
    `,
    footer: `<button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Cancelar</button>
      <button class="btn btn-primary" id="saveApptBtn">Agendar</button>`
  });

  modal.querySelector('#saveApptBtn').onclick = () => {
    const patientId = modal.querySelector('#apptPatient').value;
    const proc = modal.querySelector('#apptProc').value;
    if (!patientId || !proc) { toast.error('Preencha paciente e procedimento'); return; }
    const patient = patients.find(p => p.id === patientId);
    saveAppointment({
      patientId, patientName: patient.name,
      date: modal.querySelector('#apptDate').value, time: modal.querySelector('#apptTime').value,
      duration: +modal.querySelector('#apptDur').value, procedure: proc,
      dentist: modal.querySelector('#apptDentist').value, status: 'pending',
      notes: modal.querySelector('#apptNotes').value.trim()
    });
    closeAllModals(); toast.success('Consulta agendada com sucesso!');
    renderScheduling(parentContainer);
  };
}

function openDayAppointmentsModal(dateStr, dayAppts, parentContainer) {
  const formattedDate = formatDate(dateStr);
  const dentistsData = getData().settings?.dentists || [];
  
  const modal = openModal({
    title: `Agendamentos - ${formattedDate}`,
    size: 'lg',
    content: `
      <div style="display:flex;flex-direction:column;gap:8px;max-height:450px;overflow-y:auto;padding-right:8px;">
        ${dayAppts.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:20px 0;">Nenhum agendamento neste dia.</p>' : ''}
        ${dayAppts.map(a => {
          const dentistObj = dentistsData.find(dt => dt.name === a.dentist);
          const photoHtml = (dentistObj && dentistObj.photo) 
            ? `<img src="${dentistObj.photo}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;">` 
            : `<div style="width:24px;height:24px;border-radius:50%;background:var(--border);color:var(--text-muted);display:flex;align-items:center;justify-content:center;margin-right:8px;font-size:10px;font-weight:bold;flex-shrink:0;">${a.dentist ? a.dentist.charAt(0) : '?'}</div>`;
          return `
            <div class="card day-appt-card" data-id="${a.id}" style="padding:12px;cursor:pointer;border:1px solid var(--border);border-left:4px solid ${a.status === 'confirmed' ? 'var(--accent)' : a.status === 'completed' ? 'var(--accent-success)' : a.status === 'cancelled' ? 'var(--accent-danger)' : 'var(--accent-warn)'};transition:background 0.2s;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <h4 style="font-weight:600;margin-bottom:6px;font-size:1.05rem;">${a.time} - ${a.patientName}</h4>
                  <div style="display:flex;align-items:center;font-size:.85rem;color:var(--text-muted);">
                    ${photoHtml} ${a.procedure} · <span style="margin-left:4px;font-weight:500;">${a.dentist}</span>
                  </div>
                </div>
                <span class="status-badge status-${a.status}">${a.status === 'confirmed' ? 'Confirmado' : a.status === 'completed' ? 'Concluído' : a.status === 'cancelled' ? 'Cancelado' : 'Pendente'}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Fechar</button>
      <button class="btn btn-primary" id="addApptFromDayBtn">${icon('plus',14)} Novo neste dia</button>
    `
  });

  modal.querySelectorAll('.day-appt-card').forEach(card => {
    card.addEventListener('click', () => {
      const appt = dayAppts.find(a => a.id === card.dataset.id);
      if (appt) {
        document.querySelector('.modal-backdrop')?.remove(); // Fecha o modal atual
        openApptDetail(appt, parentContainer);
      }
    });
    // Efeito visual no hover
    card.addEventListener('mouseenter', () => card.style.background = 'var(--bg-lighter)');
    card.addEventListener('mouseleave', () => card.style.background = '');
  });

  modal.querySelector('#addApptFromDayBtn').addEventListener('click', () => {
    document.querySelector('.modal-backdrop')?.remove();
    openApptForm({ date: dateStr }, parentContainer);
  });
}
