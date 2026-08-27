---
name: check-speaker-replies
description: Check email for replies from invited seminar speakers and report who has confirmed, declined, gone quiet, or asked a question. Use this whenever the user asks about speaker responses for the Tales of Modern Software Engineering seminar (CSE 090-SE / 290-SE) — including phrasings like "any word from the speakers?", "did anyone confirm?", "check the invite threads", "who still hasn't answered?", "any updates on the seminar?", or "is the lineup settled?". Also use it when the user is about to publish or update the schedule and needs to know which speakers are still tentative, and when they ask to flip someone from tentative to confirmed in _data/talks.json. Prefer this skill over an ad-hoc mailbox search: searching by remembered thread ids or names silently misses replies, and this skill exists specifically to avoid that failure.
---

# Checking for speaker replies

The seminar's schedule lives in `_data/talks.json`. Speakers with
`"tentative": true` have been invited but are not yet publicly announced. This
skill answers one question reliably: **what has changed since the last check,
and does anything need the user's attention?**

Doing that well is harder than it looks, because the obvious approach — write
down each speaker's email thread and re-read those threads later — fails
quietly. The sections below are organized around the specific ways it fails.

## The three rules that matter most

1. **Discover replies by searching email addresses over a time window** — never
   by re-reading thread ids you recorded earlier (Step 2).
2. **Open every thread that search returns** — a result preview shows the
   *oldest* messages and routinely hides the reply you are looking for (Step 3).
3. **Never report status without checking first** — `tracking.json` is a cache,
   and a cache is a record of the past, not a statement about now (Step 0).

All three exist because all three have already failed here, each in a different
place in the pipeline: the reply was in a thread nobody was watching; the reply
was in a watched thread but hidden by a truncated preview; the reply had arrived
and nobody looked. Finding the thread, reading the thread, and refreshing before
answering are three separate jobs. Skipping any one of them produces the same
confident, wrong sentence: "no reply yet."

## Step 0: A status request is a request to check

Any question about where things stand — "what's the status", "show me the
table", "who's confirmed", "any word yet" — means **run Steps 1–5 now**. Build
the answer from mail you fetched during this turn.

`_outreach/tracking.json` looks like an answer and is not one. It is a snapshot
of the last check, and speakers reply at 4am. Rendering that file into a tidy
table produces something that *reads* as current, carries no visible age, and is
wrong the moment anyone has replied since — a worse failure than saying "I don't
know," because it looks authoritative.

This already happened: a status table was generated straight from the cache
while a confirmation from Arun Kumar sat unread in the inbox, sent about two
hours after the snapshot was taken. Nothing in producing that table consulted
email at all.

The rule has one narrow exception: if you genuinely just checked, seconds ago in
this same turn, reuse that result — but **stamp the answer with its as-of time**
so the reader can judge its age. A status report with no timestamp is a claim
about the present, and you can only make that claim about mail you have actually
looked at.

### Rule 1 in detail

**Discover replies by searching for the person's email addresses over a time
window. Never by re-reading thread ids you recorded earlier.**

Thread ids are for *reading* a conversation you have already found. They are
useless for *finding* one, because a thread id can only ever return the thread
it names.

This is not hypothetical. Bill Pugh was invited in one thread and confirmed in
a completely different one: the co-organizer started a fresh thread with a new
subject ("Planning for October 12th UCSD Visit") and Bill replied there two
minutes later. A recheck keyed on the recorded invitation thread returned the
original invitation forever and reported "no reply after five days" — while a
confirmation sat in the inbox. Address-based search finds it immediately.

Recorded thread ids are still worth keeping, for reading history and for
showing the user where a conversation lives. They just are not the search.

## Step 1: Load the state

Two files, both under `_outreach/`:

- **`tracking.json`** — tracked in git. Who was invited, for which date, by
  whom, current status, known thread ids, and the last message already seen
  for each person. This is what makes a check a *diff* rather than a re-read.
- **`contacts.local.json`** — gitignored, because this repository is public and
  it holds people's personal email addresses. Maps each `contact_key` to
  addresses, plus organizer and introducer addresses.

If `contacts.local.json` is missing (fresh clone, another machine), say so
rather than guessing addresses — a check run without it is not trustworthy and
should be reported as such.

Cross-check `tracking.json` against `_data/talks.json`. If a tentative speaker
in `talks.json` has no entry in `tracking.json`, that person is invisible to
every search below. Flag it as a gap and ask how they were contacted; that gap
is exactly how someone falls through.

