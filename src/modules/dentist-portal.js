import { getData, getAttendances, completeAttendanceProcess } from './store.js';
import { icon } from '../utils/icons.js';
import { toast } from '../components/toast.js';

let timerInterval = null;
let lastAttendanceIds = [];

// Som de notificação (Sino/Chime agradável)
function playNotification() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    
    // Acorde agradável (Ding!)
    const freqs = [523.25, 659.25, 1046.50]; 
    
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3 / freqs.length, t + 0.02); // Attack rápido
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5 + (i * 0.2)); // Decay suave
      
      osc.start(t);
      osc.stop(t + 2);
    });
  } catch(e) { console.warn('Áudio não suportado', e); }
}

export function renderDentistPortal(container) {
  const data = getData();
  const dentists = data.settings?.dentists || [];
  
  const loggedDentistName = sessionStorage.getItem('dentist_portal_user');

  // Limpa timer anterior se houver
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

  if (!loggedDentistName) {
    renderLogin(container, dentists);
  } else {
    renderPanel(container, loggedDentistName);
  }
}

function renderLogin(container, dentists) {
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg-lighter);padding:20px;">
      <div class="card" style="max-width:400px;width:100%;text-align:center;padding:40px 30px;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;background:var(--primary);color:#fff;border-radius:16px;margin-bottom:20px;">
          ${icon('activity', 32)}
        </div>
        <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:8px;">Portal do Dentista</h2>
        <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:30px;">
          Acompanhe e cronometre seus atendimentos.
        </p>
        
        <div class="form-group" style="text-align:left;margin-bottom:16px;">
          <label>Selecione seu perfil</label>
          <select id="portalDentistSelect" class="input">
            <option value="">Selecione...</option>
            ${dentists.map(d => `<option value="${d.name}">${d.name}</option>`).join('')}
          </select>
        </div>
        
        <div class="form-group" style="text-align:left;margin-bottom:24px;">
          <label>Senha de Acesso</label>
          <input type="password" id="portalPassword" class="input" placeholder="Digite a senha (123)" />
        </div>
        
        <button class="btn btn-primary" id="portalLoginBtn" style="width:100%;padding:12px;font-size:1rem;">Entrar no Portal</button>
      </div>
    </div>
  `;

  document.getElementById('portalLoginBtn').onclick = () => {
    const dentist = document.getElementById('portalDentistSelect').value;
    const pwd = document.getElementById('portalPassword').value;

    if (!dentist) { toast.error('Selecione seu perfil.'); return; }
    
    // Verifica senha individual do usuário
    const users = data.settings?.users || [];
    const user = users.find(u => u.name === dentist);
    const validPwd = user ? user.password : '123';
    if (pwd !== validPwd) { toast.error('Senha incorreta.'); return; }

    sessionStorage.setItem('dentist_portal_user', dentist);
    toast.success(`Bem-vindo(a), ${dentist}!`);
    renderDentistPortal(container);
  };
}

function renderPanel(container, dentistName) {
  // Ouve atualizações de dados apenas se estiver no portal
  const onDataUpdated = () => {
    if (window.location.hash.startsWith('#/portal')) {
      renderDentistPortal(container); // Re-renderiza quando algo muda (ex: recepção adicionou atendimento)
    } else {
      window.removeEventListener('hscorp:data-updated', onDataUpdated);
    }
  };
  window.addEventListener('hscorp:data-updated', onDataUpdated);

  const attendances = getAttendances().filter(a => a.dentist === dentistName);

  // Verifica se há novos atendimentos para tocar o som e notificar
  const currentIds = attendances.map(a => a.id);
  const hasNew = currentIds.some(id => !lastAttendanceIds.includes(id));
  if (hasNew && lastAttendanceIds.length > 0) {
    playNotification();
    toast.info('Novo atendimento recebido!');
  }
  lastAttendanceIds = currentIds;

  container.innerHTML = `
    <div style="min-height:100vh;background:var(--bg);display:flex;flex-direction:column;">
      <!-- Header do Portal -->
      <header style="background:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);box-shadow:0 2px 10px rgba(0,0,0,0.02);flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;background:var(--primary);color:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;">
            ${icon('activity', 20)}
          </div>
          <div>
            <h1 style="font-size:1.1rem;font-weight:700;margin:0;">Consultório</h1>
            <div style="font-size:0.8rem;color:var(--text-secondary);">Portal de Atendimento</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:0.9rem;">
            <div style="width:32px;height:32px;background:var(--bg-lighter);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;">
              ${dentistName.charAt(0)}
            </div>
            <span class="portal-dentist-name" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${dentistName}</span>
          </div>
          <a href="#/estoque-dentista" class="btn btn-secondary btn-sm">${icon('package', 14)} Estoque</a>
          <button class="btn btn-secondary btn-sm" id="portalLogoutBtn">${icon('logOut', 14)} Sair</button>
        </div>
      </header>

      <!-- Conteúdo Principal -->
      <main style="flex:1;padding:20px;max-width:1200px;margin:0 auto;width:100%;">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;">
          <div>
            <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:4px;">Meus Pacientes Aguardando</h2>
            <p style="color:var(--text-secondary);font-size:0.9rem;">Pacientes direcionados pela recepção aparecerão aqui.</p>
          </div>
        </div>

        ${attendances.length === 0 ? `
          <div style="text-align:center;padding:80px 20px;background:#fff;border-radius:16px;border:1px dashed var(--border);">
            <div style="color:var(--text-muted);margin-bottom:16px;">${icon('coffee', 48)}</div>
            <h3 style="font-size:1.2rem;font-weight:600;margin-bottom:8px;">Nenhum atendimento na fila</h3>
            <p style="color:var(--text-secondary);">Sua sala está livre. Aguardando a recepção enviar o próximo paciente.</p>
          </div>
        ` : `
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:20px;">
            ${attendances.map(a => `
              <div class="card" style="display:flex;flex-direction:column;border-left:4px solid var(--accent);box-shadow:0 4px 20px rgba(0,0,0,0.04);padding:20px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
                  <div>
                    <h3 style="font-size:1.3rem;font-weight:700;margin-bottom:4px;">${a.patientName}</h3>
                    <div style="color:var(--text-secondary);font-size:0.9rem;display:flex;align-items:center;gap:6px;">
                      ${icon('fileText', 14)} ${a.procedure}
                    </div>
                  </div>
                  <button class="btn btn-icon btn-secondary btn-sm open-prontuario" data-id="${a.patientId}" title="Abrir Prontuário">
                    ${icon('eye', 16)}
                  </button>
                </div>
                
                <div style="background:var(--bg-lighter);border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
                  <div style="font-size:0.8rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:4px;">Tempo Decorrido</div>
                  <div class="attendance-timer" data-start="${a.createdAt}" style="font-size:2.5rem;font-weight:800;font-variant-numeric:tabular-nums;color:var(--primary);line-height:1;">
                    00:00
                  </div>
                </div>

                <div style="margin-top:auto;">
                  <button class="btn btn-primary finish-attendance-btn" data-id="${a.id}" style="width:100%;padding:12px;font-size:1.1rem;">
                    ${icon('checkCircle', 18)} Terminar Atendimento
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </main>
    </div>
  `;

  document.getElementById('portalLogoutBtn').onclick = () => {
    sessionStorage.removeItem('dentist_portal_user');
    renderDentistPortal(container);
  };

  container.querySelectorAll('.open-prontuario').forEach(btn => {
    btn.onclick = (e) => {
      // Navega para o prontuário reduzido do dentista (sem acesso ao sistema completo)
      window.location.hash = '#/prontuario-dentista/' + e.currentTarget.dataset.id;
    };
  });

  container.querySelectorAll('.finish-attendance-btn').forEach(btn => {
    btn.onclick = (e) => {
      if (!confirm('Deseja realmente terminar este atendimento? Ele será finalizado no sistema inteiro.')) return;
      
      const id = e.currentTarget.dataset.id;
      const attendance = attendances.find(a => a.id === id);
      if (!attendance) return;

      // Calcula duração total em segundos
      const start = new Date(attendance.createdAt).getTime();
      const end = Date.now();
      const durationSeconds = Math.floor((end - start) / 1000);

      if (completeAttendanceProcess(id, durationSeconds)) {
        toast.success('Atendimento concluído com sucesso!');
        renderDentistPortal(container);
      }
    };
  });

  // Inicia o loop de atualização dos timers
  function updateTimers() {
    container.querySelectorAll('.attendance-timer').forEach(el => {
      const start = new Date(el.dataset.start).getTime();
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((now - start) / 1000));
      
      const mins = Math.floor(diffSecs / 60);
      const secs = diffSecs % 60;
      el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      
      // Muda cor se passar de 30 minutos
      if (mins >= 30) {
        el.style.color = 'var(--accent-danger)';
      }
    });
  }
  
  updateTimers();
  timerInterval = setInterval(updateTimers, 1000);
}
