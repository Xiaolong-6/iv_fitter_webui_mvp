# npm troubleshooting

## Symptom

```text
npm error code ETIMEDOUT
npm error network request to ... failed
'vite' is not recognized
```

## Meaning

Frontend dependencies were not installed successfully. Backend can still run, but frontend cannot start until `npm install` completes.

## Correct recovery

1. Close the frontend window.
2. Run:

```text
02_setup_dev.bat
```

3. If npm fails because of registry/network issues, check that `frontend/.npmrc` contains:

```text
registry=https://registry.npmjs.org/
```

4. Retry setup.

## Rule

`04_run_dev.bat` and frontend run scripts should not silently run `npm install`. Setup and run are separate.
