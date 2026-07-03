'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

const DEVICE_ID_KEY = 'cannaclub_chat_device_id';
const PUBLIC_KEY_KEY = 'cannaclub_chat_public_key';
const PRIVATE_KEY_KEY = 'cannaclub_chat_private_key_jwk';
const KEYRING_KEY = 'cannaclub_chat_keyring_v1';

export type ChatDeviceKey = {
  id: string;
  userId?: string;
  deviceId: string;
  deviceName?: string | null;
  userAgent?: string | null;
  publicKey: string;
  algorithm: string;
  active: boolean;
  createdAt: string;
  lastSeenAt?: string | null;
};

type StoredChatDeviceKey = {
  deviceId: string;
  publicKey: string;
  privateKey: JsonWebKey;
  deviceName?: string;
  createdAt: string;
};

type ChatDeviceKeyBackup = {
  version: 'cannaclub-chat-keyring-v1';
  exportedAt: string;
  currentDeviceId: string | null;
  keys: StoredChatDeviceKey[];
};

type EncryptedChatDeviceKeyBackup = {
  version: 'cannaclub-chat-keyring-encrypted-v1';
  exportedAt: string;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

export const chatDeviceKeyKeys = {
  list: ['chat', 'device-keys'] as const,
  conversation: (conversationId?: string | null) =>
    ['chat', 'conversation-device-keys', conversationId] as const,
};

function toBase64Url(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64UrlBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function fromBase64UrlBuffer(value: string) {
  return fromBase64UrlBytes(value).buffer;
}

function getOrCreateDeviceId() {
  let deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function readKeyring(): StoredChatDeviceKey[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(KEYRING_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is StoredChatDeviceKey =>
        Boolean(
          item &&
            typeof item.deviceId === 'string' &&
            typeof item.publicKey === 'string' &&
            typeof item.privateKey === 'object',
        ),
    );
  } catch {
    return [];
  }
}

function writeKeyring(keys: StoredChatDeviceKey[]) {
  if (typeof window === 'undefined') return;
  const unique = new Map(keys.map((key) => [key.deviceId, key]));
  window.localStorage.setItem(KEYRING_KEY, JSON.stringify(Array.from(unique.values())));
}

function rememberDeviceKey(key: StoredChatDeviceKey) {
  writeKeyring([...readKeyring(), key]);
}

function getDeviceName() {
  if (typeof navigator === 'undefined') return 'Dispositivo';

  const ua = navigator.userAgent;
  const browser =
    ua.includes('Edg/')
      ? 'Edge'
      : ua.includes('Chrome/')
        ? 'Chrome'
        : ua.includes('Firefox/')
          ? 'Firefox'
          : ua.includes('Safari/')
            ? 'Safari'
            : 'Navegador';
  const platform = navigator.platform || 'Equipo';

  return `${browser} · ${platform}`;
}

export function getCurrentChatDeviceId() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(DEVICE_ID_KEY);
}

export function resetCurrentChatDeviceKey() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEVICE_ID_KEY);
  window.localStorage.removeItem(PUBLIC_KEY_KEY);
  window.localStorage.removeItem(PRIVATE_KEY_KEY);
}

function getLocalPublicKey() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(PUBLIC_KEY_KEY);
}

async function importPrivateKey(privateKey: JsonWebKey) {
  const normalizedKey = { ...privateKey };
  delete normalizedKey.key_ops;

  return crypto.subtle.importKey(
    'jwk',
    normalizedKey,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    ['deriveBits'],
  );
}

async function getLocalPrivateKey(deviceId = getCurrentChatDeviceId()) {
  if (typeof window === 'undefined') return null;
  const keyringKey = readKeyring().find((key) => key.deviceId === deviceId);
  if (keyringKey) return importPrivateKey(keyringKey.privateKey);

  const privateKey = window.localStorage.getItem(PRIVATE_KEY_KEY);
  if (!privateKey) return null;

  return importPrivateKey(JSON.parse(privateKey));
}

