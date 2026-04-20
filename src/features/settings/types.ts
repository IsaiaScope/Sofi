import type { SupportedLanguage } from "@/lib/i18n/resources";

export interface ApiToken {
  digest: string;
  token_key: string;
  created: string;
  expiry: string | null;
}

export interface ApiTokenCreated extends ApiToken {
  // Plaintext token — returned once at creation. Never retrievable again.
  token: string;
}

export interface UserSettings {
  theme: string;
  locale: SupportedLanguage;
  default_agent_type: string;
  updated_at: string;
}
