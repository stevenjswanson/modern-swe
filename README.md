# Tales of Modern Software Engineering — course site

Source for <https://stevenjswanson.github.io/modern-swe/>

CSE 90-SE / CSE 290-SE, UC San Diego, Fall 2026.

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
- **`speakers`, `slides`, `videos`, and `links` are lists.** Two speakers? Add a
  second object. Three videos? Add a third. Nothing else has to change.
- **Past vs. upcoming is automatic.** It is computed in the browser from the
  date, so you never have to mark a talk as finished.
- **Order does not matter.** Entries are sorted by date when the page is built.

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
bundle install
bundle exec jekyll serve
```

Then open <http://localhost:4000/modern-swe/>.

> **Note for this Mac specifically:** the Homebrew tree here is x86_64 while the
> machine is arm64, so gems with native extensions build for the wrong
> architecture. If Jekyll fails to load with an "incompatible architecture"
> error, rebuild the offending gem with:
>
> ```bash
> arch -x86_64 gem install ffi -v 1.15.5 -- --with-cflags="-arch x86_64"
> ```
>
> This does not affect CI, which builds on Linux.

---

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
