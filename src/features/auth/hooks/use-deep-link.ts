import { useRouter } from "@tanstack/react-router";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { useEffect } from "react";
import { DEEP_LINK_SCHEME } from "@/lib/constants";

function routeForDeepLink(url: string): "/verify-success" | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${DEEP_LINK_SCHEME}:`) return null;
    // Handle both sofi://verify-success and sofi:verify-success (platform variance).
    const host = parsed.host || parsed.pathname.replace(/^\/+/, "");
    if (host === "verify-success") return "/verify-success";
    return null;
  } catch {
    return null;
  }
}

export function useDeepLink() {
  const router = useRouter();
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    onOpenUrl((urls) => {
      for (const url of urls) {
        const target = routeForDeepLink(url);
        if (target !== null) {
          router.navigate({ to: target });
          return;
        }
      }
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [router]);
}
