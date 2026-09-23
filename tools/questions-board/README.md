# Questions board

A Google Apps Script web app where enrolled students submit questions for the
seminar speakers, upvote each other's questions, and comment on them. Sorted by
upvotes, highest first.

Backed by the **Fa2026 Grade Sheet**. Students never get access to that sheet — the
script reads and writes it as the owner, and gates every request on the viewer's
address appearing in `Roster`.

This directory is excluded from the Jekyll build (`exclude:` in `_config.yml`), so
none of it is published to the course site.

---

## Files

| File | What it is |
|---|---|
| `Code.gs` | Server: auth, the roster gate, board assembly, scoring, mutations |
| `Index.html` | Page shell, rendered as an `HtmlService` template |
| `Styles.html` | Board CSS, written against the site's theme variables |
| `JavaScript.html` | Client: DOM rendering and `google.script.run` calls |
| `appsscript.json` | Manifest — OAuth scopes and web app settings |
| `.clasp.json.example` | Copy to `.clasp.json` and fill in your script id |

---

## How the sheet is used

**Read-only, always:** `Roster`, `Gradesheet`, `cse-290 students`, `cse-090 students`.
`Roster!A2` and `Gradesheet!B2` are array formulas — one stray write destroys them
with no script-side undo. `writableSheet_()` in `Code.gs` enforces this with an
allowlist, so no future edit can write to them by accident.

**Written:** `Questions` and `Student Submissions` only, append-only.

### `Questions`

| Column | Written by | Notes |
|---|---|---|
| `Question ID` | the app | `Q001`, `Q002`, … derived from the max already in the tab |
| `Question` | the app | the student's text |
| `Created` | the app | ISO 8601 |
| `Hidden` | the Hide button, or you by hand | `TRUE` pulls the question off the student board |

### `Student Submissions`

One row per action. This is the participation ledger.

| `Action` | `QuestionID` | `Data` |
|---|---|---|
| `submit` | the new question's id | the question text |
| `upvote` | the question | — |
| `unupvote` | the question | — |
| `comment` | the question | the comment text |

Every row also carries a `Submission ID` (`S0001`, `S0002`, …) and a `Hidden` flag.
The id exists so the page can name one comment for hiding without ever being told
who wrote it; row numbers would not do, because deleting a question renumbers
everything below it. `setupSheets()` backfills ids onto rows written before the
column existed.

`Timestamp` and `Questions.Created` are ISO 8601 **in course local time with an
explicit offset** — `2026-09-21T21:23:22-07:00` — so the sheet reads as wall-clock
Pacific rather than UTC. The offset comes from the script's timezone
(`America/Los_Angeles` in `appsscript.json`), so it is `-07:00` during PDT and
`-08:00` automatically once daylight time ends on 1 Nov 2026, with the seminar
still running to 30 Nov. Keeping the offset means the value is unambiguous and
still parses correctly in any browser.

Rows written before this change carry UTC (`...Z`) timestamps; both forms parse
fine, but if you sort or diff them, note the 7-hour jump.

`Role` is `student` or `staff` — see **Course staff** below.

A student's current position on a question is **whichever of `upvote` / `unupvote`
appears last in row order**. Un-voting appends a row rather than deleting one, so
nothing ever shifts under a concurrent click and the participation record survives.

To count participation, pivot on `Student's email` × `Action`, filtered to
`Role = student`.

### Course staff

`Roster` holds enrolled students only, so the instructor would otherwise be locked
out of the board they need to read before each talk. Two accounts get in anyway:

- **the deploying account** (whoever owns the grade sheet) — always, no configuration;
- **anyone listed in the `STAFF` constant** at the top of `Code.gs` — for TAs and
  readers, lowercase addresses. Currently: `leporter@ucsd.edu`.

Everyone else still has to be on the roster. Staff posts are written with
`Role = staff`, so they can be excluded from participation counts. If a TA is also
enrolled, enrolment wins and their rows are tagged `student` — their work on the
board is coursework.

Staff upvotes **do** count toward the number shown under the arrow; the count has to
match what you just clicked. Filter on `Role` if you want a student-only tally.

### Moderation: Hide and Delete

Staff see two extra controls under every question. Students never see them, and the
server re-checks staff membership on both calls — the buttons are a convenience, not
the gate.

