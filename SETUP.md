# Little by Little: private sync

The static website works immediately with browser-local storage. To access the same history on different devices, connect Supabase and sign in with the same email on each device. GitHub Pages hosts only the app; personal habit history stays in your Supabase database.

1. Create a free project at https://supabase.com/dashboard . Keep its database password private.
2. Open **SQL Editor**, paste the repository's `supabase.sql`, and run it once. This enables row-level security and grants each signed-in user access only to their own events.
3. For a single-user app, in **Authentication → Users**, create your own user with your email. Then turn off **Allow new users to sign up** in Authentication settings. Only your existing account can sign in.
4. In **Authentication → Email Templates → Magic Link**, include `{{ .Token }}` in the email body (for example, `Your sign-in code is {{ .Token }}`). The app uses email codes, so you do not need a redirect URL. For reliable delivery beyond Supabase's default email limitations, configure custom SMTP under Authentication settings.
5. In **Project Settings → API / API Keys**, find your project URL and publishable key (or legacy anon key). These are public client settings. Never use a service_role or secret key.
6. Edit `config.js` in this repository:

   ```js
   window.HABIT_CONFIG = {
     supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
     supabaseKey: 'YOUR-PUBLISHABLE-OR-ANON-KEY'
   };
   ```

7. Commit to `main`. GitHub Actions redeploys the app. Open it, tap **Save & sync**, enter your email, then enter the emailed code. Local habits are added to your account. Use the same email on another device.

## How saving works

Each change saves immediately in the browser, then uploads when signed in and online. Sync runs on changes, on returning to the tab, and every minute while open. Failed uploads remain queued; the header reports unsynced changes. Open **Save & sync** to retry manually. Browser storage can be cleared by your device, so set up sync and occasionally export a backup.

The cloud stores an append-only event history. Duplicate uploads are ignored. Changes replay in cloud arrival order, and pending local changes remain visible while offline. If two devices change the same habit/date while offline, the last change received by the server wins. There is no scheduled background sync when the webpage is closed. Streaks use the current device's local calendar date; keep device timezones consistent when travelling.

GitHub Pages is public. Sign-in plus database row-level security protects personal data; the website source and public project key are visible. No personal history or authentication secrets should ever be committed to GitHub.

## Hosting manually

In GitHub repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**. The included workflow tests and publishes the static files. All paths are relative, so project Pages URLs work without a build step.

## Backups

**Export backup** downloads your habits and check-ins as JSON. **Import backup** merges a valid export as new events; it can change existing records to the backup's values. Export current progress first if needed. Backups include personal history, so keep them private.

## Changing goals

Open a habit and choose **Edit daily goal**. Changes start today and appear in **Goal history** with their effective dates. Completed check-ins keep a snapshot of the description used when they were recorded, even if you change the goal later that same day. Select a calendar day to view its saved goal, or to record/undo that day's result. Backdated entries use the goal effective on that date. Existing habits and backups remain compatible; no database changes are needed.
