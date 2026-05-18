let modalRoot = null;

export function initModal() {
  modalRoot = document.getElementById('modal-root');
}

export function openModal({ title, content, size = '', footer = '', onClose = null }) {
  if (!modalRoot) initModal();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal-box ${size}">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="btn btn-icon modal-close-btn" title="Fechar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">${content}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>`;
  
  backdrop.querySelector('.modal-close-btn').onclick = () => closeModal(backdrop, onClose);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(backdrop, onClose); });
  modalRoot.appendChild(backdrop);
  return backdrop;
}

export function closeModal(backdrop, onClose) {
  if (!backdrop) {
    const all = document.querySelectorAll('.modal-backdrop');
    all.forEach(b => b.remove());
    return;
  }
  backdrop.style.animation = 'fadeIn .2s ease reverse';
  setTimeout(() => { backdrop.remove(); if (onClose) onClose(); }, 200);
}

export function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
}
