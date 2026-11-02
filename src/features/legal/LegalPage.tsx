import { useEffect } from 'react'
import { Link, NavLink } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { config } from '@/config/env'
import { REPO_URL } from '@/config/project'
import { cn } from '@/lib/utils'

/** Public page shell for /privacy and /terms: readable without signing in. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} · ${config.appName}`
    return () => {
      document.title = previous
    }
  }, [title])

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-hairline bg-card">
        <div className="mx-auto flex h-14 max-w-[760px] items-center justify-between gap-3 px-4">
          <Link to="/" className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
            <Logo className="text-[21px]" />
          </Link>
          <nav aria-label="Legal" className="flex gap-1">
            <LegalNavLink to="/privacy">Privacy</LegalNavLink>
            <LegalNavLink to="/terms">Terms</LegalNavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[760px] px-4 py-8 sm:py-10">
        <article className="rounded-[14px] border border-border bg-card px-5 py-7 shadow-[0_1px_2px_rgba(14,23,38,0.04)] sm:px-9 sm:py-9">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Last updated {updated}</p>
          <div className="mt-6 flex flex-col gap-7 text-[14.5px] leading-relaxed text-label">{children}</div>
        </article>
      </main>
    </div>
  )
}

function LegalNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'rounded-lg px-3 py-1.5 text-[13.5px] font-semibold text-subtle-foreground outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring',
          isActive && 'bg-brand-soft text-brand-strong hover:bg-brand-soft',
        )
      }
    >
      {children}
    </NavLink>
  )
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">{children}</ul>
}

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-brand-strong underline-offset-2 hover:underline">
      {children}
    </a>
  )
}

/** "email x@y" when the operator set CONTACT_EMAIL, otherwise "open an issue on GitHub". Reads after "To reach us, ". */
export function ContactLink() {
  if (config.contactEmail) {
    return (
      <>
        email{' '}
        <a href={`mailto:${config.contactEmail}`} className="font-semibold text-brand-strong underline-offset-2 hover:underline">
          {config.contactEmail}
        </a>
      </>
    )
  }
  return (
    <>
      open an issue on <ExternalLink href={`${REPO_URL}/issues`}>GitHub</ExternalLink>
    </>
  )
}
