// ============================================================
// dialog-accessibility.js — gemeinsame Fokus- und Tastatursteuerung
// ============================================================
// Dialoge bleiben in ihren Fachmodulen. Dieses Modul verwaltet ausschliesslich
// den zugänglichen UI-Rahmen: Startfokus, Fokus-Rückgabe, Scrollsperre,
// Escape-Anforderung und Fokusfalle für den jeweils obersten Dialog.

const previousFocus = new WeakMap();
const DIALOG_SELECTOR = '.modal-overlay.open, .detail-overlay.open';
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function element(value) {
  return typeof value === 'string' ? document.getElementById(value) : value;
}

function explicitlyHidden(node, boundary) {
  let current = node;
  while (current && current !== boundary) {
    if (current.hidden || current.getAttribute?.('aria-hidden') === 'true' ||
        current.style?.display === 'none' || current.style?.visibility === 'hidden') return true;
    current = current.parentElement;
  }
  return false;
}

function focusableElements(dialog) {
  return Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter(node => !explicitlyHidden(node, dialog));
}

function focusWithoutScroll(target) {
  if (!target || typeof target.focus !== 'function') return;
  try { target.focus({ preventScroll: true }); }
  catch (_) { target.focus(); }
}

function updateScrollLock() {
  if (!document.body) return;
  document.body.classList.toggle('dialog-open', !!document.querySelector(DIALOG_SELECTOR));
}

export function openAccessibleDialog(dialogOrId, initialFocusOrId = null) {
  const dialog = element(dialogOrId);
  if (!dialog) return false;
  const active = document.activeElement;
  if (!previousFocus.has(dialog) && active && active !== document.body) {
    previousFocus.set(dialog, active);
  }
  dialog.classList.add('open');
  updateScrollLock();

  const requested = element(initialFocusOrId);
  const target = requested || dialog.querySelector('[data-dialog-initial-focus]') ||
    focusableElements(dialog)[0] || dialog.querySelector('.modal, .detail-panel');
  focusWithoutScroll(target);
  return true;
}

export function closeAccessibleDialog(dialogOrId, restoreFocus = true) {
  const dialog = element(dialogOrId);
  if (!dialog) return false;
  dialog.classList.remove('open');
  updateScrollLock();

  const target = previousFocus.get(dialog);
  previousFocus.delete(dialog);
  if (restoreFocus && target && target.isConnected) focusWithoutScroll(target);
  return true;
}

export function handleAccessibleDialogKey(event, requestClose) {
  const dialogs = Array.from(document.querySelectorAll(DIALOG_SELECTOR));
  const dialog = dialogs[dialogs.length - 1];
  if (!dialog || !event) return false;

  if (event.key === 'Escape') {
    event.preventDefault?.();
    event.stopPropagation?.();
    if (typeof requestClose === 'function') requestClose(dialog.id);
    return true;
  }

  if (event.key !== 'Tab') return false;
  const items = focusableElements(dialog);
  if (items.length === 0) {
    event.preventDefault?.();
    focusWithoutScroll(dialog.querySelector('.modal, .detail-panel'));
    return true;
  }

  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  const outside = !dialog.contains(active);
  if ((event.shiftKey && (active === first || outside)) ||
      (!event.shiftKey && (active === last || outside))) {
    event.preventDefault?.();
    event.stopPropagation?.();
    focusWithoutScroll(event.shiftKey ? last : first);
    return true;
  }
  return false;
}
