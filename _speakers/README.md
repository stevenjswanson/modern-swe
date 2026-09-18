# Speaker materials

Everything speakers send in: bios, headshots, talk titles/abstracts, and signed
video release forms. One directory per talk date.

```
_speakers/
  2026-11-09-faculty-panel/
    materials.md          # bios and talk info as received, tracked in git
    releases/             # signed release PDFs -- NOT tracked, see below
```

**This directory never reaches the website.** It is named with a leading
underscore (Jekyll ignores those) and is also listed in `_config.yml`'s
`exclude`. Belt and braces, because the release forms must not be served.

## Signed releases are gitignored on purpose

`_speakers/**/releases/` is in `.gitignore`. **This repository is public.** A
signed release carries the speaker's handwritten signature and personal
details; committing one publishes it to the open web and, because git history
is permanent, it stays published even if the file is deleted later.

Keeping the site off it is not enough — the repo itself is the exposure.

The forms live here locally so they are collected in one predictable place. If
they need to be backed up or shared, use a private channel (Drive, a private
repo, department records) rather than this one.

To track them anyway, delete the `_speakers/**/releases/` line from
`.gitignore` — but read the paragraph above first.

## What IS tracked

`materials.md` per talk: bios, titles, abstracts, and a note of what has
arrived and what is still missing. That text is destined for the public
schedule anyway, so there is nothing to protect.
