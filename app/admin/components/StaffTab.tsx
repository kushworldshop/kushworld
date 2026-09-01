'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import {
  STAFF_PERMISSIONS,
  STAFF_PERMISSION_LABELS,
  type StaffPermission,
} from '@/lib/adminPermissions';

interface StaffRow {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'mod';
  permissions: StaffPermission[];
  enabled: boolean;
}

const emptyForm = {
  name: '',
  username: '',
  passcode: '',
  role: 'mod' as 'admin' | 'mod',
  permissions: ['orders', 'products'] as StaffPermission[],
};

export default function StaffTab() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await adminFetch('/api/admin/staff');
    const data = await res.json();
    if (res.ok && data.success) setStaff(data.staff || []);
    else setError(data.error || 'Could not load staff');
  };

  useEffect(() => {
    void load();
  }, []);

  const togglePermission = (permission: StaffPermission) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  };

  const startEdit = (row: StaffRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      username: row.username,
      passcode: '',
      role: row.role,
      permissions: row.permissions,
    });
    setMessage('');
    setError('');
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/staff', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingId
            ? {
                id: editingId,
                name: form.name,
                passcode: form.passcode,
                role: form.role,
                permissions: form.permissions,
              }
            : form
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Save failed');
        return;
      }
      setMessage(editingId ? 'Staff updated.' : `Created ${data.staff.username}.`);
      resetForm();
      await load();
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: StaffRow) => {
    if (!confirm(`Remove ${row.name} (${row.username})? They will lose access immediately.`)) return;
    const res = await adminFetch('/api/admin/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || 'Remove failed');
      return;
    }
    if (editingId === row.id) resetForm();
    setMessage(`Removed ${row.username}.`);
    await load();
  };

  const toggleEnabled = async (row: StaffRow) => {
    const res = await adminFetch('/api/admin/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, enabled: !row.enabled }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || 'Update failed');
      return;
    }
    await load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Mods & admins</h2>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Only you can add or remove people. Admins get full site access except this staff list. Mods only get the boxes you check.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
        <h3 className="font-semibold">{editingId ? 'Edit staff' : 'Add staff'}</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Display name</label>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2"
              placeholder="Jordan"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Login name</label>
            <input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2"
              placeholder="jordan"
              disabled={Boolean(editingId)}
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">
              {editingId ? 'New passcode (blank = keep)' : 'Passcode'}
            </label>
            <input
              type="password"
              value={form.passcode}
              onChange={(event) => setForm({ ...form, passcode: event.target.value })}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2"
              placeholder="at least 6 characters"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Access</label>
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as 'admin' | 'mod' })}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2"
            >
              <option value="mod">Mod — only checked permissions</option>
              <option value="admin">Admin — full access except adding staff</option>
            </select>
          </div>
        </div>

        {form.role === 'mod' && (
          <div className="grid sm:grid-cols-2 gap-2 pt-2">
            {STAFF_PERMISSIONS.map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.permissions.includes(permission)}
                  onChange={() => togglePermission(permission)}
                />
                {STAFF_PERMISSION_LABELS[permission]}
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="px-6 py-3 bg-[#00ff9d] text-black rounded-2xl font-bold disabled:opacity-50"
          >
            {editingId ? 'Save staff' : 'Add staff'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-6 py-3 bg-zinc-800 rounded-2xl">
              Cancel
            </button>
          )}
        </div>
        {message && <p className="text-sm text-[#00ff9d]">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="space-y-3">
        {staff.length === 0 && <p className="text-zinc-500 text-sm">No mods or admins yet.</p>}
        {staff.map((row) => (
          <div
            key={row.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between"
          >
            <div>
              <p className="font-semibold">
                {row.name}{' '}
                <span className="text-zinc-500 font-normal">@{row.username}</span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {row.role === 'admin' ? 'Admin · full access' : `Mod · ${row.permissions.length} permission${row.permissions.length === 1 ? '' : 's'}`}
                {row.enabled ? '' : ' · disabled'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => startEdit(row)} className="px-4 py-2 bg-zinc-800 rounded-xl text-sm">
                Edit
              </button>
              <button onClick={() => void toggleEnabled(row)} className="px-4 py-2 bg-zinc-800 rounded-xl text-sm">
                {row.enabled ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => void remove(row)} className="px-4 py-2 bg-red-900/60 rounded-xl text-sm">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
