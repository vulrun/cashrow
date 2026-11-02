import { Link } from 'react-router'
import { ArrowRightIcon, CheckIcon, CodeIcon, FileSpreadsheetIcon, ListFilterIcon, ScaleIcon, SheetIcon, ShieldCheckIcon, UsersIcon, ZapIcon } from 'lucide-react'
import { AppTile, Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { config } from '@/config/env'
import { REPO_URL, SETUP_GUIDE_URL } from '@/config/project'
import { balanceCaption, entryLabels } from '@/domain/ledger'
import { DEFAULT_SETTINGS } from '@/domain/schemas'
import type { EntryInput } from '@/domain/types'
import { formatDayMonth } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: SheetIcon,
    title: 'Your own Google Sheet',
    text: 'Every party gets a tab in a spreadsheet in your Drive. Open it, share it or print it whenever you like.',
  },
  {
    icon: UsersIcon,
    title: 'Every party in one place',
    text: 'Customers, suppliers, anyone. Archive a party to tidy up; nothing is deleted.',
  },
  {
    icon: ScaleIcon,
    title: 'Balances at a glance',
    text: 'Cash in, cash out and the net balance for each party, and the totals across all of them.',
  },
  {
    icon: ListFilterIcon,
    title: 'Find any entry',
    text: 'Filter by type, payment method or date range, and search your notes.',
  },
  {
    icon: ZapIcon,
    title: 'Quick to fill in',
    text: 'Save & add new keeps the date, type and method, so a stack of receipts goes in fast.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Private by design',
    text: 'No server and no tracking. The app can only see the spreadsheets it creates.',
  },
]

const STEPS = [
  { title: 'Sign in with Google', text: 'The app asks only for the files it creates, not the rest of your Drive.' },
  { title: 'Choose a cash book', text: 'Create a new spreadsheet in your Drive, or open one you made before.' },
  { title: 'Record as you go', text: 'Add parties and note every payment. Each entry is a row you can see in the sheet.' },
]

/** "/" for signed-out visitors (see RequireAuth). Every call to action goes to /login. */
export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-hairline bg-card">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
            <Logo className="text-[22px]" />
          </Link>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </Button>
            <Button asChild variant="brand" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-[1120px] items-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16 lg:py-20">
          <div className="flex flex-col items-start gap-6">
            <span className="rounded-full border border-brand-border bg-brand-soft px-3 py-1 text-[12.5px] font-semibold text-brand-strong">
              Free and open source
            </span>
            <h1 className="text-[40px] leading-[1.05] font-extrabold tracking-[-0.035em] sm:text-[54px]">
              Cash in, cash out.
              <br />
              <span className="text-brand">One row at a time.</span>
            </h1>
            <p className="max-w-[520px] text-[16.5px] leading-relaxed text-subtle-foreground">
              A simple cash book for every party you deal with: customers, suppliers, anyone. Your entries are saved in
              a Google Sheet in your own Drive.
            </p>
            <Button asChild variant="brand" size="lg">
              <Link to="/login">
                Get started
                <ArrowRightIcon />
              </Link>
            </Button>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-subtle-foreground">
              {['Free to use', 'No account to create', 'Data stays in your Drive'].map((point) => (
                <li key={point} className="flex items-center gap-1.5">
                  <CheckIcon className="size-4 text-brand" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <LedgerPreview />
        </section>

        <section aria-labelledby="features-title" className="border-y border-hairline bg-card">
          <div className="mx-auto max-w-[1120px] px-4 py-14 sm:px-6 sm:py-16">
            <SectionHeading id="features-title" eyebrow="Features" title="Everything a cash book needs" />
            <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-[14px] border border-border bg-background p-5">
                  <span className="flex size-10 items-center justify-center rounded-[10px] bg-brand-soft text-brand-strong">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-[15px] font-bold">{title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-subtle-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="steps-title" className="mx-auto max-w-[1120px] px-4 py-14 sm:px-6 sm:py-16">
          <SectionHeading id="steps-title" eyebrow="How it works" title="Up and running in three steps" />
          <ol className="mt-9 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4 rounded-[14px] border border-border bg-card p-5 shadow-[0_1px_2px_rgba(14,23,38,0.04)]">
                <span className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-[14px] font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[15px] font-bold">{step.title}</h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-subtle-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col gap-4 rounded-[14px] border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-muted text-foreground">
              <CodeIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <h2 className="text-[15px] font-bold">Open source, MIT licensed</h2>
              <p className="mt-1 text-[13.5px] leading-relaxed text-subtle-foreground">
                Read the code, or run your own copy on any static host with your own Google OAuth client ID.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={REPO_URL} target="_blank" rel="noreferrer">
                  View on GitHub
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a href={SETUP_GUIDE_URL} target="_blank" rel="noreferrer">
                  Setup guide
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section aria-labelledby="start-title" className="mx-auto max-w-[1120px] px-4 pb-16 sm:px-6">
          <div className="flex flex-col items-center gap-5 rounded-2xl bg-brand px-6 py-12 text-center text-white">
            <AppTile className="size-14 bg-white/12" />
            <div>
              <h2 id="start-title" className="text-[26px] font-extrabold tracking-[-0.02em] sm:text-[30px]">
                Start your cash book
              </h2>
              <p className="mt-2 text-[15px] text-white/80">
                {config.demoEnabled
                  ? 'Sign in with Google, or try the demo with sample data first.'
                  : 'Sign in with Google to create your first cash book.'}
              </p>
            </div>
            <Button asChild variant="outline" size="lg" className="border-transparent text-brand-strong hover:bg-brand-soft">
              <Link to="/login">
                Get started
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Logo className="text-[17px]" />
            <span className="text-[12.5px] text-muted-foreground">Free and open source under the MIT License.</span>
          </div>
          <nav aria-label="Footer" className="flex gap-4 text-[13px]">
            <FooterLink to="/privacy">Privacy</FooterLink>
            <FooterLink to="/terms">Terms</FooterLink>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className={FOOTER_LINK}>
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

function SectionHeading({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div>
      <p className="eyebrow text-brand-strong">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] sm:text-[30px]">
        {title}
      </h2>
    </div>
  )
}

const FOOTER_LINK =
  'font-medium text-subtle-foreground underline-offset-2 outline-none hover:text-brand-strong hover:underline focus-visible:underline'

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className={FOOTER_LINK}>
      {children}
    </Link>
  )
}

