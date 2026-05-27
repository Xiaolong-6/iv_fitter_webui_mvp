export function isBackendConnectionError(message: string | null) {
  if (!message) return false;
  return /failed to fetch|networkerror|load failed|backend|connection/i.test(message);
}

export function BackendConnectionBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const help =
    "Check that the backend window is running, then open http://127.0.0.1:8000/api/health. For phone testing, also check firewall and use the LAN address printed by 04c_run_lan_dev.bat.";
  return (
    <div className="backend-banner" role="alert">
      <div>
        <strong>Backend connection problem</strong>
        <p>
          IV-fitter could not reach the local fitting backend. The browser UI
          loaded, but fitting/import API calls are not available yet.
        </p>
        <small>{message}</small>
      </div>
      <div className="backend-banner-actions">
        <button className="primary" onClick={onRetry}>Retry</button>
        <button onClick={() => window.alert(help)}>Help</button>
      </div>
    </div>
  );
}
