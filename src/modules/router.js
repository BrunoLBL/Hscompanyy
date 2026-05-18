const routes = {};
let currentRoute = null;

export function registerRoute(path, handler) { routes[path] = handler; }

export function navigate(path) {
  window.location.hash = path;
}

export function initRouter() {
  function handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const parts = hash.split('/').filter(Boolean);
    const path = '/' + (parts[0] || '');
    const params = parts.slice(1);
    
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === path);
    });
    
    const content = document.getElementById('page-content');
    if (!content) return;
    
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
}

export function getCurrentRoute() { return currentRoute; }
