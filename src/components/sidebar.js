import { icon } from '../utils/icons.js';
import { navigate } from '../modules/router.js';
import { getAppointments, getCurrentUser } from '../modules/store.js';
import { isToday } from '../utils/helpers.js';

export function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const todayAppts = getAppointments().filter(a => isToday(a.date) && a.status !== 'cancelled').length;
  
  const currentUser = getCurrentUser();
  const isAdmin = currentUser === 'Administrador';

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <svg viewBox="0 0 40 40" width="40" height="40">
        <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#4A90E2"/><stop offset="100%" style="stop-color:#1E6FD9"/>
        </linearGradient></defs>
        <rect width="40" height="40" rx="10" fill="url(#lg)"/>
        <text x="20" y="27" font-family="Inter,sans-serif" font-weight="800" font-size="17" fill="white" text-anchor="middle">HS</text>
      </svg>
      <h1>HS Corp<span>Gestão Odontológica</span></h1>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-section-title">Principal</div>
        <a class="nav-item" data-route="/" href="#/">${icon('dashboard')}<span>Dashboard</span></a>
        <a class="nav-item" data-route="/atendimentos" href="#/atendimentos">${icon('clock')}<span>Atendimentos</span></a>
        <a class="nav-item" data-route="/pacientes" href="#/pacientes">${icon('users')}<span>Pacientes</span></a>
        <a class="nav-item" data-route="/agenda" href="#/agenda">${icon('calendar')}<span>Agendamento</span>${todayAppts?`<span class="badge">${todayAppts}</span>`:''}</a>
        <a class="nav-item" data-route="/dentistas" href="#/dentistas">${icon('user')}<span>Dentistas</span></a>
      </div>
      <div class="nav-section">
        <div class="nav-section-title">Gestão</div>
        ${isAdmin ? `<a class="nav-item" data-route="/financeiro" href="#/financeiro">${icon('dollar')}<span>Financeiro</span></a>` : ''}
        <a class="nav-item" data-route="/estoque" href="#/estoque">${icon('package')}<span>Estoque</span></a>
        ${isAdmin ? `<a class="nav-item" data-route="/relatorios" href="#/relatorios">${icon('chart')}<span>Relatórios</span></a>` : ''}
        <a class="nav-item" data-route="/whatsapp" href="#/whatsapp">${icon('messageCircle')}<span>WhatsApp</span></a>
      </div>
      <div class="nav-section">
        <div class="nav-section-title">Sistema</div>
        <a class="nav-item" data-route="/configuracoes" href="#/configuracoes">${icon('settings')}<span>Configurações</span></a>
      </div>
    </nav>
  `;
}
