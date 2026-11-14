# Playloot reminders

PMS → Notifications controls the global switch, interval (1/2/3/4/6/8/12/24 hours), and up to 24 rotating messages. Each message has an enable switch, title, text/quote and destination. Save notification settings publishes this configuration separately from the overall UI configuration.

Players opt in under Notifications or Profile Settings. Turning off reminders unsubscribes the current browser or cancels device schedules. Logout also clears reminders on the device. These controls are separate from the existing reward alert preference.

Web: real encrypted Web Push delivered by a Worker cron every five minutes; reminders become eligible after the chosen interval. OS/browser delivery can be delayed. Browser support and notification permission are required. VAPID signing keys are Worker secrets. No private keys belong in the frontend. Changing configuration restarts the next-send interval. Expired endpoints are removed. Each run handles up to 100 due subscriptions; monitor backlog if the audience grows. Failed sends are logged and next attempted at the next interval rather than repeatedly alerting users.

Android: uses Capacitor Local Notifications, not Firebase remote push. It works from scheduled device notifications with rotating messages, without keeping the app open. PMS changes sync on the next app opening; an admin pause cannot remotely cancel an offline device's existing schedule. Exact timing is subject to Android battery management. A new Android package is needed to include the plugin: build web assets, run `npx cap sync android`, then build Android normally. No Android build was run by Codex.

The shipped text encourages gameplay without claiming new offers or guaranteed rewards. Update messages if a specific promotion ends. OS notification appearance cannot be customized like an app card.