## Step 2: Search by address and time window

Build the address list from `contacts.local.json` — every speaker address, plus
the co-organizers. Then search a window that starts a little before
`last_checked` (overlap is free; a gap is not).

The Gmail search tool is `mcp__e07e6999-df03-48af-a0fe-acbe1033eb1e__search_threads`.

```
in:anywhere newer_than:7d {from:addr1 from:addr2 from:addr3 ...}
```

Notes that save time:

- `in:anywhere` includes spam and trash. Replies do land in spam, and a
  legitimate reply that got misfiled is precisely the one worth catching.
- Include the **co-organizers'** addresses, not just the speakers'. Leo Porter
  co-invites, and his messages are often the first sign a speaker has agreed
  (his "Thank you for agreeing to come" was the tell for Bill). This does make
  the results noisy — a co-organizer is a busy colleague with a lot of
  unrelated mail — so triage the co-organizer hits by subject and drop the
  ones that are plainly about something else.
- Search **`from:`** for replies. A speaker who has answered is a sender.
- Use `view: "THREAD_VIEW_MINIMAL"`, not `METADATA_ONLY`. The metadata view
  omits subject and snippet, which are the two fields that let you triage a
  result list at a glance; without them every thread has to be opened.
- If a broad time-window search overflows the tool's output limit, it is saved
  to a file and you are told the path. Use `jq` on that file rather than
  re-running narrower searches:
  ```bash
  jq -r '.threads[].messages[] | "\(.date)  \(.sender)  \(.subject)"' FILE | sort
  ```

Run a second, looser sweep as a safety net — a plain window with no address
filter, listing only date/sender/subject — and scan for anything seminar-shaped
from an address you do not have on file. Speakers reply from personal accounts,
assistants reply on their behalf, and people get introduced mid-thread. This
sweep is cheap and it is how you catch the addresses `contacts.local.json`
does not know about yet.

## Step 3: Open every thread the search returned. All of them.

**A search result listing is never evidence that a thread has nothing new.**

`search_threads` matches at the *thread* level but then shows only about five
messages per thread — **the oldest five, not the newest**. On a long-running
thread the message that caused the match is usually not in the preview at all.
The listing can show you July while the reply you are hunting arrived tonight.

That is not a corner case; it is the normal behaviour for any thread with more
than five messages, which describes every real invitation thread here.

So the rule is mechanical, and it deliberately leaves no room for triage:

> Every thread returned by the Step 2 address search gets opened with
> `mcp__e07e6999-df03-48af-a0fe-acbe1033eb1e__get_thread`. No exceptions,
> no skipping ones whose preview "looks old" — looking old is exactly the
> symptom. The address search returns only a handful of threads; opening all
> of them is cheap, and deciding which to open is where the failure happens.

This already went wrong once. Rahul Chityala confirmed Oct 5 for the Whova
group, and two consecutive checks reported "no reply since your invite." Both
times the address search *did* return his thread — correctly, because he had
sent mail. Both times the preview showed five messages from four weeks earlier,
and both times that preview was read as "nothing new." The data was in hand and
thrown away at the triage step.

A cheap way to catch the same class of error: for each person, compare the
newest message in `get_thread` against the `last_seen_message` recorded in
`tracking.json`. If the recorded id is not the final message, there is new
content — regardless of what any preview suggested. Do that comparison in code,
not by eye:

```bash
python3 - <<'PY'
# newest id from get_thread output vs tracking.json last_seen_message
PY
```

Once a thread is open, use `messageFormat: "MINIMAL"` to scan its shape and
`"PLAIN_TEXT"` for the body of anything that looks like a decision. Snippets cut
off mid-sentence, and a snippet has hidden the actual answer before.

**Threads shared by several speakers need a per-person read.** One thread holds
both Kylie Taitano and the four Whova engineers. "This thread has been handled"
is not a fact about the thread; it is a fact about one person in it. Walk the
tail message by message and attribute each to a sender before concluding
anything about anyone.

## Step 4: Classify each person honestly

For each speaker, place them in one of these, and **quote the sentence** that
justifies it. Quoting keeps the judgment auditable and stops a warm-but-vague
reply from being scored as a commitment:

