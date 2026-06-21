# Why Vue.js, Not React

Orbital Express doesn't prescribe a frontend framework — you can use whatever you want. But if you ask us what we recommend, the answer is **Vue.js**. This page explains why.

::: tip TL;DR
Vue.js is opinionated, consistent, and has a low learning curve. React is unopinionated, fragmented, and takes months to truly master. The same philosophy that drives Orbital Express — speed over everything, opinions that eliminate arguments, a team that can move without fighting — applies directly to your frontend choice.
:::

---

## The field

There are four major frontend frameworks worth knowing about: React, Vue.js, Angular, and Svelte. React is the most widely used. Vue.js is second. Angular is third, declining. Svelte is a distant fourth with an interesting technical approach but a small ecosystem.

This isn't a close call. We recommend Vue.js. React is not a good choice for the kind of teams and products Orbital Express is designed to support.

---

## The React problem: unopinionated means everyone has opinions

React is not a framework. It's a UI library. It gives you components and a rendering model, and then leaves everything else — routing, state management, data fetching, form handling, styling, file structure, testing conventions — as an open problem for your team to solve.

This sounds like freedom. It is not freedom. It is a permanent architectural decision that keeps re-opening itself every time you hire someone new.

Here's what actually happens when you hire React engineers: they all have opinions. Not bad opinions necessarily — but different ones. The engineer who came from a startup using Redux thinks you should use Redux. The one who came from a shop using Zustand thinks Redux is legacy. The one who just went through a bootcamp is still learning hooks. The one with 5 years of experience has a strong take on whether you should use React Query or SWR or roll your own. None of them are wrong. They just all disagree.

You end up spending hours in architecture meetings that have nothing to do with your product. You end up with a codebase where different sections follow different conventions because different engineers built them at different times. You end up with pull request debates about state management philosophy instead of whether the feature is correct.

**The React hiring pool is huge. But a big pool of engineers all doing things differently is functionally equivalent to a small pool.** You're not getting leverage from that pool — you're getting noise.

---

## The Vue difference: conventions ship with the framework

Vue is opinionated. There is a Vue way to do things. When you hire a Vue engineer, they know what that way is. They may have preferences, but the framework itself has already settled most of the arguments before the first PR is opened.

- Routing: Vue Router. That's the one.
- State management: Pinia (and before it, Vuex). That's the one.
- Build tooling: Vite. That's the one.
- Styling patterns: scoped styles in Single File Components. That's the convention.
- Data fetching: VueUse composables or Pinia actions. Consistent, documented, known.

When two Vue engineers join from different companies, they recognize each other's code. The patterns are familiar. The folder structures look similar. The mental model is shared. Onboarding takes days, not weeks.

This is not an accident. It's by design. The Vue team built an ecosystem, not just a library. They understood that what teams need is not maximum flexibility — it's maximum clarity.

---

## The learning curve gap

React's learning curve is deceptively steep. Beginners can write React after a weekend tutorial. But writing *good* React — understanding when to use `useEffect`, avoiding stale closures, knowing when `useMemo`/`useCallback` help or hurt, understanding the rendering model deeply enough to not cause performance bugs — takes months. Maybe longer.

The result is a framework where the floor is low and the ceiling is high, and the distance between them is a trap. Developers feel productive early, ship code that looks fine, and create subtle problems that only become visible later. Then fixing those problems requires deep React knowledge that most engineers on the team don't have.

Vue's learning curve is genuinely gentler and more consistent. The Options API is approachable for anyone who knows JavaScript. The Composition API is powerful for engineers who want it. The mental model of reactivity is explained in the docs and it actually works the way the docs say it works. There are fewer edge cases, fewer gotchas, fewer "wait, why did this re-render?" moments.

New engineers get to productivity faster. Senior engineers don't spend time firefighting beginner mistakes. The whole team can focus on the product.

---

## The ecosystem problem: React's third-party dependency

React's core team maintains React. That's it. Everything else — the router, the state library, the data fetching layer, the forms library, the animation library — is built and maintained by third parties.

Third parties have different release schedules, different levels of funding, different opinions about breaking changes, and sometimes just stop being maintained. When you build a React app and choose your stack — React + React Router + Redux Toolkit + React Query + React Hook Form + a component library — you have assembled a dependency graph of six or more projects that do not coordinate with each other. When React releases a major version, some of those dependencies lag behind. When a popular library gets abandoned, you inherit the problem.

This is not a theoretical risk. It has happened repeatedly. Libraries that were the recommended choice two years ago are now unmaintained. React's own documentation has cycled through multiple different recommended approaches for basic patterns like data fetching.

Vue's core team maintains Vue Router, Pinia, Vite (co-developed with the broader Vite team), VueUse, and the official testing utilities. These projects move together. When Vue releases, the ecosystem updates with it. You are not relying on volunteers and startups to keep your production stack running.

---

## The "backed by nobody" argument

React was created at Facebook. Angular was created at Google. Both had the full weight of trillion-dollar companies behind their adoption: internal mandates, conference sponsorships, engineering blog posts, job postings requiring them by name. Their dominance is partly explained by the fact that they had enormous institutional marketing budgets and a built-in user base of internal engineers.

Vue was created by Evan You — one person, working independently after leaving Google. No company backing. No institutional distribution. No corporate job board requiring it by name.

Vue is the second most popular frontend framework on earth. It got there on merit.

When something reaches that level of adoption without a big company behind it, it means the engineers who used it chose it, recommended it, and kept using it because it was genuinely better for them. Not because their employer mandated it. Not because it was the safe enterprise choice. Because it worked.

That's a signal worth taking seriously.

---

## Performance: not a differentiator, but Vue holds its own

React is fast. Vue is also fast. Both use virtual DOMs and have optimized rendering pipelines. You will not build or fail to build a performant product because of which one you chose. Performance is not the argument here.

If anything, Vue 3's reactivity system — built on ES Proxies — has less overhead than React's hook dependency array model. Vue's compiler can statically analyze templates and optimize rendering in ways that React's JSX model cannot. Vue's `<script setup>` in Single File Components produces leaner compiled output than equivalent React components.

But again: this is not the primary argument. The argument is developer velocity, team consistency, and hiring leverage. On all three, Vue wins.

---

## The Single File Component is a good idea

Vue's `.vue` file format — HTML template, script, and scoped styles in one file — is controversial among people who haven't used it and obvious once you have.

When you're working on a component, everything that component does is in one file. You don't context-switch between `MyComponent.jsx`, `MyComponent.module.css`, `useMyComponent.ts`, and `MyComponent.test.ts`. The template describes the structure, the script describes the behavior, the styles are scoped so they can't leak. It's readable, it's self-contained, and it's consistent across every Vue codebase.

React's JSX-mixed-with-JavaScript approach has its own elegance for people who think in JavaScript-first. But it also produces components that mix concerns in ways that are hard to navigate quickly, and CSS-in-JS solutions (of which there are many, all different) are a category of debate that Vue developers simply don't have.

---

## Our recommendation

Build your backend with Orbital Express. Build your frontend with Vue.js.

This isn't because React is a bad technology. It's because the same principles that make Orbital Express the right framework choice — high opinions, low learning curve, fast onboarding, consistent patterns, team velocity over individual cleverness — make Vue.js the right frontend choice.

The best engineering teams aren't the ones with the most brilliant individuals doing things their own way. They're the ones where every engineer can read every other engineer's code on day one and know exactly what's happening. Vue gives you that. React, structurally, does not.

---

*Want to use React? You can. Orbital Express doesn't care what your frontend does. But if you ask us what we'd build with — it's Vue.*
