import { icon } from '../utils/icons.js';
import { getPatients, getCurrentUser, setCurrentUser, flushSync } from '../modules/store.js';
import { navigate } from '../modules/router.js';
import { debounce } from '../utils/helpers.js';

export function renderHeader() {
  const header = document.getElementById('top-header');
  const currentUser = getCurrentUser();
  const currentAvatar = currentUser.substring(0, 1).toUpperCase();

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
        <span class="notif-dot"></span>
      </button>
      <div class="header-user">
        <div class="header-user-avatar">${currentAvatar}</div>
        <div class="header-user-info">
          <span class="header-user-name" id="current-user-name">${currentUser}</span>
          <span class="header-user-role">HS Corp</span>
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

  // Profile Switcher (Animated Dropdown)
  const headerRight = header.querySelector('.header-right');
  const headerUser = header.querySelector('.header-user');
  
  const targetUser = currentUser === 'Administrador' ? 'Recepção' : 'Administrador';
  const targetAvatar = targetUser.substring(0, 1).toUpperCase();
  
  // Inject the dropdown HTML right after the user button
  const dropdownHTML = `
    <div class="profile-dropdown" id="profileDropdown">
      <div class="profile-dropdown-current">
        <div class="profile-avatar-large">${currentAvatar}</div>
        <h3>${currentUser}</h3>
        <p>clinica@hscorp.com</p>
      </div>
      <div class="profile-dropdown-list">
        <div class="profile-switch-item" id="switchProfileBtn">
          <div class="profile-avatar-small">${targetAvatar}</div>
          <div class="profile-switch-item-text">Alternar para ${targetUser}</div>
        </div>
      </div>
      
      <!-- Password Overlay -->
      <div class="profile-pwd-overlay" id="profilePwdOverlay">
        <button class="profile-pwd-back" id="pwdBackBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Voltar
        </button>
        <div style="text-align:center; margin-bottom: 20px;">
          <div class="profile-avatar-large" style="width:48px;height:48px;font-size:1.2rem;margin-bottom:8px;">${targetAvatar}</div>
          <h4 style="font-size: 1rem; font-weight: 600;">${targetUser}</h4>
        </div>
        <div class="form-group">
          <input type="password" id="switcher-pwd" class="input" placeholder="Digite a senha..." />
        </div>
        <button class="btn btn-primary" id="btn-confirm-switch" style="width:100%; justify-content:center;">Entrar</button>
      </div>
    </div>
  `;
  
  // Create wrapper to hold the absolute dropdown relative to the user area
  const userWrapper = document.createElement('div');
  userWrapper.style.position = 'relative';
  
  // Move headerUser inside userWrapper
  headerUser.parentNode.insertBefore(userWrapper, headerUser);
  userWrapper.appendChild(headerUser);
  
  // Append dropdown
  userWrapper.insertAdjacentHTML('beforeend', dropdownHTML);
  
  const dropdown = document.getElementById('profileDropdown');
  const switchProfileBtn = document.getElementById('switchProfileBtn');
  const pwdOverlay = document.getElementById('profilePwdOverlay');
  const pwdBackBtn = document.getElementById('pwdBackBtn');
  const switcherPwd = document.getElementById('switcher-pwd');
  const btnConfirmSwitch = document.getElementById('btn-confirm-switch');
  
  // Toggle dropdown on user click
  headerUser.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
    if (!dropdown.classList.contains('open')) {
      // Reset overlay when closing
      setTimeout(() => {
        pwdOverlay.classList.remove('active');
        switcherPwd.value = '';
      }, 300);
    }
  });
  
  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!userWrapper.contains(e.target) && dropdown.classList.contains('open')) {
      dropdown.classList.remove('open');
      setTimeout(() => {
        pwdOverlay.classList.remove('active');
        switcherPwd.value = '';
      }, 300);
    }
  });
  
  // Open password overlay
  switchProfileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pwdOverlay.classList.add('active');
    setTimeout(() => switcherPwd.focus(), 300);
  });
  
  // Back button in overlay
  pwdBackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pwdOverlay.classList.remove('active');
    switcherPwd.value = '';
  });
  
  // Confirm password
  const confirmSwitch = async () => {
    if (switcherPwd.value === '123') {
      setCurrentUser(targetUser);
      // Aguarda a sincronização imediata antes de recarregar
      // para garantir que dados recentes cheguem ao Supabase
      btnConfirmSwitch.disabled = true;
      btnConfirmSwitch.textContent = 'Sincronizando...';
      await flushSync();
      window.location.reload();
    } else {
      alert('Senha incorreta!');
      switcherPwd.focus();
    }
  };
  
  btnConfirmSwitch.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmSwitch();
  });
  
  switcherPwd.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') confirmSwitch();
  });
}
