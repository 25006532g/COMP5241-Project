# COMP5241 Forge Learning Studio — 面試題庫使用說明

本資源為 **Jordan Wong / COMP5241 Forge Learning Studio** 模擬面試功能預備的題庫，方便後續分組、標籤與匯入應用程式。

## 檔案清單

| 檔案 | 說明 |
|------|------|
| `COMP5241-Interview-Question-Bank.xlsx` | 完整 Excel（含 `All`、六個 track 分頁、`Topics`、`Sources`） |
| `COMP5241-Interview-Question-Bank.csv` | `All` 分頁的 UTF-8 CSV 匯出 |
| `COMP5241-Interview-Question-Bank-README.md` | 本說明（繁體中文） |
| `import/*.json` | 六個 interviews-v2 Import JSON（每軌 40 題，見下方） |
| `import/interview-v2-main.sql` | 給 main 的 Supabase SQL editor：先建 interview v2 資料表，再載入 240 題 |
| `import/interview-v2-questions.sql` | 只有 240 題。資料表尚未建立時會失敗 |

## 貼上 Import JSON（interviews-v2 題庫）

`import/` 裡的 JSON 是給 **Interview simulator v2** 用的匯入素材，對齊 `src/lib/interviews-v2.ts` 的 `importFileSchema`。它們留在倉庫裡，供講師或管理員貼進 Bank UI；這不是已經寫進資料庫的題目。

每個檔案只含一個 profile、剛好 40 題。`key` 在檔內唯一（例如 `ug-01`），`relatedKeys` 只指向同一檔裡的 key。

| 檔案 | 檔內 `profile` | 鍵名 |
|------|----------------|------|
| `import/cs_degree.json` | `cs_degree` | `ug-01` … `ug-40` |
| `import/cs_master.json` | `cs_master` | `ms-01` … `ms-40` |
| `import/software_engineer.json` | `software_engineer` | `se-01` … `se-40` |
| `import/frontend_engineer.json` | `frontend_engineer` | `fe-01` … `fe-40` |
| `import/backend_engineer.json` | `backend_engineer` | `be-01` … `be-40` |
| `import/data_analyst.json` | `data_analyst` | `da-01` … `da-40` |

一次只貼一個 profile：

1. 以 **instructor** 或 **administrator** 登入。學員沒有編輯題庫的權限。
2. 打開 Question bank：`/interviews-v2/bank`（側欄 **Question bank**）。
3. 打開上表其中一個 JSON，全選並複製整份內容。
4. 貼進頁面上的 **Import JSON** 文字框（Question bank JSON）。
5. 按 **Import JSON**。寫入哪一軌以檔案裡的 `profile` 為準，不是畫面上的 Profile 下拉。成功後狀態列是 “Saved.”；說明文字是 “Import adds questions for the profile named in the file.”
6. 該 profile 的 **目前 active 題數 + 這次新題數必須 ≤ 40**。每個檔案已是 40 題，所以該軌要先是 0 題 active，才能整份貼上。超過時畫面顯示 “A profile can have at most 40 active questions.”
7. 六個 profile 各貼一次。不要把兩份 JSON 接在同一個文字框。

CSV 與 Excel 仍是題幹與來源的原稿。關鍵字與 related 題在 Import JSON 和 `import/interview-v2-questions.sql`。

## SQL for main（給 Ken）

在 main 的 Supabase SQL editor 貼上並執行 **`import/interview-v2-main.sql`** 一次。這一份會先建立 interview v2 資料表，再載入 240 題。題幹、參考答案、關鍵字和 related 題與上面六份 JSON 一致。檔案不含使用者、作答、評分或 API key。

保留 main 現有的 Supabase URL、anon key、service-role key 和 `OPENROUTER_API_KEY`。如果 `forge_v2_questions` 已經存在，這份 SQL 會停下來，不會覆蓋。

`interview-v2-questions.sql` 只有題目。資料表還沒建立時會出現 `Apply the interview v2 migrations before this import.` 請改跑 `interview-v2-main.sql`。

## 題庫規模

- **6** 條面試軌道（Entrance ×2 + Job ×4）
- 每軌 **40** 題 → 合計 **240** 題（應為 240）
- 每題欄位：`track`, `q_id`, `major_topic`, `question`, `suggested_answer`, `source_title`, `source_url`, `source_note`

## 六條軌道（名稱請保持一致）

1. Computer science degree (undergraduate) student — university CS bachelor admissions / programme interview（`UG-01`…`UG-40`）
2. Computer science master student — CS master's admissions interview（`MS-01`…`MS-40`）
3. Software engineer (general)（`SE-01`…`SE-40`）
4. Frontend engineer（`FE-01`…`FE-40`）
5. Backend engineer（`BE-01`…`BE-40`）
6. Data analyst（`DA-01`…`DA-40`）

