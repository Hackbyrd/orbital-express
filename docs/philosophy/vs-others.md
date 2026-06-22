# Orbital Express vs The Field

There are dozens of frameworks for building backend APIs. This page makes the honest case for why Orbital Express wins — not on benchmarks or features, but on the metric that actually matters for a startup: **total cost of building and maintaining a product over time.**

We'll go framework by framework. Where other frameworks are genuinely better for certain use cases, we'll say so.

---

## The quick comparison

| | Orbital Express | Ruby on Rails | Django | Express (vanilla) | NestJS | Next.js | Laravel | Fastify |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Language | JS | Ruby | Python | JS | TypeScript | JS/TS | PHP | JS |
| Opinionated | ✅ Strong | ✅ Strong | ✅ Moderate | ❌ None | ✅ Moderate | ❌ Weak (API) | ✅ Strong | ❌ None |
| Feature-folder structure | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Code generator | ✅ | ✅ | ✅ | ❌ | ⚠️ Partial | ❌ | ✅ | ❌ |
| Auth built-in | ✅ | ⚠️ Gems | ⚠️ Plugins | ❌ | ⚠️ Passport | ❌ | ✅ | ❌ |
| Background jobs built-in | ✅ | ⚠️ Sidekiq (extra) | ⚠️ Celery (extra) | ❌ | ⚠️ Extra | ❌ | ⚠️ Queues (extra) | ❌ |
| Real-time (WebSockets) | ✅ | ⚠️ ActionCable | ⚠️ Channels | ❌ | ⚠️ Extra | ⚠️ Extra | ⚠️ Extra | ⚠️ Extra |
| i18n built-in | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| AI skill playbooks | ✅ 19 skills | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MCP server (AI docs) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Pure API purpose | ✅ | ⚠️ Full-stack | ⚠️ Full-stack | ✅ | ✅ | ❌ Frontend | ⚠️ Full-stack | ✅ |
| Hiring pool | 🟢 Largest | 🟡 Shrinking | 🟡 Medium | 🟢 Large | 🟡 Medium | 🟢 Large | 🔴 Shrinking | 🟢 Large |
| Onboarding speed | 🟢 Days | 🟡 Weeks | 🟡 Weeks | 🔴 Months | 🔴 Months | 🟡 Weeks | 🟡 Weeks | 🔴 Months |

---

## vs Ruby on Rails

Rails deserves respect. It invented convention-over-configuration, the code generator, the opinionated structure. Orbital Express learned directly from it.

But Rails in 2025 has a problem the Rails community doesn't talk about enough: **Ruby is becoming a niche hiring language.**

In 2010, Rails was how you built a startup. In 2025, most bootcamp graduates, most computer science programs, and most self-taught developers are learning JavaScript — not Ruby. When you choose Rails, you are choosing a smaller hiring pool, longer time-to-find per hire, and candidates who will typically cost more because they are rarer.

**The business cost of that decision compounds.** Every hire is slower and more expensive. Every time someone leaves, finding a replacement is harder. Every time you want to hire a junior, you have to teach them Ruby before they can touch your codebase.

Beyond hiring:

- **Rails "magic" is a double-edged sword.** Rails does a lot for you automatically — Active Record callbacks, before_action filters, concerns — and when you understand the magic, it's elegant. When you don't, debugging is disorienting. Orbital Express has strong conventions with minimal magic. You can read any file and understand exactly what it does.
- **Rails is full-stack.** It was designed to render views. The API-only mode exists, but it's a bolt-on, not the primary design. Orbital Express was built from day one as a pure API framework — no view layer, no asset pipeline, no decisions about whether to use ERB or Haml.
- **Sidekiq costs money.** Background jobs in Rails require Sidekiq Pro for production features (~$179/month). Bull, which Orbital Express uses, is open source.

**When Rails is the right choice:** Your team already knows Ruby deeply and you aren't planning to scale the team significantly. Rails is genuinely excellent if you already have a Rails team.

**When Orbital Express wins:** You are hiring, growing, or building from scratch with a team that knows JavaScript. The hiring advantage alone justifies the switch.

---

## vs Django

Django is the Rails of Python: opinionated, batteries-included, battle-tested. It has an excellent ORM, a great admin panel, and a mature ecosystem.

The problem is the same as Rails, plus one more: **Python is not the language of backend APIs anymore — it's the language of data science and machine learning.**

If you are building an ML pipeline, a data processing system, or a product that is deeply integrated with Python data tools, Django is a reasonable choice. If you are building a product API — users, authentication, orders, notifications, real-time events — you are using Python for backend work that JavaScript does equally well while giving you access to a larger hiring pool.

Specific issues:

