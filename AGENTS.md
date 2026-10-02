# Repository instructions

## Scope and Ponytail

- Before implementing a code change, read and use [Ponytail](.agents/skills/ponytail/SKILL.md). Use its default `full` mode unless the user specifies another mode. Let it guide reuse, dependencies, abstractions, and the smallest correct solution.
- Before finalizing a code change or requesting review, use [Ponytail Review](.agents/skills/ponytail-review/SKILL.md) on the complete task diff. It reviews unnecessary complexity; also review correctness, security, accessibility, and behavior.
- Stay within the requested objective. Do not include unrelated linting, formatting, refactoring, or import changes. A Ponytail finding does not authorize a repository-wide cleanup.
- Preserve user-owned changes. Report unrelated findings without fixing them or creating issues automatically.
- Challenge unnecessary complexity with a concrete alternative. Do not simplify away explicitly requested behavior, validation, security, accessibility, or error handling.

## Repository sources and ownership

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for development, portal contracts, and verification; [DESIGN.md](DESIGN.md) for UI changes; and [SECURITY.md](SECURITY.md) for security boundaries and reporting. Read only the documentation relevant to the task.
- Follow the nearest applicable `AGENTS.md`. In `apps/web`, follow its instructions for the installed Next.js version.
- Portal adaptations belong in `sites/<portal>`, shared capabilities in `packages/`, and application composition in `apps/`. Import other workspaces through their public exports and respect the existing dependency checks.
- Keep server dependencies out of browser code. Use the shared design components and tokens before adding new ones.
- Validate external input at its trust boundary. Preserve owned contracts internally instead of duplicating types, hiding failures behind defaults, or forcing incompatible values through casts.

## Portal and data boundaries

- For portal adaptations, preserve the original forms, validation, navigation, and security controls. Do not replace CAPTCHA, signatures, certificates, passwords, or file-upload controls.
- Do not extract cookies, tokens, or session data from official portals. If the DOM does not satisfy the adapter contract, preserve or restore the original interface.
- Distinguish synthetic fixtures, anonymized fixtures, and captures from the real portal. Fixture-based tests are not evidence that the real portal was verified.
- Do not include personal data or secrets in fixtures, logs, screenshots, commits, or PRs.

## Verification and temporary changes

- Add or modify tests only when they directly cover behavior introduced or fixed by the task. Use the existing test tools and test observable behavior or contracts, not the implementation's shape.
- Select verification proportional to the change. Documentation-only changes do not need new tests or a full application build.
- Use the existing commands: `pnpm check` for repository checks, `pnpm test:e2e` for relevant browser behavior, and `pnpm exec prettier --check <files>` for formatting. Use focused checks while iterating; format only files belonging to the change.
- For visible UI changes, provide screenshots or recordings when they help verify the result. Report commands actually run, their results, and any expected verification left pending.
- Do not keep changes to test harnesses, E2E runners, fixtures, environment defaults, build configuration, package manifests, lockfiles, or logging merely to make local verification pass.
- Remove temporary verification and debugging changes before finishing. State what was temporarily changed and that it was removed. Never commit or push local-only workarounds without explicit authorization.
- Do not relax rules, timeouts, assertions, exclusions, or baselines to admit your implementation. Tooling changes must belong to the authorized objective. If a local workaround appears necessary as a permanent production change, explain it and ask before keeping it.
- When unsure whether a test, configuration, dependency, or harness change belongs to the task, ask before adding it.

## Git and pull requests

- Name new branches `<user>/feature-name`, using the contributor's GitHub username and a descriptive kebab-case feature name. Do not use another contributor's username or an agent name as the prefix.
- Use `type(scope): concrete result` for commit and PR titles. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, and `chore`. Use a scope matching the affected area.
- For PR titles, write the title text after the `type(scope):` prefix in Spanish, preserving technical identifiers. Example: `feat(search): añade filtros por organismo`.
- Write commit and PR descriptions in Spanish, preserving technical identifiers. Example: `fix(chat): conserva la respuesta al cancelar la búsqueda`.
- Keep one objective per PR and complete the [PR template](.github/pull_request_template.md). Link the relevant issue; use `Closes #N` only when the PR resolves it. Trivial changes do not require an issue solely for process.
- Update the PR description when its scope changes. Identify material agent assistance and the verification performed.
- Do not merge or deploy without authorization for that action. Respect GitHub's required checks and any required reviews; do not bypass them.

## Delivery

- Explain what changed, why, and how it was verified. State concrete limitations and pending decisions.
- Distinguish executed evidence from inference. Never claim that a test, manual check, or live-portal verification ran when it did not.
- Shared skills live in `.agents/skills/`. The `.claude/skills/` and `.cursor/skills/` links point to that source; edit the source rather than maintaining separate copies.
