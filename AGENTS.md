<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Simulation logic lives in pure TS under src/lib/sim (algorithms, workload, validation) with vitest tests; UI only calls it — keeps algorithms testable.
- Theme uses a `.dark` class on <html> set by an inline head script from localStorage; all colors are tokens in src/styles.css — avoids flash and hardcoded colors.
- Hosting target is Vercel: nitro (already a dependency) auto-detects Vercel at build time, so no preset is pinned in vite.config.ts — keeps Lovable builds on their default target.
