import { icon } from '../utils/icons.js';
import { getPatients, getLoggedUser, logoutUser, addLog, getInventoryNotifications } from '../modules/store.js';
import { navigate } from '../modules/router.js';
import { debounce } from '../utils/helpers.js';

export function renderHeader() {
  const header = document.getElementById('top-header');
  const loggedUser = getLoggedUser();
  const userName = loggedUser?.name || 'Usuário';
  const userRole = loggedUser?.role === 'admin' ? 'Administrador' : loggedUser?.role === 'recepcao' ? 'Recepção' : 'Dentista';
  const currentAvatar = userName.substring(0, 1).toUpperCase();
  
  // Conta notificações de estoque pendentes
  const pendingNotifs = getInventoryNotifications().filter(n => n.status === 'pending').length;

  header.innerHTML = `
    <div class="header-left">
      <button class="header-btn mobile-menu-btn" id="mobileMenuBtn" style="display:none">${icon('menu')}</button>
      <div class="header-search">
        ${icon('search',18)}
        <input type="text" id="globalSearch" placeholder="Buscar pacientes, procedimentos..." autocomplete="off"/>
        <div class="search-results" id="searchResults"></div>
      </div>
    </div>
    <div class="header-right">
      <button class="header-btn" id="notifBtn" title="Notificações">
        ${icon('bell')}
        ${pendingNotifs > 0 ? `<span class="notif-dot">${pendingNotifs}</span>` : ''}
      </button>
      <div class="header-user" style="position:relative;">
        <div class="header-user-avatar">${currentAvatar}</div>
        <div class="header-user-info">
          <span class="header-user-name" id="current-user-name">${userName}</span>
          <span class="header-user-role">${userRole}</span>
        </div>
        
        <div class="profile-dropdown" id="profileDropdown">
          <div class="profile-dropdown-current">
            <div class="profile-avatar-large">${currentAvatar}</div>
            <h3>${userName}</h3>
            <p>${userRole}</p>
          </div>
          <div class="profile-dropdown-list">
            <div class="profile-switch-item" id="logoutBtn">
              <div class="profile-avatar-small" style="background:var(--accent-danger);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </div>
              <div class="profile-switch-item-text">Sair do Sistema</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Search
  const searchInput = document.getElementById('globalSearch');
  const searchResults = document.getElementById('searchResults');
  
  searchInput.addEventListener('input', debounce((e) => {
    const q = e.target.value.toLowerCase().trim();
    if (q.length < 2) { searchResults.classList.remove('visible'); return; }
    const patients = getPatients().filter(p => p.name.toLowerCase().includes(q) || (p.cpf && p.cpf.includes(q)));
    if (patients.length === 0) {
      searchResults.innerHTML = '<div class="search-result-item" style="color:var(--text-muted)">Nenhum resultado encontrado</div>';
    } else {
      searchResults.innerHTML = patients.slice(0, 8).map(p => `
        <div class="search-result-item" data-id="${p.id}">
          <div class="patient-avatar" style="width:32px;height:32px;font-size:.7rem">${p.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
          <div><div style="font-weight:600;font-size:.82rem">${p.name}</div>
          <div style="font-size:.7rem;color:var(--text-muted)">${p.phone||''}</div></div>
        </div>
      `).join('');
    }
    searchResults.classList.add('visible');
  }, 200));

  searchResults.addEventListener('click', e => {
    const item = e.target.closest('.search-result-item');
    if (item && item.dataset.id) {
      navigate('/prontuario/' + item.dataset.id);
      searchResults.classList.remove('visible');
      searchInput.value = '';
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.header-search')) searchResults.classList.remove('visible');
  });

  // Mobile menu
  const menuBtn = document.getElementById('mobileMenuBtn');
  if (window.innerWidth <= 768) menuBtn.style.display = 'flex';
  menuBtn.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Profile dropdown toggle
  const headerUser = header.querySelector('.header-user');
  const dropdown = document.getElementById('profileDropdown');
  
  headerUser.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!headerUser.contains(e.target) && dropdown.classList.contains('open')) {
      dropdown.classList.remove('open');
    }
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    addLog('logout', 'user', loggedUser?.id, `${userName} saiu do sistema`);
    logoutUser();
    window.location.hash = '#/';
    window.location.reload();
  });
}
