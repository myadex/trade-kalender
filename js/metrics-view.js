// ============================================================
// metrics-view.js — UI fuer klassische Trading-Kennzahlen
// ============================================================
// Dieses Modul liest nur den Zeitraum und rendert ein bereits berechnetes
// Ergebnis. Es kennt weder App-State noch Drive und fuehrt keine Berechnung
// auf Trades aus; diese bleibt als pure Funktion in views.js.

import { $, fmtDE, escapeHtml } from './helpers.js';
import { openAccessibleDialog, closeAccessibleDialog } from './dialog-accessibility.js';

const PIXEL_ART = {
  'calibration': [
    '................', '.......ss.......', '......ssss......', '.....ssssss.....',
    '......ssss......', '.......ss.......', '.......ss.......', '.......ss.......',
    '.......ss.......', '.......ss.......', '.......ss.......', '.......ss.......',
    '......ssss......', '.....ssssss.....', '................', '................'
  ],
  'liquidity-spoon': [
    '.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhhhhhhhhh...',
    '....hhhhhhhh....', '.....hhhhhh.....', '.......hh.......', '.......hh.......',
    '.......hh.......', '.......hh.......', '.......hh.......', '.......hh.......',
    '.......hh.......', '......hhhh......', '................', '................'
  ],
  'breakeven-knife': [
    '.......mm.......', '......mmmm......', '......mmmm......', '......mmmm......',
    '......mmmm......', '......mmmm......', '......mmmm......', '......mmmm......',
    '....mmhhhhmm....', '.....hhhhhh.....', '.......hh.......', '.......hh.......',
    '.......hh.......', '......hhhh......', '................', '................'
  ],
  'candle-dagger': [
    '.......gg.......', '......gii.......', '......iiii......', '......iigg......',
    '......iiii......', '......ggii......', '......iiii......', '......iigg......',
    '....iihhhhii....', '.....hhhhhh.....', '.......hh.......', '.......hh.......',
    '.......hh.......', '......hhhh......', '................', '................'
  ],
  'trend-blade': [
    '.......bb.......', '......bbbb......', '......bbbb......', '......bbbb......',
    '......bbbb......', '......bbbb......', '......bbbb......', '......bbbb......',
    '......bbbb......', '...bbbhhhhbbb...', '.....hhhhhh.....', '.......hh.......',
    '.......hh.......', '.......hh.......', '......hhhh......', '................'
  ],
  'drawdown-tamer': [
    '.......rr.......', '......rbbb......', '......bbbb......', '......bbbr......',
    '......bbbb......', '......rbbb......', '......bbbb......', '......bbbr......',
    '...rrrbbbbrrr...', '..rrrhhhhhhrrr..', '.....hhhhhh.....', '.......hh.......',
    '.......hh.......', '......hhhh......', '.....r....r.....', '................'
  ],
  'patience-rune': [
    '......grrg......', '.....gbbbbg.....', '......gbbg......', '......grrg......',
    '......gbbg......', '......grrg......', '......gbbg......', '......grrg......',
    '......gbbg......', '..grrrhhhhrrrg..', '....gghhhhgg....', '......grrg......',
    '.......hh.......', '......hhhh......', '.....g....g.....', '................'
  ],
  'market-splitter': [
    '...gg......rr...', '..gbbg....gbbg..', '...bb......bb...', '...rr......gg...',
    '...bb......bb...', '...gg......rr...', '...bb......bb...', '...rr......gg...',
    '...bb......bb...', '.rrrhhrrrrhhrrr.', '..hhhh....hhhh..', '...hh......hh...',
    '...hh......hh...', '..hhhh....hhhh..', '.g..........g...', '................'
  ],
  'sacred-candle-blade': [
    '..x..cccccc..x..', '...x.ccggcc.x...', '....ccrrrrcc....', '.....gbbbbg.....',
    '.x....gbbg....x.', '......grrg......', '..x...gbbg...x..', '......grrg......',
    '.x....gbbg....x.', '......grrg......', '..x...gbbg...x..', '.xgrrrhhhhrrrgx.',
    '...gghhhhgg....', '.....grhrg......', '..x...hhhh...x..', 'x...gg....gg...x'
  ]
};

