import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr));
}

export function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(dateStr));
}

export function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'OWNER':
      return 'badge-owner';
    case 'PHARMACIST':
      return 'badge-pharmacist';
    case 'BILLING_STAFF':
      return 'badge-billing';
    default:
      return 'badge-inactive';
  }
}

export function formatRoleName(role: string): string {
  const map: Record<string, string> = {
    OWNER: 'Owner',
    PHARMACIST: 'Pharmacist',
    BILLING_STAFF: 'Billing Staff',
  };
  return map[role] ?? role;
}

export function formatAuditAction(action: string): string {
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}