async function importPublicKey(publicKey: string) {
  return crypto.subtle.importKey(
    'spki',
    fromBase64UrlBuffer(publicKey),
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    [],
  );
}

async function deriveWrappingKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  salt: ArrayBuffer,
  deviceId: string,
) {
  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    256,
  );
  const hkdfKey = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, [
    'deriveKey',
  ]);

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: new TextEncoder().encode(`cannaclub-chat:${deviceId}`),
    },
    hkdfKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function ensureDeviceKey() {
  const existingPublicKey = window.localStorage.getItem(PUBLIC_KEY_KEY);
  const existingPrivateKey = window.localStorage.getItem(PRIVATE_KEY_KEY);
  if (existingPublicKey) {
    if (existingPrivateKey) {
      rememberDeviceKey({
        deviceId: getOrCreateDeviceId(),
        publicKey: existingPublicKey,
        privateKey: JSON.parse(existingPrivateKey),
        deviceName: getDeviceName(),
        createdAt: new Date().toISOString(),
      });
    }
    return existingPublicKey;
  }

  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveBits'],
  );
  const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const encodedPublicKey = toBase64Url(publicKey);

  window.localStorage.setItem(PUBLIC_KEY_KEY, encodedPublicKey);
  window.localStorage.setItem(PRIVATE_KEY_KEY, JSON.stringify(privateKey));
  rememberDeviceKey({
    deviceId: getOrCreateDeviceId(),
    publicKey: encodedPublicKey,
    privateKey,
    deviceName: getDeviceName(),
    createdAt: new Date().toISOString(),
  });

  return encodedPublicKey;
}

