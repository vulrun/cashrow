import { Link } from 'react-router'
import { config } from '@/config/env'
import { REPO_URL } from '@/config/project'
import { ContactLink, ExternalLink, LegalList, LegalPage, LegalSection } from './LegalPage'

// Keep this page in step with docs/security.md: every statement here must match what the code does.
export function PrivacyPage() {
  const app = config.appName
  return (
    <LegalPage title="Privacy policy" updated="3 November 2026">
      <p>
        {app} is a cash book that runs entirely in your browser and keeps your records in a Google Sheet in your own
        Google Drive. This policy explains what that means for your data on this site ({window.location.host}). In
        short: there is no {app} server, we never receive your records, and we don't track you.
      </p>

      <LegalSection title="Who runs this site">
        <p>
          {app} is <ExternalLink href={REPO_URL}>open-source software</ExternalLink>. This site is a copy of it run by
          its operator, called “we” in this policy. To reach us, <ContactLink />.
        </p>
      </LegalSection>

      <LegalSection title="What the app can access in your Google account">
        <p>When you sign in with Google, the app asks for two things:</p>
        <LegalList>
          <li>
            <strong>Your basic profile</strong> (name, email address and profile picture), to show who is signed in.
            Your picture is loaded straight from Google's servers.
          </li>
          <li>
            <strong>Only the Google Drive files you use with this app</strong> (the <code>drive.file</code> permission).
            This lets the app create its spreadsheet and read and write the spreadsheets it created. It cannot see or
            open any other file in your Drive.
          </li>
        </LegalList>
        <p>The app does not ask for access to your email, contacts, calendar or anything else.</p>
      </LegalSection>

      <LegalSection title="Where your records are stored">
        <p>
          Your parties, entries and settings are stored in a Google Sheet in your Google Drive. Your browser sends them
          directly to Google's Sheets and Drive APIs. They are never sent to us, and we have no copy. Google stores them
          under the <ExternalLink href="https://policies.google.com/privacy">Google Privacy Policy</ExternalLink>.
        </p>
        <p>
          When you export a ledger as a PDF or JPG, the file is made in your browser and saved to your device. Nothing is
          uploaded.
        </p>
      </LegalSection>

      <LegalSection title="What is kept in your browser">
        <LegalList>
          <li>
            Your Google access token, in session storage. It expires after about an hour and is removed when you close
            the tab.
          </li>
          <li>
            Your name, email address, profile picture link and the ID of the spreadsheet you chose, in local storage, so
            the app can welcome you back.
          </li>
          <li>In demo mode, the sample data, in local storage. Demo data never leaves your browser.</li>
        </LegalList>
        <p>
          Signing out revokes the access token with Google and removes the token and your details from this browser. You
          can also clear them at any time in your browser's site data settings.
        </p>
      </LegalSection>

      <LegalSection title="Cookies, analytics and ads">
        <p>
          The app sets no cookies of its own and contains no analytics, advertising or tracking code. Google's sign-in
          service, which loads from accounts.google.com, may use its own cookies under Google's policy. Like most
          websites, our hosting provider may keep standard server logs (such as IP address, browser type and the pages
          requested) for security and reliability. These logs never contain your records.
        </p>
      </LegalSection>

      <LegalSection title="How Google user data is used">
        <p>
          Data received from Google APIs is used only to show and edit your cash book in your browser. We don't sell it,
          share it, use it for advertising, or use it to develop or train AI or machine-learning models.
        </p>
        <p>
          {app}'s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
          <ExternalLink href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </ExternalLink>
          , including the Limited Use requirements.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <LegalList>
          <li>
            Remove the app's access at any time from your{' '}
            <ExternalLink href="https://myaccount.google.com/connections">Google Account connections</ExternalLink>.
          </li>
          <li>
            Delete your records by deleting the spreadsheet from Google Drive. We hold no copy, so there is nothing to
            request from us.
          </li>
          <li>Sign out, or clear this site's data in your browser, to remove what is kept on your device.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Everything travels over HTTPS straight between your browser and Google. Access tokens are short-lived, are
          never kept after the tab closes, and the app never handles your Google password.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>This site is not intended for children under 13.</p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          If this policy changes, we will update this page and the date at the top. See also the{' '}
          <Link to="/terms" className="font-semibold text-brand-strong underline-offset-2 hover:underline">
            terms of service
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about this policy or your data? To reach us, <ContactLink />.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
