import { icon } from '../utils/icons.js';
import { getPatients } from '../modules/store.js';
import { navigate } from '../modules/router.js';
import { debounce } from '../utils/helpers.js';

export function renderHeader() {
  const header = document.getElementById('top-header');
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
        <div class="header-user-avatar">HS</div>
        <div class="header-user-info">
          <span class="header-user-name">Administrador</span>
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
}
