import { useRouter } from "@tanstack/react-router";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { useEffect } from "react";
import { DEEP_LINK_SCHEME } from "@/lib/constants";

type DeepLinkTarget =
  | { to: "/verify-success" }
  | { to: "/recover/confirm"; search: { uid: string; token: string } };

function routeForDeepLink(url: string): DeepLinkTarget | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${DEEP_LINK_SCHEME}:`) return null;
    // The WHATWG URL parser treats non-special schemes as opaque, so for
    // `sofi://recover/confirm` WebKit yields host="" and pathname="//recover/confirm",
    // while Node yields host="recover" and pathname="/confirm". Normalize by
    // combining host+pathname (when host is present) or stripping leading
    // slashes from pathname otherwise.
    const rawPath = parsed.host
      ? `${parsed.host}${parsed.pathname}`.replace(/^\/+|\/+$/g, "")
      : parsed.pathname.replace(/^\/+|\/+$/g, "");
    const [root, ...rest] = rawPath.split("/");
    const subpath = rest.join("/");

    if (root === "verify-success" && !subpath) return { to: "/verify-success" };

    if (root === "recover" && subpath === "confirm") {
      const uid = parsed.searchParams.get("uid") ?? "";
      const token = parsed.searchParams.get("token") ?? "";
      if (uid && token) {
        return { to: "/recover/confirm", search: { uid, token } };
      }
    }

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

    const handleUrl = (url: string) => {
      const target = routeForDeepLink(url);
      if (target !== null) {
        router.navigate(target);
      }
    };

    // Cold-start case: app was launched *by* the deep link. `onOpenUrl` only
    // fires for URLs received while the app is already running, so without this
    // the launch URL is silently lost and the app lands on the default route.
    getCurrent()
      .then((urls) => {
        if (cancelled || !urls) return;
        for (const url of urls) handleUrl(url);
      })
      .catch(() => {
        // Plugin unavailable (e.g., browser dev mode). Safe to ignore.
      });

    onOpenUrl((urls) => {
      for (const url of urls) {
        handleUrl(url);
        return;
      }
    })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      })
      .catch(() => {
        // Plugin unavailable (e.g., browser dev mode). Safe to ignore.
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [router]);
}
