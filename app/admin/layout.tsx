"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminProvider, useAdmin } from "@/hooks/useAdmin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Loader2 } from "lucide-react";

function Guard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, loading } = useAdmin();
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (loading) return;
    if (!admin && !isLoginPage) router.replace("/admin/login");
    if (admin && isLoginPage) router.replace("/admin");
  }, [admin, loading, isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-950">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-base-950">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <Guard>{children}</Guard>
    </AdminProvider>
  );
}
