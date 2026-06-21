# Why JavaScript, Not TypeScript

Orbital Express is plain JavaScript. This is a deliberate, permanent decision — not an oversight, not a plan to "add TypeScript support later." This page explains why.

::: tip TL;DR
TypeScript solves a class of problems (type errors at compile time) that are not the expensive problems for a startup or a growing product team. The overhead it adds — to configuration, onboarding, debugging, hiring, and day-to-day development — costs more than it saves. We've run this experiment at scale. The math doesn't work out.
:::

---

## What TypeScript actually solves

TypeScript catches type errors at compile time. This is genuinely useful. If you call `user.email` on something that might be `null`, TypeScript will tell you before the code runs.

That's the whole value proposition.

Now ask yourself: in your last 12 months of production incidents, how many were caused by a type error that TypeScript would have caught? Compare that number to how many were caused by incorrect business logic, bad database queries, race conditions, missing validations, or infrastructure failures.

In our experience, that first number is close to zero. The second number is where all the pain lives. TypeScript doesn't help with any of those.

---

## The technical case against it

**Configuration overhead is real and it compounds.**
Every project starts with `tsconfig.json`. Then you need to decide: strict mode or not? How strict? Path aliases? Decorators? Module resolution strategy? These aren't one-time decisions — they follow you. Third-party packages sometimes have incompatible assumptions. Build tools need TypeScript plugins. Test runners need special setup. CI pipelines need compilation steps. Every new engineer who joins has to understand your specific config before they can do anything useful.

We have personally spent hours debugging TypeScript configuration issues that had nothing to do with our application code. That time was completely wasted.

**Type definitions for third-party packages are often wrong, outdated, or missing.**
The `@types/` ecosystem is maintained by volunteers. A popular library ships a new version and the types lag behind by weeks or months. You end up with `@ts-ignore` comments — at which point you've given up the one thing TypeScript was supposed to give you. Or you spend time writing your own type declarations for a package that doesn't have them. Neither outcome is good.

Most third-party services and vendor APIs don't have TypeScript sections in their documentation. They provide JavaScript examples. You're translating.

**It adds a compilation step between you and your code.**
When a bug hits production, you want to be able to inspect what's actually running. With plain JavaScript, the code you wrote is the code that runs. With TypeScript, you're looking at compiled output. The stack traces reference compiled line numbers. The code in the browser's devtools isn't what you wrote. This is a small thing until it isn't — and in a high-stress production incident, anything that slows down diagnosis is a liability.

**Faster builds.**
TypeScript compilation takes time. Plain JavaScript doesn't need a compilation step. At scale, this matters for both developer feedback loops and CI pipeline costs.

**No extra layers.**
The core philosophy of this framework is to reduce layers, not add them. TypeScript is an entire layer on top of JavaScript — a transpilation step, a type system, a separate mental model. Every layer adds complexity and every layer can fail. We want fewer layers.

---

## The business and hiring case against it

**It shrinks your hiring pool.**
JavaScript developers are everywhere. They are the largest pool of engineers on earth. TypeScript developers are a subset of JavaScript developers — and within that subset, opinions vary enormously on how TypeScript *should* be used. One engineer's "correct" TypeScript is another engineer's `any`-everywhere mess. You don't get a standardized skill; you get fragmentation within an already smaller pool.

Plain JavaScript means: if you can write code, you can contribute. That's the hiring bar we want.

**It doubles your onboarding material.**
If you use TypeScript, your onboarding program needs to cover both JavaScript fundamentals *and* TypeScript specifics. You need TypeScript-aware linting, TypeScript-specific gotchas, TypeScript debugging workflows. For every engineer who already knows TypeScript well, there are several who know JavaScript but not TypeScript. You've just added weeks to their ramp time.

We measure onboarding speed in days, not weeks or months. TypeScript makes that goal harder to hit.

**The context-switching cost is underestimated.**
Engineers who don't fully internalize TypeScript end up switching mental modes constantly — writing code, getting a type error, debugging the type error, getting back to the actual code. That cognitive overhead is invisible on any individual task but it accumulates across every task, every day, for every engineer who isn't a TypeScript expert. It makes people slower in a way that's hard to measure and easy to dismiss.

