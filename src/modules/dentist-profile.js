import { getData, getTreatments, getPatients } from './store.js';
import { icon } from '../utils/icons.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';

export function renderDentistProfile(container, id) {
  const data = getData();
  const dentist = (data.settings?.dentists || []).find(d => d.id === id);
  
  if (!dentist) {
    container.innerHTML = `<div class="card"><p>Dentista não encontrado.</p></div>`;
    return;
  }

  // Obter todos os tratamentos realizados por este dentista
  // Como os tratamentos guardam o nome do dentista (dentist), filtramos por ele.
  const allTreatments = data.treatments || [];
  const dentistTreatments = allTreatments.filter(t => t.dentist === dentist.name);
  
  // Para exibir o nome do paciente, podemos usar t.patientId se necessário,
  // mas o treatment não armazena patientName por padrão, então vamos buscar o paciente:
  const patients = data.patients || [];
  const getPatientName = (pId) => {
    const p = patients.find(x => x.id === pId);
    return p ? p.name : 'Desconhecido';
  };

  // KPIs
  const totalProcedures = dentistTreatments.length;
  const totalValue = dentistTreatments.reduce((sum, t) => sum + (Number(t.value) || 0), 0);
  const totalPaid = dentistTreatments.reduce((sum, t) => sum + (Number(t.paid) || 0), 0);

  // Média de Tempo
  const timedTreatments = dentistTreatments.filter(t => t.durationSeconds > 0);
  const avgSeconds = timedTreatments.length > 0 
    ? Math.round(timedTreatments.reduce((sum, t) => sum + t.durationSeconds, 0) / timedTreatments.length)
    : 0;
  const avgMins = Math.floor(avgSeconds / 60);
  const avgSecs = avgSeconds % 60;
  const avgTimeStr = timedTreatments.length > 0 
    ? `${String(avgMins).padStart(2, '0')}:${String(avgSecs).padStart(2, '0')} min` 
    : '--:--';

  const isFreelancer = dentist.type === 'freelancer';
  const typeLabel = isFreelancer ? 'Freelancer' : 'Fixo';
  const typeBg = isFreelancer ? 'var(--accent-warn)' : 'var(--accent-info)';

  // Ordenar tratamentos do mais recente pro mais antigo
  const sortedTreatments = [...dentistTreatments].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  const html = `
    <div class="page-title-bar" style="margin-bottom: 20px;">
      <div>
        <a href="#/dentistas" style="color:var(--primary);text-decoration:none;font-size:0.85rem;display:flex;align-items:center;gap:4px;margin-bottom:8px;">
          ${icon('arrowLeft', 14)} Voltar para Dentistas
        </a>
        <h2>Perfil do Dentista</h2>
        <p>Visão geral e produção de procedimentos</p>
      </div>
    </div>

    <div class="card" style="display:flex;align-items:center;gap:20px;margin-bottom:24px;padding:24px;">
      <div style="position:relative;width:90px;height:90px;border-radius:50%;background:var(--border);overflow:hidden;flex-shrink:0;">
        ${dentist.photo ? `<img src="${dentist.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--text-muted);font-weight:bold;font-size:2rem;">${dentist.name.charAt(0)}</div>`}
      </div>
      <div style="flex:1;">
        <h3 style="font-size:1.5rem;font-weight:700;color:var(--text);margin-bottom:8px;display:flex;align-items:center;gap:12px;">
          ${dentist.name}
          <span style="font-size:0.75rem;padding:4px 10px;border-radius:12px;background:${typeBg};color:#fff;font-weight:600;display:flex;align-items:center;gap:4px;">
            ${icon('star', 12)} ${typeLabel}
          </span>
        </h3>
        <p style="color:var(--text-secondary);font-size:0.9rem;">
          Controle financeiro de tratamentos vinculados a este profissional.
        </p>
      </div>
    </div>

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:20px;margin-bottom:24px;">
      <div class="card" style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;border-radius:var(--radius);background:rgba(59,130,246,0.1);color:#3b82f6;display:flex;align-items:center;justify-content:center;">
          ${icon('activity', 24)}
        </div>
        <div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:4px;">Total de Procedimentos</div>
          <div style="font-size:1.5rem;font-weight:700;color:var(--text);">${totalProcedures}</div>
        </div>
      </div>
      
      <div class="card" style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;border-radius:var(--radius);background:rgba(139,92,246,0.1);color:#8b5cf6;display:flex;align-items:center;justify-content:center;">
          ${icon('dollar', 24)}
        </div>
        <div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:4px;">Valor Total Produzido</div>
          <div style="font-size:1.5rem;font-weight:700;color:var(--text);">${formatCurrency(totalValue)}</div>
        </div>
      </div>

      <div class="card" style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;border-radius:var(--radius);background:rgba(16,185,129,0.1);color:#10b981;display:flex;align-items:center;justify-content:center;">
          ${icon('checkCircle', 24)}
        </div>
        <div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:4px;">Valor Total Recebido</div>
          <div style="font-size:1.5rem;font-weight:700;color:var(--text);">${formatCurrency(totalPaid)}</div>
        </div>
      </div>

      <div class="card" style="display:flex;align-items:center;gap:16px;">
        <div style="width:48px;height:48px;border-radius:var(--radius);background:rgba(245,158,11,0.1);color:#f59e0b;display:flex;align-items:center;justify-content:center;">
          ${icon('clock', 24)}
        </div>
        <div>
          <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:4px;">Tempo Médio de Atendimento</div>
          <div style="font-size:1.5rem;font-weight:700;color:var(--text);">${avgTimeStr}</div>
        </div>
      </div>
    </div>

    <!-- Tabela de Produção -->
    <div class="card">
      <h4 style="font-weight:600;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
        ${icon('list', 16)} Histórico de Produção
      </h4>
      
      <div style="overflow-x:auto;">
        <table class="data-table" style="width:100%;">
          <thead>
            <tr>
              <th>Data</th>
              <th>Paciente</th>
              <th>Procedimento</th>
              <th>Tempo</th>
              <th>Status</th>
              <th style="text-align:right;">Valor</th>
              <th style="text-align:right;">Pago</th>
            </tr>
          </thead>
          <tbody>
            ${sortedTreatments.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">
                  Nenhum procedimento registrado para este dentista.
                </td>
              </tr>
            ` : sortedTreatments.map(t => {
              
              let statusBadge = '';
              if(t.status === 'completed') statusBadge = `<span style="color:#10b981;background:rgba(16,185,129,0.1);padding:2px 8px;border-radius:12px;font-size:0.75rem;">Concluído</span>`;
              else if(t.status === 'cancelled') statusBadge = `<span style="color:#ef4444;background:rgba(239,68,68,0.1);padding:2px 8px;border-radius:12px;font-size:0.75rem;">Cancelado</span>`;
              else statusBadge = `<span style="color:#f59e0b;background:rgba(245,158,11,0.1);padding:2px 8px;border-radius:12px;font-size:0.75rem;">Em andamento</span>`;
              
              const tMins = Math.floor((t.durationSeconds||0)/60);
              const tSecs = (t.durationSeconds||0)%60;
              const timeFormatted = t.durationSeconds ? `${String(tMins).padStart(2,'0')}:${String(tSecs).padStart(2,'0')}` : '-';

              return `
              <tr>
                <td style="white-space:nowrap;">${formatDate(t.startDate)}</td>
                <td style="font-weight:500;">
                  <a href="#/prontuario/${t.patientId}" style="color:var(--text);text-decoration:none;">
                    ${getPatientName(t.patientId)}
                  </a>
                </td>
                <td>${t.procedure}</td>
                <td><span style="font-size:0.8rem;color:var(--text-muted);font-family:monospace;">${timeFormatted}</span></td>
                <td>${statusBadge}</td>
                <td style="text-align:right;font-weight:600;">${formatCurrency(t.value)}</td>
                <td style="text-align:right;color:#10b981;">${formatCurrency(t.paid)}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}
