import { getPatients } from './store.js';
import { icon } from '../utils/icons.js';
import { showToast } from '../components/toast.js';

export function renderWhatsapp() {
  const container = document.getElementById('page-content');
  const patients = getPatients();
  
  // Extrair tags únicas para o filtro
  const allTags = new Set();
  patients.forEach(p => {
    if (p.tags) p.tags.forEach(t => allTags.add(t));
  });

  container.innerHTML = `
    <div class="page-title-bar">
      <div>
        <h2>Disparo WhatsApp</h2>
        <p>Envie mensagens personalizadas em massa para seus pacientes</p>
      </div>
    </div>

    <div id="wa-connection-status" style="margin-bottom: 24px; padding: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); text-align: center;">
      <h3 style="margin-bottom: 8px;">Status do WhatsApp</h3>
      <div id="wa-status-text">Verificando conexão...</div>
      <img id="wa-qr-image" src="" alt="QR Code" style="display: none; margin: 16px auto; max-width: 200px;" />
      <button id="wa-refresh-btn" class="btn btn-secondary" style="margin-top: 12px; display: none;">Atualizar Status</button>
    </div>

    <div class="charts-grid" style="grid-template-columns: 1fr 350px;">
      <!-- Lado Esquerdo: Filtros e Lista -->
      <div class="card">
        <h3 style="margin-bottom: 16px; font-size: 1.1rem; font-weight: 700;">Selecionar Pacientes</h3>
        
        <div class="list-header" style="background: var(--bg); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
          <div class="filter-group" style="flex: 1;">
            <div style="position: relative; width: 100%;">
              <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">${icon('search', 16)}</span>
              <input type="text" id="wa-search" placeholder="Buscar por nome..." style="width: 100%; padding-left: 32px;">
            </div>
          </div>
          <div class="filter-group">
            <select id="wa-status">
              <option value="all">Todos os Status</option>
              <option value="active" selected>Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <select id="wa-tag">
              <option value="all">Todas as Tags</option>
              ${Array.from(allTags).map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm);">
          <table class="data-table">
            <thead style="position: sticky; top: 0; z-index: 10;">
              <tr>
                <th style="width: 40px; text-align: center;">
                  <input type="checkbox" id="wa-select-all" style="cursor: pointer;">
                </th>
                <th>Paciente</th>
                <th>Telefone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="wa-patient-list">
              <!-- Renderizado via JS -->
            </tbody>
          </table>
        </div>
        <div style="margin-top: 12px; font-size: 0.85rem; color: var(--text-secondary);">
          <span id="wa-selected-count">0</span> pacientes selecionados de <span id="wa-total-filtered">0</span> filtrados.
        </div>
      </div>

      <!-- Lado Direito: Editor de Mensagem e Disparo -->
      <div class="card" style="display: flex; flex-direction: column;">
        <h3 style="margin-bottom: 16px; font-size: 1.1rem; font-weight: 700;">Mensagem</h3>
        
        <div class="form-group" style="flex: 1; display: flex; flex-direction: column;">
          <label>Texto da Mensagem</label>
          <textarea id="wa-message" style="flex: 1; min-height: 200px; resize: none; font-family: var(--font);" placeholder="Olá [nome], gostaríamos de lembrar..."></textarea>
          <div style="margin-top: 8px; font-size: 0.75rem; color: var(--text-muted);">
            <strong>Variáveis disponíveis:</strong><br>
            <code style="background: var(--bg); padding: 2px 4px; border-radius: 4px;">[nome]</code> - Nome completo do paciente<br>
            <code style="background: var(--bg); padding: 2px 4px; border-radius: 4px;">[primeiro_nome]</code> - Apenas o primeiro nome
          </div>
        </div>

        <div style="margin-top: auto; padding-top: 20px; border-top: 1px solid var(--border);">
          <div id="wa-progress-container" style="display: none; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 6px;">
              <span>Progresso de Envio</span>
              <span id="wa-progress-text">0 / 0</span>
            </div>
            <div style="height: 6px; background: var(--border); border-radius: 3px; overflow: hidden;">
              <div id="wa-progress-bar" style="height: 100%; width: 0%; background: var(--accent); transition: width 0.3s ease;"></div>
            </div>
          </div>
          <button id="btn-wa-send" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 12px; font-size: 1rem;">
            ${icon('messageCircle')} Disparar Mensagens
          </button>
        </div>
      </div>
    </div>
  `;

  // Elementos
  const listEl = document.getElementById('wa-patient-list');
  const searchInput = document.getElementById('wa-search');
  const statusSelect = document.getElementById('wa-status');
  const tagSelect = document.getElementById('wa-tag');
  const selectAllCb = document.getElementById('wa-select-all');
  const selectedCountEl = document.getElementById('wa-selected-count');
  const totalFilteredEl = document.getElementById('wa-total-filtered');
  const btnSend = document.getElementById('btn-wa-send');
  const messageInput = document.getElementById('wa-message');
  
  // Elementos de status
  const statusText = document.getElementById('wa-status-text');
  const qrImage = document.getElementById('wa-qr-image');
  const refreshBtn = document.getElementById('wa-refresh-btn');
  
  let filteredPatients = [];
  let selectedIds = new Set();
  
  async function checkServerStatus() {
    if (!document.getElementById('wa-status-text')) {
      return; 
    }
    
    try {
      const res = await fetch('http://localhost:3001/api/whatsapp/status');
      const data = await res.json();
      
      const statusText = document.getElementById('wa-status-text');
      const qrImage = document.getElementById('wa-qr-image');
      
      if (data.ready) {
        statusText.innerHTML = '<span style="color: var(--accent-success); font-weight: bold;">✅ Conectado e Pronto!</span>';
        qrImage.style.display = 'none';
        btnSend.disabled = false;
        btnSend.style.opacity = '1';
      } else if (data.qr) {
        statusText.innerHTML = '<span style="color: var(--accent-warn); font-weight: bold;">Aguardando leitura do QR Code</span>';
        qrImage.src = data.qr;
        qrImage.style.display = 'block';
        btnSend.disabled = true;
        btnSend.style.opacity = '0.5';
      } else {
        statusText.innerHTML = '<span>Inicializando sessão do WhatsApp, aguarde...</span>';
        qrImage.style.display = 'none';
        btnSend.disabled = true;
        btnSend.style.opacity = '0.5';
      }
    } catch (err) {
      const statusText = document.getElementById('wa-status-text');
      const qrImage = document.getElementById('wa-qr-image');
      if (statusText) {
        statusText.innerHTML = '<span style="color: var(--accent-danger); font-weight: bold;">❌ Erro ao conectar. O servidor (npm run server) está rodando?</span>';
        qrImage.style.display = 'none';
        btnSend.disabled = true;
        btnSend.style.opacity = '0.5';
      }
    }
  }

  // Atualizar manualmente e tbm por polling
  refreshBtn.addEventListener('click', checkServerStatus);
  let pollInterval = setInterval(checkServerStatus, 3000);
  checkServerStatus();

  const observer = new MutationObserver((mutations) => {
    if (!document.body.contains(btnSend)) {
      clearInterval(pollInterval);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  function formatPhone(phone) {
    if (!phone) return '-';
    let p = phone.replace(/\D/g, '');
    if (p.length === 11) return `(${p.substring(0,2)}) ${p.substring(2,7)}-${p.substring(7,11)}`;
    return phone;
  }

  function filterAndRender() {
    const term = searchInput.value.toLowerCase();
    const status = statusSelect.value;
    const tag = tagSelect.value;
    
    filteredPatients = patients.filter(p => {
      const matchName = p.name.toLowerCase().includes(term);
      const matchStatus = status === 'all' || p.status === status;
      const matchTag = tag === 'all' || (p.tags && p.tags.includes(tag));
      return matchName && matchStatus && matchTag;
    });
    
    totalFilteredEl.textContent = filteredPatients.length;
    
    const filteredIds = new Set(filteredPatients.map(p => p.id));
    for (let id of selectedIds) {
      if (!filteredIds.has(id)) selectedIds.delete(id);
    }
    updateSelectedCount();
    
    listEl.innerHTML = filteredPatients.length === 0 
      ? `<tr><td colspan="4" class="empty-state">Nenhum paciente encontrado com estes filtros.</td></tr>`
      : filteredPatients.map(p => {
          const st = p.status === 'active' ? 'Ativo' : 'Inativo';
          const stCls = p.status === 'active' ? 'status-active' : 'status-inactive';
          return `
            <tr>
              <td style="text-align: center;">
                <input type="checkbox" class="wa-cb" data-id="${p.id}" ${selectedIds.has(p.id) ? 'checked' : ''} style="cursor: pointer;">
              </td>
              <td>
                <div style="font-weight: 600; color: var(--text);">${p.name}</div>
              </td>
              <td>${formatPhone(p.phone)}</td>
              <td><span class="status-badge ${stCls}">${st}</span></td>
            </tr>
          `;
        }).join('');
        
    document.querySelectorAll('.wa-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        updateSelectedCount();
      });
    });
    
    selectAllCb.checked = filteredPatients.length > 0 && selectedIds.size === filteredPatients.length;
  }

  function updateSelectedCount() {
    selectedCountEl.textContent = selectedIds.size;
    selectAllCb.checked = filteredPatients.length > 0 && selectedIds.size === filteredPatients.length;
  }

  searchInput.addEventListener('input', filterAndRender);
  statusSelect.addEventListener('change', filterAndRender);
  tagSelect.addEventListener('change', filterAndRender);
  
  selectAllCb.addEventListener('change', (e) => {
    if (e.target.checked) {
      filteredPatients.forEach(p => selectedIds.add(p.id));
    } else {
      selectedIds.clear();
    }
    filterAndRender();
  });

  btnSend.addEventListener('click', async () => {
    if (selectedIds.size === 0) {
      showToast('Selecione pelo menos um paciente para enviar.', 'error');
      return;
    }
    
    const baseMessage = messageInput.value.trim();
    if (!baseMessage) {
      showToast('Escreva uma mensagem antes de disparar.', 'error');
      return;
    }

    const targetPatients = filteredPatients.filter(p => selectedIds.has(p.id) && p.phone);
    if (targetPatients.length === 0) {
      showToast('Nenhum paciente selecionado possui telefone cadastrado.', 'error');
      return;
    }

    if (!confirm(`Você está prestes a enviar ${targetPatients.length} mensagens em segundo plano pelo servidor local. Deseja continuar?`)) {
      return;
    }

    btnSend.disabled = true;
    btnSend.style.opacity = '0.7';

    const messages = targetPatients.map(p => {
      let msg = baseMessage;
      const firstName = p.name.split(' ')[0];
      msg = msg.replace(/\[nome\]/g, p.name);
      msg = msg.replace(/\[primeiro_nome\]/g, firstName);
      
      let phoneNum = p.phone.replace(/\D/g, '');
      if (phoneNum.length === 10 || phoneNum.length === 11) {
        phoneNum = '55' + phoneNum;
      }
      return { phone: phoneNum, text: msg };
    });

    try {
      const response = await fetch('http://localhost:3001/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      const data = await response.json();
      
      if (!response.ok) {
        showToast(data.error || 'Erro ao enviar requisição.', 'error');
        btnSend.disabled = false;
        btnSend.style.opacity = '1';
        return;
      }

      showToast('Envio automático iniciado no servidor!', 'success');
      
      const progressContainer = document.getElementById('wa-progress-container');
      const progressBar = document.getElementById('wa-progress-bar');
      const progressText = document.getElementById('wa-progress-text');
      
      progressContainer.style.display = 'block';
      let currentProgress = 0;
      const total = targetPatients.length;
      
      const interval = setInterval(() => {
        currentProgress++;
        if (currentProgress > total) {
          clearInterval(interval);
          setTimeout(() => {
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
            btnSend.disabled = false;
            btnSend.style.opacity = '1';
          }, 2000);
          return;
        }
        progressText.textContent = `${currentProgress} / ${total}`;
        progressBar.style.width = `${(currentProgress / total) * 100}%`;
      }, 4000);

    } catch (err) {
      showToast('Erro ao contatar o servidor local.', 'error');
      btnSend.disabled = false;
      btnSend.style.opacity = '1';
    }
  });

  filterAndRender();
}
