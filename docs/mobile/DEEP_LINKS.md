# Mobile deep links

## Custom scheme

- `duopoker://invite/{inviteCode}` — open invite acceptance flow
- `duopoker://clubs/{clubId}` — club dashboard

## Universal links (configure in App Store / Play)

- `https://duopoker.app/invite/{code}` → `/invite/:code` web route
- `https://duopoker.app/clubs/{id}` → `/clubs/:clubId`

Verify `apple-app-site-association` and `assetlinks.json` on production domain.