**Hide** sets `Hidden` to `TRUE` on that question's row and nothing else. The
question disappears for students; staff still see it, dimmed and struck through with
a HIDDEN chip, sorted to the bottom, with an **Unhide** button. Every vote and
comment stays in the sheet. Fully reversible, and the same thing as typing `TRUE`
into the cell by hand.

**Hide comment** sets `Hidden` on that one submission row. The comment stops
showing to students and stops counting toward its author's participation — and
stops using up their per-question comment allowance — but the row stays in the
sheet. Staff see it struck through with an Unhide control. Reversible, and
independent of hiding the question it sits under.

Any row with `Hidden` set is treated as though it never happened, so setting the
flag by hand on an upvote row also withdraws that vote. Only comments get a
button.

**Delete** removes the question's row from `Questions` and **every row in
`Student Submissions` that names it** — the author's `submit` row and all its
upvotes, un-upvotes and comments. It asks for confirmation first and reports how
many rows it removed.

Delete is the one place this app is not append-only, and there is no undo inside it:
Google Sheets version history is the only way back. It also destroys participation
evidence — a student who commented on a deleted question loses that record, and so
does whoever wrote it. **Prefer Hide.** Reach for Delete only when the content
actually has to leave the sheet.

Deleting never frees an id for reuse: the next id comes from the higher of the
sheet's maximum and a `LAST_QUESTION_NUMBER` script property, so `Q003` is not handed
out twice after the first `Q003` is deleted. The sheet still wins when it is ahead,
so the scheme self-heals if that property is ever lost.

### `Config` — scoring rules

`setupSheets()` creates this sheet and seeds it. Edit it here, not in `Code.gs`;
changes take effect on the next page load, with no redeploy.

| Setting | Value | |
|---|---|---|
| `Period A ends` | `2026-09-30 23:59:59` | Wednesday of week 1 |
| `Period B ends` | `2026-10-21 23:59:59` | Wednesday of week 4 |
| `Period C ends` | `2026-11-11 23:59:59` | Wednesday of week 7 |
| `Points per question` | `5` | |
| `Points per upvote` | `2` | |
| `Points per comment` | `1` | |
| `Points needed per period` | `15` | the cap, not just a target |

Deadlines are **wall clock in the course timezone**, so you write the time you mean
and daylight saving is handled for you: A and B close at 23:59:59 PDT, C at
23:59:59 PST (DST ends 1 Nov 2026). An ISO string with its own offset works too.
The `Value` column is formatted as plain text so Sheets does not reinterpret a
deadline as a date in some other zone.

A period runs from the previous deadline to its own; the deadline second itself
still counts. Activity after the last deadline earns nothing. A missing or
unreadable setting falls back to the built-in default rather than breaking the
board — run `diagnose()` to see what is actually in force, including warnings.

### How participation is scored

Each student sees their own tally at the **foot of the page, below the questions**:
one row per period with a progress bar, a breakdown, and a mark once the period is
completed. The numbers come from the server; nothing is counted in the browser.

**The requirement.** Credit needs the **first period completed, plus at least one
of the later ones** — in this quarter, Period A plus B or C. The scorecard states
that rule and whether the student has met it yet, including the case students get
wrong most often: B and C do not substitute for A. The rule is expressed by
position, not by name, so renaming the periods in `Config` does not break it. It is
not itself configurable; change `scoreFor_` in `Code.gs` if the policy changes.

**Completed periods, not a pooled score.** Reaching `Points needed per period`
completes that period and earns its mark; the header reads "1 of 3 periods
completed". There
is deliberately no cross-period total — the periods are separate hurdles, and a
single number would imply a surplus in one could cover a shortfall in another. It
cannot.

- **Proposing a question** scores in the period its `submit` row falls in.
- **Commenting** scores per comment, in that comment's period.
- **Upvoting** scores once per question, in the period of the student's **last**
  vote event on it, and only if that event is an `upvote`. An upvote that was taken
  back is worth nothing; one taken back and recast counts where it now stands.
- **Each period is capped** at `Points needed per period`, which is also the
  threshold for completing it. There is nothing to gain from upvoting everything
  in sight.
- **Hidden and deleted questions score nothing** — not for the author, and not for
  anyone who upvoted or commented on them. Hiding is reversible, so the points come
  back if you unhide.

Staff see the scorecard too, headed "Participation (staff view)", so you can see
exactly what a student sees. It scores your own activity the same way, with a note
that your rows are tagged `Role = staff` and therefore excluded from student
participation counts.

