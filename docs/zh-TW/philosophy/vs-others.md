# Orbital Express vs 其他框架

建構 backend API 的框架多達數十種。本頁面將誠實說明 Orbital Express 勝出的理由——不是靠跑分或功能清單，而是以一個真正對 startup 重要的指標來衡量：**長期建構與維護產品的總成本。**

我們會逐一比較各框架。若其他框架在特定使用情境下確實更好，我們也會如實說明。

---

## 快速比較

| | Orbital Express | Ruby on Rails | Django | Express（原生） | NestJS | Next.js | Laravel | Fastify |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 語言 | JS | Ruby | Python | JS | TypeScript | JS/TS | PHP | JS |
| 強意見 | ✅ 強 | ✅ 強 | ✅ 中 | ❌ 無 | ✅ 中 | ❌ 弱（API） | ✅ 強 | ❌ 無 |
| Feature-folder 結構 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Code generator | ✅ | ✅ | ✅ | ❌ | ⚠️ 部分 | ❌ | ✅ | ❌ |
| 內建 Auth | ✅ | ⚠️ Gems | ⚠️ Plugins | ❌ | ⚠️ Passport | ❌ | ✅ | ❌ |
| 內建背景工作 | ✅ | ⚠️ Sidekiq（額外） | ⚠️ Celery（額外） | ❌ | ⚠️ 額外 | ❌ | ⚠️ Queues（額外） | ❌ |
| 即時（WebSockets） | ✅ | ⚠️ ActionCable | ⚠️ Channels | ❌ | ⚠️ 額外 | ⚠️ 額外 | ⚠️ 額外 | ⚠️ 額外 |
| 內建 i18n | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| AI skill playbooks | ✅ 19 個 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MCP server（AI 文件） | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 純 API 用途 | ✅ | ⚠️ Full-stack | ⚠️ Full-stack | ✅ | ✅ | ❌ Frontend | ⚠️ Full-stack | ✅ |
| 人才招募規模 | 🟢 最大 | 🟡 萎縮中 | 🟡 中等 | 🟢 大 | 🟡 中等 | 🟢 大 | 🔴 萎縮中 | 🟢 大 |
| 上手速度 | 🟢 數天 | 🟡 數週 | 🟡 數週 | 🔴 數月 | 🔴 數月 | 🟡 數週 | 🟡 數週 | 🔴 數月 |

---

## vs Ruby on Rails

Rails 值得尊敬。它發明了 convention-over-configuration、code generator 和強意見結構。Orbital Express 直接從中汲取靈感。

但 Rails 在 2025 年面臨一個社群不太願意正視的問題：**Ruby 正在成為一門小眾的招募語言。**

2010 年，Rails 是建構 startup 的主流方式。到了 2025 年，大多數 bootcamp 畢業生、大學資工系學生和自學開發者學的是 JavaScript——而不是 Ruby。選擇 Rails，就是選擇更小的人才庫、更長的招募週期，以及因為稀缺而普遍要價更高的工程師。

**這個決策的商業代價會不斷累積。** 每一次招募都更慢、更貴。每一次有人離職，找到替代者就更難。每一次你想招募 junior，都必須先教他們 Ruby，才能讓他們碰你的程式碼。

除了招募問題之外：

- **Rails 的「魔法」是雙面刃。** Rails 幫你自動處理很多事情——Active Record callbacks、before_action filters、concerns——當你理解這些魔法時，它很優雅。當你不理解時，除錯會讓人摸不著頭緒。Orbital Express 有強烈的慣例，但魔法極少。你可以讀任何一個檔案，並完全清楚它在做什麼。
- **Rails 是 full-stack 框架。** 它的設計初衷是渲染畫面。純 API 模式雖然存在，但那是後來補上的，並非主要設計方向。Orbital Express 從第一天起就是純 API framework——沒有 view layer、沒有 asset pipeline、不需要決定要用 ERB 還是 Haml。
- **Sidekiq 要花錢。** Rails 的背景工作需要 Sidekiq Pro 才能用於生產環境（約 $179/月）。Orbital Express 使用的 Bull 是開源的。

**Rails 是正確選擇的情況：** 你的團隊已深度熟悉 Ruby，且近期沒有大規模擴張團隊的計畫。如果你已經有一支 Rails 團隊，Rails 確實非常出色。

**Orbital Express 勝出的情況：** 你正在招募、成長，或從零開始組建一支熟悉 JavaScript 的團隊。光是招募優勢就足以讓切換有所值。

---

## vs Django

Django 是 Python 界的 Rails：強意見、功能齊備、久經考驗。它有優秀的 ORM、出色的管理後台，以及成熟的生態系。

