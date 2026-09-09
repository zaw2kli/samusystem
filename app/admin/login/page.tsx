"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, LogIn } from "lucide-react";
import { Card } from "@/components/ui/Surfaces";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { loginAdmin } from "@/services/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await loginAdmin(email, senha);
      router.push("/admin");
    } catch (err: any) {
      setErro(
        err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password"
          ? "E-mail ou senha inválidos."
          : err?.message ?? "Não foi possível fazer login."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded border border-accent/30 bg-accent/10 text-accent">
            <Radio className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold text-ink">Acesso administrativo</h1>
          <p className="mt-1 text-xs text-ink-faint">Entre com sua conta para gerenciar o sistema.</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                required
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            {erro && <p className="text-xs text-status-bad">{erro}</p>}

            <Button type="submit" className="w-full" loading={loading}>
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
