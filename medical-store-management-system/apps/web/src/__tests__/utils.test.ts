import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatDateOnly,
  getRoleBadgeClass,
  formatRoleName,
  formatAuditAction,
  getInitials,
} from '../utils';

describe('Web Utils', () => {
  describe('cn', () => {
    it('merges tailwind classes cleanly', () => {
      expect(cn('px-2 py-1', 'bg-blue-500')).toContain('bg-blue-500');
      expect(cn('p-4', undefined, 'p-2')).toBe('p-2');
    });
  });

  describe('formatting helpers', () => {
    it('formats date and handles falsy values', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
      expect(formatDate('2026-11-06T12:00:00Z')).toBeTruthy();
    });

    it('formats date only and handles falsy values', () => {
      expect(formatDateOnly(null)).toBe('—');
      expect(formatDateOnly('2026-11-06T12:00:00Z')).toBeTruthy();
    });

    it('returns appropriate badge class for role', () => {
      expect(getRoleBadgeClass('OWNER')).toBe('badge-owner');
      expect(getRoleBadgeClass('PHARMACIST')).toBe('badge-pharmacist');
      expect(getRoleBadgeClass('BILLING_STAFF')).toBe('badge-billing');
      expect(getRoleBadgeClass('UNKNOWN')).toBe('badge-inactive');
    });

    it('formats role name for display', () => {
      expect(formatRoleName('OWNER')).toBe('Owner');
      expect(formatRoleName('PHARMACIST')).toBe('Pharmacist');
      expect(formatRoleName('BILLING_STAFF')).toBe('Billing Staff');
      expect(formatRoleName('CUSTOM')).toBe('CUSTOM');
    });

    it('formats audit actions properly', () => {
      expect(formatAuditAction('USER_LOGIN')).toBe('User Login');
      expect(formatAuditAction('EMPLOYEE_CREATED')).toBe('Employee Created');
    });

    it('extracts initials properly', () => {
      expect(getInitials('Ankur Pandey')).toBe('AP');
      expect(getInitials('Owner')).toBe('O');
      expect(getInitials('John Middle Doe')).toBe('JM');
    });
  });
});
