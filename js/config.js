// ============================================================
// config.js — zentrale Konstanten der App
// ============================================================
// Diese Werte werden an vielen Stellen gebraucht. Statt sie zu
// duplizieren, stehen sie hier an einer Stelle und werden per
// `import { ... } from './config.js'` in andere Module geholt.

// Google OAuth Client-ID (öffentlich, darf im Code stehen — kein Secret)
export const CLIENT_ID = '654655385029-oscipiaf48u4pnrh6t1ahnfgua1mjp43.apps.googleusercontent.com';

// Drive-Scope: App sieht NUR Dateien, die sie selbst erstellt hat
export const SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Name der Datendatei in Google Drive
export const DATA_FILENAME = 'trade-kalender.json';

// Positionen unter diesem Einstand (€) gelten beim Import als ausgeknockt
// (betrifft nur die Ableitung offener Positionen, NICHT die P&L-Berechnung)
export const KNOCKOUT_THRESHOLD = 1000;

// Deutscher Steuersatz: 25% Abgeltungsteuer + 5,5% Soli = 26,375% (ohne Kirchensteuer)
export const TAX_RATE = 0.26375;

// App-Version — wird in der App angezeigt und sollte bei jeder Änderung erhöht werden.
// Hilft zu erkennen, ob die neueste Version geladen ist (oder noch der Cache hängt).
export const APP_VERSION = 'v44';
