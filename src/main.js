import { createApp } from './app.js';
import { renderAuthView } from './auth/authView.js';
import { supabase } from './cloud/supabaseClient.js';
import { prepareCacheForUser } from './cloud/cacheOwner.js';
import { initialCloudSync, startCloudSync } from './cloud/cloudSync.js';
import { createSnippet } from './storage/snippetRepository.js';
import { captureToSnippet, clearCaptureParameters, isCaptureMessage, parseCaptureUrl } from './capture/captureParams.js';

const root = document.querySelector('#app');
let appInstance = null;
let stopCloudSync = null;
let currentUserId = null;
let openingUserId = null;
let captureConsumed = false;
let pendingCapture = parseCaptureUrl(window.location.href);
let authNotice = '';
const captureSession = new URL(window.location.href).searchParams.get('captureSession');

function appBaseUrl() {
  const url = clearCaptureParameters(window.location.href);
  url.hash = '';
  return url.href;
}

function cleanAddressBar() {
  const clean = clearCaptureParameters(window.location.href);
  if (clean.href !== window.location.href) history.replaceState(null, '', clean.href);
}

async function consumeCapture() {
  if (captureConsumed || !pendingCapture || !appInstance || !currentUserId) return;
  captureConsumed = true;
  const capture = pendingCapture;
  pendingCapture = null;
  const snippet = await createSnippet(capture.markdown, Date.now(), { sourceUrl: capture.sourceUrl });
  cleanAddressBar();
  await appInstance.openSnippet(snippet.id);
}

window.addEventListener('message', event => {
  if (!isCaptureMessage(event.data, captureSession) || captureConsumed) return;
  const capture = captureToSnippet(event.data);
  if (!capture) return;
  pendingCapture = capture;
  consumeCapture().catch(console.error);
});

async function cleanupAuthenticatedApp() {
  stopCloudSync?.();
  stopCloudSync = null;
  appInstance?.destroy?.();
  appInstance = null;
  currentUserId = null;
}

function showAuth(message = authNotice) {
  authNotice = '';
  renderAuthView(root, {
    initialError: message,
    onRequestCode: async email => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: appBaseUrl(), shouldCreateUser: false }
      });
      if (error) throw error;
    },
    onVerify: async (email, token) => {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (error) throw error;
      if (data.session) await openAuthenticated(data.session);
    }
  });
}

async function openAuthenticated(session) {
  const user = session?.user;
  if (!user || currentUserId === user.id || openingUserId === user.id) return;
  openingUserId = user.id;
  try {
    const { data: hasAccess, error: accessError } = await supabase.rpc('snippets_has_access');
    if (accessError) throw accessError;
    if (!hasAccess) {
      authNotice = 'This account is not authorized for Snippets.';
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      return;
    }
    await cleanupAuthenticatedApp();
    const cache = await prepareCacheForUser(user.id);
    try {
      await initialCloudSync(supabase, user.id, { adoptExistingCache: cache.adoptedExistingCache });
    } catch (error) {
      console.warn('Snippets cloud sync unavailable; using local cache.', error);
    }
    appInstance = await createApp(root, {
      onSignOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
    });
    currentUserId = user.id;
    stopCloudSync = startCloudSync(supabase, user.id);
    await consumeCapture();
  } finally {
    openingUserId = null;
  }
}

async function boot() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) await openAuthenticated(data.session);
  else showAuth();

  supabase.auth.onAuthStateChange((event, session) => {
    queueMicrotask(async () => {
      if (event === 'SIGNED_OUT' || !session) {
        await cleanupAuthenticatedApp();
        showAuth();
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        await openAuthenticated(session);
      }
    });
  });
}

boot().catch(error => {
  console.error(error);
  root.innerHTML = '<main class="library-empty" style="padding:20vh 24px">Could not open Snippets.</main>';
});
