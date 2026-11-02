import { Link } from 'react-router'
import { config } from '@/config/env'
import { REPO_URL } from '@/config/project'
import { ContactLink, ExternalLink, LegalList, LegalPage, LegalSection } from './LegalPage'

export function TermsPage() {
  const app = config.appName
  return (
    <LegalPage title="Terms of service" updated="2 November 2026">
      <p>
        These terms apply when you use {app} on this site ({window.location.host}). By using the site you agree to them.
        If you don't agree, please don't use it. How we handle your data is described in the{' '}
        <Link to="/privacy" className="font-semibold text-brand-strong underline-offset-2 hover:underline">
          privacy policy
        </Link>
        .
      </p>

      <LegalSection title="The service">
        <p>
          {app} is a free tool for recording the cash you give and get with each party. Your records are kept in a Google
          Sheet in your own Google Drive. {app} is open-source software released under the{' '}
          <ExternalLink href={`${REPO_URL}/blob/main/LICENSE`}>MIT License</ExternalLink>. These terms cover this site;
          the license covers the code.
        </p>
      </LegalSection>

      <LegalSection title="Your Google account and your data">
        <LegalList>
          <li>
            You need a Google account. Google's own terms apply to it and to Google Drive and Google Sheets.
          </li>
          <li>
            Your records belong to you. They live in your Drive, not with us, and you can open, export or delete them in
            Google Sheets at any time.
          </li>
          <li>
            You are responsible for keeping your account secure, for what you record, and for keeping backups. Changes
            made directly in the spreadsheet affect what the app shows.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>
          Use the site lawfully. Don't use it to record information you have no right to keep, try to disrupt the site
          or Google's services, or access anyone else's account.
        </p>
      </LegalSection>

      <LegalSection title="Not financial advice">
        <p>
          The app adds up the numbers you enter. It is not accounting, tax or legal advice. Check important figures
          yourself.
        </p>
      </LegalSection>

      <LegalSection title="Demo mode">
        <p>
          Demo mode uses sample data stored only in your browser. It is not saved anywhere else and is lost if you clear
          this site's data.
        </p>
      </LegalSection>

      <LegalSection title="Availability and changes">
        <p>
          We may change, pause or stop the site at any time. If the site goes away, your spreadsheet stays in your Drive
          and keeps working in Google Sheets.
        </p>
      </LegalSection>

      <LegalSection title="No warranty">
        <p>
          The site is provided “as is” and “as available”, without warranties of any kind, including fitness for a
          particular purpose, accuracy, or uninterrupted availability.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the extent the law allows, we are not liable for any indirect or consequential loss, or for any loss of
          data, profits or business, arising from your use of the site. Nothing in these terms limits any liability that
          cannot be limited by law.
        </p>
      </LegalSection>

      <LegalSection title="Stopping use">
        <p>
          You can stop using the site at any time: sign out and remove its access from your{' '}
          <ExternalLink href="https://myaccount.google.com/connections">Google Account connections</ExternalLink>. We may
          block access to the site if these terms are broken.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          If these terms change, we will update this page and the date at the top. Continuing to use the site after that
          means you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms? To reach us, <ContactLink />.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
