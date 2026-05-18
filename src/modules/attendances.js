import { icon } from '../utils/icons.js';
import { formatDate } from '../utils/helpers.js';
import { getAttendances, saveAttendance, deleteAttendance, getPatients, saveTransaction, saveClinicalRecord } from './store.js';
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

  const modal = openModal({
    title: 'Iniciar Novo Atendimento',
    content: `
      <div class="form-group" style="margin-bottom:16px;">
        <label>Paciente *</label>
        <div style="display:flex; gap:8px;">
          <select id="attPatient" style="flex:1;">
            <option value="">Selecione um paciente cadastrado...</option>
            ${patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
          <button class="btn btn-secondary" id="registerNewPatientBtn" type="button">${icon('plus', 16)} Cadastrar Novo</button>
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
          <label>Valor (R$) *</label>
          <input type="number" id="attValue" step="0.01" min="0" placeholder="0,00" />
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-secondary" onclick="document.querySelector('.modal-backdrop')?.remove()">Cancelar</button>
      <button class="btn btn-primary" id="startAttBtn">Iniciar Atendimento</button>
    `
  });

  modal.querySelector('#registerNewPatientBtn').addEventListener('click', () => {
    closeAllModals();
    window.location.hash = '#/pacientes';
    // Opcional: Se quiséssemos abrir o modal de cadastro de paciente direto, teríamos que importar de patients.js
  });

  modal.querySelector('#startAttBtn').addEventListener('click', () => {
    const patientId = modal.querySelector('#attPatient').value;
    const procedure = modal.querySelector('#attProc').value;
    const value = modal.querySelector('#attValue').value;

    if (!patientId || !procedure || !value) {
      toast.error('Preencha todos os campos (Paciente, Procedimento e Valor)');
      return;
    }

    const patient = patients.find(p => p.id === patientId);

    saveAttendance({
      patientId,
      patientName: patient.name,
      procedure,
      value: Number(value)
    });

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
    dentist: 'Recepção', // Default for reception/attendance flow
    notes: 'Realizado e concluído no atendimento.',
    tooth: null
  });

  // Remove da lista de atendimentos em aberto
  deleteAttendance(id);

  toast.success('Atendimento concluído e financeiro atualizado!');
  renderAttendances(parentContainer);
}
