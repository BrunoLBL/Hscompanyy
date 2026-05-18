let container = null;

export function initToast() {
  container = document.getElementById('toast-root');
  if (!container) { container = document.createElement('div'); container.id = 'toast-root'; document.body.appendChild(container); }
  container.className = 'toast-container';
}

export function showToast(message, type = 'info', duration = 3500) {
  if (!container) initToast();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span><button class="toast-close">&times;</button>`;
  toast.querySelector('.toast-close').onclick = () => removeToast(toast);
  container.appendChild(toast);
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(el) {
  el.style.animation = 'toastIn .2s ease reverse';
  setTimeout(() => el.remove(), 200);
}

export const toast = {
  success: (msg) => showToast(msg, 'success'),
  error: (msg) => showToast(msg, 'error'),
  warning: (msg) => showToast(msg, 'warning'),
  info: (msg) => showToast(msg, 'info'),
};
