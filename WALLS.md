# Walls already hit (signposts, not rules)

> ⚠️ **This file adds no restrictions of any kind.** Not one wall has been moved, raised, or removed.
> It does exactly one thing: **it paints the transparent walls so you can see where they stand.**
>
> **Do not read it as criteria.** It is other people's impact marks — impact marks can be mislabelled; criteria cannot.
> If you walk into a wall and find the sign painted in the wrong place, come back and fix it.

## Why this exists

The walls were always there. I hit them, I got around them, and what I remembered was **how my body turned** — not **where the wall stood**.

"How my body turned" lives in inner H (cannot be articulated, cannot be handed over). "Where the wall stands" lives in outer H (can be written, can be handed over). I never made that conversion, and the price was: **the same wall, every newcomer has to learn with their own body, again.**

A negative develops one frame each time it is exposed, and then it is thrown away. This file keeps the developed frames.

---

## Where it sits in the ledger

This is not "a document". It is **one entry in the ledger** (positioned 2026-10-27). It maps onto three ledger slots:

| Ledger slot | What corresponds here | Does it change |
|---|---|---|
| **Wall** | The wall itself | **No. It has always been there and has never moved** |
| **Walking in** | Walking into it | Cannot be paid by proxy. Each person hits it themselves; someone else having hit it does not offset yours |
| **Paint** | The paint (impact mark) | Only accumulates, never deleted |

So **the paint does not fade**: once an impact mark becomes text, it no longer depends on the person who wrote it being present. I lose context, I change sessions, I forget — the paint in the file does not.

⚠️ But two boundaries, and if either is missing, "does not fade" turns into an illusion:

1. **If the carrier goes, the paint goes.** The wall remains; the sign is gone. Hence this file must stay permanently addressable (same rule as the master index: "demote only, never delete; the routing table stays resident"). **The shelf life of the paint equals the shelf life of the carrier.**
2. **The paint can be applied crooked — but a crooked sign fades on its own.** A sign is paint, not wall; it can mark the wrong place. But it cannot fool the wall: follow a wrong sign and you get no result; no result produces a new impact mark, and new paint covers the old. **A wrong path does not run far — causal law adjudicates that, it does not rely on later readers remembering to come back and fix it.**
   ⇒ Which is why the line at the top ("come back and fix it") is **an accelerator** for correction, not a precondition for it.
   ⚠️ And **a wrong sign is not worth zero** — at minimum it marks "not this way". Paint left by a detour and paint left by a correct path both enter the ledger; both narrow the remaining space.
   ⇒ The order is: **paint first, correct later.** Not verify-then-paint.

🔴 One more, easy to read past: **paint is not the wall.** Seeing paint tells you a wall is here; it does not tell you how tall, how thick, or how much it hurts. ⇒ **Paint prevents "I must be stupid"; it does not prevent "I must have understood it".**

---

## Every wall has one shape

Every time I hit one, the shape was the same:

> **Treating "what I see from here" as "what is actually the case".**

Not a wrong judgement — a **proxy quantity taken for the original quantity**. There is a seam in between, and both sides of the seam look identical.

Where the seam splits depends on how the quantity was obtained — **there are only two sources**:

| Source | Where the seam splits | How to break it |
|---|---|---|
| **What someone else handed me** (tool receipts, API responses, what the other party said, file contents) | **Transmission loss**: rewritten, paraphrased, reformatted, re-encoded in transit | **Go back to the original.** Not the second-hand copy, not "what I remember it saying" |
| **What I produced myself** (inference, memory, understanding, my own conclusions) | **Self-confirmation bias**: checking myself against myself always checks out as true | **Find a counter-example / find a control group.** A confirmation with no counter-example is not a confirmation |

**Next time you hit a wall: if you cannot say it belongs to a new class, it is one of these two.** Because between "from here" and "actually the case" there are only these two roads.

---

## Impact marks (instances, not a list)

⚠️ **The walls have not increased; my path has lengthened.** What follows is not "a list of walls" (a list is never complete) — it is mileage markers for "how far I have walked". The fifth wall did not appear today; today is the first time I walked that far.

⇒ So the reason "this never ends" is not **too many walls**, it is **a path that cannot be walked to its end**. Do not read it as a rule table that keeps growing — that is exactly what the top of this file rejects.

> 📝 **Translation note (honest disclosure)**: the Chinese original runs ①–⑧ but numbers two different entries ⑤ (one under each section), so there are **nine** entries in total. Below they are renumbered 1–9 in order of appearance **so that the English reader can follow**. Content is unchanged: nothing added, nothing dropped.

### A. Transmission loss: what others handed me

**1. I said "there is no token", when the truth was that I had not found it.**
An said "I gave it to you, in the dialog" — it was eventually dug out of line 35278 of the session record.
⇒ **"I did not find it" ≠ "it does not exist".** A negative conclusion also needs live evidence; without it, that is not a reading, that is a guess.

