export const prismaGuardMock = {
  tenant: {
    findUnique: jest.fn().mockResolvedValue({
      status: 'ACTIVE',
      accessStatus: 'ENABLED',
      subscription: null,
    }),
  },
  platformModuleDefinition: {
    findUnique: jest.fn().mockResolvedValue(null),
  },
};