const PIXEL_CLASS = {
  '.': 'pixel-empty', s: 'pixel-shadow', h: 'pixel-wood',
  m: 'pixel-metal', i: 'pixel-iron', b: 'pixel-steel',
  r: 'pixel-rune', g: 'pixel-glow', c: 'pixel-crown', x: 'pixel-spark'
};

export function readTradingMetricRange() {
  return {
    from: $('metrics-from') ? $('metrics-from').value : '',
    to: $('metrics-to') ? $('metrics-to').value : ''
  };
}

export function clearTradingMetricRange() {
  if ($('metrics-from')) $('metrics-from').value = '';
  if ($('metrics-to')) $('metrics-to').value = '';
}

export function readTradingLevelPeriod() {
  return $('trading-level-period') && $('trading-level-period').value === 'all'
    ? 'all'
    : 'season';
}

function displayDate(dateKey) {
  const parts = String(dateKey || '').split('-');
  return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : dateKey;
}

function rangeLabel(range) {
  if (range.from && range.to) return displayDate(range.from) + '–' + displayDate(range.to);
  if (range.from) return 'Ab ' + displayDate(range.from);
  if (range.to) return 'Bis ' + displayDate(range.to);
  return 'Gesamter Zeitraum';
}

function numberDE(value, digits = 2) {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function ratio(value) {
  if (value === null || value === undefined) return '—';
  if (value === Infinity) return '∞';
  return numberDE(value);
}

function percent(value) {
  return value === null || value === undefined ? '—' : numberDE(value, 1) + ' %';
}

function pnlClass(value) {
  return value > 0 ? 'pos' : (value < 0 ? 'neg' : '');
}

function tradeMeta(trade) {
  if (!trade) return '';
  const product = trade.desc ? ' · ' + escapeHtml(trade.desc) : '';
  return displayDate(trade.date) + product;
}

function card(label, value, cssClass = '', meta = '') {
  return '<article class="metrics-card">' +
    '<div class="metrics-card-label">' + label + '</div>' +
    '<div class="metrics-card-value ' + cssClass + '">' + value + '</div>' +
    (meta ? '<div class="metrics-card-meta">' + meta + '</div>' : '') +
    '</article>';
}

function renderPixelArt(pixelKey) {
  const rows = PIXEL_ART[pixelKey] || PIXEL_ART.calibration;
  return rows.flatMap(row => row.padEnd(16, '.').slice(0, 16).split(''))
    .map(pixel => '<span class="pixel-cell ' + (PIXEL_CLASS[pixel] || PIXEL_CLASS['.']) + '"></span>')
    .join('');
}

function renderTradingLevelArsenal(catalog) {
  const grid = $('trading-level-arsenal-grid');
  if (!grid) return;
  const statusLabel = { current: 'Aktuell', reached: 'Erreicht', locked: 'Gesperrt' };
  grid.innerHTML = (Array.isArray(catalog) ? catalog : []).map(level =>
    '<article class="level-arsenal-card ' + level.status + '" data-level="' + escapeHtml(level.id) + '">' +
      '<div class="level-arsenal-pixel" role="img" aria-label="' + escapeHtml(level.name) + '">' +
        renderPixelArt(level.pixelKey) + '</div>' +
      '<div class="level-arsenal-card-head"><h4>' + escapeHtml(level.name) + '</h4>' +
        '<span class="level-arsenal-status">' + statusLabel[level.status] + '</span></div>' +
      '<p class="level-arsenal-description">' + escapeHtml(level.description) + '</p>' +
      '<p class="level-arsenal-requirements">' + level.requirements.map(escapeHtml).join(' · ') + '</p>' +
    '</article>'
  ).join('');
}

export function openTradingLevelArsenal() {
  openAccessibleDialog('trading-level-arsenal-overlay', 'trading-level-arsenal-close');
}

export function closeTradingLevelArsenal() {
  closeAccessibleDialog('trading-level-arsenal-overlay');
}

export function handleTradingLevelArsenalKey(event) {
  if (event && event.key === 'Escape' &&
      $('trading-level-arsenal-overlay')?.classList.contains('open')) {
    closeTradingLevelArsenal();
  }
}

export function renderTradingLevel(state, context = {}) {
  const cardEl = $('trading-level-card');
  const art = $('trading-level-art');
  const name = $('trading-level-name');
  const description = $('trading-level-description');
  const period = $('trading-level-period-label');
  const progressLabel = $('trading-level-progress-label');
  const progress = $('trading-level-progress');
  const next = $('trading-level-next');
  const record = $('trading-level-record');
  const timeline = $('trading-level-timeline');
  if (!cardEl || !art || !name || !description || !period || !progressLabel ||
      !progress || !next || !record || !state || !state.current) return;

  const current = state.current;
  cardEl.dataset.level = current.id;
  art.innerHTML = renderPixelArt(current.pixelKey);
  art.setAttribute('aria-label', 'Pixelgrafik: ' + current.name);
  name.textContent = current.name;
  description.textContent = current.description;
  period.textContent = context.periodLabel || '';
  progress.style.width = Math.max(0, Math.min(100, current.progress)) + '%';
  progressLabel.textContent = current.next
    ? current.progress + ' % bis ' + current.next.name
    : '✦ MYTHISCHES MAXIMUM ERREICHT ✦';
  next.textContent = current.next
    ? 'Nächste Stufe: ' + current.next.name + ' · ' + current.next.requirements.join(' · ')
    : 'Die heilige grüne Kerze wurde entzündet. Krone, Aura und Marktfunken sind freigeschaltet.';

  const recordDate = state.recordDate ? ' · zuerst am ' + displayDate(state.recordDate) : '';
  record.textContent = 'Persönlicher Rekord: ' + state.record.name + recordDate;

  if (timeline) {
    const events = Array.isArray(state.timeline) ? state.timeline : [];
    if (events.length === 0) {
      timeline.innerHTML = '<div class="trading-level-timeline-empty">Noch keine Levelwechsel in diesem Zeitraum.</div>';
    } else {
      timeline.innerHTML = events.map((event, index) => {
        const previous = index > 0 ? events[index - 1].level : null;
        const direction = !previous ? 'start' : (event.level.index > previous.index ? 'up' : 'down');
        const directionLabel = direction === 'start'
          ? 'Start'
          : (direction === 'up' ? 'Aufstieg' : 'Abstieg');
        const currentClass = index === events.length - 1 ? ' current' : '';
        return '<article class="trading-level-event ' + direction + currentClass + '">' +
          '<div class="timeline-pixel-stage"><div class="timeline-pixel-art" role="img" aria-label="' +
            escapeHtml(event.level.name) + '">' + renderPixelArt(event.level.pixelKey) + '</div></div>' +
          '<div class="trading-level-event-date">' + displayDate(event.date) + '</div>' +
          '<div class="trading-level-event-name">' + escapeHtml(event.level.name) + '</div>' +
          '<div class="trading-level-event-direction">' + directionLabel + '</div>' +
          '</article>';
      }).join('');
    }
  }
  renderTradingLevelArsenal(state.catalog);
}

export function renderTradingMetrics(result) {
  const summary = $('metrics-summary');
  const grid = $('metrics-grid');
  const note = $('metrics-note');
  if (!summary || !grid || !note || !result) return;

  if (!result.range.valid) {
    summary.textContent = 'Der gewählte Zeitraum ist ungültig.';
    grid.innerHTML = '<div class="metrics-empty">Keine Kennzahlen berechnet.</div>';
    note.textContent = '„Von“ muss vor oder am selben Tag wie „Bis“ liegen.';
    return;
  }

  summary.textContent = rangeLabel(result.range) + ' · ' + result.count + ' Trades · ' +
    result.wins + ' Gewinn / ' + result.losses + ' Verlust / ' + result.flat + ' neutral';

  if (result.count === 0) {
    grid.innerHTML = '<div class="metrics-empty">Für diesen Zeitraum sind keine auswertbaren Trades vorhanden.</div>';
  } else {
    const drawdownPct = result.maxDrawdownPct === null
      ? ''
      : ' · ' + percent(result.maxDrawdownPct);
    grid.innerHTML =
      card('Netto-P&L', fmtDE(result.totalPnl), result.totalPnl >= 0 ? 'pos' : 'neg',
        'Summe im gewählten Zeitraum') +
      card('Trade-Winrate', percent(result.winrate), '',
        result.wins + ' von ' + result.decisiveTrades + ' entschiedenen Trades') +
      card('Profit Factor', ratio(result.profitFactor),
        result.profitFactor === null ? '' : (result.profitFactor >= 1 ? 'pos' : 'neg'),
        'Gewinnsumme ÷ Verlustsumme') +
      card('Erwartungswert / Trade', fmtDE(result.expectancy),
        result.expectancy >= 0 ? 'pos' : 'neg', 'Netto-P&L ÷ alle Trades') +
      card('Ø Gewinn', result.avgWin === null ? '—' : fmtDE(result.avgWin),
        result.avgWin === null ? '' : 'pos',
        result.wins + ' Gewinn-Trades') +
      card('Ø Verlust', result.avgLoss === null ? '—' : fmtDE(result.avgLoss),
        result.avgLoss === null ? '' : 'neg',
        result.losses + ' Verlust-Trades') +
      card('Payoff-Ratio', ratio(result.payoffRatio), '', 'Ø Gewinn ÷ |Ø Verlust|') +
      card('Bester Trade', result.bestTrade ? fmtDE(result.bestTrade.pnl) : '—',
        result.bestTrade ? pnlClass(result.bestTrade.pnl) : '',
        tradeMeta(result.bestTrade)) +
      card('Schlechtester Trade', result.worstTrade ? fmtDE(result.worstTrade.pnl) : '—',
        result.worstTrade ? pnlClass(result.worstTrade.pnl) : '',
        tradeMeta(result.worstTrade)) +
      card('Max. Gewinnserie', String(result.maxWinStreak), '', 'Aufeinanderfolgende Gewinn-Trades') +
      card('Max. Verlustserie', String(result.maxLossStreak), '', 'Aufeinanderfolgende Verlust-Trades') +
      card('Max. Drawdown', result.maxDrawdown > 0 ? fmtDE(-result.maxDrawdown) : '0,00 €',
        result.maxDrawdown > 0 ? 'neg' : '',
        'Realisierte Tagesendstände' + drawdownPct) +
      card('Recovery Factor', ratio(result.recoveryFactor),
        result.recoveryFactor === null ? '' : (result.recoveryFactor >= 0 ? 'pos' : 'neg'),
        'Netto-P&L ÷ Max. Drawdown');
  }

  const notes = ['Zeitraum = realisierter Ausstiegstag.'];
  if (result.count < 8) notes.push('Kleine Stichprobe: Kennzahlen noch vorsichtig einordnen.');
  if (result.excluded.outsideRange > 0) {
    notes.push(result.excluded.outsideRange + ' Trades liegen außerhalb des Zeitraums.');
  }
  if (result.excluded.invalidDate > 0 || result.excluded.invalidPnl > 0) {
    notes.push('Ausgeschlossen: ' + result.excluded.invalidDate + ' mit ungültigem Datum, ' +
      result.excluded.invalidPnl + ' mit ungültigem P&L.');
  }
  if (result.capital <= 0) notes.push('Drawdown-Prozent benötigt ein positives Startkapital.');
  note.textContent = notes.join(' ');
}
