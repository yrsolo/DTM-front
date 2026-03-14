# Plan

1. Finalize infra and routing source of truth:
   - deploy config
   - YDB database paths
   - auth deploy workflow contract
   - public routing contract: `prod=/`, `test=/test`, service namespace `/ops/*`
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
   - troubleshooting for `/test`, localhost contour and OAuth callbacks
7. Validate:
   - auth app build
   - web build
   - migration dry-run / deploy dry-run
   - search-based check for legacy routing references removed from active docs
