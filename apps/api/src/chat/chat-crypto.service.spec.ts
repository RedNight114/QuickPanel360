import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatCryptoService } from './chat-crypto.service';

describe('ChatCryptoService', () => {
  async function buildService(envValues: Record<string, string | undefined>) {
    const configService = {
      get: jest.fn((key: string) => envValues[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatCryptoService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    return module.get<ChatCryptoService>(ChatCryptoService);
  }

  describe('encrypt/decrypt roundtrip', () => {
    it('encrypts and decrypts plain text using the current key', async () => {
      const service = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v1',
        CHAT_ENCRYPTION_KEY: 'test-key-current-secret',
      });

      const plainText = 'Hola, este es un mensaje secreto.';
      const encrypted = service.encrypt(plainText);

      expect(encrypted).not.toEqual(plainText);
      expect(encrypted.startsWith('enc:v2:v1:')).toBe(true);

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toEqual(plainText);
    });

    it('produces different ciphertext for the same plaintext due to random IV', async () => {
      const service = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v1',
        CHAT_ENCRYPTION_KEY: 'test-key-current-secret',
      });

      const plainText = 'Mismo contenido';
      const first = service.encrypt(plainText);
      const second = service.encrypt(plainText);

      expect(first).not.toEqual(second);
      expect(service.decrypt(first)).toEqual(plainText);
      expect(service.decrypt(second)).toEqual(plainText);
    });

    it('does not double-encrypt a value that already has the current prefix', async () => {
      const service = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v1',
        CHAT_ENCRYPTION_KEY: 'test-key-current-secret',
      });

      const encryptedOnce = service.encrypt('texto original');
      const encryptedTwice = service.encrypt(encryptedOnce);

      expect(encryptedTwice).toEqual(encryptedOnce);
    });

    it('returns falsy/empty input unchanged without throwing', async () => {
      const service = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v1',
        CHAT_ENCRYPTION_KEY: 'test-key-current-secret',
      });

      expect(service.encrypt('')).toEqual('');
    });

    it('returns plain (non-prefixed) values unchanged when decrypting', async () => {
      const service = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v1',
        CHAT_ENCRYPTION_KEY: 'test-key-current-secret',
      });

      expect(service.decrypt('mensaje sin cifrar')).toEqual(
        'mensaje sin cifrar',
      );
    });
  });

  describe('key rotation and previous keys', () => {
    it('decrypts messages encrypted with a previous key after rotation', async () => {
      const oldService = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v1',
        CHAT_ENCRYPTION_KEY: 'test-key-old-secret',
      });

      const encryptedWithOldKey = oldService.encrypt('mensaje histórico');

      const rotatedService = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v2',
        CHAT_ENCRYPTION_KEY: 'test-key-new-secret',
        CHAT_ENCRYPTION_PREVIOUS_KEYS: 'v1:test-key-old-secret',
      });

      expect(rotatedService.decrypt(encryptedWithOldKey)).toEqual(
        'mensaje histórico',
      );
    });

    it('encrypts new messages using the current key id, not a previous one', async () => {
      const service = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v2',
        CHAT_ENCRYPTION_KEY: 'test-key-new-secret',
        CHAT_ENCRYPTION_PREVIOUS_KEYS: 'v1:test-key-old-secret',
      });

      const encrypted = service.encrypt('mensaje nuevo');

      expect(encrypted.startsWith('enc:v2:v2:')).toBe(true);
    });

    it('supports multiple previous keys separated by commas', async () => {
      const v1Service = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v1',
        CHAT_ENCRYPTION_KEY: 'test-key-secret-one',
      });
      const v2Service = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v2',
        CHAT_ENCRYPTION_KEY: 'test-key-secret-two',
      });

      const encryptedV1 = v1Service.encrypt('mensaje v1');
      const encryptedV2 = v2Service.encrypt('mensaje v2');

      const currentService = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v3',
        CHAT_ENCRYPTION_KEY: 'test-key-secret-three',
        CHAT_ENCRYPTION_PREVIOUS_KEYS:
          'v1:test-key-secret-one,v2:test-key-secret-two',
      });

      expect(currentService.decrypt(encryptedV1)).toEqual('mensaje v1');
      expect(currentService.decrypt(encryptedV2)).toEqual('mensaje v2');
    });

    it('falls back to JWT_SECRET when CHAT_ENCRYPTION_KEY is not set', async () => {
      const service = await buildService({
        JWT_SECRET: 'test-key-jwt-fallback-secret',
      });

      const encrypted = service.encrypt('mensaje con fallback');
      expect(service.decrypt(encrypted)).toEqual('mensaje con fallback');
    });
  });

  describe('legacy format support', () => {
    it('decrypts legacy enc:v1: payloads encrypted with the default key id', async () => {
      const service = await buildService({
        CHAT_ENCRYPTION_KEY: 'test-key-legacy-secret',
      });

      // Build a legacy-format ciphertext manually using the same key material
      // the service derives for the implicit 'default' key id.
      const plainText = 'mensaje legado';
      const encryptedCurrentFormat = service.encrypt(plainText);
      const [, , , iv, tag, data] = encryptedCurrentFormat.split(':');
      const legacyValue = `enc:v1:${iv}:${tag}:${data}`;

      expect(service.decrypt(legacyValue)).toEqual(plainText);
    });
  });

  describe('integrity and tampering protection', () => {
    it('returns a fallback message when the auth tag does not match (tampered ciphertext)', async () => {
      const service = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v1',
        CHAT_ENCRYPTION_KEY: 'test-key-integrity-secret',
      });

      const encrypted = service.encrypt('mensaje íntegro');
      const parts = encrypted.split(':');
      // Tamper with the encrypted payload (last segment) while keeping the rest valid.
      const tamperedDataB64 = Buffer.from('tampered-data-payload').toString(
        'base64',
      );
      parts[parts.length - 1] = tamperedDataB64;
      const tampered = parts.join(':');

      expect(service.decrypt(tampered)).toEqual('Mensaje no disponible');
    });

    it('returns a fallback message when decrypting with an unknown key id', async () => {
      const service = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v1',
        CHAT_ENCRYPTION_KEY: 'test-key-known-secret',
      });

      const encrypted = service.encrypt('mensaje');
      const withUnknownKeyId = encrypted.replace('enc:v2:v1:', 'enc:v2:v99:');

      expect(service.decrypt(withUnknownKeyId)).toEqual(
        'Mensaje no disponible',
      );
    });

    it('returns a fallback message for malformed payloads missing required parts', async () => {
      const service = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v1',
        CHAT_ENCRYPTION_KEY: 'test-key-malformed-secret',
      });

      expect(service.decrypt('enc:v2:v1:onlyoneparttoofew')).toEqual(
        'Mensaje no disponible',
      );
    });

    it('returns a fallback message when the IV is invalid', async () => {
      const service = await buildService({
        CHAT_ENCRYPTION_KEY_ID: 'v1',
        CHAT_ENCRYPTION_KEY: 'test-key-iv-secret',
      });

      const encrypted = service.encrypt('mensaje');
      const parts = encrypted.split(':');
      parts[3] = Buffer.from('short').toString('base64'); // invalid IV length for GCM
      const corrupted = parts.join(':');

      expect(service.decrypt(corrupted)).toEqual('Mensaje no disponible');
    });
  });
});
