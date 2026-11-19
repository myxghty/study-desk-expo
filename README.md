# Study Desk (Expo) v2.3

Planner, focus timer, quick list, marks, procrastination check, calendar sync, study reminders, app lock and teacher sharing.

## Run
```
npm install
npx expo start
```
Scan the QR code with Expo Go. All data is saved on the phone. Teacher sharing is optional and needs the `study-desk-cloud` project deployed on Vercel.

## First run
Welcome slides, then "Create your profile" (name, optional 6-digit PIN, optional fingerprint/Face ID). After that the app opens straight to Plan, or to the lock screen if you set a PIN.

## Tabs
- **Plan**: timer, quick list, deadlines, and a banner when the procrastination check finds a problem.
- **Marks**: scores per course with averages.
- **Insights**: procrastination check and focus-per-day chart.
- **Settings**: lock, reminders, calendar, teacher sharing.

## Reminders
All reminders are scheduled on the phone (no server). Exams get alerts 3 days and 1 day before and the morning of; tasks the evening before and the morning of. There's an optional daily focus nudge that skips days you've already studied, a heads-up when the procrastination check says "falling behind", and a notification when your focus timer ends, even with the app closed. Turn them on in Settings > Reminders (use "Send a test reminder" to check).

## Privacy and security
- The app lock stores only a salted hash of your PIN in the phone's secure storage; wrong guesses lock you out for 30s, 60s, 2 min... up to 15 min. It re-locks after a minute in the background. It keeps people who pick up your phone out of your marks. It is not a cloud account, and if you forget the PIN you have to reinstall (which clears your data).
- Your teacher-link key is kept in secure storage, not plain app storage.
- The app refuses to send them to anything that isn't `https://`.

## Honest limits
- Procrastination detection only sees what happens inside this app.
- Fingerprint / Face ID may not work inside Expo Go on iPhone. The PIN always works. A real build (below) enables Face ID.
- Reminder times can drift a little on some Android phones that restrict exact alarms.
- Install without Expo Go: `npx eas build --profile preview --platform android` (free) or `--platform ios` (Apple Developer account).


## Accounts, classes and teachers (v3)

Sign-in, classes, posts and marks run on Supabase (`src/config.js` holds the project URL and the publishable key, which is safe to ship).

1. In Supabase open **SQL Editor**, paste `schema.sql` (in the cloud folder / download) and run it.
2. Optional while testing: **Authentication > Providers > Email**, turn off "Confirm email" so sign-up logs in immediately.
3. Choose "I'm a teacher" or "I'm a student" on first launch. Teachers create a class and share its code; students join with it.

Students see posts from their classes land in Plan (and the phone calendar). Teachers see only what each student switched on, and can post marks.
