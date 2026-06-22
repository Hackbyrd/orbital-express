---
layout: home

hero:
  name: "Orbital Express"
  text: "更快建構正式環境 API。現在搭配 AI。"
  tagline: "告訴 Claude 你需要什麼功能。它讀取操作手冊、執行產生器、撰寫測試，並以正確的方式產生程式碼——完全遵循你的架構，每次都是。"
  image:
    src: /logo.svg
    alt: Orbital Express
  actions:
    - theme: brand
      text: 快速開始
      link: /zh-TW/guide/introduction
    - theme: alt
      text: 在 GitHub 上查看
      link: https://github.com/Hackbyrd/orbital-express

features:
  - icon: 🤖
    title: 用 AI 完整交付功能
    details: 告訴 Claude 你要什麼。它讀取 skill 操作手冊、執行 yarn gen、填入邏輯、撰寫測試——所有內容都遵循你的慣例。不是隨意猜測，而是你的架構。
  - icon: 📁
    title: 功能資料夾架構
    details: 一個功能的所有程式碼都在同一個資料夾。不需要在 controllers/、models/、routes/ 之間來回跳轉。即使擴展到數百個功能也不會陷入混亂。
  - icon: ⚡
    title: Generator 優先
    details: 永遠不要手動建立檔案。yarn gen Order 幾秒內就能 scaffold 完整的功能結構——model、routes、controller、actions、tests。
  - icon: 🔐
    title: 內建 Auth
    details: 雙 token JWT auth（access + refresh），支援每個 client 的 audience 隔離。User 和 Admin 入口開箱即用。
  - icon: 🔄
    title: 背景任務
    details: Bull/Redis queue 內建於 framework。Actions 將工作加入佇列，tasks 負責處理。獨立的 worker process，已包含重試邏輯。
  - icon: 📡
    title: 即時就緒
    details: Socket.IO 整合於 framework 層級。commit 後立即 emit。基於 room 的廣播。可測試的 socket actions。
---
