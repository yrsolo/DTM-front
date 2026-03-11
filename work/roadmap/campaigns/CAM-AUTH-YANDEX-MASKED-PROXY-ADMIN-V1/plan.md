# Plan

1. Finalize infra source of truth:
   - deploy config
   - YDB database paths
   - auth deploy workflow contract
2. Create `apps/auth` workspace:
   - config/env validation
   - YDB driver/repositories
   - session cookie signing
   - Yandex OAuth flow
   - masked/full proxy logic
3. Add schema migrations and contour-aware migration scripts for test/prod
4. Integrate contour-aware auth/api routing in `apps/web`
5. Add admin SPA route and admin JSON client
6. Add docs:
   - auth/access contract
   - deploy/routing
   - backend handoff
7. Validate:
   - auth app build
   - web build
   - migration dry-run / deploy dry-run
