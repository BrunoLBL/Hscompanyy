import { getLoggedUser } from './store.js';
import { toast } from '../components/toast.js';

const routes = {};
let currentRoute = null;

export function registerRoute(path, handler) { routes[path] = handler; }

export function navigate(path) {
  window.location.hash = path;
}

// Mapa de rota → permissão necessária
const routePermissions = {
  '/': 'dashboard',
  '/atendimentos': 'atendimentos',
  '/pacientes': 'pacientes',
  '/prontuario': 'pacientes',
  '/inadimplentes': 'pacientes',
  '/agenda': 'agenda',
  '/financeiro': 'financeiro',
  '/estoque': 'estoque',
  '/relatorios': 'relatorios',
  '/configuracoes': 'configuracoes',
  '/whatsapp': 'whatsapp',
  '/dentistas': 'dentistas',
  '/dentista': 'dentistas',
  '/portal': 'portal',
  '/prontuario-dentista': 'portal',
  '/estoque-dentista': 'portal'
};

// Rotas de portal (sem sidebar/header)
const portalRoutes = ['/portal', '/prontuario-dentista', '/estoque-dentista'];

export function initRouter() {
  function handleRoute() {
    let hash = window.location.hash.slice(1) || '/';
    let parts = hash.split('/').filter(Boolean);
    let path = '/' + (parts[0] || '');
    const params = parts.slice(1);
    
    // Guard de permissões
    const loggedUser = getLoggedUser();
    if (loggedUser) {
      const requiredPerm = routePermissions[path];
      if (requiredPerm && !loggedUser.permissions.includes(requiredPerm)) {
        // Dentista tentando acessar algo que não é portal
        if (loggedUser.role === 'dentista') {
          window.location.hash = '#/portal';
          return;
        }
        toast.error('Você não tem permissão para acessar esta página.');
        window.location.hash = '#/';
        return;
      }
    }
    
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === path);
    });
    
    const content = document.getElementById('page-content');
    if (!content) return;
    
    // Configurações de layout (Portal vs Sistema Padrão)
    const isPortal = portalRoutes.includes(path);
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('top-header');
    const pageContent = document.getElementById('page-content');
    
    if (sidebar) sidebar.style.display = isPortal ? 'none' : 'flex';
    if (header) header.style.display = isPortal ? 'none' : 'flex';
    if (pageContent) {
      pageContent.style.padding = isPortal ? '0' : '28px';
    }
    
    currentRoute = path;
    content.style.animation = 'none';
    content.offsetHeight; // trigger reflow
    content.style.animation = 'fadeIn .3s ease';
    
    if (routes[path]) {
      routes[path](content, ...params);
    } else if (routes['/']) {
      routes['/'](content);
    }
  }
  
  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // Re-renderiza a página quando dados são atualizados por outro usuário (Realtime)
  window.addEventListener('hscorp:data-updated', () => {
    console.log('🔄 Re-renderizando página (dados atualizados por outro usuário)');
    toast.info('📡 Dados atualizados por outro usuário');
    handleRoute();
  });
}

export function getCurrentRoute() { return currentRoute; }
