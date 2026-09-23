# Source material: how engineers say their jobs have changed

Gathered 2026-09-16 for the seminar question bank (`questions.md`). Not
published — `_outreach/` is excluded from Jekyll.

Everything here is raw material for questions, not fact to repeat from the
podium. See **Verification status** at the bottom before putting a number on a
slide.

---

## Hacker News

Firsthand and unfiltered, which is the register speakers will *not* default to.
Useful for calibrating what an honest answer sounds like.

- **[Ask HN: By what percentage has AI changed your output?](https://news.ycombinator.com/item?id=46409375)**
  Answers span negative to 100x. The pattern: biggest multipliers come from
  greenfield and personal projects, smallest from large orgs and legacy code.
  Best line in the thread, aimed at the 20x claimants — *"If you're truly 20x
  faster, you'd have done an entire career's worth this year."* Another: *"it
  ranges from 10x to 1x... In large businesses where 20 people stare at Jira,
  the bottleneck is not how fast you write code."*

- **[Ask HN: AI has changed my job for the worse](https://news.ycombinator.com/item?id=45740750)**
  Code quality becoming "irrelevant," pressure to match colleagues shipping
  twice the code, maintenance burden from unreviewed "ghost code." The one
  engineers rarely say out loud: *"The output and productivity is amazing. I'm
  also really bored and hate that my job is writing specs and stupid prompts."*

- **[Ask HN: Anyone who enjoys their AI-native workflow?](https://news.ycombinator.com/item?id=49586386)**
  The opposite camp, and more concrete: thousands of custom lint rules, a
  "regulator" script that pre-approves or blocks agent commands, agents scoped
  to explicit file allow-lists, parallel agents with separate implementer and
  reviewer roles. One participant: *"I have accepted that the code itself is
  much worse. But I found joy in working at a much higher architecture level."*

- **[Ask HN: In the Age of AI, How Do I Grow as a Software Engineer?](https://news.ycombinator.com/item?id=47079802)**
  The most directly useful thread for our audience. Consensus: AI amplifies
  existing skill gaps rather than closing them. *"AI compresses the value of
  generic output and amplifies the value of domain judgment."* Spotting subtle
  bugs in model output described as "becoming a superpower."

- **[Reflections on software engineering in the age of AI](https://news.ycombinator.com/item?id=48708721)**
  Andrew Diamond's post plus the rebuttals. Sharpest comment: *"I end up having
  to understand the code pretty much as deeply as I would anyway."* Also a
  skill-decay argument — delegating everything causes "total decay of my mental
  model," after which you can no longer describe the change you want.

- Further threads not yet read: [AI Replacing Engineers – Firsthand Stories?](https://news.ycombinator.com/item?id=43831122),
  [Is anyone seriously considering a career change?](https://news.ycombinator.com/item?id=48038191)

## Blogs

- **[Addy Osmani, "My LLM coding workflow going into 2026"](https://addyosmani.com/blog/ai-coding-workflow/)**
  The most concrete step-by-step account found: spec first, small chunks,
  commit after every green task, cross-check with a second model. Rule —
  *"treat every AI-generated snippet as if it came from a junior developer."*

- **Mitchell Hashimoto, "My AI Adoption Journey."** Contains a technique worth
  stealing as a class exercise: solve a problem by hand, then reproduce the same
  solution with an agent and compare. Separately (March 2026) he pointed an
  agent at a Ghostty bug that had defeated him and his contributors for six
  months; it found the fix in 45 minutes. A concrete benchmark for "most
  impressive thing you've seen."

- **[Simon Willison](https://simonwillison.net/)** — argues the senior skills
  (system design, managing complexity, knowing what to hand-code vs. automate)
  are precisely what now pays off. Also interviewed on
  [High Leverage ep. 9](https://www.heavybit.com/library/podcasts/high-leverage/ep-9-the-ai-coding-paradigm-shift-with-simon-willison).

- **[Pragmatic Engineer: Steve Yegge, "From IDEs to AI Agents"](https://newsletter.pragmaticengineer.com/p/from-ides-to-ai-agents-with-steve)**
  The "Dracula Effect": maybe three productive hours a day, but far higher
  output within them, because the easy work is gone and only the intense
  thinking remains. Also an eight-level adoption ladder, with the claim that
  most engineers sit at levels 1-2. Nobody asks speakers whether they are more
  *tired*; this is why we should.

- **Pragmatic Engineer: Tuomas Artman (Linear).** Argues AI-assisted development
  makes product judgment, restraint, and craftsmanship *more* important.

## YouTube

Thinner than the written sources — mostly career-advice content rather than
working engineers describing their days. Usable:

### Scott Hanselman, "Should You Still Become a Software Engineer in 2026?"

[Video](https://www.youtube.com/watch?v=W6aOdLlEz1w) · Jean Lee channel ·
2026-06-25 · 25 min. Hanselman is VP / member of technical staff at Microsoft
and GitHub, working on AI coding agents.

**Transcript pulled 2026-09-16** via `yt-dlp` (auto-captions, en-orig, cleaned):
`~/Downloads/W6aOdLlEz1w-transcript.txt`. Deliberately *not* committed — this
repo is public and the transcript is someone else's content.

I had rated this the weakest of the YouTube hits before reading it. That was
wrong. It is the most directly useful source found, because its center of
gravity is junior hiring and how seniors get made — exactly what Steve's
questions 2, 3, 6 and 7 are reaching for. It also ends with a seven-question
rapid-fire round, which is the lightning-round format already working in the
wild.

**The historical frame.** He started coding in 1984 and calls this "the fourth
decade of panic": told around 1989 he was not a real programmer because he was
not using assembler; told syntax highlighting would rot his brain and make him
weak; told Stack Overflow was the death of coding. *"Just because power tools
got made doesn't mean that bespoke really cool furniture can't be created by
craftspeople."* Good opener for Bill Pugh (10/12), who has lived the same span.

**His own numbers and trust model.** About 70% of the code he writes now is AI
augmented, but all of it flows through the same SDLC — code signing, tests,
GitHub Actions — so the insertion point is unchanged whether code comes from his
hands, an open-source PR, or a model. The framing worth stealing: treat the AI
as an anonymous contributor. *"I don't trust the rando on the internet, I'm not
going to trust the AI, and I barely trust myself."* He runs "adversarial
reviews" with three or more models.

**Accountability, answered cleanly.** If an anonymous PR breaks production and
you squash-merged it without reading — whose fault? Yours, because it is your
product. Same answer for AI. This is the crispest version of the accountability
question in the bank.

**The collapse argument.** He co-wrote an ACM piece arguing the profession
collapses if companies stop hiring early-career developers: *"Where are the
seniors coming from?"* If you need seniors and never make any, your only source
is a competitor who trained them — and who has therefore given them a reason to
stay.

**The preceptor model — the best single idea in the interview.** Borrowed from
nursing, where his wife and son work. Calling someone an intern or apprentice
"makes them less than" when they are usually just missing context. Nursing
instead names the *senior* — the preceptor, a designated safe person to bring
questions to. It moves the power dynamic: the junior no longer has to dig out of
a hole you put them in, and *the senior's job becomes making more seniors*.
Proposed metric: over five years, how many seniors did you mint? None is a you
problem. Microsoft is building a formal preceptorship program, and Microsoft
Research is looking at whether juniors and seniors should interact with the same
model at all — whether a teaching model should require the learner to pause,
write some code themselves, explain it back, or take a quiz. Their research says
the two groups do not use the model the same way.

**Portfolio advice, with a teachable anecdote.** Do not show him tic-tac-toe. A
student told him he had "one-shotted Minecraft"; the prompt was "make me a clone
of Minecraft." Hanselman asked him to do it again without using the word
*Minecraft* — and he could not. The word was carrying the entire specification.
That is a 10-minute class exercise as it stands. His actual advice: build
something you care about — your church, your kid's little league, your Pokémon
collection — because it shows "a person of high agency who's excited to solve
problems for humans."

**An assessment idea.** His juniors do code reviews and justify them: this is
what the AI made, this is what I pushed back on, here are my turns. He is
considering having them check the conversation itself into the repo.

**Other bits.** "Multitasking is a lie," but three concurrent agent sessions is
about the human limit. The adoption spectrum runs from "slop cannon" to "AI
augmented," and he describes people "vibrating with tokens" — a caffeine
metaphor he thinks the industry under-uses. The basics he would drill: HTTP,
DNS, distributed systems, deadlocks — *"you've got to be able to drive stick
shift, because when your Waymo breaks down, who's changing the tire?"* Second
skill is communication: "programming is expressing intent clearly," and you can
see people thrashing in their AI turns when they cannot do it.

**His rapid-fire seven**, as a format reference: generalist or specialist
(*T-shaped*); study CS or AI (*neither — software engineering, "the actual
shipping part"*); one language everyone should learn (*English — "not the
language we deserve, but the language we have"*); one AI tool to try (*Copilot,
"got to pay the bills"*); whiteboard interviews, useful or outdated (*useful —
"I'm not interested in what you put on the whiteboard, I'm interested in
watching you think"*); most exciting thing in tech (*medical — he runs an
open-source artificial pancreas*); will AI replace software engineers (*"It
better not."*).

### Others, not yet watched

- [Andrew Ng: The Future of Software Engineering](https://www.youtube.com/watch?v=g8um2AEf5ZA) — AI Dev 26.
- [The Current State of AI for Software Engineers (2026)](https://www.youtube.com/watch?v=ICispFxvPIY).

## Research

- **[METR randomized controlled trial](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)**
  16 experienced open-source developers, 246 real issues, randomized within
  subject. They expected a **24% speedup**. They were measured **19% slower**.
  Afterward they still believed they had been **20% faster**.

  This is the most useful single fact for this seminar. It is the caveat for
  every self-reported number in the lightning round, and it is the question for
  Austin Henley on 11/30.

- **Google RCT**, reported as 96 engineers, ~21% *faster* on a complex
  enterprise task. Same era, opposite sign from METR. The tension between the
  two is itself a good question: what differs — the task, the tooling, or the
  measurement?

- Other results seen in summary only: Sonar "State of Code" 2026 (less
  experienced developers report more benefit *and* more effort reviewing model
  output; 43% of SMB vs 36% of enterprise developers report being "much more
  productive"); Stack Overflow 2025 (29% trust AI accuracy, 66% spend more time
  debugging than expected); Pichai, April 2026 ("75% of new code at Google is
  AI-generated and approved by engineers").

## Verification status

| Claim | Status |
|---|---|
| METR: 19% slower, 24% expected, 20% perceived | **Verified** against metr.org directly |
| All HN threads and quotes above | **Verified** — threads read |
| Addy Osmani workflow | **Verified** — post read |
| Google RCT ~21% faster, n=96 | **Unverified** — search summary only |
| Sonar State of Code 2026 splits | **Unverified** — search summary only |
| Stack Overflow 29% / 66% | **Unverified** — search summary only |
| Pichai "75% of new code" | **Unverified** — search summary only |
| Hashimoto Ghostty bug, 45 minutes | **Unverified** — search summary only |
| Everything in the Hanselman section | **Verified** — full transcript read |
| Hanselman's ACM paper on junior hiring | **Unverified** — his claim in the interview; find the paper |

Do not put an unverified row on a slide or in a speaker email. Pull the primary
source first.