問題與 Rails 相同，再加一個：**Python 已不再是 backend API 的語言——它是資料科學與機器學習的語言。**

如果你在建構 ML pipeline、資料處理系統，或與 Python 資料工具深度整合的產品，Django 是合理的選擇。如果你在建構產品的 API——使用者、驗證、訂單、通知、即時事件——你是在用 Python 做 JavaScript 同樣能做好的事，同時犧牲了更大的人才庫。

具體問題：

- **Django REST Framework 是一個獨立的函式庫。** Django 的設計初衷是提供 HTML 頁面。用 Django 建構 API 意味著要在上面疊加 DRF，學習它的 serializers、viewsets、router 設定——在 Django 本身之外還有一整套額外的學習面。Orbital Express 是 API-first，沒有「加上 DRF 等價物」這個步驟。
- **Async 是後來補上的。** Django 加入了 async 支援，但它並非框架設計的原生能力。Node.js 預設就是 async——這是 runtime 的核心設計。對於 I/O 密集的 API 工作，Node.js 處理並發的方式比 Django 的 threading model 更自然。
- **Python type hints 正在變成必要條件。** Django 社群正朝著全面使用 type hints 的方向邁進。這是 Python 版的 TypeScript 問題：需要學習投入、增加編譯步驟，並成為縮小人才庫的門檻。
- **Celery 作為背景工作是相當沉重的維運負擔。** 運行 Celery 需要獨立的 broker（通常是 RabbitMQ 或 Redis）、獨立的 worker 程序、獨立的監控設定。Orbital Express 中的 Bull 運行在你的應用程式已在使用的同一個 Redis 上，只需一個 worker 程序，並內建 queue 儀表板。

**Django 是正確選擇的情況：** 你的產品與 Python 資料生態系深度整合。你需要 Django 的管理後台。你的團隊已深度熟悉 Python。

**Orbital Express 勝出的情況：** 你在建構產品 API。你想從最大的工程師人才庫中招募。你想要背景工作，且不需要獨立的 broker 和額外的維運成本。

---

## vs Express.js（原生）

Orbital Express *就是* Express。相同的 router、相同的 middleware 系統、相同的 req/res 模式。如果你熟悉 Express，你就熟悉 Orbital Express 的 runtime。

原生 Express 缺少的，是其他所有東西：**結構、慣例、generator、auth 模式、queue、sockets、測試、i18n，以及 playbooks。**

每一支在原生 Express 上開發的團隊，最終都會在它上面建構自己的 framework。他們建立自己的資料夾結構、自己的錯誤處理慣例、自己的驗證模式、自己的 auth middleware。問題在於：**每個團隊建的 framework 都不一樣。** 工程師加入時，不只要學 Express，還要學這個團隊在 Express 上疊加的那一層。當那位工程師離職時，那些知識也跟著帶走了。

成本如下：

- **3 到 6 個月的上手時間**，光是搞清楚這個團隊選擇了什麼樣的 routing、驗證、錯誤代碼、model 結構和測試設定——在工程師能做出真正貢獻之前。
- **超過 6 個月的反覆討論**，發生在新團隊早期決定結構應該長什麼樣子。這些決策 Orbital Express 已經替你做好了，而且是正確的，基於多年的生產環境經驗。
- **不一致的程式碼庫**，隨著時間推移逐漸偏移，因為不同工程師以不同方式新增功能，沒有任何機制來強制一致性。

**原生 Express 是正確選擇的情況：** 你在建構一個只有一兩位工程師長期維護的小型服務，且想要完全的掌控權。

**Orbital Express 勝出的情況：** 只要你的團隊超過一個人、有任何招募預期、或者希望兩年後還能看懂自己的程式碼。

---

## vs NestJS

NestJS 是架構上最精密的 Node.js framework。它將 Angular 的 dependency injection 系統、模組架構和大量 decorator 的模式帶入了 backend。對於來自 Java Spring 或 .NET 背景的工程師，NestJS 感覺像家。

對其他人來說，這是一段陡峭而昂貴的攀登。

NestJS 的核心問題在於**學習曲線與獲得的收益不成比例。** 一位新工程師在 NestJS 中能夠交付功能之前，需要理解：

- TypeScript（超過基礎程度）
- Decorator 及其運作方式
- Dependency injection 與 DI container
- Module、provider 與模組依賴圖
- Guard、interceptor 和 pipe 與 middleware 的差異
- 請求在所有這些層次中的生命週期

這需要數月的學習才能開始寫業務邏輯。在 Orbital Express 中，幾個小時就能理解整個結構：feature 資料夾、action 檔案、route 檔案、model 檔案。就這樣。第一天就能交付。

