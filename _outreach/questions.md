# Seminar questions

A working bank of questions for the speaker Q&A, plus a lightning round.
Nothing here is published — `_outreach/` is excluded from Jekyll — so this is
the scratch pad, not a page speakers or students see.

The series is called *Tales of Modern Software Engineering*, and the questions
that work are the ones that force a story. The reliable follow-up is **"can you
give an example?"** — speakers default to abstractions about AI, and the hour
lives or dies on specifics.

---

## Steve's questions

Added 2026-09-16. These are his own wording; keep them intact rather than
smoothing them into the bank below.

1. What's the hardest skill you've had to learn in adapting to AI-assisted
   coding?
2. If you could cut one thing from what you learned as an undergrad, what would
   it be?
3. What's a software engineering skill you wish you learned about more as an
   undergrad?
4. What percentage of your code do you write, and what percentage of it do you
   read?
5. How has your company changed its hiring practices? What are interviews like?
6. What are you looking for in new hires?
7. What's something you might see in an interview that would make you really
   excited to work with someone who just graduated with a degree?

Notes on using them:

- **2, 3, 6 and 7 are the curriculum questions.** Asked of every speaker across
  the quarter they add up to an answer about what the department should be
  teaching, from people who are hiring our graduates. Worth asking every week
  even when the talk goes somewhere else.
- **4 is lightning-round shaped** — it is two numbers and it invites the
  write/read ratio comparison across speakers. It appears in the lightning round
  below in that form.
- **5 and 6 do not fit the intern panel** (they are being hired, not hiring).
  For that week, invert them: what was the interview like from your side, and
  what did you wish you had known.

---

## Q&A bank

### Make them tell a story

- Tell us about a time AI wrote something that shipped and then broke. What was
  the failure, and how long until you found it?
- What's the most impressive thing you've watched a model do on your own
  codebase? What was the prompt, what came back?
- Describe the last thing you tried to do with AI that flatly didn't work, and
  what you did instead.
- What's a task you used to dread that you now don't think about anymore?
- Walk us through your last 30 minutes of coding, minute by minute. Where was
  the model?

### The honest before/after

- What percentage of your day is reading code versus writing it, and how did
  that split look three years ago?
- What did you do in 2022 that is now completely gone from your job?
- Has your team's output gone up, or just the volume of code? How would you tell
  the difference?
- What got faster that doesn't matter, and what got faster that really matters?
- Is anything *slower* now than it was before?

### Trust, review, and verification

- Do you read every line before you merge? If not, what's your rule for when
  you do?
- What's the class of code you will not let a model touch, and why that class?
- How has code review changed when the author can't fully explain the diff? Do
  you ask them to?
- Who's accountable when AI-written code causes an incident — the prompter, the
  reviewer, or the team?
- Are the tests also written by the model, and does that worry you?
- Is your codebase getting bigger faster than it's getting better?

### Team, process, and organization

- Did your team adopt this top-down or bottom-up? Which worked?
- Is there a policy, and does anyone follow it?
- Has AI changed how you *scope* projects — do you attempt things you'd have
  declared out of budget?
- What's the new ceiling for what four people can build?
- How do you evaluate an engineer's performance now? What does "good" look like?

### For the students in the room

- If you were a sophomore today, what would you spend this quarter learning?
- What skill did you build the hard way that you now think is obsolete? Which
  one turned out to matter more than you expected?
- How do you learn a new language or framework now, and would you recommend that
  path to someone who doesn't already know three others?
- Where's the line between using AI to learn and using it to skip the learning?
- In an interview, do you let candidates use AI? What are you actually measuring
  if you do?
- What does a first-year engineer do on your team in 2026 that's genuinely
  valuable? Be concrete.
- Is the junior-engineer role disappearing or just changing?

### Craft and the uncomfortable questions

- Do you understand your own systems as well as you used to?
- Is there code nobody on the team has ever read? How much of it is there?
- Has the work gotten more fun or less?
- What do you think a model still can't do at all — and how confident are you in
  that answer for five years from now?
- What's the thing everyone in this industry is currently wrong about?
- If the tools froze at today's capability forever, what would you change about
  how you work?

### Systems-specific

This is a systems department; the audience skews toward people who will ask
these anyway.

- Does any of this help with distributed systems, performance debugging, or
  concurrency — or is it mostly a CRUD-and-glue accelerator?
- Legacy codebase or greenfield: which is the harder problem for these tools?
- Are AI-written systems different architecturally — more code, more
  duplication, different abstractions?
- What about the parts of the job that aren't code: design docs, incident
  review, convincing another team to do something?

---

## Per-speaker

One or two that only work for that person. Dates match `_data/talks.json`.

- **Kylie Taitano — Intuit, EM (2026-09-28).** As a manager, how do you tell
  whether an engineer is using these tools well or badly? What does the bad
  version look like?
- **Whova — four EMs (2026-10-05).** You're a smaller company. Has AI changed
  what you can compete on against companies with 50x your engineering headcount?
