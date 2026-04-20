interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div
      className="mb-4 rounded-lg bg-sofi-red/10 px-3 py-2 text-base text-sofi-red"
      title={message}
    >
      <p className="line-clamp-3 break-words">{message}</p>
    </div>
  );
}
