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
