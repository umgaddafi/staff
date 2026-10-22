import React from 'react';

export default function LoadingButton({
  loading = false,
  disabled = false,
  className = 'btn',
  children,
  loadingText,
  type = 'button',
  ...props
}) {
  return (
    <button className={className} type={type} disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading && <span className="spinner" aria-hidden="true" />}
      <span>{loading ? loadingText || children : children}</span>
    </button>
  );
}
