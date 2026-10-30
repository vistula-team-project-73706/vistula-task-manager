# Vistula Task Manager

A responsive task dashboard for Vistula University student **73706**. It uses plain HTML, CSS and JavaScript, and saves tasks to a Supabase `tasks` table through the Supabase REST API (`fetch`).

## Project files

- `index.html` — page structure, accessible controls and task form
- `style.css` — responsive dashboard styling
- `app.js` — task loading and CRUD actions
- `config.json` — Supabase connection placeholders
- `README.md` — setup and publishing notes

Partner contribution files are intentionally not included; add `contribution.html` and `contribution.json` from your partner's pull request.

## Configure Supabase

1. In Supabase, open **Project Settings → API** (or **API Keys**) and copy the **Project URL** and **publishable key**. The publishable key starts with `sb_publishable_`.
2. Replace the two placeholders in `config.json`:

   ```json
   {
     "supabaseUrl": "YOUR_SUPABASE_PROJECT_URL",
     "supabasePublishableKey": "YOUR_SUPABASE_PUBLISHABLE_KEY",
     "tableName": "tasks"
   }
   ```

   Keep the field names and `tableName` value as shown. Never put a database password, secret key, or service-role key in this public website.
3. The current `public.tasks` table uses `id`, `title`, `description`, and `completed`. A typical setup uses an integer identity `id`, text `title`, nullable text `description`, and boolean `completed` defaulting to `false`.
4. Enable Row Level Security and grant the `anon` role the SELECT, INSERT, UPDATE, and DELETE operations needed for this assignment. The browser sends the publishable key; RLS policies control which operations it can perform. Use policies only as permissive as your assignment requires.

`config.json` is fetched at runtime, so run the site from a local web server while developing; opening `index.html` directly from the filesystem may block that request.

## Run locally

From this folder, start any static file server (for example, VS Code Live Server) and open the local address it provides. The dashboard displays loading, configuration, and API error messages, and shows tasks only after a successful database response.

## Publish with GitHub Pages

1. Commit and push the five project files to the repository's default branch.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the default branch and the `/ (root)` folder, then save.
4. Wait for the Pages deployment to finish and open the published URL. Confirm that `config.json` is reachable at that URL and that the Supabase Project URL, publishable key, table, and RLS policies are correct.

The URL and publishable key are delivered to every site visitor as browser configuration. They are intended for client-side use; access to task data must be controlled by Supabase Row Level Security. Do not place privileged secrets in this repository.

## Interface selectors

The page and script use the assignment IDs `task-form`, `task-title`, `task-description`, `task-submit`, `status-message`, `task-list`, and `contribution-link`, plus IDs for the task dialog, filters, and overview. Filter buttons use the `data-filter` attribute; row actions use `data-action`.