## 如何用於標籤／分組（Labeling / Grouping）

1. **先用 `major_topic` 做粗分組**：同一 track 內的 `major_topic` 已採受控詞彙（controlled vocabulary），可直接映射成 App 的 topic tag。
2. **再用 `Topics` 分頁核對覆蓋**：確認每軌主題數量是否均衡；若某主題過少，可在匯入前微調標籤或補題。
3. **建議額外標籤維度（可於 App 層新增，不必改題幹）**：
   - `difficulty`：intro / intermediate / advanced
   - `format`：behavioural_STAR / conceptual / technical_deep_dive / design
   - `locale`：HK_admissions / global_tech（入學題偏港／國際大學公開指引；求職題偏國際科技職缺常見題）
4. **匯入建議**：以 `q_id` 作為穩定主鍵；`track` + `major_topic` 作為篩選器；`source_url` 可做成「延伸閱讀」連結。
5. **模型答案用途**：`suggested_answer` 供學習者對照結構（行為題用 STAR），不是唯一標準答案；評分時應允許等價表述。

## 主題圖例（Topic Legend）

### Computer science degree (undergraduate) student — university CS bachelor admissions / programme interview
- **Academic Preparation**：5 題
- **Behavioural / STAR**：5 題
- **CS Fundamentals**：7 題
- **Ethics & Academic Integrity**：4 題
- **Extracurriculars & Projects**：4 題
- **Motivation & Fit**：7 題
- **Problem-Solving**：5 題
- **Teamwork & Communication**：3 題

### Computer science master student — CS master's admissions interview
- **Academic Preparation**：5 題
- **Algorithms & Complexity**：6 題
- **Behavioural / STAR**：5 題
- **Career Goals**：3 題
- **Ethics & Academic Integrity**：3 題
- **Motivation & Fit**：5 題
- **Research / Thesis**：7 題
- **Systems / Architecture**：6 題

### Software engineer (general)
- **Algorithms & Complexity**：7 題
- **Behavioural / STAR**：7 題
- **Collaboration & Leadership**：3 題
- **Data Structures**：4 題
- **Motivation & Fit**：4 題
- **Software Engineering Practices**：5 題
- **Systems / Architecture**：6 題
- **Testing & Debugging**：4 題

### Frontend engineer
- **Behavioural / STAR**：4 題
- **CSS & Layout**：4 題
- **Frontend Tech**：8 題
- **JavaScript Fundamentals**：11 題
- **Motivation & Fit**：2 題
- **Performance & Accessibility**：4 題
- **Testing & Tooling**：3 題
- **Web Architecture**：4 題

### Backend engineer
- **Algorithms & Complexity**：3 題
- **Backend Tech**：6 題
- **Behavioural / STAR**：4 題
- **Databases & Storage**：8 題
- **Motivation & Fit**：3 題
- **Reliability & Scalability**：5 題
- **Security**：4 題
- **Systems / Architecture**：7 題

### Data analyst
- **Behavioural / STAR**：4 題
- **Business Sense**：4 題
- **Data Cleaning & Process**：4 題
- **Motivation & Fit**：4 題
- **SQL & Data**：8 題
- **Statistics & Experimentation**：8 題
- **Tools & Programming**：4 題
- **Visualization & Communication**：4 題


## 來源與引用原則

- 優先引用可公開查核的大學招生／職涯頁、Google／Amazon／AWS 面試建議、Interview Cake、freeCodeCamp、Coursera 等。
- `source_note` 說明該來源如何支撐該題（例如「常見行為題」「招生 FAQ 主題」）。
- 若一題綜合多個常見指引，會在 `source_note` 註明，並提供實際查核過的 URL；**請勿把題庫誤認為任何一間機構的官方考題清單**。

## 重要聲明（Caveats）

- **僅供練習**：真實面試題因學校、公司、年份與面試官而異；本庫反映公開常見題型與主題，**不保證**出現在實際面試。
- **非錄取／錄用保證**：熟練題庫無法取代真實專案、成績、研究或工程產出。
- **學術誠信**：入學軌道含學術誠信／生成式 AI 使用界線題，練習時請強調誠實與校規優先。
- **版權**：模型答案為改寫與綱要，避免大段抄錄版權內容；引用來源請保留 URL 以便查證。
- **技術題深度**：求職軌道技術題著重「可口述的正確框架」；現場白板／ quant 細節仍需另做刷題與系統設計練習。

## Excel 分頁說明

- `All`：全部 240 列
- `UG_CS_Bachelor` / `MS_CS_Master` / `SE_Software_Engineer` / `FE_Frontend` / `BE_Backend` / `DA_Data_Analyst`：分軌道
- `Topics`：track × major_topic 計數
- `Sources`：去重後的來源標題、URL、涵蓋軌道

---
建檔用途：COMP5241 Forge Learning Studio mock-interview feature。