- **Django REST Framework is a separate library.** Django was built to serve HTML pages. Building an API with Django means adding DRF on top, learning its serializers, its viewsets, its router configuration — an entire additional learning surface on top of Django itself. Orbital Express is API-first. There is no "add DRF equivalent" step.
- **Async is bolted on.** Django added async support, but it is not native to the framework's design. Node.js is async by default — it's the runtime's core design. For I/O-heavy API work, Node.js handles concurrency more naturally than Django's threading model.
- **Python type hints are becoming mandatory.** The Django community is moving toward type hints everywhere. This is the TypeScript problem in Python form: a learning investment, a compilation step, a gatekeeping mechanism that narrows your hiring pool.
- **Celery for background jobs is a significant operational burden.** Running Celery requires a separate broker (usually RabbitMQ or Redis), a separate worker process, a separate monitoring setup. Bull in Orbital Express runs on the same Redis your app already uses, with a single worker process, with a built-in queue dashboard.

**When Django is the right choice:** Your product is deeply integrated with Python's data ecosystem. You need the Django admin panel. Your team is already Python-fluent.

**When Orbital Express wins:** You are building a product API. You want to hire from the largest possible pool of engineers. You want background jobs without a separate broker and separate ops overhead.

---

## vs Express.js (vanilla)

Orbital Express *is* Express. The same router, the same middleware system, the same req/res pattern. If you know Express, you know Orbital Express's runtime.

What you don't have with vanilla Express is everything else: **the structure, the conventions, the generator, the auth pattern, the queue, the sockets, the tests, the i18n, and the playbooks.**

Every team building on vanilla Express eventually builds their own framework on top of it. They create their own folder structure, their own error handling conventions, their own validation pattern, their own auth middleware. This is the problem: **every team builds a different framework.** When an engineer joins, they have to learn not just Express but your team's specific layer on top of Express. When that engineer leaves, that knowledge walks out with them.

The cost:

- **3-6 months of onboarding** just to understand what pattern this particular team chose for routing, validation, error codes, model structure, and test setup — before the engineer can contribute anything real.
- **6+ months of bike-shedding** early in a new team's life deciding what that structure should be. These are decisions Orbital Express made for you, correctly, based on years of production experience.
- **Inconsistent codebases** that drift over time as different engineers add features in different ways, because there was nothing to enforce consistency.

**When vanilla Express is the right choice:** You are building a tiny service with one or two engineers who will maintain it permanently and want total control.

**When Orbital Express wins:** You have any team larger than one, any expectation of hiring, any desire to still understand the codebase in two years.

---

## vs NestJS

NestJS is the most architecturally sophisticated Node.js framework. It brings Angular's dependency injection system, module architecture, and decorator-heavy patterns to the backend. For engineers coming from a Java Spring or .NET background, NestJS feels like home.

For everyone else, it is a steep and expensive climb.

The core problem with NestJS is **the learning curve is not proportional to the benefit.** Before a new engineer can ship a feature in NestJS, they need to understand:

- TypeScript (at a level beyond basic)
- Decorators and how they work
- Dependency injection and the DI container
- Modules, providers, and the module graph
- How guards, interceptors, and pipes differ from middleware
- The lifecycle of a request through all of these layers

This is months of learning before you write business logic. In Orbital Express, you understand the structure in hours: feature folder, action file, route file, model file. That's it. You ship on day one.

Specific issues:

- **TypeScript tax is real.** TypeScript is a learning investment, a toolchain addition, and a hiring filter. It excludes junior engineers who haven't learned it yet. It confuses AI tools with its type hierarchies and generated output. Orbital Express uses plain JavaScript — the language the most engineers already know at the level needed to be productive.
- **NestJS encourages over-abstraction.** The module/provider/injectable system is elegant in theory but invites layers of indirection that make code harder to trace in practice. What is this class injecting? Where is this provider defined? Orbital Express code is direct: the function is in the file. There's no injection to trace.
- **It's primarily a TypeScript showcase.** NestJS is where the TypeScript Node.js ecosystem landed. It is excellent for engineers who love TypeScript and want to use all of its features. It is expensive for a team that needs to hire broadly and ship quickly.

**When NestJS is the right choice:** Your team is all senior TypeScript engineers who came from a Spring/Angular background and prefer that architectural style.

**When Orbital Express wins:** You want to hire broadly, onboard fast, and have juniors (or AI) contributing correct code from day one.

---

## vs Next.js

Next.js is a great framework. It is also a **frontend framework with API capability bolted on,** and confusing the two costs startups significantly.

Next.js API routes were designed for one thing: small, serverless-style endpoints that sit close to the frontend — fetch some data, proxy a third-party API, handle a form submission. They are not designed to be your entire backend API.

The issues when you try to use Next.js as a proper backend:

- **No background job system.** Next.js has no concept of a job queue. Every operation has to complete within the API route's request lifecycle — if it takes too long, Vercel kills it. You end up bolting on a third-party queue service, running it separately, and connecting everything yourself.
- **No database layer or ORM.** Next.js doesn't make any choices about your data layer. You add Prisma, or Drizzle, or raw queries — and now you're making all the decisions a framework should make for you.
- **No auth system.** NextAuth.js exists but it's a separate library with its own learning curve. Access tokens, refresh tokens, per-client isolation — none of this comes with Next.js.
- **Serverless constraints are real constraints.** The Vercel deployment model is convenient until you need persistent connections, long-running operations, or WebSockets. Real-time features require separate infrastructure. Orbital Express is designed for a long-running server that can hold WebSocket connections open, process queues continuously, and handle complex session state.
- **You are coupled to Vercel.** Next.js is built by Vercel and optimized for Vercel. Self-hosting Next.js is possible but not the happy path. Orbital Express deploys to Heroku, Render, Railway, or any Node.js host equally well.
- **It mixes frontend and backend concerns.** The same repo, the same engineers, the same deployment cycle for your React components and your API. For a small team shipping a single product, this can feel convenient. For any team that has different people working on frontend and backend, or that wants to serve multiple frontends from one API, it creates coupling that is hard to undo.

