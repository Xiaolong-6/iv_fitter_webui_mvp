# NPM registry lockfile hotfix

The source package must not contain package-lock entries that point to environment-specific package mirrors. The frontend lockfile should resolve packages from the public npm registry so local installations work outside the build container.

Manual validation: search package lock files for private/internal registry host names. There should be no matches.
