import './styles/index.css';
import { initStore } from './modules/store.js';
import { registerRoute, initRouter } from './modules/router.js';
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

// Initialize
initStore();
initToast();
initModal();

// Render layout
renderSidebar();
renderHeader();

// Register routes
registerRoute('/', renderDashboard);
registerRoute('/atendimentos', renderAttendances);
registerRoute('/pacientes', renderPatients);
registerRoute('/prontuario', (container, id) => renderPatientRecord(container, id));
registerRoute('/agenda', renderScheduling);
registerRoute('/financeiro', renderFinancial);
registerRoute('/estoque', renderInventory);
registerRoute('/relatorios', renderReports);
registerRoute('/configuracoes', renderSettings);
registerRoute('/whatsapp', renderWhatsapp);

// Start router
initRouter();

// Notification check for upcoming appointments
function checkNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}
checkNotifications();