/* The hero picture: a party's ledger drawn with the app's own labels and formatters, so it never drifts from the real screens. */
const SAMPLE_IN = 112750
const SAMPLE_OUT = 34000
const SAMPLE_ROWS: Omit<EntryInput, 'method'>[] = [
  { date: '2026-10-30', type: 'IN', amount: 10250, notes: 'Balance cleared, invoice #1190' },
  { date: '2026-10-28', type: 'OUT', amount: 5000, notes: 'Credit note #1206' },
  { date: '2026-10-21', type: 'IN', amount: 7500, notes: 'Part payment, invoice #1255' },
  { date: '2026-10-14', type: 'OUT', amount: 2250, notes: 'Commission paid' },
]

function LedgerPreview() {
  const { currency, dateFormat } = DEFAULT_SETTINGS
  const labels = entryLabels({ inLabel: '', outLabel: '' })
  const balance = SAMPLE_IN - SAMPLE_OUT

  return (
    <div
      role="img"
      aria-label="Example of one party's cash book: cash in, cash out, the net balance and the latest entries."
      className="relative pb-5"
    >
      <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_24px_60px_-28px_rgba(14,23,38,0.28)]">
        <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-[13px] font-bold text-brand-strong">
            ST
          </span>
          <div className="min-w-0 flex-1 truncate text-[15px] font-bold">Sharma Traders</div>
          <div className="text-right">
            <div className="eyebrow text-income">{balanceCaption(balance, DEFAULT_SETTINGS.balanceWording)}</div>
            <div className="tabular text-lg font-bold text-income">{formatMoney(balance, currency)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-hairline">
          <div className="border-r border-hairline px-5 py-3">
            <div className="eyebrow text-income">{labels.in}</div>
            <div className="tabular mt-0.5 text-[15px] font-semibold text-income">{formatMoney(SAMPLE_IN, currency)}</div>
          </div>
          <div className="px-5 py-3">
            <div className="eyebrow text-expense">{labels.out}</div>
            <div className="tabular mt-0.5 text-[15px] font-semibold text-expense">{formatMoney(SAMPLE_OUT, currency)}</div>
          </div>
        </div>

        {/* Bottom padding leaves room for the "Saved to your Google Sheet" badge. */}
        <ul className="pb-4">
          {SAMPLE_ROWS.map((row, i) => (
            <li
              key={row.notes}
              className={cn(
                'relative grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3',
                i > 0 && 'border-t border-hairline',
                i === 0 && 'bg-highlight-soft/40',
              )}
            >
              {i === 0 && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-highlight" />}
              <span className="tabular text-[12.5px] text-muted-foreground">{formatDayMonth(row.date, dateFormat)}</span>
              <span className="truncate text-[13.5px] text-label">{row.notes}</span>
              <span className={cn('tabular text-[13.5px] font-semibold', row.type === 'IN' ? 'text-income' : 'text-expense')}>
                {formatMoney(row.type === 'IN' ? row.amount : -row.amount, currency, { signed: true })}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute bottom-0 left-5 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[12.5px] font-semibold shadow-[0_8px_20px_-10px_rgba(14,23,38,0.3)]">
        <FileSpreadsheetIcon className="size-4 text-brand" aria-hidden="true" />
        Saved to your Google Sheet
      </div>
    </div>
  )
}