**Every action counts in exactly one period.** The periods partition time — A is
everything up to its deadline, B runs from A's deadline to its own, C likewise —
so nothing is double-counted and nothing between the quarter's start and Nov 11
falls through a gap. Activity after the final deadline earns nothing, which
includes the last three talks of the seminar (16, 23 and 30 Nov).

### `Email list` — talk-notification sign-ups

| Column | |
|---|---|
| `Date` | when they signed up, course-local ISO 8601 |
| `Email` | the address |

The tab is exactly the list you would paste into a mail client: removing yourself
deletes the row rather than flagging it.

Two ways in, and neither ever takes an address on trust from the browser:

- **`/exec?page=subscribe`** — for `@ucsd.edu` accounts, whose address Apps Script
  will tell us. One click, nothing typed.
- **`/notifications/` on the course site** — for anyone with a Google account,
  Gmail included. Apps Script will *not* reveal a non-domain visitor's address, so
  that page signs them in with Google directly and posts the resulting ID token to
  `doPost`, which verifies it with Google (`aud`, `iss`, `exp`, `email_verified`)
  before writing. This is what buys one-click sign-up with no confirmation email.
  It needs `GOOGLE_CLIENT_ID` as a script property, `notifications.client_id` and
  `notifications.endpoint` in `_data/course.yml`, and its own deployment whose
  access is **Anyone** — kept separate so the question board's domain-only
  deployment is never widened.

Sheet names are matched case-insensitively (`Email list` vs `Email List`), so a tab
renamed to a different case does not take a page down.

### Columns are found by header name

Nothing in `Code.gs` refers to a column letter or index. Row 1 is read into a
name → column map, and the header strings live in one `COLS` constant at the top of
the file. Rename a header in the sheet, change it in `COLS`, and you are done; a
header that goes missing raises a named error instead of silently reading the wrong
column.

This matters because `Roster` is
`={'cse-290 students'!A2:AW59; 'cse-090 students'!A2:AW59}`. The day a TSS export
gains or reorders a column, anything hardcoded to `H` would start reading phone
numbers into the auth gate and lock out the whole class. `Gradesheet!B2` already
defends against this with `MATCH` on header text; this script does the same.

---

## First-time setup

**1. Enable the Apps Script API** at <https://script.google.com/home/usersettings>,
or `clasp` fails with an opaque error.

**2. Create the script and push.**

```bash
npm i -g @google/clasp
clasp login
cd tools/questions-board
clasp create-script --title "Questions Board" --type standalone --rootDir .
```

`create-script` overwrites `appsscript.json`, so restore ours before pushing:

```bash
git checkout appsscript.json
clasp push -f
```

**3. Point it at the grade sheet.** In the Apps Script editor →
**Project Settings → Script Properties**, add:

| Property | Value |
|---|---|
| `SPREADSHEET_ID` | the id from the sheet's URL |

The id is deliberately not in this repo: the repo is public and the sheet holds
student records.

**4. Run `setupSheets()`** from the editor. It adds `Created` / `Hidden` to
`Questions` and `Timestamp` to `Student Submissions` if they are missing, checks
that `Roster` still has its institution-email column, and reports the enrolment
count. Authorize when prompted.

**5. Deploy.**

```bash
clasp create-version "initial"
clasp create-deployment --description "prod"
```

Record the deployment id. In the editor, confirm **Deploy → Manage deployments**
shows:

- **Execute as:** Me — students must not need access to the grade sheet.
- **Who has access:** Anyone within UC San Diego.

**The URL is the domain-scoped form**, which the deployment dialog shows under
**Web app → URL**:

```
https://script.google.com/a/macros/ucsd.edu/s/<deploymentId>/exec
```

