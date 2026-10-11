# 海岸地貌教室

繁體中文（香港）互動教學工具。五個獨立單元涵蓋海崖、浪蝕平台、海蝕洞、拱、柱、殘柱、海蝕隙、海灘與連島沙洲。

[開啟網站](https://caritasfsc-anthony.github.io/coastal-erosion-sim/)

## 課堂使用

選擇單元，再用步驟按鈕、上一／下一步或自動逐步播放。每一步配有形成過程、觀察指引、原因與模型取捨。課堂提問提供即時解釋。

立體、正面剖視、俯視可互換；拖曳旋轉、滾輪／雙指縮放。關閉海水可看水下地形，原有輪廓可比較侵蝕前後。鍵盤 Tab 操作控制項；非控制項聚焦時左右方向鍵換步。

## 模型原則

- 岩體是有厚度的剖切幾何，海蝕凹地可懸垂。崖頂不升高，侵蝕步驟只減少岩體。
- 洞穴有盡頭，拱是貫通開口。海蝕柱與殘柱保持原位，是原有岩岬的殘餘。
- 海灘有固定基底及鬆散沙剖面。風暴與較平靜情境重新分配岸上／近岸沙量；固定沿岸寬度下剖面面積守恆。
- 沿岸漂移單獨展示路徑，不改變封閉剖面沙量。連島沙洲另假設外部持續供沙，與海灘封閉系統不同。
- 五個情境獨立，不是所有海岸的必然地質序列。步驟無實際年期或相等時間意義。
- 波線、箭頭、固定水位與規則岩體為解說用途；不求解水流、岩體力學、潮汐或侵蝕速率。比例無量綱，不能作預測。

## 開發

Node.js 22.18+，WebGL2 瀏覽器。

```sh
npm ci
npm test
npm run build
npm run dev
```

入口為 `src/classroom.ts`，教學資料及純模型為 `src/lessons.ts`，實體幾何為 `src/classroom-scene.ts`，樣式為 `src/classroom.css`。先前島嶼模擬檔案保留作歷史參考，已不由入口載入。

`npm test` 驗證崖體積單調減少、崖頂高度固定、海灘沙剖面面積守恆、風暴搬沙方向、水下沙壩水位與教學資料完整性。正式推送 main 後由 GitHub Pages workflow 部署。

## 參考

- [BGS：崖腳侵蝕及海岸滑坡](https://www.bgs.ac.uk/geology-projects/landslides/aldbrough-observatory/)
- [BGS：海岸變化與崩塌](https://www.bgs.ac.uk/news/six-changing-coastlines-and-how-climate-change-could-affect-them/)
- [NOAA：沿岸流及泥沙搬運](https://oceanservice.noaa.gov/education/tutorial_currents/03coastal2.html)
- [NOAA：Coastal Impressions，連島沙洲](https://repository.library.noaa.gov/view/noaa/17386/noaa_17386_DS1.pdf)

## 海水與材質

起伏水面採多組方向及頻率的視覺波浪，配合深淺色、反光、岸邊白沫與飛濺。岩石有程序層理、粗糙表面及潮間帶濕潤色差，光照使用柔和陰影。可單獨暫停海浪而繼續切換教學步驟。

水面只按教學幾何判斷遮擋與岸線，沒有流體、繞射或破波求解；不影響岩體及沙量。海浪視覺不能用來推斷侵蝕速率。水面程式為 `src/classroom-water.ts`。
