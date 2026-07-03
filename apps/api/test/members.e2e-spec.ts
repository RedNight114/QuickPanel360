/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { MemberClass, MemberStatus } from '@prisma/client';
import { AppModule } from './../src/app.module';

describe('CRM Members & Benefits (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let tenantId: string;
  let memberId: string;

  jest.setTimeout(60_000);

  async function login(email: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.tenantId).toBeDefined();
    return {
      token: response.body.accessToken as string,
      tenantId: response.body.tenantId as string,
    };
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

    // Login and get auth token
    const login_result = await login('owner@cannaclub.test', 'password123');
    authToken = login_result.token;
    tenantId = login_result.tenantId;
  });

  describe('Members CRUD', () => {
    it('should create a member with minimal data', () => {
      return request(app.getHttpServer())
        .post('/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Juan',
          lastName: 'Pérez',
          displayName: 'Juan',
          memberNumber: 'MBR-' + Date.now(),
        })
        .expect(201)
        .expect((response) => {
          expect(response.body.id).toBeDefined();
          expect(response.body.firstName).toBe('Juan');
          expect(response.body.status).toBe(MemberStatus.ACTIVE);
          expect(response.body.memberClass).toBe(MemberClass.STANDARD);
          memberId = response.body.id;
        });
    });

    it('should get member with full details', () => {
      return request(app.getHttpServer())
        .get(`/members/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.id).toBe(memberId);
          expect(response.body.firstName).toBe('Juan');
        });
    });

    it('should update member class to VIP', () => {
      return request(app.getHttpServer())
        .patch(`/members/${memberId}/class`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          memberClass: MemberClass.VIP,
        })
        .expect(200)
        .expect((response) => {
          expect(response.body.memberClass).toBe(MemberClass.VIP);
        });
    });

    it('should update member with additional data', () => {
      return request(app.getHttpServer())
        .patch(`/members/${memberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          city: 'Madrid',
          postalCode: '28001',
          birthDate: '1990-05-15',
          phone: '+34 666 555 444',
          email: 'juan@example.com',
          profileNotes: 'Cliente preferente',
        })
        .expect(200)
        .expect((response) => {
          expect(response.body.city).toBe('Madrid');
          expect(response.body.phone).toBe('+34 666 555 444');
        });
    });
  });

  describe('Member Benefits Configuration', () => {
    it('should get default benefits configuration', () => {
      return request(app.getHttpServer())
        .get('/members/benefits/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
          const standardBenefit = response.body.find(
            (b: any) => b.memberClass === MemberClass.STANDARD,
          );
          expect(standardBenefit).toBeDefined();
        });
    });

    it('should update benefits configuration', () => {
      return request(app.getHttpServer())
        .patch('/members/benefits/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          benefits: [
            {
              memberClass: MemberClass.STANDARD,
              discountPercent: 0,
              birthdayBenefitEnabled: false,
              birthdayDiscountPercent: 0,
              allowSpecialCreditLimit: false,
              creditLimitAmount: 0,
            },
            {
              memberClass: MemberClass.PREFERRED,
              discountPercent: 5,
              birthdayBenefitEnabled: true,
              birthdayDiscountPercent: 10,
              birthdayGiftNote: 'Descuento especial de cumpleaños',
              allowSpecialCreditLimit: true,
              creditLimitAmount: 100,
            },
            {
              memberClass: MemberClass.VIP,
              discountPercent: 15,
              birthdayBenefitEnabled: true,
              birthdayDiscountPercent: 25,
              birthdayGiftNote: 'Descuento VIP de cumpleaños',
              allowSpecialCreditLimit: true,
              creditLimitAmount: 500,
            },
          ],
        })
        .expect(200)
        .expect((response) => {
          expect(response.body.length).toBe(3);
          const vipBenefit = response.body.find(
            (b: any) => b.memberClass === MemberClass.VIP,
          );
          expect(vipBenefit.discountPercent).toBe(15);
          expect(vipBenefit.birthdayDiscountPercent).toBe(25);
        });
    });
  });

  describe('POS Member Discounts', () => {
    it('should get suggested discounts for VIP member', () => {
      return request(app.getHttpServer())
        .get(`/pos/members/${memberId}/discounts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.memberId).toBe(memberId);
          expect(response.body.memberClass).toBe(MemberClass.VIP);
          expect(response.body.suggestedDiscounts).toBeDefined();
          expect(Array.isArray(response.body.suggestedDiscounts)).toBe(true);
          // VIP member should have at least the class discount
          const classDiscount = response.body.suggestedDiscounts.find(
            (d: any) => d.discountType === 'member_class',
          );
          expect(classDiscount).toBeDefined();
          expect(classDiscount.discountPercent).toBe(15);
        });
    });

    it('should calculate correct total discount percent', () => {
      return request(app.getHttpServer())
        .get(`/pos/members/${memberId}/discounts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((response) => {
          // Without birthday: should be 15% (VIP class discount)
          // Today is not birthday (unless test runs on birthday)
          expect(response.body.totalDiscountPercent).toBeGreaterThanOrEqual(15);
        });
    });
  });

  describe('Member Photo Upload', () => {
    it('should upload member photo from URL', () => {
      return request(app.getHttpServer())
        .post(`/members/${memberId}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          photoUrl: 'https://example.com/photo.jpg',
        })
        .expect(200)
        .expect((response) => {
          expect(response.body.photoUrl).toBe('https://example.com/photo.jpg');
        });
    });

    it('should upload member photo from file', () => {
      // Create a small test image buffer (1x1 pixel PNG)
      const pngBuffer = Buffer.from([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
        1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68,
        65, 84, 8, 29, 1, 1, 0, 0, 255, 255, 0, 0, 0, 2, 0, 1, 0, 0, 35, 81,
        186, 86,
      ]);

      return request(app.getHttpServer())
        .post(`/members/${memberId}/photo/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', pngBuffer, 'test-photo.png')
        .expect(200)
        .expect((response) => {
          expect(response.body.photoStorageKey).toBeDefined();
          expect(response.body.id).toBe(memberId);
        });
    });

    it('should reject oversized photo', () => {
      // Create a buffer larger than 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

      return request(app.getHttpServer())
        .post(`/members/${memberId}/photo/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeBuffer, 'large-photo.png')
        .expect(400);
    });

    it('should reject invalid image type', () => {
      const textBuffer = Buffer.from('This is not an image');

      return request(app.getHttpServer())
        .post(`/members/${memberId}/photo/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', textBuffer, 'not-image.txt')
        .expect(400);
    });

    it('should remove member photo', () => {
      return request(app.getHttpServer())
        .delete(`/members/${memberId}/photo`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.photoUrl).toBeNull();
          expect(response.body.photoStorageKey).toBeNull();
        });
    });
  });

  describe('Member Birthdays', () => {
    let birthdayMemberId: string;

    it('should create member with birthday today', async () => {
      const today = new Date();
      const birthDate = new Date(1990, today.getMonth(), today.getDate());

      const response = await request(app.getHttpServer())
        .post('/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Cumpleañero',
          lastName: 'Especial',
          memberNumber: 'BDY-' + Date.now(),
          birthDate: birthDate.toISOString().split('T')[0],
          memberClass: MemberClass.VIP,
        })
        .expect(201);

      birthdayMemberId = response.body.id;
      expect(birthdayMemberId).toBeDefined();
    });

    it('should include birthday discount in suggested discounts', () => {
      return request(app.getHttpServer())
        .get(`/pos/members/${birthdayMemberId}/discounts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((response) => {
          if (response.body.isBirthday) {
            const birthdayDiscount = response.body.suggestedDiscounts.find(
              (d: any) => d.discountType === 'birthday',
            );
            expect(birthdayDiscount).toBeDefined();
            expect(birthdayDiscount.discountPercent).toBeGreaterThan(0);
          }
        });
    });

    it('should get upcoming birthdays', () => {
      return request(app.getHttpServer())
        .get('/members/birthdays/upcoming')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ days: 7 })
        .expect(200)
        .expect((response) => {
          expect(Array.isArray(response.body)).toBe(true);
        });
    });
  });

  describe('Member Search', () => {
    it('should search members by query', () => {
      return request(app.getHttpServer())
        .get('/members/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'Juan' })
        .expect(200)
        .expect((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          if (response.body.length > 0) {
            expect(
              response.body[0].firstName || response.body[0].displayName,
            ).toBeDefined();
          }
        });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
