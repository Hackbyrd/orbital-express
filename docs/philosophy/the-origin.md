# The Story Behind Orbital Express

<div style="display:flex;align-items:center;gap:24px;margin:32px 0 40px;">
  <img src="/orbital-express/jonathan.jpg" alt="Jonathan Chen" style="width:120px;height:120px;border-radius:50%;object-fit:cover;object-position:top;border:3px solid #42d392;flex-shrink:0;" />
  <div>
    <strong style="font-size:1.15rem;">Jonathan Chen</strong><br/>
    <span style="color:var(--vp-c-text-2);font-size:0.95rem;">Creator of Orbital Express · Co-founder &amp; CTO at Nitra · Former CTO at FiscalNote<br/>
    <a href="https://x.com/hackbyrd" target="_blank">@hackbyrd</a> · <a href="https://github.com/Hackbyrd" target="_blank">GitHub</a> · <a href="https://www.linkedin.com/in/hackbyrd" target="_blank">LinkedIn</a></span>
  </div>
</div>

---

I've been writing code since 2006 — over 20 years of building things, breaking things, and occasionally setting things on fire and watching them burn.

I studied Computer Science at the University of Maryland, graduated valedictorian of my class, then went on to Stanford Graduate School of Business. In 2013, I co-founded **[FiscalNote](https://fiscalnote.com/)** — a government data and AI company. I built and led the engineering org there as CTO for almost a decade.

Orbital Express is the direct result of everything I got wrong at FiscalNote.

---

## What I got wrong

FiscalNote grew fast. We hired fast. Engineers came in with strong opinions, built things their way, and eventually moved on. The next wave of engineers would look at what the previous wave built and think "what the hell is this?" — then they'd rewrite it their way. Then they'd leave too.

This cycle has a name: **spaghetti code by committee**. Every engineer who touched the codebase left their fingerprints on it. Some of those fingerprints were bad decisions made with good intentions. Some were good decisions that got buried under bad ones that came later. All of it accumulated into a codebase that was increasingly expensive to change.

We were, at our worst, shipping **four features a year**. These decisions cost me over **$10 million** across a decade. Not from a single catastrophic failure — from a slow, grinding burn. Engineering salaries for teams that couldn't move. Rewrite projects that took six months and delivered the same thing we already had. Opportunity cost from features that never shipped because we were too deep in firefighting to build anything new. Millions of dollars a year, year after year, spent on the consequences of bad architectural decisions that seemed reasonable at the time.

The turning point was when I stepped back and realized I'd been thinking about scaling entirely wrong. I was obsessed with technical scaling — how do we handle more requests, how do we distribute load, how do we process more data. Meanwhile, the real scaling problem was staring me in the face: **people**. How do engineers onboard? How quickly can someone new contribute something real? How much of the codebase can a new hire actually understand in their first month?

Every bad architectural decision I'd made was bad for the same reason: it made *individual* engineers faster at the cost of making the *team* slower. Microservices felt empowering to the engineers who built them. TypeScript felt satisfying to the engineers who introduced it. Custom build pipelines felt clever to the people who designed them. Every one of these things made the next hire's first week harder.

The engineers who made these decisions weren't bad engineers. They were optimizing for the wrong thing.

---

## The hiring problem nobody talks about

When we were using Ruby on Rails, we needed Rails engineers. We were in Washington D.C. I ran out of Rails engineers to hire. Not because Rails developers don't exist — they do — but because we had filtered ourselves into a corner.

This taught me something fundamental: **your tech stack is a hiring decision**. Every framework, language, and pattern you choose either expands or shrinks your pool of potential engineers. The more exotic your stack, the harder it is to hire, the longer onboarding takes, the more dependent you are on the specific people who know that stack — which gives them leverage and you fragility.

The right question isn't "what's the best technology?" It's "what technology lets me hire the most engineers, get them contributing the fastest, and keep the codebase understandable the longest?"

JavaScript answers all three. It's the most widely known programming language on earth. If someone says they can code, there's a high probability they know JavaScript. You're not filtering for a rare skill — you're filtering for a common one.

---

## The microservices trap

At some point, a smart engineer at FiscalNote made the case for microservices. The pitch was compelling: independent deployment, independent scaling, teams working autonomously. We did it.

We ended up with 17 services. Some were Node.js. Some were Python. One was Go. They had different logging conventions, different error formats, different deployment pipelines. Onboarding a new engineer meant explaining not one codebase but a whole ecosystem.

Debugging a bug in production required tracing a request through three services before you could even identify which one was wrong. When something went down, figuring out *why* was an incident in itself.

The engineers who built those services were gone. The engineers who inherited them spent more time understanding the architecture than shipping features.

**Microservices are an organizational solution masquerading as a technical one.** They're designed for companies like Netflix, where you have hundreds of engineers working on genuinely independent domains and the cost of coordinating deployments outweighs the cost of operational complexity. At a 15-person startup, that tradeoff is exactly backwards. You don't have the engineering bandwidth to run the infrastructure, and your domains aren't independent enough to justify the split.

Start with a monolith. Keep it until it actually hurts. Most companies never get to the point where it actually hurts.

---

## The 2 AM phone calls

On top of the microservices complexity, we were running everything on AWS. Dozens of services, manual infrastructure configuration, custom deployment pipelines, VPC networking, IAM policies, load balancers — the works. It felt like the professional choice at the time.

What it actually produced was a dedicated DevOps team that was waking up at 2 AM on a regular basis to fight fires. Not occasionally — regularly. We had people whose entire job was managing infrastructure, and they were still getting paged in the middle of the night. The system was too complex to be reliable, and too custom for any one person to fully understand. When something broke, it broke in ways that took hours to trace.

The cost was real: salaries for a team that existed purely to manage the infrastructure tax we had imposed on ourselves. And even with that team, we still had outages, still had deployment failures, still had nights where someone's weekend got ruined because a service went down in a way nobody anticipated.

When I started Nitra and built on Orbital Express, I made a different call: **Heroku for deployment, Redis Cloud and Render for services**. Managed infrastructure. No DevOps team. No custom pipelines. No 2 AM pages.

In over five years at Nitra, we have had **zero** deployment firefighting incidents. Zero. Not "fewer" — zero. The infrastructure just works. When I want to deploy, I push code. That is the entire process. The time that would have gone to a DevOps team, to on-call rotations, to incident postmortems — all of it goes to building features instead.

AWS is powerful. It is also an enormous operational burden that most startups have no business taking on. The managed hosting services available today — Heroku, Render, Railway — are production-grade, reliable, and cost a fraction of what it costs to staff the engineering time AWS requires. You trade some theoretical ceiling on customization for a practical floor on operational sanity. For the vast majority of products, that trade is obviously correct.

Don't hire a DevOps team. Don't manage your own infrastructure. Ship features.

---

## The result

I left FiscalNote and started **Nitra**. I built Orbital Express from scratch, taking everything I'd learned — every bad decision, every onboarding nightmare, every 2am debugging session tracing through microservices — and went the opposite direction.

Maximum opinions. Minimum magic. One language. One deployment target. One pattern for everything.

The first time I used Orbital Express seriously, we shipped **four features a week**. Same size team. Better product quality. Less stress.

The only difference was the framework.

---

## What this framework is actually for

Orbital Express is not trying to be the most technically impressive framework. It's not trying to win benchmarks or support every possible use case. It's trying to do one thing: **let you build a production API fast, keep it maintainable for years, and hand it off to any engineer without a month of context transfer.**

The opinions baked into this framework aren't arbitrary. They're the direct opposite of every decision that slowed us down at FiscalNote:

- **Feature folders** instead of type-based folders — because when you're fixing a bug in "Orders", you want all the Order code in one place, not scattered across models/, controllers/, routes/, tests/.
- **One language** (plain JavaScript) — because onboarding should take days, not months.
- **No microservices** — because a monolith you understand beats a distributed system you don't.
- **Managed deployment** (Heroku/Render) — because engineers should be building features, not configuring VPCs.
- **Generators over boilerplate** — because the most common onboarding mistake is writing things slightly wrong; the generator makes it impossible.

Every convention has a reason. Every opinion was paid for.

---

## A note on AI and this framework

We are in a world where AI writes code. That changes the calculus even further in favor of simplicity.

A large language model trained on the internet knows JavaScript better than anything else. It knows Express. It knows Sequelize. When you ask it to build a feature in Orbital Express, the conventions are so consistent and so standard that the AI can follow them reliably.

TypeScript types confuse AI assistants. Custom build systems confuse them. Exotic patterns confuse them. Simple, consistent, well-documented JavaScript does not.

If the last decade was about making engineers faster, the next decade is about making AI faster. The answer is the same: keep it simple, keep it consistent, keep it understandable.

---

*If any of this resonates with you — if you've been burned by the same decisions — this framework was built for you.*

*— Jonathan Chen ([@Hackbyrd](https://github.com/Hackbyrd))*
