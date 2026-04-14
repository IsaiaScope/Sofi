# Contributing to Sofi

Thank you for your interest in contributing to Sofi! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Sofi.git`
3. Follow the [Development Guide](development.md) for setup
4. Create a feature branch: `git checkout -b feat/your-feature`

## Code Style

- **Linter**: Biome + UltraCite (zero-config). Run `pnpm lint:fix` before committing.
- **Rust**: Follow standard Rust conventions. `cargo clippy` for additional checks.
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, etc.

## Architecture Principles

- **Feature-based folders**: Each feature is self-contained (`components/`, `hooks/`, `store/`, `types.ts`)
- **Zustand slices**: Each feature manages its own state slice
- **Tauri commands**: Backend logic lives in Rust, frontend calls via `invoke()`
- **Mobile-first responsive**: All UI components use Tailwind breakpoints (sm → 2xl)
- **Agent adapters**: New agents are added by implementing the adapter interface

## Adding a New Agent

To add support for a new AI coding agent:

1. Create `src/features/agents/adapters/your-agent.ts` implementing `AgentAdapter`
2. Add the agent type to `src/lib/constants.ts`
3. Register it in the agent adapter registry
4. Add the Rust-side spawn logic in `src-tauri/src/services/agent_manager.rs`

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Include a description of what changed and why
- Ensure `pnpm lint` and `cargo check` pass
- Add tests for new backend functionality

## Reporting Issues

Use [GitHub Issues](https://github.com/IsaiaScope/Sofi/issues) with the provided templates:
- **Bug Report**: Include steps to reproduce, expected vs actual behavior
- **Feature Request**: Describe the use case and proposed solution

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