**Type safety isn't actually a problem we have.**
This framework uses Joi for runtime validation at every API boundary. The things that come in from users are validated before they touch your business logic. The database is typed at the Sequelize model layer. The places where TypeScript's type system would theoretically add safety are already covered by the validation patterns built into this framework. You get the real protection (runtime validation) without the tax (compile-time type system).

**It doesn't outlast the engineers who introduce it.**
Most engineers who push for TypeScript adoption don't stay at a company long enough to see the full downstream cost of their decision. The person who added TypeScript to the stack is usually gone by the time the new hire spends three days fighting the compiler. We've seen this pattern enough times to consider it a law.

---

## The AI era argument

We are in a world where AI writes significant amounts of production code. This shifts the equation further against TypeScript.

AI code generation tools — including Claude — know JavaScript better than any other language. They know Express, Sequelize, the patterns in this framework. When the codebase is consistent, well-documented, and uses standard JavaScript, AI assistance is fast, accurate, and reliable.

Complex TypeScript type hierarchies, generic constraints, and declaration merging confuse AI tools. They generate plausible-looking code that fails type checking. You end up debugging AI-generated type errors instead of AI-generated logic errors. The promise of TypeScript (catch errors before runtime) collides directly with the promise of AI assistance (generate correct code fast) — and they don't reinforce each other.

If your goal is maximum velocity — human *and* AI — plain JavaScript wins.

---

## Addressing the counterarguments honestly

**"TypeScript catches real bugs."**
Sometimes. The bugs it catches most reliably — calling a method on `undefined`, passing the wrong type to a function — are also caught by good Joi validation, good tests, and code review. The marginal bug-prevention value of TypeScript above those practices is small. The cost is not small.

**"It's better for large codebases."**
This is the strongest version of the TypeScript argument. At 500k lines of code with 50 engineers, the IDE autocomplete and refactoring tools TypeScript enables are genuinely valuable. We're not building a codebase with 500k lines of code and 50 engineers. If you get there, the framework will be worth evolving. Don't pay the tax now for a problem you don't have yet.

**"It documents the code."**
Good function names, good JSDoc comments, and clear Joi schemas document the code. Type annotations are one form of documentation, not the only form and not always the clearest. This framework enforces naming conventions and structure that communicate intent without a type system.

**"Everyone is using TypeScript now."**
Many teams are. Many are also slowing down, struggling to hire, and spending engineering time on type errors instead of features. Popularity isn't the same as correctness. Ruby on Rails was extremely popular. PHP was extremely popular. We make decisions based on outcomes, not trends.

---

## The same logic applies to other choices in this framework

The reasoning here — reduce layers, reduce onboarding time, expand the hiring pool, optimize for team velocity — applies everywhere:

- **No microservices.** A monolith you understand beats a distributed system you don't. Microservices are an organizational solution for teams of hundreds. If you have 10 engineers, you have one team, you should have one service.
- **Managed deployment (Heroku/Render) over AWS directly.** AWS is powerful and complex. Engineers configuring VPCs and IAM policies are not building features. Use managed infrastructure until you have a specific reason not to.
- **POST and GET only.** Eliminating the REST method debate removes an entire category of pointless argument from every code review. The action name carries the meaning; the HTTP method doesn't need to.

Every one of these choices is the same trade: give up theoretical flexibility, gain actual speed.

---

## The bottom line

Orbital Express is built around a specific belief: **the most important metric for a software team is how fast it can safely ship features, at sustained pace, as the team changes over time.**

TypeScript doesn't improve that metric for the kind of teams and products this framework is designed for. It adds configuration, slows onboarding, shrinks the hiring pool, adds a compilation layer, and introduces a new category of errors (type errors) without eliminating the categories of errors that actually cause production incidents.

We've built on TypeScript. We've built on plain JavaScript. The products built on plain JavaScript shipped faster, had shorter onboarding times, were easier to hand off, and accumulated less technical debt.

That's the whole argument. The rest is details.