具體問題：

- **TypeScript 的代價是真實存在的。** TypeScript 是學習投資、工具鏈的增加，以及招募的篩選門檻。它排除了尚未學會它的 junior 工程師。它的型別層次結構和產生的輸出讓 AI 工具感到困惑。Orbital Express 使用純 JavaScript——最多工程師已經熟悉到足以高效產出的語言。
- **NestJS 鼓勵過度抽象。** module/provider/injectable 系統在理論上很優雅，但實踐中卻容易疊加出多層間接性，讓程式碼變得難以追蹤。這個 class 注入了什麼？這個 provider 在哪裡定義？Orbital Express 的程式碼是直接的：函式就在那個檔案裡。沒有注入需要追蹤。
- **它本質上是 TypeScript 的展示舞台。** NestJS 是 TypeScript Node.js 生態系的集大成者。對於熱愛 TypeScript 並想充分運用其特性的工程師來說，它非常出色。對於需要廣泛招募並快速交付的團隊來說，代價高昂。

**NestJS 是正確選擇的情況：** 你的團隊全是資深 TypeScript 工程師，來自 Spring/Angular 背景，且偏好那種架構風格。

**Orbital Express 勝出的情況：** 你想廣泛招募、快速上手，並讓 junior（或 AI）從第一天起就能貢獻正確的程式碼。

---

## vs Next.js

Next.js 是一個很棒的 framework。它也是一個**前端 framework，API 能力是後來補上的**，混淆這兩者讓許多 startup 付出了不小的代價。

Next.js 的 API routes 設計用途只有一個：靠近前端的小型、serverless 風格端點——取得一些資料、代理第三方 API、處理表單提交。它們不是被設計來作為你整個 backend API 的。

當你試圖把 Next.js 當作正式 backend 使用時，問題如下：

- **沒有背景工作系統。** Next.js 沒有 job queue 的概念。每個操作都必須在 API route 的請求生命週期內完成——如果太慢，Vercel 就會終止它。你最終會補上第三方 queue 服務、獨立運行它，然後把所有東西串接在一起。
- **沒有資料庫層或 ORM。** Next.js 不對你的資料層做任何選擇。你加上 Prisma、或 Drizzle、或原始查詢——然後你得自己做所有 framework 本應替你做的決定。
- **沒有 auth 系統。** NextAuth.js 存在，但它是一個獨立的函式庫，有自己的學習曲線。Access token、refresh token、per-client 隔離——這些 Next.js 都不附帶。
- **Serverless 的限制是真實的限制。** Vercel 的部署模型很方便，直到你需要持久連線、長時間運行的操作，或 WebSockets。即時功能需要獨立的基礎設施。Orbital Express 的設計是用於長時間運行的伺服器，能夠保持 WebSocket 連線、持續處理 queue，並處理複雜的 session 狀態。
- **你與 Vercel 緊密綁定。** Next.js 由 Vercel 打造，並為 Vercel 優化。自行部署 Next.js 雖然可行，但並非輕鬆的路徑。Orbital Express 部署到 Heroku、Render、Railway，或任何 Node.js 主機都同樣順暢。
- **它混合了前端與後端關注點。** 同一個 repo、同一批工程師、同一個部署週期，同時處理你的 React 元件和你的 API。對於一個小團隊交付單一產品來說，這可能感覺很方便。對於任何前後端由不同人負責的團隊，或希望從一個 API 服務多個前端的團隊，這會造成難以解開的耦合。

**Next.js 是正確選擇的情況：** 你在建構一個以前端為主、只需要幾個簡單 API 端點的產品。你部署到 Vercel。你的 API 需求很輕量。

**Orbital Express 勝出的情況：** 你在建構真正的 backend API——帶有 auth、queue、即時功能、複雜業務邏輯、多個 client。Next.js 並不是為了解決這個問題而生的。Orbital Express 是。

---

## vs Laravel

Laravel 是這份清單中最被低估的 framework，也是與 Orbital Express 哲學最接近的兄弟。它強意見、以 generator 為核心、功能齊備，且以商業成果為考量而打造。Artisan 指令、Eloquent ORM、queue、broadcasting、第一方 auth——Laravel 為 PHP 提供了 Orbital Express 所提供的一切。

問題在於 PHP。

PHP 的招募需求已持續下滑超過十年。PHP 開發者的供給來源——bootcamp、資工系、自學者——只是 JavaScript 供給的一小部分。資深 PHP 工程師更難找到，junior 開發者入職時不太可能已經懂 PHP。Laravel 是一個優秀的 framework，但因為語言的緣故，正在打一場逆水行舟的仗。

