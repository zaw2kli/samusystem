"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Users,
  CalendarRange,
  History,
  Trophy,
  UploadCloud,
  ListChecks,
  Settings,
  ScrollText,
  LogOut,
  Radio,
} from "lucide-react";
import { logoutAdmin } from "@/services/auth";
import { useAdmin } from "@/hooks/useAdmin";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/funcionarios", label: "Funcionários", icon: Users },
  { href: "/admin/semanas", label: "Semanas", icon: CalendarRange },
  { href: "/admin/importar", label: "Importar planilha", icon: UploadCloud },
  { href: "/admin/importacoes", label: "Importações", icon: ListChecks },
  { href: "/admin/historico", label: "Histórico", icon: History },
  { href: "/admin/destaques", label: "Destaques", icon: Trophy },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin } = useAdmin();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-base-border bg-base-900">
      <div className="flex items-center gap-2.5 border-b border-base-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded border border-accent/30 bg-accent/10 text-accent">
          <Radio className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-ink">SAMU</p>
          <p className="text-[11px] text-ink-faint">Painel Administrativo</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors",
                active ? "bg-accent/10 text-accent" : "text-ink-muted hover:bg-base-700 hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-base-border px-3 py-3">
        <div className="mb-2 px-2">
          <p className="truncate text-xs font-medium text-ink">{admin?.nome}</p>
          <p className="truncate text-[11px] text-ink-faint">{admin?.email}</p>
        </div>
        <button
          onClick={async () => {
            await logoutAdmin();
            router.push("/admin/login");
          }}
          className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-ink-muted hover:bg-base-700 hover:text-status-bad"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