| Status | Means |
|---|---|
| `confirmed` | Explicitly agreed to a **specific date**. "Yes, Oct 12th works very well for me." |
| `interested` | Willing, but no date locked. "Happy to join, sounds fun" — this is not a confirmation. |
| `question` | Waiting on the user for something. Needs a reply, not just a status line. |
| `declined` | Said no, or proposed only dates that do not work. |
| `invited` | Invitation sent, nothing back yet. |
| `gap` | In `talks.json` as tentative, but no outreach on record at all. |

Two distinctions worth preserving because they have already caused a wrong
conclusion:

- **Agreeing to participate ≠ agreeing to a date.** Arun Kumar and George
  Porter both said yes to the seminar weeks before the November 9 date existed.
  Someone can be enthusiastic and still not have confirmed anything schedulable.
- **A panel is not one person.** The faculty panel has five invitees who reply
  separately, sometimes in their own older one-to-one threads. Track each
  individually; the panel is confirmed only when the people you actually need
  have each confirmed.

## Step 5: Say what you cannot see

The mailbox you are searching is one participant's view. When another organizer
sent the invitation, the speaker may reply to them alone and nothing appears
here at all. That is exactly what happened with Bill.

So phrase silence precisely. "No reply in your mail" is a true statement about
the mailbox; "no reply" is a claim about the world, and you usually cannot make
it. When someone is silent past a deadline **and** was invited by a
co-organizer, the useful next step is to ask that co-organizer before nudging
the speaker — the answer may already exist.

Also watch for **deadlines inside the invitations themselves** (Leo's asked for
an answer by a specific date). A passed deadline on a silent invitee is the
thing most worth surfacing.

## Step 6: Report

Lead with what changed. The user has read the unchanged rows before.

```
## New since <last_checked>
- <Name> — confirmed <date>: "<quoted sentence>"  (<thread subject>)
- <Name> — asked: "<quoted question>"  ← needs a reply

## Still outstanding
| Speaker | Talk date | Invited | Last contact | Note |

## Needs attention
- <deadline passed / gap in tracking / question awaiting an answer>
```

Then, if anything is now confirmed, propose the `talks.json` change — do not
make it yet:

> Bill Pugh and Kylie Taitano are confirmed. Want me to set `"tentative": false`
> for 2026-10-12 and 2026-09-28?

**`tentative` exists at two levels**, and a partly-confirmed panel needs both.
The talk-level flag governs the slot; each speaker object carries its own flag
for the person. When a panel's date is settled but one or two invitees have not
agreed to it, the right change is `"tentative": false` on the talk *and*
`"tentative": true` on just those speakers — the site then publishes the
confirmed names and adds "*N* more panelists to be announced". Marking the whole
talk tentative instead would hide people who have already committed, and
flipping the talk without flagging the stragglers would publish names that never
agreed to the date. Neither is honest; propose the two-level version.

## Step 7: Apply, on approval only

The user approves the flip; you do not decide it. Once approved:

1. Edit only the `tentative` field for the named dates. Do a targeted textual
   edit rather than a JSON round-trip, which would reformat the whole file:
   ```bash
   python3 - <<'PY'
   p="_data/talks.json"; s=open(p).read()
   for date in ("2026-10-12",):
       i=s.index('"date": "%s"'%date); j=s.index('"tentative":', i); k=s.index('\n', j)
       s=s[:j]+s[j:k].replace('true','false')+s[k:]
   open(p,"w").write(s)
   PY
   ```
2. Run `bin/check-talks` — it validates the file and prints a summary.
3. Show `git diff`.
4. **Stop there.** Do not commit and do not push. The user verifies the push
   themselves; a speaker's name going live on a public site is their call, and
   an incorrect flip is publicly visible within a minute or two of a push.

## Step 8: Write the state back

Update `_outreach/tracking.json`: set `last_checked` to now, and for each person
update `status`, `threads` (**append** newly discovered thread ids — Bill has
two), `last_seen_message`, `last_seen_at`, and `notes`.

If the loose sweep in Step 2 surfaced a new address for someone, add it to
`contacts.local.json` so the next check searches it.

This step is what makes the next run a diff instead of a re-derivation. Skipping
it is how a check silently becomes a full re-read that misses things.

## A note on names

Search by address, never by a remembered human name. The user has referred to
the co-organizer by two different first names; a name-based search for the wrong
one returns nothing and looks exactly like a real absence of mail. Addresses
are identifiers, names are not. When a name in the conversation does not match
the address on file, mention the mismatch briefly and go with the address.
