import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const json = await api.auth.login({ email, password });

      if (!json?.accessToken) {
        throw new Error("Login did not return an access token");
      }

      navigate("/", { replace: true });
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/bg.jpg')" }}
    >
      <div className="glass p-10 w-[380px]">
        <h1 className="text-3xl font-bold gradient-text text-center mb-6">CMS Login</h1>

        <div className="flex flex-col gap-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            className="w-full p-3 rounded-lg border border-white/30 bg-white/20 text-white focus:outline-none"
            autoComplete="email"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg border border-white/30 bg-white/20 text-white focus:outline-none"
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
          />

          {error ? <div className="text-red-200 text-sm">{error}</div> : null}

          <button
            className="button-gradient w-full text-lg disabled:opacity-60"
            onClick={onSubmit}
            disabled={loading || !email || !password}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="text-xs text-white/70">
            Tip: In Vercel set <span className="font-mono">VITE_API_BASE_URL</span> to your backend domain
            if you don&apos;t have a rewrite to <span className="font-mono">/api</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
