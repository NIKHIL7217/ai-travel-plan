# Production Deployment Guide

Last updated: 2026-06-19

This guide prepares ai-travel-app for production delivery with mandatory quality gates:

- Unit tests
- Component tests
- Integration tests
- E2E tests
- Linting
- Build checks
- Coverage reporting (target >= 80%)
- Lighthouse target >= 95

## 1. Prerequisites

1. Node.js 20+
2. npm 10+
3. Production-ready `.env` values for:
   - `VITE_GEMINI_API_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY` (optional but recommended)
   - `VITE_OPENWEATHER_API_KEY` (optional but recommended)
   - Firebase keys for authenticated persistence

## 2. Local Quality Gate Commands

Run all commands before opening PR:

```bash
npm run lint
npm run test:unit
npm run test:component
npm run test:integration
npm run test:coverage
npm run test:e2e
npm run build
npm run lighthouse
```

Combined gate:

```bash
npm run quality:check
```

## 3. Coverage Policy

Coverage is generated with Vitest (V8 provider).

- Reports are written to: `coverage/`
- Report formats: text, html, lcov, json-summary
- Enforced thresholds in `vitest.config.js`:
  - Statements >= 80
  - Branches >= 80
  - Functions >= 80
  - Lines >= 80

## 4. Lighthouse Policy

Lighthouse config is in `lighthouserc.json`.

Routes audited:

- `/`
- `/planner`

Assertions:

- Performance >= 0.95
- Accessibility >= 0.95
- Best Practices >= 0.95
- SEO >= 0.95

## 5. GitHub Actions Pipeline

Workflow file: `.github/workflows/ci.yml`

Jobs:

1. `quality`
   - lint
   - unit/component/integration tests
   - coverage gate
   - build
2. `e2e`
   - playwright smoke suite
3. `lighthouse`
   - lighthouse quality gate with 95+ thresholds

Artifacts uploaded:

- Coverage report
- Playwright report
- Lighthouse report

## 6. Deployment Steps (Recommended)

1. Push changes to feature branch.
2. Open PR to `main`.
3. Ensure all CI jobs pass.
4. Merge only after green checks.
5. Deploy from `main` (Vercel/Netlify/Firebase Hosting).

### Example Vercel settings

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`

## 7. Release Checklist

1. CI all green.
2. Coverage threshold met.
3. Lighthouse assertions pass.
4. No unresolved security alerts in dependencies.
5. Environment variables validated in target platform.
6. Smoke-test production URL after deploy.