export function useChatDeviceKey(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !window.crypto?.subtle) {
      return;
    }

    let cancelled = false;

    async function register() {
      const publicKey = await ensureDeviceKey();
      if (cancelled) return;

      await apiFetch('/chat/device-keys', {
        method: 'POST',
        body: {
          deviceId: getOrCreateDeviceId(),
          publicKey,
          algorithm: 'ECDH-P256',
          deviceName: getDeviceName(),
          userAgent: navigator.userAgent,
        },
      });
    }

    register().catch(() => {
      // Registro oportunista: si falla, el chat sigue funcionando con cifrado en reposo.
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}

export function useChatConversationDeviceKeys(conversationId?: string | null) {
  return useQuery({
    queryKey: chatDeviceKeyKeys.conversation(conversationId),
    queryFn: () =>
      apiFetch<ChatDeviceKey[]>(`/chat/conversations/${conversationId}/device-keys`),
    enabled: Boolean(conversationId),
  });
}

export function useChatDeviceKeys(enabled = true) {
  return useQuery({
    queryKey: chatDeviceKeyKeys.list,
    queryFn: () => apiFetch<ChatDeviceKey[]>('/chat/device-keys'),
    enabled,
  });
}

export function useRevokeChatDeviceKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deviceId: string) =>
      apiFetch<{ ok: boolean }>(`/chat/device-keys/${encodeURIComponent(deviceId)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatDeviceKeyKeys.list });
    },
  });
}

async function deriveBackupKey(password: string, salt: ArrayBuffer, iterations: number) {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
    salt,
      iterations,
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function generateStoredDeviceKey(deviceId: string): Promise<StoredChatDeviceKey> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveBits'],
  );
  const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return {
    deviceId,
    publicKey: toBase64Url(publicKey),
    privateKey,
    deviceName: getDeviceName(),
    createdAt: new Date().toISOString(),
  };
}

async function registerStoredDeviceKey(key: StoredChatDeviceKey) {
  await apiFetch('/chat/device-keys', {
    method: 'POST',
    body: {
      deviceId: key.deviceId,
      publicKey: key.publicKey,
      algorithm: 'ECDH-P256',
      deviceName: key.deviceName ?? getDeviceName(),
      userAgent: navigator.userAgent,
    },
  });
}

function setCurrentStoredDeviceKey(key: StoredChatDeviceKey) {
  window.localStorage.setItem(DEVICE_ID_KEY, key.deviceId);
  window.localStorage.setItem(PUBLIC_KEY_KEY, key.publicKey);
  window.localStorage.setItem(PRIVATE_KEY_KEY, JSON.stringify(key.privateKey));
  rememberDeviceKey(key);
}

export async function rotateCurrentChatDeviceKey() {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Este navegador no soporta rotación de claves.');
  }

  const previousDeviceId = getCurrentChatDeviceId();
  const nextKey = await generateStoredDeviceKey(crypto.randomUUID());
  setCurrentStoredDeviceKey(nextKey);
  await registerStoredDeviceKey(nextKey);

  if (previousDeviceId) {
    await apiFetch<{ ok: boolean }>(
      `/chat/device-keys/${encodeURIComponent(previousDeviceId)}`,
      {
        method: 'DELETE',
      },
    ).catch(() => null);
  }

  return {
    previousDeviceId,
    deviceId: nextKey.deviceId,
  };
}

export async function exportChatDeviceKeyBackup(password: string) {
  if (typeof window === 'undefined') {
    throw new Error('No se puede exportar desde el servidor.');
  }

  if (password.length < 10) {
    throw new Error('La contraseña debe tener al menos 10 caracteres.');
  }

  const backup: ChatDeviceKeyBackup = {
    version: 'cannaclub-chat-keyring-v1',
    exportedAt: new Date().toISOString(),
    currentDeviceId: getCurrentChatDeviceId(),
    keys: readKeyring(),
  };

  if (backup.keys.length === 0) {
    throw new Error('No hay claves locales para exportar.');
  }

  const iterations = 250_000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(password, salt.buffer, iterations);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    new TextEncoder().encode(JSON.stringify(backup)),
  );
  const encryptedBackup: EncryptedChatDeviceKeyBackup = {
    version: 'cannaclub-chat-keyring-encrypted-v1',
    exportedAt: new Date().toISOString(),
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: toBase64Url(salt),
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(ciphertext),
  };

  return JSON.stringify(encryptedBackup, null, 2);
}

export async function importChatDeviceKeyBackup(rawBackup: string, password: string) {
  if (typeof window === 'undefined') {
    throw new Error('No se puede importar desde el servidor.');
  }

  if (!password) {
    throw new Error('Introduce la contraseña de la copia.');
  }

  const encryptedBackup = JSON.parse(rawBackup) as Partial<EncryptedChatDeviceKeyBackup>;
  if (
    encryptedBackup.version !== 'cannaclub-chat-keyring-encrypted-v1' ||
    encryptedBackup.kdf !== 'PBKDF2-SHA256' ||
    typeof encryptedBackup.iterations !== 'number' ||
    typeof encryptedBackup.salt !== 'string' ||
    typeof encryptedBackup.iv !== 'string' ||
    typeof encryptedBackup.ciphertext !== 'string'
  ) {
    throw new Error('La copia de claves debe estar cifrada y tener formato válido.');
  }

  const key = await deriveBackupKey(
    password,
    fromBase64UrlBuffer(encryptedBackup.salt),
    encryptedBackup.iterations,
  );
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: fromBase64UrlBytes(encryptedBackup.iv),
    },
    key,
    fromBase64UrlBuffer(encryptedBackup.ciphertext),
  );
  const backup = JSON.parse(new TextDecoder().decode(decrypted)) as Partial<ChatDeviceKeyBackup>;

  if (
    backup.version !== 'cannaclub-chat-keyring-v1' ||
    !Array.isArray(backup.keys) ||
    backup.keys.length === 0
  ) {
    throw new Error('La copia de claves no es válida.');
  }

  const validKeys = backup.keys.filter(
    (key): key is StoredChatDeviceKey =>
      Boolean(
        key &&
          typeof key.deviceId === 'string' &&
          typeof key.publicKey === 'string' &&
          typeof key.privateKey === 'object',
      ),
  );

  if (validKeys.length === 0) {
    throw new Error('La copia no contiene claves válidas.');
  }

  writeKeyring([...readKeyring(), ...validKeys]);
  const currentKey =
    validKeys.find((key) => key.deviceId === backup.currentDeviceId) ?? validKeys[0];
  setCurrentStoredDeviceKey(currentKey);
  await registerStoredDeviceKey(currentKey);

  return {
    deviceId: currentKey.deviceId,
    importedKeys: validKeys.length,
  };
}

type ClientEncryptedPayload = {
  version: 'client-e2e-v1';
  algorithm: 'ECDH-P256+HKDF-SHA256+AES-GCM';
  senderPublicKey: string;
  iv: string;
  ciphertext: string;
  keys: Array<{
    userId?: string;
    deviceId: string;
    iv: string;
    encryptedKey: string;
  }>;
};

export async function createClientEncryptedPayload(
  plaintext: string,
  devices: ChatDeviceKey[],
) {
  if (typeof window === 'undefined' || !window.crypto?.subtle || devices.length === 0) {
    return null;
  }

  const privateKey = await getLocalPrivateKey();
  const senderPublicKey = getLocalPublicKey();
  if (!privateKey || !senderPublicKey) return null;

  const messageKey = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  );
  const messageIv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: messageIv,
    },
    messageKey,
    new TextEncoder().encode(plaintext),
  );
  const rawMessageKey = await crypto.subtle.exportKey('raw', messageKey);

  const keys = await Promise.all(
    devices
      .filter((device) => device.algorithm === 'ECDH-P256')
      .map(async (device) => {
        const recipientPublicKey = await importPublicKey(device.publicKey);
        const wrappingKey = await deriveWrappingKey(
          privateKey,
          recipientPublicKey,
          messageIv.buffer,
          device.deviceId,
        );
        const wrapIv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedKey = await crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv: wrapIv,
          },
          wrappingKey,
          rawMessageKey,
        );

        return {
          userId: device.userId,
          deviceId: device.deviceId,
          iv: toBase64Url(wrapIv),
          encryptedKey: toBase64Url(encryptedKey),
        };
      }),
  );

  return {
    version: 'client-e2e-v1',
    algorithm: 'ECDH-P256+HKDF-SHA256+AES-GCM',
    senderPublicKey,
    iv: toBase64Url(messageIv),
    ciphertext: toBase64Url(ciphertext),
    keys,
  } satisfies ClientEncryptedPayload;
}

function isClientEncryptedPayload(value: unknown): value is ClientEncryptedPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<ClientEncryptedPayload>;
  return (
    payload.version === 'client-e2e-v1' &&
    typeof payload.senderPublicKey === 'string' &&
    typeof payload.iv === 'string' &&
    typeof payload.ciphertext === 'string' &&
    Array.isArray(payload.keys)
  );
}

export async function decryptClientEncryptedPayload(payload: unknown) {
  if (!isClientEncryptedPayload(payload) || typeof window === 'undefined') return null;

  const localDeviceIds = Array.from(
    new Set([
      getCurrentChatDeviceId(),
      ...readKeyring().map((key) => key.deviceId),
    ].filter(Boolean) as string[]),
  );
  const wrappedKey = payload.keys.find((item) => localDeviceIds.includes(item.deviceId));
  if (!wrappedKey) return null;

  const privateKey = await getLocalPrivateKey(wrappedKey.deviceId);
  if (!privateKey) return null;

  const senderPublicKey = await importPublicKey(payload.senderPublicKey);
  const messageIv = fromBase64UrlBytes(payload.iv);
  const wrappingKey = await deriveWrappingKey(
    privateKey,
    senderPublicKey,
    messageIv.buffer,
    wrappedKey.deviceId,
  );
  const rawMessageKey = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: fromBase64UrlBytes(wrappedKey.iv),
    },
    wrappingKey,
    fromBase64UrlBuffer(wrappedKey.encryptedKey),
  );
  const messageKey = await crypto.subtle.importKey(
    'raw',
    rawMessageKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['decrypt'],
  );
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: messageIv,
    },
    messageKey,
    fromBase64UrlBuffer(payload.ciphertext),
  );

  return new TextDecoder().decode(plaintext);
}
