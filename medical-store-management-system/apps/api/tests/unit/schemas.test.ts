/**
 * Unit tests for shared validation schemas
 */
import { describe, it, expect } from 'vitest';
import {
  LoginSchema,
  ChangePasswordSchema,
  CreateEmployeeSchema,
  EmployeeListQuerySchema,
} from '@medstore/shared';

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = LoginSchema.safeParse({ email: 'test@example.com', password: 'pass' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('lowercases email', () => {
    const result = LoginSchema.safeParse({ email: 'Test@EXAMPLE.COM', password: 'x' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('rejects invalid email', () => {
    const result = LoginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = LoginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('ChangePasswordSchema', () => {
  const validPassword = 'SecurePass@123';

  it('accepts valid password change', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: validPassword,
      confirmPassword: validPassword,
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: validPassword,
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
  });

  it('rejects passwords shorter than 10 chars', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'Short@1',
      confirmPassword: 'Short@1',
    });
    expect(result.success).toBe(false);
  });

  it('requires uppercase', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'alllowercase@123',
      confirmPassword: 'alllowercase@123',
    });
    expect(result.success).toBe(false);
  });

  it('requires special character', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'NoSpecial1234',
      confirmPassword: 'NoSpecial1234',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateEmployeeSchema', () => {
  it('accepts valid employee data', () => {
    const result = CreateEmployeeSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@medstore.in',
      employeeCode: 'EMP002',
      role: 'PHARMACIST',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid mobile number', () => {
    const result = CreateEmployeeSchema.safeParse({
      name: 'Jane',
      email: 'jane@medstore.in',
      employeeCode: 'EMP002',
      role: 'PHARMACIST',
      phone: '1234567890', // doesn't start with 6-9
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = CreateEmployeeSchema.safeParse({
      name: 'Jane',
      email: 'jane@medstore.in',
      employeeCode: 'EMP002',
      role: 'ADMIN', // not a valid role
    });
    expect(result.success).toBe(false);
  });
});

describe('EmployeeListQuerySchema', () => {
  it('applies defaults', () => {
    const result = EmployeeListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string numbers', () => {
    const result = EmployeeListQuerySchema.safeParse({ page: '2', limit: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });
});
