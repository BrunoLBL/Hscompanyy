import { icon } from '../utils/icons.js';
import { formatDate, formatPhone, formatCPF, getInitials, getAge, debounce, generateId, escapeHTML } from '../utils/helpers.js';
import { getPatients, savePatient, deletePatient } from '../modules/store.js';
import { navigate } from '../modules/router.js';
import { openModal, closeAllModals } from '../components/modal.js';
import { toast } from '../components/toast.js';

export function renderPatients(container) {
  let searchTerm = '';
  let statusFilter = 'all';
  
  function render() {
    let patients = getPatients();
    if (searchTerm) patients = patients.filter(p => p.name.toLowerCase().includes(searchTerm) || (p.cpf && p.cpf.includes(searchTerm)));
    if (statusFilter !== 'all') patients = patients.filter(p => p.status === statusFilter);
    patients.sort((a, b) => a.name.localeCompare(b.name));

    container.innerHTML = `
      <div class="page-title-bar">
        <div><h2>Pacientes</h2><p>${getPatients().length} pacientes cadastrados</p></div>
        <button class="btn btn-primary" id="addPatientBtn">${icon('plus',16)} Novo Paciente</button>
      </div>
      <div class="card">
        <div class="list-header">
          <div class="filter-group">
            <div class="header-search" style="position:relative">
              ${icon('search',16)}
              <input type="text" id="patientSearch" placeholder="Buscar por nome ou CPF..." value="${searchTerm}" style="width:260px"/>
            </div>
            <select id="statusFilter">
              <option value="all" ${statusFilter==='all'?'selected':''}>Todos</option>
              <option value="active" ${statusFilter==='active'?'selected':''}>Ativos</option>
              <option value="inactive" ${statusFilter==='inactive'?'selected':''}>Inativos</option>
            </select>
          </div>
          <span style="font-size:.8rem;color:var(--text-muted)">${patients.length} resultados</span>
        </div>
        ${patients.length === 0 ? '<div class="empty-state"><h3>Nenhum paciente encontrado</h3><p>Cadastre um novo paciente para começar</p></div>' : `
        <table class="data-table">
          <thead><tr>
            <th>Paciente</th><th>CPF</th><th>Telefone</th><th>Idade</th><th>Status</th><th>Tags</th><th style="width:120px">Ações</th>
          </tr></thead>
          <tbody>
            ${patients.map(p => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:12px;cursor:pointer" onclick="location.hash='#/prontuario/${p.id}'">
                    <div class="patient-avatar">${getInitials(p.name)}</div>
                    <div><div style="font-weight:600">${escapeHTML(p.name)}</div>
                    <div style="font-size:.72rem;color:var(--text-muted)">${escapeHTML(p.email||'')}</div></div>
                  </div>
                </td>
                <td style="font-size:.82rem">${formatCPF(p.cpf)}</td>
                <td style="font-size:.82rem">${formatPhone(p.phone)}</td>
                <td>${p.birth ? getAge(p.birth) + ' anos' : '-'}</td>
                <td><span class="status-badge status-${p.status}">${p.status==='active'?'Ativo':'Inativo'}</span></td>
                <td>${(p.tags||[]).map(t=>`<span style="background:var(--primary-bg);color:var(--primary);padding:2px 8px;border-radius:10px;font-size:.7rem;font-weight:600;margin-right:4px">${escapeHTML(t)}</span>`).join('')}</td>
                <td>
                  <div class="action-cell">
                    <button title="Ver prontuário" onclick="location.hash='#/prontuario/${p.id}'">${icon('eye',16)}</button>
                    <button title="Editar" data-edit="${p.id}">${icon('edit',16)}</button>
                    <button title="Excluir" data-delete="${p.id}">${icon('trash',16)}</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
      </div>
    `;

    // Event listeners
    document.getElementById('addPatientBtn')?.addEventListener('click', () => openPatientForm());
    document.getElementById('patientSearch')?.addEventListener('input', debounce(e => { searchTerm = e.target.value.toLowerCase(); render(); }, 250));
    document.getElementById('statusFilter')?.addEventListener('change', e => { statusFilter = e.target.value; render(); });
    container.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const p = getPatients().find(x => x.id === b.dataset.edit);
      if (p) openPatientForm(p);
    }));
    container.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm('Deseja realmente excluir este paciente?')) {
        deletePatient(b.dataset.delete);
        toast.success('Paciente excluído com sucesso');
        render();
      }
    }));
  }
  render();
}

export function openPatientForm(patient = null) {
  const isEdit = !!patient;
  const p = patient || { name:'',cpf:'',phone:'',email:'',birth:'',gender:'',address:'',status:'active',tags:[],notes:'',isDefaulter:null };
  
  const modal = openModal({
    title: isEdit ? 'Editar Paciente' : 'Novo Paciente',
    size: 'lg',
    content: `
      <div class="form-row">
        <div class="form-group"><label>Nome Completo *</label><input type="text" id="pName" value="${escapeHTML(p.name)}" required/></div>
        <div class="form-group"><label>CPF</label><input type="text" id="pCpf" value="${p.cpf||''}" maxlength="14"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Telefone *</label><input type="text" id="pPhone" value="${p.phone||''}" /></div>
        <div class="form-group"><label>Email</label><input type="email" id="pEmail" value="${p.email||''}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Data de Nascimento</label><input type="date" id="pBirth" value="${p.birth||''}"/></div>
        <div class="form-group"><label>Gênero</label>
          <select id="pGender"><option value="">Selecione</option><option value="M" ${p.gender==='M'?'selected':''}>Masculino</option><option value="F" ${p.gender==='F'?'selected':''}>Feminino</option><option value="O" ${p.gender==='O'?'selected':''}>Outro</option></select>
        </div>
      </div>
      <div class="form-group"><label>Endereço</label><input type="text" id="pAddress" value="${escapeHTML(p.address||'')}"/></div>
      <div class="form-row">
        <div class="form-group"><label>Status</label>
          <select id="pStatus"><option value="active" ${p.status==='active'?'selected':''}>Ativo</option><option value="inactive" ${p.status==='inactive'?'selected':''}>Inativo</option></select>
        </div>
        <div class="form-group"><label>Inadimplente *</label>
          <select id="pDefaulter">
            <option value="">Selecione</option>
            <option value="true" ${p.isDefaulter===true?'selected':''}>Sim</option>
            <option value="false" ${p.isDefaulter===false?'selected':''}>Não</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Tags (separadas por vírgula) *</label><input type="text" id="pTags" value="${(p.tags||[]).join(', ')}" placeholder="Ex: CONVENIO, PARTICULAR"/></div>
      <div class="form-group"><label>Observações</label><textarea id="pNotes" rows="3">${escapeHTML(p.notes||'')}</textarea></div>
    `,
    footer: `<button class="btn btn-secondary" id="cancelPatient">Cancelar</button><button class="btn btn-primary" id="savePatient">${isEdit?'Salvar Alterações':'Cadastrar'}</button>`
  });

  modal.querySelector('#cancelPatient').onclick = () => closeAllModals();
  modal.querySelector('#savePatient').onclick = () => {
    const name = modal.querySelector('#pName').value.trim();
    if (!name) { toast.error('Nome é obrigatório'); return; }

    const defVal = modal.querySelector('#pDefaulter').value;
    if (!defVal) { toast.error('Selecione se o paciente é Inadimplente'); return; }
    const isDefaulter = defVal === 'true';

    const tagsInput = modal.querySelector('#pTags').value;
    const tagsArray = tagsInput.split(',').map(t=>t.trim().toUpperCase()).filter(Boolean);
    if (tagsArray.length === 0) { toast.error('É obrigatório adicionar pelo menos uma tag'); return; }

    const data = {
      ...p,
      name,
      cpf: modal.querySelector('#pCpf').value.replace(/\D/g,''),
      phone: modal.querySelector('#pPhone').value.replace(/\D/g,''),
      email: modal.querySelector('#pEmail').value.trim(),
      birth: modal.querySelector('#pBirth').value,
      gender: modal.querySelector('#pGender').value,
      address: modal.querySelector('#pAddress').value.trim(),
      status: modal.querySelector('#pStatus').value,
      tags: tagsArray,
      notes: modal.querySelector('#pNotes').value.trim(),
      isDefaulter
    };
    savePatient(data);
    closeAllModals();
    toast.success(isEdit ? 'Paciente atualizado!' : 'Paciente cadastrado!');
    
    if (isDefaulter) {
      navigate('/inadimplentes');
    } else {
      navigate('/pacientes');
    }
  };
}
