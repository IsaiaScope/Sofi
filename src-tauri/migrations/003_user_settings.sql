CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
    default_agent_type TEXT NOT NULL DEFAULT 'claude-code',
    default_shell TEXT NOT NULL DEFAULT '/bin/zsh',
    font_size INTEGER NOT NULL DEFAULT 14,
    font_family TEXT NOT NULL DEFAULT 'JetBrains Mono',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
