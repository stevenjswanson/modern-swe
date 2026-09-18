# Course flier

`modern-swe-flier.pdf` — print/attach version (US Letter).
`modern-swe-flier.png` — 2448x3168, for pasting into email or slides.

Both are the same design. Leo attaches the PDF to speaker invitations, so keep
this the canonical copy rather than mailing around whatever is in someone's
Downloads folder.

**Not linked from the site**, deliberately — nothing in `_layouts` or
`_includes` references it. It still builds into `_site/` and is reachable at
`/modern-swe/assets/flier/modern-swe-flier.pdf`, which is what makes it useful
to paste into an email. If it ever needs to be genuinely unreachable, move it
under `_speakers/` (excluded from Jekyll) instead.

If the schedule, room, or TSS section IDs change, this file goes stale silently
— it is an image, so nothing validates it against `_data/course.yml`. Check it
whenever those change.
