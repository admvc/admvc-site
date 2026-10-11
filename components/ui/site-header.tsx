// components/site-header.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MEMBERS_AREA_URL, SITE_NAME } from "@/lib/constants";

type NavItem = { href: string; label: string };

export default function SiteHeader({ logoUrl }: { logoUrl?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav: NavItem[] = useMemo(
    () => [
      { href: "/", label: "Início" },
      { href: "/sobre", label: "Sobre" },
      { href: "/congregacoes", label: "Congregações" },
      { href: "/ministerios", label: "Ministérios" },
      { href: "/agenda", label: "Agenda" },
      { href: "/permanecer", label: "Permanecer" },
      { href: "/contato", label: "Contato" }
    ],
    []
  );

  // fecha o menu ao trocar de página
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-soft bg-bg/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-12 w-12 md:h-14 md:w-14 overflow-hidden rounded-2xl border border-soft bg-bg2">
            <Image
              src={logoUrl || "/images/logo_admvc.png"}
              alt={`${SITE_NAME} — Logo`}
              fill
              sizes="(max-width: 768px) 48px, 56px"
              className="object-contain"
              priority
            />
          </div>

          <div className="leading-tight">
            <div className="text-base font-semibold text-fg">{SITE_NAME}</div>
            <div className="text-xs text-muted2">Figueira da Foz · Leiria · Barcelos</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-5">
          {nav.map((i) => {
            const active = pathname === i.href;
            return (
              <Link
                key={i.href}
                href={i.href}
                className={[
                  "text-sm transition",
                  active ? "text-fg font-semibold" : "text-muted hover:text-fg"
                ].join(" ")}
              >
                {i.label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* CTA (sempre visível) */}
          <a
            href={MEMBERS_AREA_URL}
            className="btn btn-primary hidden sm:inline-flex"
            target="_blank"
            rel="noopener noreferrer"
            title="Acesso exclusivo para membros da ADMVC"
          >
            🔒 Área de Membros
          </a>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-xl border border-soft bg-bg2 px-3 py-2 text-fg"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Abrir menu"
          >
            <span className="text-lg">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      <div
        id="mobile-nav"
        className={[
          "md:hidden border-t border-soft bg-bg/95 backdrop-blur",
          open ? "block" : "hidden"
        ].join(" ")}
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-4 space-y-3">
          <div className="grid gap-2">
            {nav.map((i) => {
              const active = pathname === i.href;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  className={[
                    "flex items-center justify-between rounded-xl border px-4 py-3 text-sm",
                    active
                      ? "border-soft bg-bg2 text-fg font-semibold"
                      : "border-soft bg-bg2/50 text-muted hover:text-fg"
                  ].join(" ")}
                  onClick={() => setOpen(false)}
                >
                  <span>{i.label}</span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: "var(--g-figueira)", opacity: active ? 1 : 0.35 }}
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>

          {/* CTA também no mobile (abaixo) */}
          <a
            href={MEMBERS_AREA_URL}
            className="btn btn-primary w-full justify-center"
            target="_blank"
            rel="noopener noreferrer"
            title="Acesso exclusivo para membros da ADMVC"
            onClick={() => setOpen(false)}
          >
            🔒 Área de Membros
          </a>

          <div className="text-xs text-muted2">
            Acesso exclusivo para membros ADMVC.
          </div>
        </div>
      </div>
    </header>
  );
}
