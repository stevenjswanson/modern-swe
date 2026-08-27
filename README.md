# Tales of Modern Software Engineering — course site

Source for <https://stevenjswanson.github.io/modern-swe/>

CSE 090-SE / CSE 290-SE, UC San Diego, Fall 2026.

The site is static. Push to `main` and GitHub Actions rebuilds and publishes it,
usually within a minute or two.

---

## Adding a talk

Everything about the schedule lives in **`_data/talks.json`**. That is the only
file you need to touch week to week. Find the entry for the date, fill it in,
and push.

A blank entry looks like this:

```json
{
  "date": "2026-10-05",
  "time": "11:00–11:50",
  "location": "TBD",
  "status": "tba",
  "title": "",
  "abstract": "",
  "speakers": [],
  "slides": [],
  "videos": [],
  "links": [],
  "tags": []
}
```

A filled-in one looks like this:

```json
{
  "date": "2026-10-05",
  "time": "11:00–11:50",
  "location": "CSE 1202",
  "status": "confirmed",
  "title": "What actually broke when we let the model write the migrations",
  "abstract": "One paragraph, plain text. Optional.",
  "speakers": [
    {
      "name": "Jane Doe",
      "role": "Staff Engineer",
      "org": "Example Corp",
      "links": [{ "label": "Website", "url": "https://example.com/jane" }]
    }
  ],
  "slides": [{ "label": "Slides (PDF)", "url": "/assets/slides/2026-10-05.pdf" }],
  "videos": [{ "label": "Full talk", "url": "https://youtu.be/xxxxxxxx" }],
  "links": [],
  "tags": []
}
```

### Rules that matter

- **Only `date` and `status` are required.** Leave anything else empty and the
  page just omits it.
- **`status`** is one of `tba`, `confirmed`, or `cancelled`.
- **`tentative`** is `true` or `false`. Tentative speakers are **visible when
  you run the site locally** and **hidden on the published site**, where the row
  renders as "Speaker to be announced". So you always see the real schedule while
  working, and unconfirmed names never go out. See below.
- **`speakers`, `slides`, `videos`, and `links` are lists.** Two speakers? Add a
  second object. Three videos? Add a third. Nothing else has to change.
- **Past vs. upcoming is automatic.** It is computed in the browser from the
  date, so you never have to mark a talk as finished.
- **Order does not matter.** Entries are sorted by date when the page is built.

### Tentative speakers: local vs. published

|  | Tentative speakers |
|---|---|
| `bin/serve` or a local build | **shown**, with a yellow "Local preview" banner at the top |
| The published site (CI) | **hidden** — the row reads "Speaker to be announced" |

CI builds with `JEKYLL_ENV=production`, which is what draws the line. You do not
have to remember to flip anything before pushing, and pushing a half-finished
schedule will not leak a name.

**To publish a speaker once they confirm:** set that talk's `"tentative": false`
and push. That is the whole change.

**To publish every tentative speaker at once** (each gets a "Tentative" chip),
set `show_tentative: true` in `_data/course.yml`. That one *does* affect the
live site.

### Tentative individuals inside a confirmed slot

A slot can be settled while one of its people is not. This happens with panels:
the date is fixed and most panelists have agreed, but one or two have not yet
answered. Marking the whole talk tentative would hide everybody, which
overstates the uncertainty.

So a **speaker** carries its own `tentative` flag, using the same rule as the
talk:

```json
{
  "date": "2026-11-09",
  "tentative": false,
  "speakers": [
    { "name": "Dan Fu",       "tentative": false, "role": "..." },
    { "name": "Arun Kumar",   "tentative": true,  "role": "..." }
  ]
}
```

The published site lists the confirmed people, omits the tentative ones, and
adds "*N* more panelists to be announced" so the list does not read as complete.
Locally, everyone appears, with a "Tentative" chip on the unconfirmed ones.

Omitting the field means confirmed, so existing entries need no change. Setting
it inside an already-tentative talk does nothing — the talk-level flag hides the
whole slot — and `bin/check-talks` warns if you do.

