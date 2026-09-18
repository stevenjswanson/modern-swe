# Pre-talk meeting request

Sent to a confirmed speaker a few weeks out, to set up the 30-minute Zoom chat
promised in the original invitation and to chase whatever intake items are
still missing.

This is Steve's own wording, from the message he sent Kylie Taitano on
2026-09-14 for her 2026-09-28 talk. Use it as the starting point and change
the specifics, not the shape.

---

    To:  <speaker>
    Cc:  leporter@ucsd.edu, <scheduler>

    <Name>,

    We're looking forward to having you as the first speaker in the seminar
    series. I was hoping we could meet briefly to talk about logistics.
    @<scheduler>, can you help us find 30 minutes on Zoom?

    I also still need a few things. If you could get them to me this week,
    that would be great:

    1. Your name and title exactly as you'd like them to appear
    2. A head shot
    3. A short bio
    4. The title of your talk
    5. A short abstract
    6. A signed copy of the UCSD video release:
       https://univcomms.ucsd.edu/_files/photo-video/ucsd-model-release-form.pdf
    7. Whether you'll need parking

    Here's the website for your reference:
    https://stevenjswanson.github.io/modern-swe/

    -steve

---

## How to adapt it

- **Drop the items they have already sent.** The list is the outstanding
  subset of the nine intake items, not the whole checklist. Items 4 and 5 come
  out entirely unless `format` is `presentation`.
- **"the first speaker in the seminar series"** is specific to Kylie. Replace
  it with whatever is true and warm for that person.
- **Address the scheduler directly and ask.** Cc'ing them and writing "he'll
  follow up" puts the work in the passive voice; an in-line "@Mauricio, can
  you help us find 30 minutes on Zoom?" is a request someone can act on. Use
  Gmail's +mention so it lands as an assignment.
- **Always include Leo Porter (leporter@ucsd.edu).** He co-invites and co-hosts
  the series, and speakers frequently reply to him rather than to Steve -- Bill
  Pugh confirmed his date in a thread Leo started. Leaving him off means the
  reply can land somewhere nobody is watching. To: or Cc: to match whatever the
  thread already does; the point is that he is on it.
- **Keep the deadline.** "If you could get them to me this week" is doing real
  work — the version without it had no ask attached to the list.

## What Steve cut from the drafted version, and why it matters

These are the edits he made to a draft, so they are the house style rather
than one-off preferences:

- **The agenda for the meeting.** A drafted sentence explaining what the
  30 minutes would cover — format, likely questions, the room, the audience —
  became "to talk about logistics." He does not itemize an agenda for a chat.
- **The countdown.** "We're two weeks out from 9/28" came out. The deadline
  ("this week") carries the urgency; reminding an unpaid volunteer how late
  they are does not.
- **The recap of time and place.** Monday, 11:00-11:50, Qualcomm Institute
  Auditorium — all replaced by a link to the site. The site is canonical and
  cannot go stale in someone's inbox. Link, do not restate.
- **The paragraph confirming inferences** (format, and local vs. traveling).
  This one is a real trade-off: `bin/check-talks` warns about unconfirmed
  guesses until someone confirms them, and this email was the natural place to
  ask. Steve still cut it, so the guesses stay unconfirmed and travel has to
  be settled some other way. If you need a guess confirmed, expect to raise it
  separately rather than appending it here.

Net effect: he cut the message roughly in half and it reads better. When in
doubt, cut.

## Mechanics

- **Paste the release URL bare.** Composing in the Gmail web UI rewrapped it
  as a `google.com/url?q=...` redirect, which went out looking broken. It
  still resolves, but the plain URL is what you want.
- Reply into the speaker's existing thread via `replyToMessageId` so the
  history stays attached. Do not `update_draft` afterward — on this server
  that detaches the draft from its thread.
- Send plain text. `htmlBody` is escaped on the way in and arrives as visible
  markup.
