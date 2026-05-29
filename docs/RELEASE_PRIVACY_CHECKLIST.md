# Release privacy checklist

Before publishing a release, verify that release notes, generated manifests, logs, screenshots, and commit messages do not expose private/local context.

## Block before release

- Windows home paths such as `C:\Users\...`
- Unix home paths such as `/home/...`
- Personal email addresses that are not intentionally public project contacts
- Local temporary folders, workstation names, or lab-user account names
- Secrets, tokens, API keys, instrument passwords, or private network addresses

## Required wording discipline

- State exactly which tests were run.
- State exactly which tests were not run.
- Do not claim frontend/build/portable validation unless the command actually passed.
- Do not paste raw local error logs into public release notes without redaction.
