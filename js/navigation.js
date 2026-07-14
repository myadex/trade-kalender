// ============================================================
// navigation.js — Navigation der Haupt- und Statistik-Tabs
// ============================================================
// Dieses Modul verwaltet ausschliesslich sichtbare UI-Bereiche, Fokus und
// mobile Navigation. Es kennt weder App-Daten noch Drive, Import oder
// Berechnungslogik und kann deshalb isoliert gegen ein DOM getestet werden.

const MAIN_TABS = ['calendar', 'weekly', 'monthly', 'open', 'timestats'];
const STATS_VIEWS = ['performance', 'timing', 'behavior'];

// Der Zustand bleibt bewusst im Navigationsmodul: Beim Wechsel vom Statistik-
// Tab zu einem Haupttab und zurueck soll derselbe Statistikbereich sichtbar sein.
let statsView = 'performance';

export function showTab(id) {
  document.querySelectorAll('.nav-tab').forEach((tab, index) =>
    tab.classList.toggle('active', MAIN_TABS[index] === id));
  document.querySelectorAll('.section').forEach(section =>
    section.classList.toggle('active', section.id === 'tab-' + id));
  if (id === 'timestats') setStatsView(statsView);
}

export function setStatsView(view) {
  const selected = STATS_VIEWS.includes(view) ? view : 'performance';
  statsView = selected;
  document.querySelectorAll('.stats-view').forEach(panel => {
    const active = panel.id === 'stats-view-' + selected;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  document.querySelectorAll('.stats-view-nav-btn').forEach(button => {
    const active = button.id === 'stats-nav-' + selected;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.setAttribute('tabindex', active ? '0' : '-1');
  });
}

export function handleStatsViewKey(event) {
  const supported = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!supported.includes(event.key)) return;
  const buttons = Array.from(document.querySelectorAll('.stats-view-nav-btn'));
  if (buttons.length === 0) return;

  event.preventDefault();
  let index = buttons.indexOf(document.activeElement);
  if (index < 0) {
    index = Math.max(0, buttons.findIndex(button => button.classList.contains('active')));
  }
  if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = buttons.length - 1;
  else if (event.key === 'ArrowRight') index = (index + 1) % buttons.length;
  else index = (index - 1 + buttons.length) % buttons.length;

  const nextButton = buttons[index];
  setStatsView(nextButton.id.slice('stats-nav-'.length));
  nextButton.focus();
}

export function mobileTab(id) {
  showTab(id);
  document.querySelectorAll('#bottom-bar button[data-tab]').forEach(button => {
    button.classList.toggle('active', button.getAttribute('data-tab') === id);
  });
  closeMobileActions();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function toggleMobileActions() {
  document.getElementById('mobile-actions').classList.toggle('open');
}

export function closeMobileActions() {
  document.getElementById('mobile-actions').classList.remove('open');
}
