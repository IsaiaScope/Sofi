import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApiTokens } from "../queries/hooks";
import { useCreateApiToken, useRevokeApiToken } from "../queries/mutations";
import type { ApiTokenCreated } from "../types";

export function ApiTokensSection() {
  const [revealed, setRevealed] = useState<ApiTokenCreated | null>(null);

  const list = useApiTokens();
  const createToken = useCreateApiToken();
  const revokeToken = useRevokeApiToken();

  const handleCreate = () => {
    createToken.mutate(undefined, { onSuccess: setRevealed });
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-sofi-text">API Tokens</h2>
        <p className="text-base text-sofi-text-muted">
          Long-lived bearer tokens for CLI or automation clients. The plaintext value is shown only
          once.
        </p>
      </div>

      {revealed && <RevealedTokenCard token={revealed} onDismiss={() => setRevealed(null)} />}

      <div className="rounded-lg border border-sofi-border bg-sofi-elevated">
        <div className="flex items-center justify-between gap-4 border-b border-sofi-border px-4 py-3">
          <span className="text-base font-medium text-sofi-text">
            {list.data ? `${list.data.length} active` : "…"}
          </span>
          <Button type="button" size="sm" disabled={createToken.isPending} onClick={handleCreate}>
            {createToken.isPending ? "Creating…" : "New token"}
          </Button>
        </div>

        {list.isError && (
          <div className="px-4 py-3 text-base text-sofi-red">
            Failed to load tokens: {list.error.message}
          </div>
        )}

        {list.data?.length === 0 && (
          <div className="px-4 py-6 text-center text-base text-sofi-text-muted">
            No API tokens yet.
          </div>
        )}

        {list.data?.map((token) => (
          <div
            key={token.digest}
            className="flex items-center justify-between gap-4 border-b border-sofi-border px-4 py-3 last:border-b-0"
          >
            <div className="min-w-0">
              <div className="font-mono text-base text-sofi-text">{token.token_key}…</div>
              <div className="text-base text-sofi-text-muted">
                Created {new Date(token.created).toLocaleString()}
                {token.expiry && ` · expires ${new Date(token.expiry).toLocaleDateString()}`}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={revokeToken.isPending && revokeToken.variables === token.digest}
              onClick={() => revokeToken.mutate(token.digest)}
            >
              Revoke
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function RevealedTokenCard({
  token,
  onDismiss,
}: {
  token: ApiTokenCreated;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(token.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-lg border border-violet-primary/40 bg-violet-primary/5 p-4">
      <p className="mb-2 text-base font-semibold text-sofi-text">
        Copy your token now — it won't be shown again.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded bg-sofi-terminal px-3 py-2 font-mono text-base text-sofi-text">
          {token.token}
        </code>
        <Button type="button" size="sm" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
