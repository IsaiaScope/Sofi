interface ErrorBannerProps {
  message: string;
}

// role="alert" + aria-live="assertive" ensures screen readers announce auth
// failures the moment they appear — unlike FieldError (polite) these are
// top-level flow-blocking errors, so cutting into narration is appropriate.
export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-4 border border-sofi-red/30 bg-sofi-red/10 p-3 text-base text-sofi-red"
      title={message}
    >
      <p className="line-clamp-3 break-words">{message}</p>
    </div>
  );
}
