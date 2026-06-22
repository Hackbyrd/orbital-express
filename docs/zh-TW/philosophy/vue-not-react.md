# 為什麼選 Vue.js，不選 React

Orbital Express 不規定前端 framework——你可以用任何你想用的。但如果你問我們的推薦，答案是 **Vue.js**。這頁說明原因。

::: tip TL;DR
Vue.js 有主見、一致，且學習曲線低。React 沒有主見、碎片化，需要好幾個月才能真正掌握。驅動 Orbital Express 的同一套哲學——速度至上、用主見消除爭論、讓團隊能動起來而不是一直在吵——直接適用於你的前端選擇。
:::

---

## 當前的格局

前端 framework 裡有四個值得了解的主要選手：React、Vue.js、Angular 和 Svelte。React 使用最廣泛。Vue.js 第二。Angular 第三，且在走下坡。Svelte 以遙遠的第四名排著，技術方案有趣但生態系小。

這不是個難以判斷的選擇。我們推薦 Vue.js。React 對於 Orbital Express 設計服務的那類團隊和產品，並不是個好選擇。

---

## React 的問題：沒有主見意味著每個人都有主見

React 不是一個 framework。它是一個 UI 函式庫。它給你 component 和一個渲染模型，然後把其他所有事情——routing、狀態管理、data fetching、form 處理、樣式、資料夾結構、測試規範——都留給你的團隊去解決。

這聽起來像自由。它不是自由。它是一個永久的架構決定，每次你招到新人時都會重新打開。

以下是你招 React 工程師時實際會發生的事：他們全都有自己的主見。不一定是壞主見——但都不一樣。從用 Redux 的新創公司來的工程師，認為你應該用 Redux。從用 Zustand 的公司來的，認為 Redux 是過時的東西。剛從 bootcamp 出來的還在學 hook。有 5 年經驗的對於你應該用 React Query、SWR 還是自己做，有強烈的看法。沒有人是錯的。他們只是全都意見相左。

你最終會花好幾個小時在與你的產品毫無關係的架構會議上。你最終得到一個不同區塊遵循不同規範的程式碼庫，因為不同工程師在不同時間建造了它們。你最終在 pull request 裡爭論狀態管理哲學，而不是功能是否正確。

**React 的招聘人才庫很大。但一大群各行其是的工程師，在功能上等同於一個小人才庫。** 你從那個人才庫得到的不是槓桿——而是雜訊。

---

## Vue 的不同：規範隨 framework 一起出貨

Vue 有主見。有一套做事的 Vue 方式。當你招一位 Vue 工程師，他們知道那套方式是什麼。他們可能有偏好，但 framework 本身在第一個 PR 開出來之前就已經解決了大部分爭論。

- Routing：Vue Router。就這個。
- 狀態管理：Pinia（以及在它之前的 Vuex）。就這個。
- Build 工具：Vite。就這個。
- 樣式模式：Single File Component 中的 scoped style。這是規範。
- Data fetching：VueUse composable 或 Pinia action。一致、有文件、人人皆知。

當兩位來自不同公司的 Vue 工程師加入，他們能認出彼此的程式碼。模式很熟悉。資料夾結構看起來差不多。心智模型是共享的。入職是幾天的事，不是幾週。

這不是偶然。這是刻意設計的。Vue 團隊建立的是一個生態系，不只是一個函式庫。他們理解團隊需要的不是最大的彈性——而是最大的清晰度。

---

## 學習曲線的差距

React 的學習曲線有著欺騙性的陡峭。初學者一個週末的教學就能寫 React。但要寫*好的* React——理解何時該用 `useEffect`、避免 stale closure、知道 `useMemo`/`useCallback` 什麼時候有幫助或有害、對渲染模型有足夠深的理解以避免製造效能 bug——需要好幾個月。也許更長。

結果是一個 framework，入門門檻低、上限高，而兩者之間的距離是個陷阱。開發者早期感覺有生產力，交付看起來沒問題的程式碼，然後製造出只有在後來才會顯現的細微問題。修復那些問題，需要團隊裡大多數工程師都沒有的深厚 React 知識。

Vue 的學習曲線真的更平緩、更一致。Options API 對任何懂 JavaScript 的人都很好上手。Composition API 對想要更多能力的工程師來說很強大。響應式的心智模型在文件中有說明，而且它的行為方式和文件說的一樣。edge case 更少、坑更少、「等等，為什麼這個重新渲染了？」的時刻更少。

新工程師更快達到生產力。資深工程師不用花時間救初學者的錯誤。整個團隊可以專注在產品上。

