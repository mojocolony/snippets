export function validatePasswordChange(password, confirmation) {
  const value = String(password ?? '');
  if (!value) return { ok: false, error: 'Enter a new password.' };
  if (value !== String(confirmation ?? '')) return { ok: false, error: 'Passwords do not match.' };
  return { ok: true };
}
