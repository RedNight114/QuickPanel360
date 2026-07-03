/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Preproduction smoke (e2e)', () => {
  let app: INestApplication<App>;

  jest.setTimeout(30_000);

  async function login(email: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    return response.body.accessToken as string;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('ok');
        expect(response.body.timestamp).toBeDefined();
      });
  });

  it('/auth/login rejects invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'invalid@example.com', password: 'wrong' })
      .expect(401);
  });

  it('/platform/summary rejects anonymous users', () => {
    return request(app.getHttpServer()).get('/platform/summary').expect(401);
  });

  it('owner login works and cannot access platform summary', async () => {
    const token = await login('owner@demo.com', 'Owner123!');

    await request(app.getHttpServer())
      .get('/platform/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('superadmin login works and can access platform summary', async () => {
    const token = await login('superadmin@demo.com', 'Superadmin123!');

    await request(app.getHttpServer())
      .get('/platform/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.totalTenants).toBeDefined();
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
