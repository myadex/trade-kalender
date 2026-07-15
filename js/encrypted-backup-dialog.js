// ============================================================
// encrypted-backup-dialog.js — UI fuer sichere Backup-Dateien
// ============================================================
// Liest nur Formularwerte und verwaltet Dialogzustand. Verschluesselung,
// Download, Datenvalidierung und Persistenz bleiben im App-Controller.

import { $ } from './helpers.js';
import { openAccessibleDialog, closeAccessibleDialog } from './dialog-accessibility.js';

let backupOperationBusy = false;

export function openEncryptedBackupDialog() {
  ['encrypted-backup-export-password', 'encrypted-backup-export-confirm',
    'encrypted-backup-import-password', 'encrypted-backup-file']
    .forEach(id => { $(id).value = ''; });
  $('encrypted-backup-file-name').textContent = 'Keine Datei ausgewaehlt';
  setEncryptedBackupStatus('');
  setEncryptedBackupBusy(false);
  openAccessibleDialog('encrypted-backup-overlay', 'encrypted-backup-close');
}

export function closeEncryptedBackupDialog(force = false) {
  if (backupOperationBusy && !force) return false;
  ['encrypted-backup-export-password', 'encrypted-backup-export-confirm',
    'encrypted-backup-import-password']
    .forEach(id => { $(id).value = ''; });
  backupOperationBusy = false;
  return closeAccessibleDialog('encrypted-backup-overlay');
}

export function readEncryptedExportPasswords() {
  return {
    password: $('encrypted-backup-export-password').value,
    confirmation: $('encrypted-backup-export-confirm').value
  };
}

export function readEncryptedImport() {
  return {
    file: $('encrypted-backup-file').files?.[0] || null,
    password: $('encrypted-backup-import-password').value
  };
}

export function showEncryptedBackupFileName() {
  const file = $('encrypted-backup-file').files?.[0] || null;
  $('encrypted-backup-file-name').textContent = file ? file.name : 'Keine Datei ausgewaehlt';
}

export function setEncryptedBackupStatus(message, isError = false) {
  const status = $('encrypted-backup-status');
  status.textContent = message;
  status.classList.toggle('error', !!isError);
}

export function setEncryptedBackupBusy(busy) {
  backupOperationBusy = !!busy;
  ['encrypted-backup-export', 'encrypted-backup-restore', 'encrypted-backup-close']
    .forEach(id => { $(id).disabled = !!busy; });
}
