import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/features/auth/queries/hooks";
import { useUserSettings } from "@/features/settings/queries/hooks";
import { isSupportedLanguage, LOCAL_STORAGE_KEY } from "./resources";

/**
 * Syncs i18n.language with the server-stored `locale` on the authenticated
 * user's settings. Runs once per settings change; bails out when the remote
 * value already matches the active language, so this is safe against loops.
 *
 * Rendered as a sibling to the router so it has access to the query client
 * and the authenticated session query.
 */
export function LocaleSync() {
  const { i18n } = useTranslation();
  const { data: user } = useSession();
  const { data: settings } = useUserSettings({ enabled: !!user });

  const remote = settings?.locale;

  useEffect(() => {
    if (!remote || !isSupportedLanguage(remote) || remote === i18n.language) return;
    void i18n.changeLanguage(remote);
    localStorage.setItem(LOCAL_STORAGE_KEY, remote);
  }, [remote, i18n]);

  return null;
}
