# One Repo, Not Microservices

The promise of microservices is appealing: independent teams, independent deployments, independent scaling. The reality, for most companies, is something else entirely.

This framework is built around a monolith. A single repo, a single codebase, a single set of conventions. And when you need to scale — you deploy that same codebase like microservices, without ever splitting the repo.

---

## What microservices actually cost

The case against microservices isn't that they're technically wrong. It's that they're an organizational solution being applied to a team-size problem.

Microservices make sense when you have hundreds of engineers working on genuinely independent domains, where the cost of coordinating a single deployment outweighs the cost of running distributed infrastructure. Netflix has that problem. You almost certainly don't.

For teams under ~50 engineers, microservices create more problems than they solve:

**Five repos means five onboarding experiences.** Every new engineer has to learn not one codebase but an ecosystem. Different conventions, different tooling, different deployment pipelines. Your ramp time multiplies.

**Cross-service debugging is a nightmare.** A bug that crosses a service boundary requires tracing a request through multiple logs, multiple environments, multiple repos. What would be a 10-minute fix in a monolith becomes a 2-hour archaeology project.

**The "independent teams" assumption is wrong.** At a startup or a growth-stage company, you don't have independent teams — you have one team wearing multiple hats. Your frontend engineer touches auth. Your backend lead touches billing. Forcing artificial service boundaries on a team that can't respect them creates coordination overhead without any of the promised autonomy.

**Consistency decays.** When your user service is Node.js and your billing service is Python and your notifications service is Go, you've guaranteed that any engineer moving between them has to context-switch every time. Libraries drift apart. Error formats differ. Monitoring is inconsistent. The codebase stops being a codebase and becomes a collection of projects that happen to share a domain.

---

## The real cost: $10M and a DevOps team waking up at 2 AM

At FiscalNote, we ran 17 services across multiple languages on AWS. We had a dedicated DevOps team. They were waking up at 2 AM on a regular basis to fight infrastructure fires — not occasionally, regularly. The system was too complex to be reliable, and too custom for any one person to fully understand.

The total cost of those architectural decisions — engineering salaries, rewrite projects, operational overhead, opportunities missed because we couldn't move fast — was over **$10 million across a decade**. That number isn't hypothetical. It's what bad architecture actually costs when you run the tape.

At Nitra, running Orbital Express on managed hosting with a monolith: **zero infrastructure incidents in five years**. Zero on-call pages. Zero DevOps team. The time and money that would have gone to infrastructure management goes to building features instead.

---

## The monolith advantage: one repo, total consistency

A single repo means:

- **One set of conventions.** Every feature folder looks the same. Every model follows the same patterns. Every action has the same structure. An engineer who has touched one feature can navigate any other feature on day one.
- **One onboarding experience.** Learn the framework once. Contribute everywhere immediately.
- **Shared libraries, shared schemas, shared constants.** No drift between services. No "which service has the canonical user schema?" No version mismatches between internal packages.
- **Trivial cross-feature work.** Need to query the Orders table from the Notifications feature? Import the model. Done. In a microservices architecture, that's a synchronous API call with latency, failure modes, and a contract to maintain.
- **One deployment pipeline.** Push code, it deploys. There is no "deploy service A, wait, deploy service B, check that they're compatible."

---

## When you need to scale: deploy like microservices, stay in one repo

Here's the part most people miss: **you don't need to split the repo to get horizontal scaling.**

Orbital Express is a standard Express.js application. When you're ready to scale beyond a single server, you can deploy the same codebase to multiple servers and configure each instance to handle only a subset of your API routes.

```
Server A → handles /v1/users/*, /v1/auth/*
Server B → handles /v1/orders/*, /v1/payments/*
Server C → handles /v1/notifications/*, /v1/search/*
```

Each server runs the same code, the same database connection, the same conventions. You route traffic at the load balancer level. You scale individual servers independently based on load. You get horizontal distribution without splitting a single file.

The codebase stays unified. Onboarding stays simple. Conventions stay consistent. You scale the infrastructure without scaling the complexity.

---

## On managed deployment: Heroku and Render

The AWS argument is related. AWS gives you maximum control over your infrastructure. What it costs you is an enormous operational burden: VPCs, IAM policies, load balancers, auto-scaling groups, custom deployment pipelines, monitoring configuration, on-call rotations.

That is not a good trade for a product team. Engineers who are configuring infrastructure are not building features. A DevOps team is an overhead that doesn't ship anything users see.

Managed platforms — Heroku, Render, Railway — handle the infrastructure so you don't have to. They are production-grade and reliable. Deployment is `git push`. Scaling is a slider. Databases are provisioned in minutes. The operational overhead drops to near zero.

When you're a startup or a growth-stage company, the only metric that matters is how fast you ship features users want. Managed deployment maximizes that metric. Self-managed AWS minimizes it.

Use managed hosting until you have a specific, concrete reason not to. Most companies never reach that point.

---

## The pattern in all of this

The monolith recommendation, the managed hosting recommendation, the single-language recommendation — they're all the same argument:

**Complexity is a tax. Every layer of complexity you add costs onboarding time, training overhead, and debugging hours. The job is to minimize that tax while still building something that scales.**

A well-structured monolith on managed hosting, deployed to multiple servers when needed, gives you 90% of what microservices on custom infrastructure gives you — at 10% of the operational cost.

That's the trade we make here. It's the right trade.
