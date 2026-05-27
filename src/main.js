import './styles/index.css';
import { initStore, getLoggedUser, getData } from './modules/store.js';
import { registerRoute, initRouter, navigate } from './modules/router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { initToast } from './components/toast.js';
import { initModal } from './components/modal.js';
import { renderDashboard } from './modules/dashboard.js';
import { renderAttendances } from './modules/attendances.js';
import { renderPatients } from './modules/patients.js';
import { renderPatientRecord } from './modules/patient-record.js';
import { renderScheduling } from './modules/scheduling.js';
import { renderFinancial } from './modules/financial.js';
import { renderInventory } from './modules/inventory.js';
import { renderReports } from './modules/reports.js';
import { renderSettings } from './modules/settings.js';
import { renderWhatsapp } from './modules/whatsapp.js';
import { renderDentists } from './modules/dentists.js';
import { renderDentistProfile } from './modules/dentist-profile.js';
import { renderDentistPortal } from './modules/dentist-portal.js';
import { renderDentistPatientRecord } from './modules/dentist-patient-record.js';
import { renderDentistInventory } from './modules/dentist-inventory.js';
import { renderLogin } from './modules/login.js';
import { renderDefaulters } from './modules/defaulters.js';

// Initialize (async porque initStore pode restaurar dados do servidor)
async function bootstrap() {
  await initStore();
  initToast();
  initModal();

  // Expõe dados para uso interno (login.js precisa)
  window.__hsData = getData();

  // Verifica se há usuário logado
  const loggedUser = getLoggedUser();

  if (!loggedUser) {
    // Mostra tela de login
    renderLogin((user) => {
      startApp(user);
    });
    return;
  }

  startApp(loggedUser);
}

function startApp(user) {
  // Render layout
  renderSidebar();
  renderHeader();

  // Register routes
  registerRoute('/', renderDashboard);
  registerRoute('/atendimentos', renderAttendances);
  registerRoute('/pacientes', renderPatients);
  registerRoute('/prontuario', (container, id) => renderPatientRecord(container, id));
  registerRoute('/inadimplentes', renderDefaulters);
  registerRoute('/agenda', renderScheduling);
  registerRoute('/financeiro', renderFinancial);
  registerRoute('/estoque', renderInventory);
  registerRoute('/relatorios', renderReports);
  registerRoute('/configuracoes', renderSettings);
  registerRoute('/whatsapp', renderWhatsapp);
  registerRoute('/dentistas', renderDentists);
  registerRoute('/dentista', (container, id) => renderDentistProfile(container, id));
  registerRoute('/portal', renderDentistPortal);
  registerRoute('/prontuario-dentista', (container, id) => renderDentistPatientRecord(container, id));
  registerRoute('/estoque-dentista', renderDentistInventory);

  // Start router
  initRouter();

  // Se for dentista, redireciona ao portal
  if (user.role === 'dentista') {
    navigate('/portal');
  }

  // Notification check for upcoming appointments
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

bootstrap();
