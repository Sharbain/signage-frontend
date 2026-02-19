import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type UserRow = { id: string; email: string; name?: string | null; role: string; createdAt?: string };

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("restricted");
  const [password, setPassword] = useState("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.admin.users.list();
      setUsers(data.users || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate() {
    setLoading(true);
    setError(null);
    try {
      await api.admin.users.create({ email, password, role, name: name || undefined });
      setEmail("");
      setName("");
      setPassword("");
      setRole("restricted");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Users</h2>
        <button
          className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
          onClick={refresh}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error ? <div className="mb-4 text-red-600">{error}</div> : null}

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <h3 className="font-semibold mb-3">Create user</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="border rounded-lg p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="border rounded-lg p-2" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="border rounded-lg p-2" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">admin</option>
            <option value="manager">manager</option>
            <option value="viewer">viewer</option>
            <option value="restricted">restricted</option>
          </select>
          <input className="border rounded-lg p-2" placeholder="Temp password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="mt-3">
          <button
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
            onClick={onCreate}
            disabled={loading || !email || !password}
          >
            Create
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          For development only. Later we’ll switch to Google sign-in + invite links.
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.name || "-"}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}</td>
              </tr>
            ))}
            {!users.length && !loading ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={4}>
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
