<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Assistant conversations use owner-scoped chat_threads and thread_id on chat_messages; the streaming helper is server-only, so histories and secrets cannot leak across chats or into the browser.
- All UI copy lives in `src/i18n/ru.json` and `src/i18n/kz.json`, read via `useI18n().t`; never hardcode visible strings in components — the app must stay fully bilingual.
- Signed-in screens live under `src/routes/_authenticated/` and render inside `AppShell` (header with RU/KZ switch, pediatrician disclaimer, bottom nav) so every screen shows the disclaimer.
- Child profile is one row per parent in `child_profiles` (unique `user_id`), read through `profileQuery` in `src/lib/profile.ts`; screens that need it redirect to `/onboarding` when it is null.
- Built-in content (`src/data/activities.json`, `src/data/milestones.json`) is bilingual JSON with `ru`/`kz` fields; milestones keep a per-item `source` pointing at CDC "Learn the Signs. Act Early.".
- Day planning is pure and tested: `src/lib/schedule.ts` turns the profile into nap-safe slots; `src/lib/ai-plan.ts` validates the AI answer and fills gaps from `src/lib/library.ts`; today's own marks are excluded from picking so the plan stays stable during the day.
- Today's plan comes from `getTodayPlan` (`src/lib/plan.functions.ts`): AI first, library on any AI failure, stored once per day in `daily_plans` with both RU and KZ text (`language = 'both'`) so the cards never change mid-day or on a language switch; saving the profile deletes today's row to re-plan.
- Weather, minutes, streaks, Kazakh-word counts and pediatrician signals are pure helpers (`src/lib/{weather,minutes,kazakh-words,milestones}.ts`) covered by `src/test/features.test.ts`; screens only render them, so rules stay testable.
- Bad-weather swaps are applied at display time over the stored daily plan (`applyWeather`), and the plan generator also receives weather, so cached plans stay stable while the weather can change.
- Moment photos live in the private `moments` bucket under `<user_id>/…`, shown via short-lived signed URLs; deleting removes the file and the row.
