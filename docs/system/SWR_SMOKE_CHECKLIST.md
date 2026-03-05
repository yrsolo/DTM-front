# SWR Smoke Checklist

Quick manual checklist to close `CAM-API-V2-LOADING-SWR-CACHE`.

## 1) Second launch is instant
1. Open app once and let data load fully.
2. Refresh page.
3. Verify UI appears immediately from cache.
4. Verify top area shows `Updating...` during background refresh.

Evidence:
- short video of second launch behavior.

## 2) Stale banner when API is offline
1. Open DevTools -> Network.
2. Block API domain or switch to Offline.
3. Click `Refresh JSON from API`.
4. Verify existing data stays visible.
5. Verify stale error banner is shown.

Evidence:
- screenshot with visible stale banner.

## 3) localStorage keys
1. DevTools -> Application -> Local Storage.
2. Verify keys:
   - `dtm.snapshot.v1`
   - `dtm.snapshot.meta`

Evidence:
- screenshot of keys.

## 4) timeout/retry logs
1. In dev mode, throttle network (`Slow 3G` or custom).
2. Trigger refresh.
3. Check console for:
   - `[snapshot.fetch] attempt_failed`

Evidence:
- screenshot or console copy of retry/timeout logs.
