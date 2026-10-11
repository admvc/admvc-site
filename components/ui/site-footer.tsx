import Image from "next/image";
import Link from "next/link";
import { MEMBERS_AREA_URL, SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export default function SiteFooter() {
  return (
    <footer className="border-t border-soft bg-bg2">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-soft bg-bg">
                <Image
                  src="/images/logo_admvc.png"
                  alt={`${SITE_NAME} — Logo`}
                  fill
                  sizes="40px"
                  className="object-contain p-1"
                />
              </div>
              <div>
                <div className="text-base font-semibold text-fg">{SITE_NAME}</div>
                <div className="text-sm text-muted">{SITE_TAGLINE}</div>
              </div>
            </div>

            <div className="text-sm text-muted2">
              Sede: Figueira da Foz<br />
              Congregações: Leiria · Barcelos
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-fg">Links</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="text-muted hover:text-fg" href="/sobre">Sobre</Link></li>
              <li><Link className="text-muted hover:text-fg" href="/congregacoes">Congregações</Link></li>
              <li><Link className="text-muted hover:text-fg" href="/ministerios">Ministérios</Link></li>
              <li><Link className="text-muted hover:text-fg" href="/agenda">Agenda</Link></li>
              <li><Link className="text-muted hover:text-fg" href="/permanecer">Permanecer</Link></li>
              <li><Link className="text-muted hover:text-fg" href="/contato">Contato</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold text-fg">Área de Membros</div>
            <p className="mt-3 text-sm text-muted">Acesso exclusivo para membros da ADMVC.</p>
            <a
              href={MEMBERS_AREA_URL}
              className="btn btn-primary mt-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Entrar
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-soft pt-6 text-xs text-muted2">
          © {new Date().getFullYear()} {SITE_NAME}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