**When Next.js is the right choice:** You are building a primarily frontend product that needs a few simple API endpoints. You are shipping to Vercel. Your API needs are lightweight.

**When Orbital Express wins:** You are building a real backend API — with auth, queues, real-time, complex business logic, multiple clients. Next.js is not trying to solve that problem. Orbital Express is.

---

## vs Laravel

Laravel is the most underrated framework in this list and the closest philosophical sibling to Orbital Express. It is opinionated, generator-first, batteries-included, and built with business outcomes in mind. Artisan commands, Eloquent ORM, queues, broadcasting, first-class auth — Laravel ships what Orbital Express ships, for PHP.

The problem is PHP.

PHP hiring has been declining for over a decade. The PHP developer pipeline — bootcamps, CS programs, self-taught learners — is a fraction of the JavaScript pipeline. Senior PHP engineers are harder to find, and junior developers are less likely to know PHP coming in. Laravel is an excellent framework fighting an uphill battle because of its language.

There is also the "two languages" problem for most teams. Your frontend is almost certainly JavaScript. If your backend is PHP, you have engineers who can't cross between them. In JavaScript, a frontend developer can read and occasionally contribute to backend code. Knowledge transfers. The codebase is one language.

**When Laravel is the right choice:** Your team is PHP-fluent, your system is built on PHP, and you are not planning to rebuild. Laravel is genuinely excellent.

**When Orbital Express wins:** You are starting fresh or rebuilding. The same business-first philosophy as Laravel, in the language with the largest hiring pool.

---

## vs Fastify

Fastify is fast — measurably, benchmarkably fast. It has lower overhead than Express and better performance at high request volume. It has a plugin system, schema validation via JSON Schema, and good TypeScript support.

It has no opinions about structure, auth, jobs, sockets, or anything else.

Fastify is a runtime choice, not a framework choice. It's Express's speed-conscious younger sibling. If you're building a microservice that needs to handle 100,000 requests per second and does nothing else, Fastify is reasonable to evaluate.

If you're building a product API, you still have to make every architectural decision yourself — the same problem as vanilla Express, just on a faster runtime.

**When Fastify is the right choice:** You are hyper-optimizing a specific, small service for raw throughput and you have a team with the architecture experience to build the conventions yourself.

**When Orbital Express wins:** You need a complete framework, not a fast router. The performance difference between Express and Fastify at startup scale is unmeasurable by your users.

---

## vs Hono, Koa, Hapi, and everything else

These are microframeworks or niche frameworks with smaller communities and the same fundamental problem: they give you a runtime and nothing else. You make every decision. Your team makes a different set of decisions than the last team. Nobody can read each other's code. You're back to building your own framework on top of theirs.

Hono is worth watching — it runs on the edge and is genuinely well-designed. It is not an answer to the same question Orbital Express answers.

---

## What nobody else has

After going through every alternative, here is what no other framework offers that Orbital Express does:

**1. Feature-folder architecture.** Every other framework organizes by type: all models together, all controllers together, all routes together. Orbital Express organizes by feature: everything for Orders in one folder, everything for Users in one folder. At scale, this is the difference between finding a bug in 5 seconds and finding it in 5 minutes.

**2. A complete, ready-to-ship stack.** Auth, queues, sockets, i18n, generators, structured tests — all built-in, all opinionated, all pre-integrated. Every other framework requires you to assemble these yourself from separate libraries, then integrate them, then document how you integrated them, then teach every new engineer your integration.

**3. 19 AI skill playbooks.** No other framework ships with step-by-step playbooks that an AI can follow to build correct features end-to-end. This is not a feature that will be added to Rails or NestJS — it requires the framework itself to be designed for AI from the ground up, with enough consistency that AI-generated code matches the convention.

**4. An MCP server.** The `orbital-express-mcp` package gives Claude Code complete knowledge of the framework — conventions, skills, docs — without any setup. This turns Claude from a generic coding assistant into a developer who knows your entire framework.

**5. Business-first decision making.** Every other framework was built by engineers solving engineering problems. Orbital Express was built after a decade of watching bad technical decisions become expensive business problems. The opinions are not about what's technically elegant — they're about what reduces total cost of ownership across a team over years.

---

::: tip The honest summary
If your team is already deep in Rails, stay in Rails. If your team is already deep in NestJS, stay in NestJS. Framework migrations are expensive, and the right time to adopt Orbital Express is when you're starting or rebuilding.

If you're starting fresh, building a product API in JavaScript, and you want to hire from the widest possible pool while shipping from day one — there is no better option.
:::
