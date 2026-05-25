import { getCurrentUser } from './store.js';
import { toast } from '../components/toast.js';

const routes = {};
let currentRoute = null;

export function registerRoute(path, handler) { routes[path] = handler; }

export function navigate(path) {
  window.location.hash = path;
}

export function initRouter() {
  function handleRoute() {
    let hash = window.location.hash.slice(1) || '/';
    let parts = hash.split('/').filter(Boolean);
    let path = '/' + (parts[0] || '');
    const params = parts.slice(1);
    
    // Guard restrict routes
    const currentUser = getCurrentUser();
    if (currentUser !== 'Administrador' && (path === '/financeiro' || path === '/relatorios')) {
      window.location.hash = '/';
      return;
    }
    
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === path);
    });
    
    const content = document.getElementById('page-content');
    if (!content) return;
    
    // Configurações de layout (Portal vs Sistema Padrão)
    const isPortal = path === '/portal';
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('top-header');
    const mainContent = document.getElementById('main-wrapper');
    const pageContent = document.getElementById('page-content');
    
    if (sidebar) sidebar.style.display = isPortal ? 'none' : 'flex';
    if (header) header.style.display = isPortal ? 'none' : 'flex';
    if (mainContent) {
      // Quando no celular, a sidebar já é position fixed, então não há margin-left por padrão na mídia
      // Mas para garantir que na web/desktop ocupe tudo:
      if (window.innerWidth > 1024) {
        mainContent.style.marginLeft = isPortal ? '0' : 'var(--sidebar-w)'; 
      }
    }
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

