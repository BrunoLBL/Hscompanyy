import { getPatients } from './store.js';
import { icon } from '../utils/icons.js';
import { showToast } from '../components/toast.js';

export function renderWhatsapp() {
  const container = document.getElementById('page-content');
  
  container.innerHTML = `
    <div class="page-title-bar">
      <div>
        <h2>Disparo WhatsApp (App Local)</h2>
        <p>A ferramenta de disparos agora é um aplicativo independente instalado no seu computador.</p>
      </div>
    </div>

    <div class="card" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 40px 20px;">
      <div style="color: var(--accent); margin-bottom: 16px;">
        ${icon('messageCircle', 48)}
      </div>
      <h3 style="margin-bottom: 16px; font-size: 1.2rem;">Integração com HS Corp Sender</h3>
      <p style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.5;">
        Para garantir maior estabilidade e que o WhatsApp não desconecte devido à falta de memória em servidores na nuvem,
        o módulo de disparos foi separado em um aplicativo próprio que roda direto no seu computador.
      </p>
      
      <div style="background: var(--bg); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 24px;">
        <h4 style="margin-bottom: 12px; font-size: 0.95rem;">Como fazer os disparos:</h4>
        <ol style="text-align: left; padding-left: 20px; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">
          <li>Clique no botão abaixo para baixar a lista atualizada de pacientes.</li>
          <li>Abra o aplicativo <strong>HS Corp Sender</strong> no seu computador.</li>
          <li>Clique em "Importar Clientes" e selecione o arquivo baixado.</li>
          <li>Escreva a mensagem e inicie os disparos!</li>
        </ol>
      </div>

      <button id="btn-export-patients" class="btn btn-primary" style="font-size: 1.1rem; padding: 12px 24px; margin: 0 auto;">
        ${icon('download')} Baixar Lista de Pacientes
      </button>
    </div>
  `;

  document.getElementById('btn-export-patients').addEventListener('click', () => {
    try {
      const patients = getPatients();
      // Filtra os dados relevantes para o disparo para deixar o arquivo mais leve
      const exportData = patients.map(p => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        status: p.status,
        tags: p.tags || []
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = \`hscorp_pacientes_\${new Date().toISOString().slice(0, 10)}.json\`;
      a.click();
      URL.revokeObjectURL(a.href);
      
      showToast('Lista baixada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar pacientes.', 'error');
    }
  });
}
