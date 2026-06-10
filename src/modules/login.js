import { getUsers, setLoggedUser, addLog, getData } from './store.js';
import { toast } from '../components/toast.js';
import { hashPassword } from '../utils/helpers.js';

export function renderLogin(onLoginSuccess) {
  const app = document.getElementById('app');
  const sidebar = document.getElementById('sidebar');
  const header = document.getElementById('top-header');
  const pageContent = document.getElementById('page-content');

  // Esconde layout principal
  if (sidebar) sidebar.style.display = 'none';
  if (header) header.style.display = 'none';
  if (pageContent) pageContent.style.display = 'none';

  // Cria container de login
  let loginRoot = document.getElementById('login-root');
  if (!loginRoot) {
    loginRoot = document.createElement('div');
    loginRoot.id = 'login-root';
    app.parentNode.insertBefore(loginRoot, app);
  }

  const users = getUsers();

  loginRoot.innerHTML = `
    <div class="login-screen">
      <div class="login-bg-orbs">
        <div class="login-orb login-orb-1"></div>
        <div class="login-orb login-orb-2"></div>
        <div class="login-orb login-orb-3"></div>
      </div>
      
      <div class="login-card">
        <div class="login-logo">
          <svg viewBox="0 0 50 50" width="50" height="50">
            <defs><linearGradient id="login-lg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#6366f1"/>
              <stop offset="100%" style="stop-color:#4A90E2"/>
            </linearGradient></defs>
            <rect width="50" height="50" rx="14" fill="url(#login-lg)"/>
            <text x="25" y="33" font-family="Inter,sans-serif" font-weight="800" font-size="20" fill="white" text-anchor="middle">HS</text>
          </svg>
        </div>
        <h1 class="login-title">HS Corp</h1>
        <p class="login-subtitle">Sistema de Gestão Odontológica</p>
        
        <div class="login-form">
          <div class="login-field">
            <label for="loginUser">Usuário</label>
            <select id="loginUser" class="login-input">
              <option value="">Selecione seu usuário...</option>
              ${users.map(u => `<option value="${u.id}">${u.name} ${u.role === 'admin' ? '(Admin)' : u.role === 'recepcao' ? '(Recepção)' : '(Dentista)'}</option>`).join('')}
            </select>
          </div>
          
          <div class="login-field">
            <label for="loginPassword">Senha</label>
            <div class="login-password-wrap">
              <input type="password" id="loginPassword" class="login-input" placeholder="Digite sua senha..." />
              <button type="button" id="togglePwdBtn" class="login-toggle-pwd" title="Mostrar senha">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </div>
          
          <button class="login-btn" id="loginBtn">
            <span>Entrar</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        
        <p class="login-footer-text">© ${new Date().getFullYear()} HS Corp · Gestão Odontológica</p>
      </div>
    </div>
  `;

  // Toggle password visibility
  const toggleBtn = document.getElementById('togglePwdBtn');
  const pwdInput = document.getElementById('loginPassword');
  toggleBtn.addEventListener('click', () => {
    pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
  });

  // Enter key
  pwdInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') doLogin();
  });

  // Login
  document.getElementById('loginBtn').addEventListener('click', doLogin);

  async function doLogin() {
    const userId = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPassword').value;

    if (!userId) {
      toast.error('Selecione um usuário');
      return;
    }
    if (!password) {
      toast.error('Digite sua senha');
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      toast.error('Usuário não encontrado');
      return;
    }

    const hashedInput = await hashPassword(password);

    if (user.password !== password && user.password !== hashedInput) {
      toast.error('Senha incorreta!');
      document.getElementById('loginPassword').value = '';
      document.getElementById('loginPassword').focus();
      return;
    }

    // Login bem-sucedido
    setLoggedUser(user);
    addLog('login', 'user', user.id, `${user.name} fez login no sistema`);

    // Se for dentista, seta o portal
    if (user.role === 'dentista') {
      const dentists = (getData()?.settings?.dentists || []);
      const linkedDentist = dentists.find(d => d.id === user.dentistId);
      if (linkedDentist) {
        sessionStorage.setItem('dentist_portal_user', linkedDentist.name);
      }
    }

    // Remove tela de login
    loginRoot.remove();
    
    // Mostra layout principal
    if (sidebar) sidebar.style.display = '';
    if (header) header.style.display = '';
    if (pageContent) pageContent.style.display = '';

    toast.success(`Bem-vindo(a), ${user.name}!`);
    onLoginSuccess(user);
  }
}
