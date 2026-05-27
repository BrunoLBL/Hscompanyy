import { icon } from '../utils/icons.js';
import { formatDate, formatPhone, formatCPF, getInitials, getAge, debounce } from '../utils/helpers.js';
import { getPatients, deletePatient } from '../modules/store.js';
import { toast } from '../components/toast.js';
import { openPatientForm } from './patients.js';

export function renderDefaulters(container) {
  let searchTerm = '';
  
  function render() {
    let patients = getPatients().filter(p => p.isDefaulter === true);
    if (searchTerm) patients = patients.filter(p => p.name.toLowerCase().includes(searchTerm) || (p.cpf && p.cpf.includes(searchTerm)));
    patients.sort((a, b) => a.name.localeCompare(b.name));

    container.innerHTML = `
      <div class="page-title-bar">
        <div><h2>Inadimplentes</h2><p>${patients.length} pacientes com pendências</p></div>
      </div>
      <div class="card" style="border-left:4px solid var(--accent-danger);">
        <div class="list-header">
          <div class="filter-group">
            <div class="header-search" style="position:relative">
              ${icon('search',16)}
              <input type="text" id="defaulterSearch" placeholder="Buscar inadimplente..." value="${searchTerm}" style="width:260px"/>
            </div>
          </div>
          <span style="font-size:.8rem;color:var(--text-muted)">${patients.length} resultados</span>
        </div>
        ${patients.length === 0 ? '<div class="empty-state"><h3>Nenhum inadimplente encontrado</h3><p>Todos os pacientes estão em dia!</p></div>' : `
        <table class="data-table">
          <thead><tr>
            <th>Paciente</th><th>CPF</th><th>Telefone</th><th>Idade</th><th>Tags</th><th style="width:120px">Ações</th>
          </tr></thead>
          <tbody>
            ${patients.map(p => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:12px;cursor:pointer" onclick="location.hash='#/prontuario/${p.id}'">
                    <div class="patient-avatar">${getInitials(p.name)}</div>
                    <div><div style="font-weight:600">${p.name}</div>
                    <div style="font-size:.72rem;color:var(--text-muted)">${p.email||''}</div></div>
                  </div>
                </td>
                <td style="font-size:.82rem">${formatCPF(p.cpf)}</td>
                <td style="font-size:.82rem">${formatPhone(p.phone)}</td>
                <td>${p.birth ? getAge(p.birth) + ' anos' : '-'}</td>
                <td>${(p.tags||[]).map(t=>`<span style="background:var(--primary-bg);color:var(--primary);padding:2px 8px;border-radius:10px;font-size:.7rem;font-weight:600;margin-right:4px">${t}</span>`).join('')}</td>
                <td>
                  <div class="action-cell">
                    <button title="Ver prontuário" onclick="location.hash='#/prontuario/${p.id}'">${icon('eye',16)}</button>
                    <button title="Editar" data-edit="${p.id}">${icon('edit',16)}</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
      </div>
    `;

    // Event listeners
    document.getElementById('defaulterSearch')?.addEventListener('input', debounce(e => { searchTerm = e.target.value.toLowerCase(); render(); }, 250));
    container.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const p = getPatients().find(x => x.id === b.dataset.edit);
      if (p) openPatientForm(p);
    }));
  }
  render();
}