- **Bill Pugh (2026-10-12).** FindBugs spent years on false positives and
  developer trust in automated warnings. What did static analysis learn that LLM
  tooling is re-learning from scratch? Is "right 80% of the time" a
  fundamentally different product from "right"?
- **Student intern panel (2026-10-19).** What did your team let you do, and what
  did they not? Did the internship match what school prepared you for? Did
  anyone tell you the rules about AI use, or did you have to guess?
- **Roy Guo — XBOX (2026-10-26).** Games have huge non-code content pipelines.
  Is the engineering change bigger or smaller than the art and design change?
- **Faculty panel (2026-11-09).** You wear both hats — Together AI, Cubist,
  RapidFire, AWS S3. Where does your industry hat disagree with your academic
  hat? What should we be teaching undergrads that we currently aren't?
- **Austin Henley — CMU (2026-11-30).** You study what programmers actually do.
  Where does the evidence most sharply contradict what engineers believe about
  their own productivity? What should we be measuring that nobody is?

---

## Lightning round

The point is **comparability**. Ask the same core set every week, record the
answers, and by week 10 there is a cross-industry dataset — EM, IC, games,
startup, faculty, intern — and the last session can be a reveal of where they
agreed and where they split. That is a better artifact than any single talk.

Mechanics that work: one slide, "15 seconds each, first instinct," run at the
start of the hour so it warms up the room and sets an honest tone. Send the list
ahead so nobody feels ambushed.

### Core ten — ask every speaker

