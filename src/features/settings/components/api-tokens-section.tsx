import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useApiTokens } from "../queries/hooks";
import { useCreateApiToken, useRevokeApiToken } from "../queries/mutations";
import type { ApiTokenCreated } from "../types";

export function ApiTokensSection() {
  const { t } = useTranslation("settings");
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
        <h2 className="text-lg font-semibold text-sofi-text">{t("apiTokens.title")}</h2>
        <p className="text-base text-sofi-text-muted">{t("apiTokens.description")}</p>
      </div>

      {revealed && <RevealedTokenCard token={revealed} onDismiss={() => setRevealed(null)} />}

      <div className="rounded-lg border border-sofi-border bg-sofi-elevated">
        <div className="flex items-center justify-between gap-4 border-b border-sofi-border px-4 py-3">
          <span className="text-base font-medium text-sofi-text">
            {list.data
              ? t("apiTokens.activeCount", { count: list.data.length })
              : t("apiTokens.loading")}
          </span>
          <Button type="button" size="sm" disabled={createToken.isPending} onClick={handleCreate}>
            {createToken.isPending ? t("apiTokens.creating") : t("apiTokens.newToken")}
          </Button>
        </div>

        {list.isError && (
          <div className="px-4 py-3 text-base text-sofi-red">
            {t("apiTokens.loadError", { message: list.error.message })}
          </div>
        )}

        {list.data?.length === 0 && (
          <div className="px-4 py-6 text-center text-base text-sofi-text-muted">
            {t("apiTokens.empty")}
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
                {t("apiTokens.createdAt", { date: new Date(token.created).toLocaleString() })}
                {token.expiry &&
                  t("apiTokens.expires", { date: new Date(token.expiry).toLocaleDateString() })}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={revokeToken.isPending && revokeToken.variables === token.digest}
              onClick={() => revokeToken.mutate(token.digest)}
            >
              {t("apiTokens.revoke")}
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
  const { t } = useTranslation("settings");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(token.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-lg border border-violet-primary/40 bg-violet-primary/5 p-4">
      <p className="mb-2 text-base font-semibold text-sofi-text">{t("apiTokens.revealTitle")}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded bg-sofi-terminal px-3 py-2 font-mono text-base text-sofi-text">
          {token.token}
        </code>
        <Button type="button" size="sm" onClick={copy}>
          {copied ? t("apiTokens.copied") : t("apiTokens.copy")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
          {t("apiTokens.dismiss")}
        </Button>
      </div>
    </div>
  );
}
