import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as crypto from 'crypto';

export interface StorageConfig {
  type: 'local' | 's3';
  local?: {
    uploadDir: string;
    privateDir: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface UploadOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
}

export interface StoredFile {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class StorageService {
  private config: StorageConfig;

  constructor() {
    this.config = {
      type: (process.env.STORAGE_TYPE as 'local' | 's3') || 'local',
      local: {
        uploadDir: process.env.STORAGE_LOCAL_DIR || 'storage/uploads',
        privateDir: process.env.STORAGE_PRIVATE_DIR || 'storage/private',
      },
      s3: {
        bucket: process.env.AWS_S3_BUCKET || '',
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    };

    if (this.config.type === 'local') {
      this.ensureLocalDirectories();
    }
  }

  private ensureLocalDirectories(): void {
    const dirs = [this.config.local!.uploadDir, this.config.local!.privateDir];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    tenantId: string,
    options: UploadOptions = {},
  ): Promise<StoredFile> {
    const maxSize = options.maxSizeBytes ?? DEFAULT_MAX_SIZE;
    const allowedTypes = options.allowedMimeTypes ?? DEFAULT_ALLOWED_TYPES;

    if (buffer.length > maxSize) {
      throw new BadRequestException(
        `El archivo excede el tamaño máximo de ${maxSize / 1024 / 1024}MB`,
      );
    }

    if (!allowedTypes.includes(mimeType)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Tipos aceptados: ${allowedTypes.join(', ')}`,
      );
    }

    if (this.config.type === 's3') {
      return this.uploadS3(buffer, originalName, mimeType, tenantId);
    }

    return this.uploadLocal(buffer, originalName, mimeType, tenantId);
  }

  private uploadLocal(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    tenantId: string,
  ): Promise<StoredFile> {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(originalName);
    const filename = `${timestamp}-${randomStr}${extension}`;
    const storageKey = `tenant/${tenantId}/${filename}`;
    const filePath = path.join(this.config.local!.privateDir, storageKey);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);

    return Promise.resolve({
      storageKey,
      originalName,
      mimeType,
      sizeBytes: buffer.length,
      uploadedAt: new Date(),
    });
  }

  private async uploadS3(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    tenantId: string,
  ): Promise<StoredFile> {
    const { bucket, region, accessKeyId, secretAccessKey } = this.config.s3!;
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new BadRequestException('S3 no está configurado correctamente');
    }

    const extension = path.extname(originalName);
    const storageKey = `tenant/${tenantId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}${extension}`;

    await this.s3Request('PUT', region, bucket, storageKey, buffer, mimeType, accessKeyId, secretAccessKey);

    return {
      storageKey,
      originalName,
      mimeType,
      sizeBytes: buffer.length,
      uploadedAt: new Date(),
    };
  }

  async getFile(storageKey: string): Promise<Buffer> {
    if (this.config.type === 's3') {
      return this.getFileS3(storageKey);
    }

    return this.getFileLocal(storageKey);
  }

  private getFileLocal(storageKey: string): Promise<Buffer> {
    const filePath = path.join(this.config.local!.privateDir, storageKey);
    if (!fs.existsSync(filePath)) {
      return Promise.reject(new BadRequestException('Archivo no encontrado'));
    }
    return Promise.resolve(fs.readFileSync(filePath));
  }

  private async getFileS3(storageKey: string): Promise<Buffer> {
    const { bucket, region, accessKeyId, secretAccessKey } = this.config.s3!;
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new BadRequestException('S3 no está configurado correctamente');
    }

    return this.s3Request('GET', region, bucket, storageKey, null, '', accessKeyId, secretAccessKey);
  }

  async deleteFile(storageKey: string): Promise<void> {
    if (this.config.type === 's3') {
      return this.deleteFileS3(storageKey);
    }

    return this.deleteFileLocal(storageKey);
  }

  private deleteFileLocal(storageKey: string): Promise<void> {
    const filePath = path.join(this.config.local!.privateDir, storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return Promise.resolve();
  }

  private async deleteFileS3(storageKey: string): Promise<void> {
    const { bucket, region, accessKeyId, secretAccessKey } = this.config.s3!;
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new BadRequestException('S3 no está configurado correctamente');
    }

    await this.s3Request('DELETE', region, bucket, storageKey, null, '', accessKeyId, secretAccessKey);
  }

  getStorageConfig(): StorageConfig {
    return this.config;
  }

  private s3Request(
    method: string,
    region: string,
    bucket: string,
    key: string,
    body: Buffer | null,
    contentType: string,
    accessKeyId: string,
    secretAccessKey: string,
  ): Promise<Buffer> {
    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);
    const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const payloadHash = crypto.createHash('sha256').update(body ?? '').digest('hex');

    const headers: Record<string, string> = {
      Host: host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
    };

    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const signedHeaderKeys = Object.keys(headers).map((h) => h.toLowerCase()).sort().join(';');
    const canonicalHeaders = Object.keys(headers)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map((h) => `${h.toLowerCase()}:${headers[h]}\n`)
      .join('');

    const canonicalRequest = [
      method,
      `/${key}`,
      '',
      canonicalHeaders,
      signedHeaderKeys,
      payloadHash,
    ].join('\n');

    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = this.getSignatureKey(secretAccessKey, dateStamp, region, 's3');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaderKeys}, Signature=${signature}`;

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: host,
          path: `/${key}`,
          method,
          headers: { ...headers, Authorization: authorization },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const responseBody = Buffer.concat(chunks);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(responseBody);
            } else {
              reject(new BadRequestException(`S3 ${method} failed: ${res.statusCode}`));
            }
          });
        },
      );

      req.on('error', (err) => reject(new BadRequestException(`S3 error: ${err.message}`)));

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  private getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
    const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    return crypto.createHmac('sha256', kService).update('aws4_request').digest();
  }
}