1. What fraction of the code you ship starts as a model's draft? *(a number)*
2. What percentage of your code do you write, and what percentage do you read?
   *(two numbers — Steve's #4)*
3. Do you read every line before you merge? *(yes / no / depends on what)*
4. Most of your usage: autocomplete, chat, or an agent working on its own?
5. One word: what is it best at in your work?
6. One word: what is it worst at?
7. Trust letting it write a database migration, 1-5.
8. Greenfield or legacy — where does it help more?
9. One skill you'd tell a sophomore to invest in this year.
10. More fun or less fun than three years ago?

### Rotating pool — pick three to five, vary by speaker

- Over/under: in three years, does a first-year engineer mostly write code or
  mostly review it?
- Would you hire someone who used AI throughout your interview?
- Do you let it write your tests?
- Do you still read documentation?
- Has it changed an architecture decision you made? Which one, in one sentence?
- If your tools reverted to 2021 tomorrow, how much slower are you?
  *(a multiplier)*
- Is your codebase healthier or less healthy than two years ago?
- Do you use it for design and writing, or only code?
- Best AI-assisted thing you did this month, in one sentence.
- Worst AI-assisted thing you did this month, in one sentence.
- Name one job on your team that didn't exist in 2023.
- The claim about AI and software you're most tired of hearing.
- Finish the sentence: "The thing nobody tells you is ___."

### Say the caveat out loud

Questions 1 and 2 are self-reported and every speaker measures them
differently — "50% of my code" means something different to each of them. Say so
when the tally goes up. The signal is not the average, it's the spread, and why
an EM at a 200-person company and a systems professor land 40 points apart.

---

## From the source material

Added 2026-09-16 after reading what engineers say publicly about this — HN
threads, workflow blogs, podcast interviews, and the productivity studies. See
`source-material.md` for the sources and for which numbers are verified.

These five fill gaps the bank above had.

- **METR ran a randomized trial: experienced developers were 19% slower with AI
  while believing they were 20% faster. What would it take to convince you that
  was true of you?** The strongest question in the bank. It is the one Austin
  Henley (11/30) is best placed to answer, and asking it of a practitioner
  earlier in the quarter sets up that session.
- **Are you more tired at the end of the day than you were three years ago?**
  Steve Yegge's "Dracula Effect" — the easy work is gone and only the intense
  thinking is left. Nobody asks this, and it gets at something the productivity
  questions miss entirely.
- **What guardrails have you actually built — lint rules, scoped file
  permissions, an agents file? Walk us through one.** The engineers who report
  enjoying this work describe elaborate constraint systems. Asking for one
  concrete example separates the people doing it from the people talking
  about it.
- **Has anyone at your company measured this, or is it all vibes?** Most
  adoption claims are self-report. Worth knowing which speakers have data.
- **You've accepted worse code in exchange for speed. Was that a decision
  someone made, or did it just happen?** Presupposes the trade-off, which is
  what makes it work — the denial is as informative as the admission.

One framing note for the lightning round: the METR perception gap is the reason
to say the self-reporting caveat out loud. People reliably misjudge their own
speedup, in a measured setting, in the direction of flattering themselves.

### From the Hanselman interview (2026-06-25)

Four more, drawn from the transcript in `source-material.md`. The first two are
for the faculty panel and the intern panel specifically.

- **Nursing names the senior a "preceptor" rather than labelling the junior an
  apprentice, and makes minting new seniors the senior's job. Over five years,
  how many seniors have you made?** Hanselman's framing, and the sharpest
  version of the junior-pipeline question in the bank.
- **Should a junior and a senior be talking to the same model at all?** Microsoft
  Research says the two groups don't use them the same way. For the faculty
  panel (11/9), this is a curriculum question with teeth.
- **"Make me a clone of Minecraft" — now do it without using the word
  Minecraft.** Ask a speaker where the specification weight actually sits in
  their prompts. Works as a live demo and as a class exercise.
- **Whose fault is it when an unread PR breaks production — the author or the
  person who merged it?** Speakers answer this cleanly about anonymous
  contributors and then have to apply the same answer to AI.

---

## What the students in the room are actually worried about

Added 2026-09-20. Fifteen questions written in the voice of a 19-year-old,
grounded in reporting on CS student and parent anxiety through 2026 — campus
papers, national surveys, enrollment data, and a Toronto interview study. See
`source-material.md` for the sources and the numbers underneath.

These are not questions to put to a speaker cold. They are what the room is
thinking and mostly will not say out loud. Use them to seed anonymous Q&A, to
prompt the panels, or to hand to a speaker in advance so they answer the real
question rather than the polite one.

### The job market

1. Is it actually as bad as it looks online, or is it just that people who get
   jobs don't post about it?
2. Everyone in my year keeps saying we're cooked. Are we? Like, actually?
3. If big companies are hiring way fewer new grads than they used to, what makes
   them hire me instead of just... nobody?
4. Is the entry-level job coming back, or is this just what the job is now?
5. Should I go to grad school to wait this out, or is that just paying to delay
   the same problem?

### The junior role

6. If AI does all the stuff juniors used to do, what do I actually do on my
   first day?
7. Everyone says "be the person who reviews the AI's code." How am I supposed to
   review code when I've never written anything that big myself?
8. Do I need to be good at writing code anymore, or good at telling the AI what
   to write?
9. What's the part of this job that's still going to be mine?

### What to study

10. Should I switch majors? Everyone says pick something "AI-proof" but nobody
    can tell me what that actually is.
11. Is this degree still worth what my parents are paying for it?
12. My dad keeps sending me articles about the CS bubble bursting. What am I
    supposed to say to him?
13. Should I do the AI concentration, or is that going to be just as
    oversaturated by the time I graduate?
14. Is it smarter to go deep on something hard like systems or security, or is
    that a trap too?
### Getting hired

15. Everyone says build a portfolio — but if AI can build my project in a
    weekend, what does my project prove about me?

### Two more on the bench

- I didn't get an internship this summer. Am I behind forever?
- What do you actually look at on a resume now?

### How to use these

The honest ones are 2, 11 and 12, and they are the least likely to be asked
in public. Consider an anonymous submission form — index cards at the door or a
form link on the slide — and read them aloud yourself. A student will not stand
up in Atkinson Hall and ask a Microsoft VP whether their degree was a waste of
their parents' money.

Question 7 is the sharpest one in the list and the one most speakers have not
thought about: the industry's stock answer to juniors is "become a reviewer,"
which assumes an expertise that reviewing alone never builds. Hanselman's
preceptor material is the closest thing to a real answer anyone has offered.

---

## Short-answer round

Added 2026-09-21. Every one of these can be answered in a sentence, and most in
a word. The elaboration is optional, which is what makes them survive a room
that is running out of time.

Distinct from the lightning round above: that one is about the speaker's own
practice and produces a comparable dataset. This one is about whether the job
has changed and whether they are hiring — the two things the room actually
wants to know.

### How much has actually changed

1. Has AI changed *what* you do, or just *how fast* you do it?
2. Do you write more code now, or less?
3. Would you go back to working the way you did in 2023?
4. Name one thing you used to do every week and never do now.
5. How long before your workflow actually changed — weeks, months, years?

### Hiring

6. Will your team hire a new grad this year?
7. Would you hire someone from UCSD?
8. Would you hire someone who doesn't use AI to build software?
9. Do you still make people do leetcode?

### What they'd tell a student

10. Would you major in CS today?
11. Would you tell your own kid to major in CS?
12. Should I still learn to write code by hand?
13. Is grad school a good move right now?
14. The one skill that matters most in year one?
15. One thing you wish students would stop doing?

### Notes

**6 is the most valuable question here.** Future tense makes it a commitment
rather than a fact, and asked of every speaker it produces a hiring forecast
across the quarter that no amount of career-services optimism can paper over.

**11 is the honest version of 10.** People answer differently once the stakes
stop being abstract.

**8 is the inverse of the question everyone asks**, and a better one. "Would
you hire someone who *uses* AI" tests tolerance; this tests whether fluency has
quietly become a requirement. A speaker who says no has told the room that the
skill is now mandatory, which is a much stronger claim than "AI helps."

**7 has a weakness worth knowing about.** Nobody says "no" to a room full of
UCSD students, so as written it is nearly free to answer. If you want it to
bite, ask it in the past tense — *have* you hired someone from UCSD, or when did
you last — which is a fact rather than a courtesy. Keep the yes/no version if
what you want is a warm moment rather than information; both are legitimate,
they just do different jobs.

Send 6, 8 and 11 ahead rather than springing them. A speaker ambushed in front of
200 students will hedge; one who saw it coming may tell the truth.
