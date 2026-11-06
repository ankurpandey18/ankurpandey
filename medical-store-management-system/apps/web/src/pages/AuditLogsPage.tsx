import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, ClipboardList, Info } from 'lucide-react';
import { auditApi } from '../services/api';
import { Button, EmptyState, Skeleton, PageHeader } from '../components/ui';
import { formatAuditAction, formatDate } from '../utils';

interface AuditItem {
  id: string;
  action: string;
  actorName: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditListResponse {
  items: AuditItem[];
  total: number;
  page: number;
  totalPages: number;
}

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'USER_LOGIN', label: 'Login' },
  { value: 'USER_LOGOUT', label: 'Logout' },
  { value: 'USER_LOGIN_FAILED', label: 'Login Failed' },
  { value: 'PASSWORD_CHANGED', label: 'Password Changed' },
  { value: 'PASSWORD_RESET', label: 'Password Reset' },
  { value: 'EMPLOYEE_CREATED', label: 'Employee Created' },
  { value: 'EMPLOYEE_UPDATED', label: 'Employee Updated' },
  { value: 'EMPLOYEE_ACTIVATED', label: 'Employee Activated' },
  { value: 'EMPLOYEE_DEACTIVATED', label: 'Employee Deactivated' },
];

const ACTION_COLORS: Record<string, string> = {
  USER_LOGIN: 'bg-emerald-50 text-emerald-700',
  USER_LOGOUT: 'bg-slate-100 text-slate-600',
  USER_LOGIN_FAILED: 'bg-red-50 text-red-700',
  PASSWORD_CHANGED: 'bg-amber-50 text-amber-700',
  PASSWORD_RESET: 'bg-amber-50 text-amber-700',
  EMPLOYEE_CREATED: 'bg-blue-50 text-blue-700',
  EMPLOYEE_UPDATED: 'bg-blue-50 text-blue-700',
  EMPLOYEE_ACTIVATED: 'bg-emerald-50 text-emerald-700',
  EMPLOYEE_DEACTIVATED: 'bg-red-50 text-red-700',
};

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, action, startDate, endDate],
    queryFn: () =>
      auditApi.list({
        page,
        limit: 25,
        action: action || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }) as Promise<AuditListResponse>,
    staleTime: 15_000,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Audit Logs"
        description="Complete audit trail of all system actions"
      />

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            id="audit-action-filter"
            aria-label="Filter by action"
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="flex gap-2 items-center">
            <label htmlFor="audit-start" className="text-sm text-slate-600 whitespace-nowrap">From:</label>
            <input
              id="audit-start"
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-2 items-center">
            <label htmlFor="audit-end" className="text-sm text-slate-600 whitespace-nowrap">To:</label>
            <input
              id="audit-end"
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {(action || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setAction(''); setStartDate(''); setEndDate(''); setPage(1); }}
            >
              Clear filters
            </Button>
          )}
        </div>
        {total > 0 && (
          <p className="text-xs text-slate-500 mt-2">{total} events found</p>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-6 h-6" />}
            title="No audit events"
            description="Events will appear as users take actions in the system."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Action</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Entity</th>
                  <th scope="col">IP Address</th>
                  <th scope="col">Timestamp</th>
                  <th scope="col" className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          ACTION_COLORS[item.action] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {formatAuditAction(item.action)}
                      </span>
                    </td>
                    <td className="font-medium text-slate-700">{item.actorName}</td>
                    <td className="text-xs text-slate-500">
                      {item.entityType && item.entityId
                        ? `${item.entityType} #${item.entityId.slice(0, 8)}…`
                        : '—'}
                    </td>
                    <td className="text-xs font-mono text-slate-500">{item.ipAddress ?? '—'}</td>
                    <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                    <td className="text-right">
                      {item.metadata && Object.keys(item.metadata).length > 0 && (
                        <button
                          onClick={() => setSelectedEntry(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          aria-label="View details"
                          title="View metadata"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedEntry(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-slate-800 mb-4">
              {formatAuditAction(selectedEntry.action)} — Details
            </h2>
            <pre className="text-xs bg-slate-50 rounded-lg p-4 overflow-auto max-h-72 text-slate-700">
              {JSON.stringify(selectedEntry.metadata, null, 2)}
            </pre>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedEntry(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
