import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { AccessDenied, Alert, EmptyState, PageHeader, Spinner } from '../../components/Ui';
import Pill from '../../components/Pill';
import { formatDateTime } from '../../lib/utils';

const ACTION_TONE = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'info',
};

const ACTION_LABELS = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  LOGIN: 'Logged in',
};

export default function AuditPage() {
  const { can } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get('/audit');
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!can.audit) return;
    load();
  }, [can.audit, load]);

  const entities = useMemo(() => {
    const set = new Set(logs.map((log) => log.entity || ''));
    set.delete('');
    return ['', ...Array.from(set).sort()];
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchesEntity = !entityFilter || log.entity === entityFilter;
      const term = filter.toLowerCase();
      const matchesTerm =
        !term ||
        [
          log.action,
          log.entity,
          log.entityId,
          log.username,
          log.description,
          log.changes,
        ]
          .join(' ')
          .toLowerCase()
          .includes(term);
      return matchesEntity && matchesTerm;
    });
  }, [logs, filter, entityFilter]);

  if (!can.audit) {
    return <AccessDenied description="Only administrators can view the audit log." />;
  }

  if (loading) return <Spinner label="Loading audit log…" />;

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="A full history of actions performed in the system."
      />

      <Alert>{error}</Alert>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search action, user, entity or description…"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500"
        />
        <select
          value={entityFilter}
          onChange={(event) => setEntityFilter(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
        >
          <option value="">All entities</option>
          {entities.map((entity) => (
            <option key={entity} value={entity}>
              {entity}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No audit records found" description="Actions performed in the system will be recorded here." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-3 pl-4 pr-4 font-medium">Time</th>
                  <th className="py-3 pr-4 font-medium">Action</th>
                  <th className="py-3 pr-4 font-medium">Entity</th>
                  <th className="py-3 pr-4 font-medium">User</th>
                  <th className="py-3 pr-4 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 pl-4 pr-4 whitespace-nowrap text-slate-400">
                      {formatDateTime(log.createdAt || log.timestamp)}
                    </td>
                    <td className="py-3 pr-4">
                      <Pill tone={ACTION_TONE[log.action] || 'neutral'}>
                        {ACTION_LABELS[log.action] || log.action}
                      </Pill>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium text-slate-200">{log.entity || '—'}</span>
                      {log.entityId && <span className="ml-1 text-xs text-slate-500">#{log.entityId}</span>}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{log.username || '—'}</td>
                    <td className="py-3 pr-4">
                      <p className="text-slate-300">{log.description || '—'}</p>
                      {log.changes && (
                        <pre className="mt-1 max-h-24 overflow-auto rounded bg-slate-950/60 p-2 text-xs text-slate-400">
                          {typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
