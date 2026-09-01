let currentToast = null;
let currentTimer = null;

export function showToast(message, { duration = 1800 } = {}) {
  currentToast?.remove();
  clearTimeout(currentTimer);
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.append(toast);
  currentToast = toast;
  currentTimer = setTimeout(() => {
    toast.remove();
    if (currentToast === toast) currentToast = null;
  }, duration);
}