---

## 生態系問題：React 對第三方的依賴

React 的核心團隊維護 React。僅此而已。其他所有東西——router、狀態函式庫、data fetching 層、form 函式庫、動畫函式庫——都由第三方建造和維護。

第三方有不同的發布時程、不同程度的資金、對 breaking change 有不同的看法，有時候就是停止維護了。當你建一個 React app 並選擇你的技術棧——React + React Router + Redux Toolkit + React Query + React Hook Form + 一個 component library——你組合了六個以上彼此不協調的專案所構成的依賴圖。當 React 發布主要版本，這些依賴中有些會落後。當一個熱門函式庫被放棄，你繼承了問題。

這不是理論上的風險。它已經反覆發生過。兩年前被推薦的函式庫，現在沒人維護了。React 自己的文件，對於像 data fetching 這樣的基本模式，已經循環過好幾個不同的推薦方式。

Vue 的核心團隊維護 Vue Router、Pinia、Vite（與更廣泛的 Vite 團隊共同開發）、VueUse 和官方測試工具。這些專案一起前進。Vue 發布，生態系跟著更新。你不是在依賴志願者和新創公司來維持你的 production 技術棧運作。

---

## 「沒有大公司背書」的論據

React 是在 Facebook 創建的。Angular 是在 Google 創建的。兩者背後都有兆元級公司的全力推動：內部強制規定、研討會贊助、工程部落格文章、明確要求這些技術的職缺。他們的主導地位，部分原因是他們擁有龐大的機構行銷預算和內部工程師的現成用戶群。

Vue 是由 Evan You 創建的——一個人，在離開 Google 後獨立工作。沒有公司支持。沒有機構發行。沒有企業職缺欄位要求。

Vue 是地球上第二受歡迎的前端 framework。它靠的是實力到達那裡。

當某個東西在沒有大公司背後的情況下達到那種採用程度，意味著使用它的工程師選擇了它、推薦了它、並繼續使用它，因為它對他們來說真的更好。不是因為他們的雇主規定。不是因為它是安全的企業選擇。而是因為它有效。

這個訊號值得認真對待。

---

## 效能：不是差異化因素，但 Vue 也不差

React 很快。Vue 也很快。兩者都使用 virtual DOM，都有優化過的渲染 pipeline。你不會因為選了哪個而建出或建不出一個高效能的產品。效能不是這裡的論據。

如果說有什麼的話，Vue 3 建立在 ES Proxy 上的響應式系統，比 React 的 hook dependency array 模型有更少的額外開銷。Vue 的 compiler 能靜態分析 template 並以 React 的 JSX 模型做不到的方式優化渲染。Vue Single File Component 中的 `<script setup>` 比對等的 React component 產出更精簡的編譯輸出。

但再說一次：這不是主要論據。論據是開發者速度、團隊一致性和招聘槓桿。在這三點上，Vue 勝出。

---

## Single File Component 是個好主意

Vue 的 `.vue` 檔案格式——HTML template、script 和 scoped style 在同一個檔案——在沒用過的人中頗具爭議，一旦用過就覺得理所當然。

當你在處理一個 component，它做的所有事情都在同一個檔案裡。你不需要在 `MyComponent.jsx`、`MyComponent.module.css`、`useMyComponent.ts` 和 `MyComponent.test.ts` 之間切換 context。template 描述結構，script 描述行為，style 有 scope 所以不會洩漏。可讀、自包含，而且在每個 Vue 程式碼庫裡都一致。

React 的 JSX 與 JavaScript 混合的方式，對那些以 JavaScript 為優先思考的人有其優雅之處。但它也產生了難以快速瀏覽的混合關注點 component，而 CSS-in-JS 解決方案（種類繁多，各不相同）是 Vue 開發者根本不需要有的一整類爭論。

---

## 我們的推薦

用 Orbital Express 建你的 backend。用 Vue.js 建你的 frontend。

這不是因為 React 是壞的技術。而是因為讓 Orbital Express 成為正確 framework 選擇的同一套原則——高度主見、低學習曲線、快速入職、一致模式、團隊速度優於個人聰明——讓 Vue.js 成為正確的前端選擇。

最好的工程團隊，不是那些最聰明的個人各自為政的團隊。而是每個工程師都能在第一天就讀懂其他工程師的程式碼，並確切知道發生了什麼事的團隊。Vue 給你這個。React，在結構上，做不到。

---

*想用 React？你可以。Orbital Express 不在意你的前端做什麼。但如果你問我們會用什麼建——是 Vue。*
