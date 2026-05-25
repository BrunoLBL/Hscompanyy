import { getData } from './store.js';
import { icon } from '../utils/icons.js';
import { navigate } from './router.js';

export function renderDentists(container) {
  const data = getData();
  const dentists = data.settings?.dentists || [];

  const html = `
    <div class="page-title-bar">
      <div>
        <h2>Dentistas</h2>
        <p>Profissionais parceiros e fixos da clínica</p>
      </div>
    </div>
    
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;">
      ${dentists.map(d => {
        const isFreelancer = d.type === 'freelancer';
        const typeLabel = isFreelancer ? 'Freelancer' : 'Fixo';
        const typeBg = isFreelancer ? 'var(--accent-warn)' : 'var(--accent-info)';
        
        return `
          <div class="card dentist-card" data-id="${d.id}" style="cursor:pointer; transition:transform 0.2s, box-shadow 0.2s; display:flex; flex-direction:column; align-items:center; text-align:center; padding:24px 16px;">
            <div style="position:relative;width:80px;height:80px;border-radius:50%;background:var(--border);overflow:hidden;margin-bottom:16px;">
              ${d.photo ? `<img src="${d.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--text-muted);font-weight:bold;font-size:1.5rem;">${d.name.charAt(0)}</div>`}
            </div>
            
            <h3 style="font-size:1.1rem;font-weight:600;margin-bottom:8px;color:var(--text);">${d.name}</h3>
            
            <span style="font-size:0.75rem;padding:4px 10px;border-radius:12px;background:${typeBg};color:#fff;font-weight:600;">
              ${typeLabel}
            </span>
            
            <div style="margin-top:16px; width:100%; border-top:1px solid var(--border); padding-top:16px;">
               <div style="font-size:0.85rem; color:var(--text-secondary); display:flex; align-items:center; justify-content:center; gap:6px;">
                  ${icon('chart', 14)} Ver Perfil e Produção
               </div>
            </div>
          </div>
        `;
      }).join('')}
      
      ${dentists.length === 0 ? `
        <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);border:1px dashed var(--border);border-radius:var(--radius);">
          ${icon('users', 40)}
          <p style="margin-top:16px;font-size:.9rem;">Nenhum dentista cadastrado.</p>
          <button class="btn btn-primary" style="margin-top:16px;" onclick="window.location.hash='#/configuracoes'">Ir para Configurações</button>
        </div>
      ` : ''}
    </div>
  `;

  container.innerHTML = html;

  // Add hover effects and click listeners
  const cards = container.querySelectorAll('.dentist-card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-2px)';
      card.style.boxShadow = '0 8px 16px rgba(0,0,0,0.06)';
      card.style.borderColor = 'var(--primary)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'none';
      card.style.boxShadow = 'none';
      card.style.borderColor = 'var(--border)';
    });
    
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      navigate(`/dentista/${id}`);
    });
  });
}
