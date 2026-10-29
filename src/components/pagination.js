/**
 * Componente de paginação reutilizável e robusto.
 *
 * Atende com precisão ao requisito:
 *  - Mostra as páginas 1 a 5 para seleção direta.
 *  - Botões "Anterior" e "Próxima" para avançar de página em página com segurança até o fim.
 *  - Ao lado do 5, exibe reticências '…' e o número da ÚLTIMA página, totalmente clicável.
 *  - Quando a navegação avança além da 5ª página (via 'Próxima'), a janela desliza mantendo
 *    no máximo 5 botões centrais, com atalhos clicáveis para a primeira e última páginas.
 *  - Não estoura a tela mesmo com centenas de páginas acumuladas.
 */

const WINDOW_SIZE = 5;

/**
 * Fatia um array para a página atual com validação de limites.
 * @param {Array} items
 * @param {number} page
 * @param {number} perPage
 */
export function paginate(items, page, perPage = 25) {
  const safeItems = Array.isArray(items) ? items : [];
  const total = safeItems.length;
  const safePerPage = Math.max(1, parseInt(perPage, 10) || 25);
  const totalPages = Math.max(1, Math.ceil(total / safePerPage));
  const safePage = Math.min(Math.max(1, parseInt(page, 10) || 1), totalPages);
  const startIdx = (safePage - 1) * safePerPage;
  const pageItems = safeItems.slice(startIdx, startIdx + safePerPage);
  
  return {
    pageItems,
    page: safePage,
    totalPages,
    total,
    perPage: safePerPage,
    from: total === 0 ? 0 : startIdx + 1,
    to: startIdx + pageItems.length,
  };
}

/**
 * Calcula a janela de páginas visíveis.
 * Enquanto page <= 5, mantém fixo 1..5 para uma experiência estável.
 */
function getVisibleWindow(page, totalPages) {
  if (totalPages <= WINDOW_SIZE) {
    return { start: 1, end: totalPages };
  }
  // Se está nas 5 primeiras páginas: mostra 1 a 5
  if (page <= WINDOW_SIZE) {
    return { start: 1, end: WINDOW_SIZE };
  }
  // Janela deslizante quando avança além da 5ª página
  let start = page - Math.floor(WINDOW_SIZE / 2);
  let end = start + WINDOW_SIZE - 1;
  if (end > totalPages) {
    end = totalPages;
    start = end - WINDOW_SIZE + 1;
  }
  return { start: Math.max(1, start), end };
}

/**
 * Renderiza o HTML da paginação.
 * @param {{page:number,totalPages:number,total:number,from:number,to:number}} info
 * @param {string} id - Chave identificadora para associar eventos
 * @param {string} [label='registros'] - Descrição dos itens (ex: 'lançamentos', 'pacientes')
 */
export function renderPagination(info, id, label = 'lançamentos') {
  if (!info || info.totalPages <= 1) return '';

  const { page, totalPages, total, from, to } = info;
  const { start, end } = getVisibleWindow(page, totalPages);

  const makeBtn = (p, text = p, title = '') => {
    const isActive = p === page;
    return `<button type="button" class="pagination-btn ${isActive ? 'active' : ''}" data-pg="${id}" data-page="${p}" ${isActive ? 'aria-current="page"' : ''} ${title ? `title="${title}"` : ''}>${text}</button>`;
  };

  let numbersHtml = '';

  // Se a janela deslizou além do início, mantém o atalho para a página 1
  if (start > 1) {
    numbersHtml += makeBtn(1, '1', 'Ir para a primeira página');
    if (start > 2) {
      numbersHtml += '<span class="pagination-ellipsis">…</span>';
    }
  }

  // Janela de até 5 botões centrais
  for (let p = start; p <= end; p++) {
    numbersHtml += makeBtn(p);
  }

  // Atalho para a última página se o final da janela ainda não for a última página
  if (end < totalPages) {
    if (end < totalPages - 1) {
      numbersHtml += '<span class="pagination-ellipsis">…</span>';
    }
    numbersHtml += makeBtn(totalPages, String(totalPages), `Ir para a última página (${totalPages})`);
  }

  return `
    <div class="pagination" data-pagination="${id}">
      <span class="pagination-info">Mostrando ${from.toLocaleString('pt-BR')}–${to.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} ${label}</span>
      <div class="pagination-controls">
        <button type="button" class="pagination-btn pagination-nav" data-pg="${id}" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Anterior</button>
        ${numbersHtml}
        <button type="button" class="pagination-btn pagination-nav" data-pg="${id}" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>Próxima</button>
      </div>
    </div>
  `;
}

/**
 * Vincula os eventos de clique da paginação no container especificado.
 * @param {HTMLElement} root
 * @param {string} id
 * @param {(newPage: number) => void} onChange
 */
export function bindPagination(root, id, onChange) {
  if (!root || typeof onChange !== 'function') return;
  root.querySelectorAll(`[data-pg="${id}"]`).forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      if (btn.disabled || btn.classList.contains('active')) return;
      const targetPage = parseInt(btn.dataset.page, 10);
      if (!isNaN(targetPage) && targetPage >= 1) {
        onChange(targetPage);
      }
    };
  });
}
