# NPM registry lockfile hotfix

This package-lock hotfix removes an environment-specific OpenAI internal npm artifact URL from `frontend/package-lock.json`.

## Problem

`npm ci` on a user machine attempted to fetch `elkjs` from:

```text
https://packages.applied-caas-gateway1.internal.api.openai.org/.../elkjs-0.11.1.tgz
```

That URL is only valid in the build environment and can timeout outside it.

## Fix

`frontend/package-lock.json` now resolves `elkjs` from the public npm registry:

```text
https://registry.npmjs.org/elkjs/-/elkjs-0.11.1.tgz
```

The root `.npmrc` already sets:

```text
registry=https://registry.npmjs.org/
include=dev
```

## User command

From a clean extracted folder:

```bat
cd frontend
npm ci --registry=https://registry.npmjs.org/
npm run build
```

If an old failed install left partial state, delete `frontend/node_modules` and retry.
