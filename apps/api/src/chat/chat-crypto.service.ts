import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const LEGACY_PREFIX = 'enc:v1:';
const PREFIX = 'enc:v2:';

@Injectable()
export class ChatCryptoService {
  private readonly keyId: string;
  private readonly keys: Map<string, Buffer>;

  constructor(configService: ConfigService) {
    this.keyId =
      configService.get<string>('CHAT_ENCRYPTION_KEY_ID') ?? 'default';
    const configuredSecret = configService.get<string>('CHAT_ENCRYPTION_KEY');

    if (!configuredSecret && process.env.NODE_ENV === 'production') {
      throw new Error(
        'CHAT_ENCRYPTION_KEY es obligatorio en producción. Configura esta variable de entorno antes de iniciar la API.',
      );
    }

    // Fallback SOLO para desarrollo/test local. Nunca se usa en producción
    // porque el guard anterior lanza un error si CHAT_ENCRYPTION_KEY falta.
    const currentSecret =
      configuredSecret ??
      configService.get<string>('JWT_SECRET') ??
      'cannaclub-chat-local-dev-key';
    const previousSecrets = (
      configService.get<string>('CHAT_ENCRYPTION_PREVIOUS_KEYS') ?? ''
    )
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    this.keys = new Map([
      [this.keyId, this.toKey(currentSecret)],
      ['default', this.toKey(currentSecret)],
    ]);

    for (const entry of previousSecrets) {
      const [id, secret] = entry.split(':');
      if (id && secret) {
        this.keys.set(id, this.toKey(secret));
      }
    }
  }

  encrypt(plainText: string) {
    if (
      !plainText ||
      plainText.startsWith(PREFIX) ||
      plainText.startsWith(LEGACY_PREFIX)
    ) {
      return plainText;
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv(
      'aes-256-gcm',
      this.keys.get(this.keyId)!,
      iv,
    );
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return `${PREFIX}${this.keyId}:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(value: string) {
    if (!value?.startsWith(PREFIX) && !value?.startsWith(LEGACY_PREFIX)) {
      return value;
    }

    const legacy = value.startsWith(LEGACY_PREFIX);
    const encoded = value.slice(legacy ? LEGACY_PREFIX.length : PREFIX.length);
    const parts = encoded.split(':');
    const keyId = legacy ? 'default' : parts[0];
    const ivValue = legacy ? parts[0] : parts[1];
    const tagValue = legacy ? parts[1] : parts[2];
    const encryptedValue = legacy ? parts[2] : parts[3];
    const key = this.keys.get(keyId);

    if (!ivValue || !tagValue || !encryptedValue || !key) {
      return 'Mensaje no disponible';
    }

    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivValue, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(tagValue, 'base64'));

      return Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      return 'Mensaje no disponible';
    }
  }

  private toKey(secret: string) {
    return createHash('sha256').update(secret).digest();
  }
}