對大多數團隊來說，還有「兩種語言」的問題。你的前端幾乎肯定是 JavaScript。如果你的 backend 是 PHP，你就有工程師無法跨領域協作。在 JavaScript 中，一位前端開發者可以閱讀、偶爾貢獻後端程式碼。知識可以流通。程式碼庫是同一種語言。

**Laravel 是正確選擇的情況：** 你的團隊深度熟悉 PHP，你的系統建立在 PHP 上，且你沒有重建的計畫。Laravel 確實非常出色。

**Orbital Express 勝出的情況：** 你正在從零開始或重新建構。與 Laravel 相同的以商業為優先的哲學，但用的是人才庫最大的語言。

---

## vs Fastify

Fastify 很快——可量測、可跑分的快。它比 Express 有更低的開銷，在高請求量下有更好的效能。它有 plugin 系統、透過 JSON Schema 做 schema 驗證，以及良好的 TypeScript 支援。

它對結構、auth、jobs、sockets 或任何其他事情沒有任何意見。

Fastify 是一個 runtime 選擇，而不是 framework 選擇。它是 Express 注重速度的弟弟。如果你在建構一個需要每秒處理 100,000 個請求且只做這一件事的 microservice，Fastify 值得評估。

如果你在建構產品 API，你仍然得自己做每一個架構決策——和原生 Express 一樣的問題，只是跑在更快的 runtime 上。

**Fastify 是正確選擇的情況：** 你在針對一個特定的小型服務極致優化原始吞吐量，並且你的團隊有足夠的架構經驗自行建立慣例。

**Orbital Express 勝出的情況：** 你需要的是一個完整的 framework，而不是一個快速的 router。Express 和 Fastify 在 startup 規模下的效能差異，你的使用者根本感受不到。

---

## vs Hono、Koa、Hapi，以及其他所有框架

這些是 microframework 或小眾 framework，社群規模較小，且有相同的根本問題：它們只給你一個 runtime，其他什麼都不給。你自己做每一個決定。你的團隊做的決定和上一個團隊不一樣。沒有人能看懂彼此的程式碼。你又回到了在他們的框架上建構自己框架的處境。

Hono 值得關注——它在 edge 上運行，設計上確實很出色。但它回答的不是 Orbital Express 所回答的那個問題。

---

## 沒有人能給你的

逐一檢視所有替代方案之後，以下是只有 Orbital Express 提供、其他 framework 都沒有的東西：

**1. Feature-folder 架構。** 所有其他 framework 都按類型組織：所有 model 放在一起、所有 controller 放在一起、所有 route 放在一起。Orbital Express 按功能組織：所有訂單相關的東西在一個資料夾，所有使用者相關的東西在一個資料夾。在規模擴大後，這是找到一個 bug 需要 5 秒還是 5 分鐘的差別。

**2. 一套完整、可直接交付的 stack。** Auth、queue、sockets、i18n、generator、結構化測試——全部內建、全部有強意見、全部預先整合完畢。所有其他 framework 都需要你自己從獨立的函式庫中組裝這些，然後整合它們，然後記錄你如何整合，然後教每一位新工程師你的整合方式。

**3. 19 個 AI skill playbooks。** 沒有其他 framework 附帶了 AI 可以遵循、端到端建構正確功能的逐步 playbook。這不是一個會被加到 Rails 或 NestJS 上的功能——它需要 framework 本身從一開始就為 AI 設計，有足夠的一致性，讓 AI 生成的程式碼符合慣例。

**4. 一個 MCP server。** `orbital-express-mcp` 套件讓 Claude Code 完整掌握這個 framework 的知識——慣例、skill、文件——無需任何設定。這讓 Claude 從一個通用的程式碼助理，變成一個熟悉你整個 framework 的開發者。

**5. 以商業為優先的決策制定。** 所有其他 framework 都是由工程師為了解決工程問題而建構的。Orbital Express 是在觀察了十年糟糕的技術決策如何變成昂貴的商業問題之後才打造的。這些意見不是關於什麼在技術上更優雅——而是關於什麼能在多年間降低整個團隊的總持有成本。

---

::: tip 誠實的總結
如果你的團隊已深耕 Rails，就繼續用 Rails。如果你的團隊已深耕 NestJS，就繼續用 NestJS。Framework 遷移代價高昂，採用 Orbital Express 的正確時機是在你從零開始或重新建構的時候。

如果你正在從頭起步、用 JavaScript 建構產品 API，並希望從最廣泛的人才庫中招募、同時從第一天就能交付——沒有比這更好的選擇了。
:::
