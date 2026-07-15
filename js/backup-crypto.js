// ============================================================
// backup-crypto.js — passwortgeschuetztes Backup-Format
// ============================================================
// Verschluesselt und entschluesselt komplette JSON-Dokumente mit Web Crypto.
// Das Modul kennt weder DOM noch App-State. Kryptografie wird injizierbar
// gehalten, damit echte Browser-Primitive ohne eigene Algorithmuskopie testen.

export const ENCRYPTED_BACKUP_FORMAT = 'trade-kalender-encrypted-backup';
export const ENCRYPTED_BACKUP_VERSION = 1;
export const BACKUP_PBKDF2_ITERATIONS = 600000;

const MIN_ITERATIONS = 100000;
const MAX_ITERATIONS = 1000000;
const MAX_ENVELOPE_LENGTH = 25 * 1024 * 1024;

function cryptoDefault() {
  return typeof globalThis === 'undefined' ? null : globalThis.crypto;
}

function requireCrypto(cryptoApi) {
  if (!cryptoApi?.subtle || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('Sichere Browser-Kryptografie ist nicht verfuegbar.');
  }
}

function requirePassword(password, enforceLength) {
  if (typeof password !== 'string' || !password) {
    throw new Error('Bitte eine Passphrase eingeben.');
  }
  if (enforceLength && password.length < 10) {
    throw new Error('Die Passphrase muss mindestens 10 Zeichen lang sein.');
  }
  if (password.length > 1024) {
    throw new Error('Die Passphrase ist zu lang.');
  }
}

function bytesToBase64(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ENVELOPE_LENGTH ||
      value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('Backup enthaelt ungueltige ' + label + '.');
  }
  let binary;
  try {
    binary = atob(value);
  } catch (_) {
    throw new Error('Backup enthaelt ungueltige ' + label + '.');
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function additionalData(envelope) {
  return new TextEncoder().encode([
    envelope.format,
    envelope.version,
    envelope.createdAt,
    envelope.kdf.iterations
  ].join('|'));
}

async function deriveBackupKey(password, salt, iterations, cryptoApi) {
  const passwordKey = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return cryptoApi.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBackupFile(data, password, options = {}) {
  const cryptoApi = options.cryptoApi || cryptoDefault();
  requireCrypto(cryptoApi);
  requirePassword(password, true);
  const iterations = options.iterations === undefined
    ? BACKUP_PBKDF2_ITERATIONS
    : Number(options.iterations);
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
    throw new Error('Ungueltiger PBKDF2-Work-Factor.');
  }

  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const envelope = {
    format: ENCRYPTED_BACKUP_FORMAT,
    version: ENCRYPTED_BACKUP_VERSION,
    createdAt: Number.isFinite(options.createdAt) ? options.createdAt : Date.now(),
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations,
      salt: bytesToBase64(salt)
    },
    cipher: {
      name: 'AES-GCM',
      iv: bytesToBase64(iv),
      tagLength: 128
    },
    payload: ''
  };
  const key = await deriveBackupKey(password, salt, iterations, cryptoApi);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await cryptoApi.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128, additionalData: additionalData(envelope) },
    key,
    plaintext
  );
  envelope.payload = bytesToBase64(ciphertext);
  return JSON.stringify(envelope, null, 2);
}

export async function decryptBackupFile(text, password, options = {}) {
  const cryptoApi = options.cryptoApi || cryptoDefault();
  requireCrypto(cryptoApi);
  requirePassword(password, false);
  if (typeof text !== 'string' || text.length === 0 || text.length > MAX_ENVELOPE_LENGTH) {
    throw new Error('Backup-Datei ist leer oder zu gross.');
  }

  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch (_) {
    throw new Error('Datei ist kein gueltiges verschluesseltes Backup.');
  }
  if (!envelope || envelope.format !== ENCRYPTED_BACKUP_FORMAT ||
      envelope.version !== ENCRYPTED_BACKUP_VERSION) {
    throw new Error('Unbekanntes Backup-Format oder nicht unterstuetzte Version.');
  }
  const iterations = Number(envelope.kdf?.iterations);
  if (envelope.kdf?.name !== 'PBKDF2' || envelope.kdf?.hash !== 'SHA-256' ||
      !Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS ||
      envelope.cipher?.name !== 'AES-GCM' || envelope.cipher?.tagLength !== 128) {
    throw new Error('Backup verwendet nicht unterstuetzte Kryptografie-Parameter.');
  }
  const salt = base64ToBytes(envelope.kdf.salt, 'Salt-Daten');
  const iv = base64ToBytes(envelope.cipher.iv, 'Nonce-Daten');
  const payload = base64ToBytes(envelope.payload, 'Nutzdaten');
  if (salt.length !== 16 || iv.length !== 12 || payload.length < 16) {
    throw new Error('Backup enthaelt ungueltige Kryptografie-Daten.');
  }

  try {
    const key = await deriveBackupKey(password, salt, iterations, cryptoApi);
    const plaintext = await cryptoApi.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128, additionalData: additionalData(envelope) },
      key,
      payload
    );
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext));
  } catch (_) {
    throw new Error('Passphrase falsch oder Backup-Datei beschaedigt.');
  }
}