The plain `https://script.google.com/macros/s/<deploymentId>/exec` that most
documentation shows **404s** for a UC San Diego–restricted app ("Sorry, unable to
open the file at this time"). Give students the `/a/macros/ucsd.edu/` form.

`clasp list-deployments` prints the deployment id if you need it again.

---

## Two deployments — read this before redeploying

| Deployment | Access | Used for |
|---|---|---|
| `AKfycbwxHLe4…UXKTll_b` | **Anyone within UC San Diego** | the question board and `?page=subscribe` |
| `AKfycbwbD6w3…Umi50sw5d94i` | **Anyone** | `doPost` only, for `/notifications/` |

They exist separately so the public sign-up never widens access to the board.

**The access setting comes from `webapp.access` in `appsscript.json` at the moment a
version is deployed.** The manifest in this repo says `DOMAIN`, which is right for
the board. So:

- Updating the **board** deployment is safe — just `clasp update-deployment <boardId>`.
- Updating the **public** deployment with the repo's manifest would silently make it
  domain-only, and every sign-up would start failing with a Google login page. To
  update it, temporarily set `access` to `ANYONE_ANONYMOUS`, push, update that
  deployment, then restore `DOMAIN` and push again.

Verify access functionally rather than trusting the UI — an anonymous request tells
you the truth:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -L "<public>/exec?page=subscribe"   # 200, our page
curl -s -L "<board>/exec" | grep -c accounts.google.com                      # non-zero: sign-in required
```

### If sign-up starts refusing every token

`oauthScopes` is pinned in the manifest, and **pinning stops Apps Script
re-prompting when a new scope is added** — it compares against the stored grant and
stays quiet, so `UrlFetchApp` fails at runtime with "You do not have permission to
call UrlFetchApp.fetch". That happened once already. To force consent: delete the
`oauthScopes` block, push, run `setupSheets()` (accept the prompt), then restore the
block and push. `setupSheets()` reports the state on its "Public sign-in:" line, so
you will see it before a visitor does.

## Releasing a change

Always **update the existing deployment**. Creating a new one changes the URL and
breaks every bookmark.

```bash
clasp push -f && clasp create-version "what changed" && clasp update-deployment <deployId>
```

Adding an OAuth scope to `appsscript.json` means re-authorizing in the editor before
the new version will run.

`clasp` v3 renamed these commands. Tutorials showing `clasp create` or
`clasp deploy -i` are for v2 and will mislead you.

---

## Maintenance

| Task | How |
|---|---|
| Roster changed mid-quarter | Run `refreshRoster()`, or wait 6h for the cache to expire |
| Add or remove a TA | Edit `STAFF` in `Code.gs`, then push, version and update the deployment |
| Added a column to `COLS` | Run `setupSheets()` again **before** releasing, or every write fails with "has no column named …" |
| Run `setupSheets()` again after an upgrade | It is the **first function in `Code.gs`**, so the editor preselects it — just press Run. See the note in the file: the editor's Run dropdown silently fails to commit a selection once the function list scrolls, and will happily run a different function while displaying the one you picked. Check the Executions page if a run surprises you. |
| Check a sheet edit didn't break anything | Run `diagnose()` — prints every resolved column number, the timezone and a sample timestamp, and the staff list |
| Hide a question | Type `TRUE` in its `Hidden` cell. No redeploy needed |
| Restyle | The page loads `tokens.css` and `themes.css` from the live site, so a theme change there flows through. Bump `CSS_VERSION` in `Code.gs` to bust browser caches |

---

## Things to know

**Anonymity is UI-only.** Students see no names next to questions or comments, but
every row in `Student Submissions` carries an email. The page says so in three
places — the lead, under every input box, and on the sign-in screen — and it is
worth saying in class too.

**Row order leaks timing.** In a class of 58, the order of rows is a weak
identifier. The board deliberately sends the client no author id at all, not even a
stable pseudonymous one: "author #7 wrote these four comments" plus one
self-identifying comment is enough to deanonymize someone.

**Every row is written by the owner account**, so the sheet's revision history shows
nothing about who did what. `Student Submissions` is the only record.

**If the owner's OAuth grant is revoked** or the account is suspended, the app fails
for everyone at once. Deploy from the account that owns the sheet.

**Do not embed this in the course site with an iframe.** It would need
`setXFrameOptionsMode(ALLOWALL)`, and third-party-cookie blocking in Safari and
Chrome breaks the Google session inside a cross-site frame — which blanks
`Session.getActiveUser()` and breaks auth entirely. Link out to `/exec`.

### Testing the rejection path

You are the owner *and* on the roster, so you cannot see the "not enrolled" screen
normally. Append `?debugAs=someone@example.com` to the `/exec` URL. The override is
honoured only when the signed-in user is the deploying account, and it grants no
privilege — the impersonated address still has to clear the roster gate, so this
exercises the real rejection path rather than a mock of it.

When `debugAs` is active the page shows a yellow banner, and **posting is live** —
anything you submit is written to the sheet under the impersonated address.