### A note on personal data

`talks.json` is in a public repo. Anything written there is one `git push` from
being on the open web, whether or not the page displays it. Keep speaker email
addresses and phone numbers out of it — the site never needs them.

`bin/check-talks` **fails the build** if it finds an email address anywhere in
`talks.json`, so this is enforced rather than merely requested.

### Adding slides and videos later

Videos are hosted elsewhere — paste the URL.

Slides can either be a URL, or a PDF committed to `assets/slides/` and
referenced as `/assets/slides/whatever.pdf`.

---

## Before you push

```bash
bin/check-talks
```

Run it. JSON is unforgiving, and a single trailing comma makes Jekyll render an
**empty schedule with no error at all**. This catches that, plus bad dates,
duplicate entries, links missing URLs, and misspelled field names.

CI runs the same check first, so a bad file fails the build loudly instead of
quietly publishing a blank page. But finding out locally is faster.

---

## Changing the look

- **Whole-site theme** — `theme:` in `_data/course.yml`. One of `classic`,
  `mono`, or `vibrant`. That is the entire change.
- **Header and footer text** — the rest of `_data/course.yml`.
- **Colors, type, spacing** — `assets/css/`, in three layers:
  - `tokens.css` — the raw UCSD brand palette, copied from the brand kit. Do not
    hand-edit; it gets overwritten (see below).
  - `themes.css` — maps meanings (`--ink`, `--bg`, `--accent`) onto brand colors.
  - `site.css` — layout and components. Never references a brand color directly.

### When the UCSD brand kit changes

```bash
bin/sync-brand
```

Re-copies `tokens.css` and the logos from the brand kit, then reports which CSS
variables were added, changed, or removed — and warns if `themes.css` still
references one that is gone. That case fails *silently* in CSS (no color, no
error), which is exactly why the script checks for it.

Pass a path if the kit is not in `~/Downloads/ucsd-brand-for-claude-design`.

### Accessibility

Only 23 of the brand palette's 91 color pairs clear WCAG AA. The ratios for
every pair the site uses are written in comments in `themes.css`. If you change
a text or background color, check it against `05-reference/contrast-matrix.json`
in the brand kit rather than eyeballing it.

---

## Running it locally

```bash
bin/serve
```

Then open <http://localhost:4000/modern-swe/>.

Note the `/modern-swe/` on the end — the bare <http://localhost:4000/> returns
404, because the site is built with a base URL to match where GitHub Pages
serves it.

Edits to `_data/`, `_includes/`, `_layouts/` and `assets/` rebuild automatically;
refresh the browser to see them. Changes to `_config.yml` need a restart.

`bin/serve` validates `talks.json` before starting, so a typo there stops you
immediately rather than silently rendering an empty schedule.

> **Why a wrapper instead of `bundle exec jekyll serve`?** The Homebrew tree on
> this Mac is x86_64 while the machine is arm64, so the system gem directory
> holds native extensions built for the wrong architecture. Jekyll works fine
> from the user gem directory (`~/.gem`) — it just has to be found first, which
> is all `bin/serve` does. On a normally configured machine
> `bundle exec jekyll serve` is all you need, and CI (Linux) is unaffected.
>
> If you ever rebuild the Ruby install and hit an "incompatible architecture"
> error, the fix for a given gem is:
>
> ```bash
> arch -x86_64 gem install ffi -v 1.15.5 -- --with-cflags="-arch x86_64"
> ```

## Adding a page

Copy `about.md`, change the front matter at the top, and link to it. Pages are
plain Markdown.

## Layout

```
_data/talks.json     the schedule — the file you edit
_data/course.yml     header/footer text, theme
_includes/           header, footer, one talk card
_layouts/default.html
assets/css/          tokens -> themes -> site
assets/js/           marks past/upcoming talks
bin/check-talks      validate before pushing
bin/sync-brand       re-copy the brand kit
.github/workflows/   build and deploy on push to main
```