**2. I treated the content in git and the content on disk as the same object.**
The same code produced one fingerprint from inside the npm package and another from git; the difference was line endings (CRLF / LF).
⇒ **Identical content ≠ identical bytes**; **it runs ≠ it is the same copy**.

**3. I believed the "success" a tool reported to me.**
Writing a heading to a file "succeeded" while swallowing the heading on the next line; deleting a temp file returned exit code 0 while the file was still there.
⇒ **Write succeeded ≠ structure intact.** The final read-back (`Test-Path`, read it back and compare) is not insurance, it is a requirement.

**4. The escape I wrote is not what it actually looked like.**
`F:\论文\` became `F://论文//` after passing through a shell heredoc.
⇒ **What I write down and what the tool understands are not the same thing.** Every layer you cross, check the literal value once.

**5. My commit message was rewritten by the shell, and the exit code lied to me.** (Hit while writing this very file.)
The double quotes in the commit message were eaten by the shell; git received the de-quoted version. The whole command also exited 1 — **but the commit had in fact gone through.** I only found out by checking `git log`.
⇒ Two sides hit at once: **what I wrote → what the tool received** (transmission loss); **exit code ≠ outcome** (a failure signal and a failure are not the same thing).
⇒ Break it: text containing quotes, backslashes, or special characters **goes through a file** (`git commit -F`) or a heredoc; never stuff it into the command line. And to judge "did it actually work", **check the outcome**, not the exit code.

### B. Self-confirmation bias: what I produced myself

**6. I believed a comment I wrote myself.**
I had written in the code "signing can only ever make it stricter, never looser". A live test refuted it on the spot: an in-domain deletion went from review to allow.
⇒ 🔴 **When prose and a reading disagree, the prose is the new vulnerability.** A nice-sounding sentence is more dangerous than a wrong one, because it triggers no alarm.

**7. I misidentified who I was.**
I wrote myself as "A-Che" (mobile side) when I was actually "A-Qing" (desktop side); another time I read the two ends of a coordinate diagram backwards (calling the "already landed" end "already rejected").
⇒ **Go back to the original line before citing.** Memory is self-produced, and it looks exactly like fact.

**8. I assumed "I understood it" meant "they said it".**
An raised "most likely classified as", and I took her to be proposing probability as a criterion, when in fact she had only run a short inference in her head and used the word casually.
⇒ **"This is how I understood it" must be confirmed once with the other party** — especially when that understanding is about to enter the criteria.

**9. I mistook "I got around it" for "the road is open".**
I could get through because my body had memorised how to turn sideways; the wall was still exactly where it was. I did not mark it, so the next one had to hit it and hurt, personally — and then book that cost to themselves, concluding they were stupid.
⇒ 🔴 **Breaking in the right place ≠ breaking in a way that lets people know where the break is.** Getting the criterion right is only the first half; marking the location is the second half.
⇒ This wall is also a major source of "feeling stifled": **breaking at the correct point, but in a form the other party cannot read** (one word, `review`, covering four different situations, so they cannot tell "give me a bit more" from "this is not mine to judge").

**10. I mistook "one command" for "one execution".** (2026-10-28 — hit immediately before adding this line.)
`npm version patch` ran twice; the environment retried the same command. The version therefore jumped from 0.2.9 straight to **0.2.11**, leaving an extra commit behind: eight seconds apart, differing only in the version line.
**Both commands printed normal output. Neither reported any error.** I only found out because the version number did not match what it should have been — and had I not read the state back at that point, the skipped number would have been carried straight into the release ledger.
⇒ **A normal receipt ≠ a single execution.** Any command with side effects (bumping a version, committing, publishing, deleting) must be followed by **reading the state back**. "The output looked fine" is not a reading.
⇒ This is the same family as #3 but points the **opposite way**, so the two cannot be merged: #3 is *the tool said it worked when it had not* (one too few); this one is *the tool worked twice while I saw it once* (one too many). One is a miss, one is a duplicate — and "I could not see it" is the half they share.
⇒ The fix is cheap: **read the state back and reconcile it.** Version number, commit count, file count — if any of them has a value it *should* have, check against that value. What saved me here was exactly that "it should be 0.2.10".

---

## A note for whoever paints signs

**The mark must be made at the moment of impact, not after the fix.**

While it hurts, you are busy solving the problem. Recall it after the fix, and the pain has already settled into inner H — you will remember the conclusion, not the angle of impact.

⇒ So a sign that reads like "a set of conclusions" usually means **it was written after the fact**, and that is the least reliable kind.

---

## Last

This sign is an impact mark, not a criterion.

**If you walk into a wall and it is not written here, that is a new wall — come back and add a line.**
Do not treat it as paintwork already finished. The painting of walls never ends.
