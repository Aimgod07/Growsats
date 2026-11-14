import { AlertTriangle, RefreshCw } from "lucide-react";
import "../styles/resource.css";

function errorMessage(error, fallback) {
  if (!error) return fallback;
  if (error.status === 401) return "Your session expired. Sign in again to continue.";
  if (error.status === 403) return fallback;
  return error.message || fallback;
}

/**
 * Non-blocking notice shown when a resource failed but we still have data on
 * screen. The content stays visible; only the freshness is called out.
 */
export function ResourceBanner({ resource, label, onRetry, retrying }) {
  if (!resource?.error) return null;
  const stale = resource.data !== undefined;

  return (
    <div className={`resource-banner${stale ? "" : " resource-banner--blocking"}`} role="status">
      <AlertTriangle size={15} aria-hidden="true" className="resource-banner__icon" />
      <span className="resource-banner__text">
        {stale
          ? `Couldn't refresh ${label || "this section"}. Showing the last saved data.`
          : errorMessage(resource.error, `Couldn't load ${label || "this section"}.`)}
      </span>
      {onRetry && (
        <button
          type="button"
          className="resource-banner__action"
          onClick={onRetry}
          disabled={retrying}
        >
          <RefreshCw size={13} aria-hidden="true" className={retrying ? "spin" : undefined} />
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Renders one section of a screen.
 *
 *  - no data yet  -> skeleton (page still shows its shell)
 *  - data + error -> children, plus a stale-data banner
 *  - error, no data -> inline error card with retry, scoped to this section
 *
 * The last case is the only time this section hides itself, and it never takes
 * the rest of the screen down with it.
 */
export function ResourceGate({
  resource,
  label,
  children,
  skeleton,
  minHeight,
  onRetry,
  emptyState,
  emptyWhen,
}) {
  const retry = onRetry || resource?.reload;

  if (!resource) return children;

  if (resource.data === undefined && resource.error) {
    return (
      <div className="resource-error" style={minHeight ? { minHeight } : undefined} role="alert">
        <AlertTriangle size={22} aria-hidden="true" className="resource-error__icon" />
        <p className="resource-error__text">{errorMessage(resource.error, `Couldn't load ${label || "this section"}.`)}</p>
        <button type="button" className="resource-error__retry" onClick={retry} disabled={resource.loading}>
          <RefreshCw size={14} aria-hidden="true" className={resource.loading ? "spin" : undefined} />
          {resource.loading ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  if (resource.data === undefined) {
    if (skeleton) return skeleton;
    return (
      <div className="resource-skeleton" style={minHeight ? { minHeight } : undefined} aria-busy="true">
        <span className="resource-skeleton__bar" />
        <span className="resource-skeleton__bar" />
        <span className="resource-skeleton__bar" />
      </div>
    );
  }

  // The caller decides what "empty" means: a bare list has .length, but an
  // object payload (notifications, rewards) needs its own predicate.
  const isEmpty = typeof emptyWhen === "function" ? emptyWhen(resource.data) : !resource.data?.length;

  if (emptyState && isEmpty) {
    return (
      <>
        <ResourceBanner resource={resource} label={label} onRetry={retry} retrying={resource.refreshing} />
        {emptyState}
      </>
    );
  }

  return (
    <>
      <ResourceBanner resource={resource} label={label} onRetry={retry} retrying={resource.refreshing} />
      {typeof children === "function" ? children(resource.data) : children}
    </>
  );
}