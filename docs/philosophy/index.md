# The Philosophy

The goal of a startup is simple: **build a great product fast, survive long enough to win, and run an operation that doesn't eat itself.**

It is not to build the greatest technical platform. It is not to impress other engineers. It is not to implement the architecture the big tech companies use at a scale you won't reach for years, if ever. It is just to build a great business — and do it before you run out of time and money.

Orbital Express exists because every decision in software development is really a business decision in disguise. The framework you choose determines how fast you hire, how long onboarding takes, how much you pay engineers to argue instead of build, whether your codebase survives a team change, and whether you wake up at 2 AM to fight infrastructure fires. These are not technical outcomes. They are business outcomes.

**Every opinion in this framework was chosen to help you build a great business — not a great technical platform.**

The bottleneck is almost never the technology. It's the people — how long it takes them to onboard, how much time they spend arguing about architectural decisions, how fast a new hire can contribute something real, and how much of the team's energy goes to operations instead of product.

---

## The principles

Every opinionated choice in this framework is a direct expression of one or more of these:

### 1. Low learning curve beats raw power

A framework that a developer can be productive in on day one is worth more than a framework that unlocks theoretical capabilities they'll need in year three. We optimize for the time between "first commit" and "first feature shipped" — for every engineer, every time.

### 2. Opinions eliminate arguments

When a framework makes a choice, your team doesn't have to. Every open question — what state library, what router, what folder structure, what HTTP method, what naming convention — is an invitation for debate. Orbital Express closes those questions. You spend that time building instead.

### 3. Consistency over cleverness

A codebase where every file looks like every other file is a codebase any engineer can navigate on day one. Brilliant individual solutions that nobody else understands are a liability. The goal is a codebase that outlasts any one person — including you.

### 4. Reduce training overhead to near zero

Every non-standard technology choice is a training cost. Every additional layer is something new engineers have to understand before they can contribute. Every tool that requires deep expertise to use correctly narrows your hiring pool and extends your onboarding time. We strip those costs out wherever possible.

### 5. Team velocity, not individual velocity

The measure of a good engineering team is not how fast the best engineer ships. It's how fast the whole team ships — including the engineer who joined last month. Decisions that make one engineer 10% faster but require three weeks to teach everyone else are bad decisions.

---

## How this plays out

These five principles drive every choice in the framework:

- [JavaScript, not TypeScript](/philosophy/javascript-not-typescript) — because a compilation layer, a type system, and months of learning curve don't improve team shipping speed.
- [Vue.js, not React](/philosophy/vue-not-react) — because React's unopinionated nature means every new hire brings their own opinions, and you spend your time adjudicating instead of building.
- [One repo, not microservices](/philosophy/one-repo) — because five repos means five sets of conventions, five onboarding experiences, and cross-service debugging at 2 AM.
- [Managed deployment, not AWS](/philosophy/one-repo#deployment) — because a DevOps team managing custom infrastructure is not building features.

And behind all of it: [the story of why this framework exists](/philosophy/the-origin) — what ten years of expensive mistakes actually taught us.

---

## Why this framework, not another

Most frameworks are built by engineers, for engineers. They optimize for technical elegance, flexibility, and architectural purity — all admirable goals that have nothing to do with shipping a product.

Orbital Express is different. It is [built for business outcomes, not engineering satisfaction](/philosophy/business-first). Every opinion it holds — about language, structure, deployment, patterns — was chosen because it reduces your total cost of building software over time: faster onboarding, fewer architectural debates, lower operational burden, and a codebase that any engineer can extend without a month of context transfer.

That is a different kind of framework. [Read the full argument →](/philosophy/business-first)

---

::: tip The bottom line
Your startup is on the clock. Every week you spend on the wrong architecture, on unnecessary complexity, on infrastructure you don't need, is a week you're not shipping product. The framework that helps you survive and win is the one that gets out of your way and lets you build. That is what this is for.
:::
