import { useEffect, useMemo, useState } from "react";
import { apiJson, apiFetch } from "../lib/api";

type InvoiceStatus = "Paid" | "Pending" | "Overdue" | "Draft";

type Invoice = {
  id: string | number;
  client: string;
  amount: number;
  currency?: string; // default USD
  date: string; // ISO date string
  status: InvoiceStatus;
  pdfUrl?: string; // optional direct link
  notes?: string;
};

function formatMoney(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // fallback if Intl/currency unsupported
    return `$${amount.toLocaleString()}`;
  }
}

export default function Accounting() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Invoice | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      /**
       * Expected backend (recommended):
       * GET /api/accounting/invoices
       * -> { invoices: Invoice[] }
       *
       * If you don't have this endpoint yet, you can temporarily return mocked data
       * from the backend until we wire real persistence.
       */
      const data = await apiJson("/accounting/invoices", { method: "GET" }, "Failed to load invoices");

      const list = Array.isArray(data?.invoices) ? data.invoices : Array.isArray(data) ? data : [];
      setInvoices(list);
    } catch (e: any) {
      // If endpoint doesn't exist yet, show a helpful message
      setError(e?.message || "Failed to load invoices");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) => {
      return (
        String(inv.id).toLowerCase().includes(q) ||
        inv.client.toLowerCase().includes(q) ||
        inv.status.toLowerCase().includes(q)
      );
    });
  }, [invoices, search]);

  const totals = useMemo(() => {
    let totalRevenue = 0;
    let pending = 0;
    let paidCount = 0;

    for (const inv of filtered) {
      totalRevenue += Number(inv.amount || 0);
      if (inv.status === "Paid") paidCount += 1;
      if (inv.status === "Pending") pending += Number(inv.amount || 0);
    }

    const currency = filtered[0]?.currency || "USD";

    return {
      currency,
      totalRevenue,
      pending,
      paidCount,
      count: filtered.length,
    };
  }, [filtered]);

  async function downloadInvoice(inv: Invoice) {
    try {
      // If invoice has a direct PDF URL, use it
      if (inv.pdfUrl) {
        window.open(inv.pdfUrl, "_blank", "noopener,noreferrer");
        return;
      }

      /**
       * Recommended backend:
       * GET /api/accounting/invoices/:id/pdf
       * -> returns PDF file
       */
      const res = await apiFetch(`/accounting/invoices/${encodeURIComponent(String(inv.id))}/pdf`, {
        method: "GET",
      });

      if (!res.ok) throw new Error("Failed to download invoice PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${inv.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || "Download failed");
    }
  }

  return (
    <div className="p-6">
      {/* PAGE TITLE */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Accounting & Invoices</h1>
          <p className="text-sm text-[#6b6b6b] mt-2">
            View invoices, revenue, and payment status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="px-3 py-2 rounded-lg border border-black/10 bg-white"
          />
          <button
            onClick={load}
            className="button-gradient px-4 py-2 rounded-lg text-sm"
            disabled={loading}
            title="Refresh"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="font-semibold">Couldn’t load invoices</div>
          <div className="text-sm mt-1">{error}</div>
          <div className="text-sm mt-2 opacity-80">
            If you haven’t built the endpoint yet, create: <code>/api/accounting/invoices</code>
          </div>
        </div>
      )}

      {/* REVENUE SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="glass p-6">
          <h2 className="text-sm opacity-80">Total Revenue</h2>
          <p className="text-3xl font-bold mt-2">
            {formatMoney(totals.totalRevenue, totals.currency)}
          </p>
        </div>

        <div className="glass p-6">
          <h2 className="text-sm opacity-80">Pending Payments</h2>
          <p className="text-3xl font-bold mt-2 text-red-400">
            {formatMoney(totals.pending, totals.currency)}
          </p>
        </div>

        <div className="glass p-6">
          <h2 className="text-sm opacity-80">Paid Invoices</h2>
          <p className="text-3xl font-bold mt-2 text-green-400">{totals.paidCount}</p>
        </div>

        <div className="glass p-6">
          <h2 className="text-sm opacity-80">Shown</h2>
          <p className="text-3xl font-bold mt-2">{totals.count}</p>
        </div>
      </div>

      {/* INVOICE LIST */}
      <div className="glass p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-2xl font-semibold gradient-text">Invoices</h2>
          <div className="text-sm text-[#6b6b6b]">
            {loading ? "Loading…" : `${filtered.length} invoice(s)`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/20">
                <th className="py-2 px-4">ID</th>
                <th className="py-2 px-4">Client</th>
                <th className="py-2 px-4">Amount</th>
                <th className="py-2 px-4">Date</th>
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="py-6 px-4 text-[#6b6b6b]" colSpan={6}>
                    No invoices found.
                  </td>
                </tr>
              )}

              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="py-2 px-4">{inv.id}</td>
                  <td className="py-2 px-4">{inv.client}</td>
                  <td className="py-2 px-4">{formatMoney(inv.amount, inv.currency || totals.currency)}</td>
                  <td className="py-2 px-4">{inv.date}</td>
                  <td
                    className={[
                      "py-2 px-4 font-semibold",
                      inv.status === "Paid" ? "text-green-400" : "",
                      inv.status === "Pending" ? "text-yellow-300" : "",
                      inv.status === "Overdue" ? "text-red-400" : "",
                      inv.status === "Draft" ? "text-white/70" : "",
                    ].join(" ")}
                  >
                    {inv.status}
                  </td>

                  <td className="py-2 px-4">
                    <button
                      onClick={() => setSelected(inv)}
                      className="glass px-3 py-1 text-sm rounded-lg"
                    >
                      View
                    </button>
                    <button
                      onClick={() => downloadInvoice(inv)}
                      className="button-gradient px-3 py-1 text-sm ml-2 rounded-lg"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}

              {loading && (
                <tr>
                  <td className="py-6 px-4 text-[#6b6b6b]" colSpan={6}>
                    Loading invoices…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MODAL */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass p-6 w-full max-w-xl rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold gradient-text">Invoice #{selected.id}</h3>
                <div className="text-sm text-white/80 mt-1">{selected.client}</div>
              </div>

              <button
                className="glass px-3 py-1 rounded-lg text-sm"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-3 text-white/90">
              <div className="flex justify-between">
                <span className="opacity-80">Amount</span>
                <span className="font-semibold">
                  {formatMoney(selected.amount, selected.currency || totals.currency)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="opacity-80">Date</span>
                <span className="font-semibold">{selected.date}</span>
              </div>

              <div className="flex justify-between">
                <span className="opacity-80">Status</span>
                <span className="font-semibold">{selected.status}</span>
              </div>

              {selected.notes && (
                <div className="pt-3 border-t border-white/10">
                  <div className="opacity-80 text-sm">Notes</div>
                  <div className="mt-1">{selected.notes}</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="glass px-4 py-2 rounded-lg text-sm"
                onClick={() => downloadInvoice(selected)}
              >
                Download PDF
              </button>
              <button
                className="button-gradient px-4 py-2 rounded-lg text-sm"
                onClick={() => setSelected(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
