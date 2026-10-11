# 海岸侵蝕實驗室｜Coastal Erosion Lab

繁體中文（香港）的 Three.js 互動地理教學工具：探索九個地貌、觀看分章解說，再以挑戰模式辨認地貌。

[開啟網站](https://caritasfsc-anthony.github.io/coastal-erosion-sim/)

## 課堂使用

1. 選擇地貌專題；手機和平板可使用上方選單。
2. 拖動演變階段或播放，觀察地貌家族的變化。
3. 比較來浪方向，切換潮汐觀察平台與沙洲。
4. 使用「模型與資料來源」閱讀適用範圍。

拖曳旋轉、滾輪或雙指縮放。地貌選項可用鍵盤 Tab、Enter 操作。空白鍵播放，左右方向鍵調整演變階段（控制元件聚焦時保留原生鍵盤操作）。

## 模型的適用範圍

- 虛構海岸概念模型，並非實際島嶼、測量或 GIS 地形。
- 百分比為教學進度，不代表固定年期、侵蝕速率或預測。
- 海崖與平台、洞拱柱、沉積地貌為不同過程，可同時發生；並非九個地貌的一條必然序列。
- 來浪方向切換比較不同長期情境，不模擬泥沙瞬間搬移。沒有求解波浪折射／繞射、泥沙收支或搬運速率。
- 波浪強度只影響水面、浪花及濕潤效果；潮汐只控制水位。
- 連島沙洲需要適合水深、波浪及泥沙供應，不是任何兩島都必然相連。
- 南岸凹地使用高度場近似，未建立真實懸垂崖壁的力學模型。
- 小地圖是地貌位置示意，不是精確岸線或潮汐淹浸圖。

## 本機開發與驗證

需要 Node.js 22.18+ 及支援 WebGL2 的瀏覽器。

```sh
npm ci
npm test
npm run build
npm run dev
```

模型回歸檢查涵蓋來浪方位、九個專題建議階段、柱／殘柱互斥、原岬角內的固定殘柱位置、專題隔離，以及多個階段的有效網格。`.model-check/` 是檢查產生的暫存檔，已忽略。

文字內容在 `src/landforms.ts` 與 `src/story.ts`。正式建置使用 `/coastal-erosion-sim/` 路徑，推送 main 後由原有 GitHub Pages workflow 部署。

## 教學參考

- [BGS：侵蝕](https://www.bgs.ac.uk/discovering-geology/geological-processes/erosion/)
- [BGS：沉積](https://www.bgs.ac.uk/discovering-geology/geological-processes/deposition/)
- [NOAA：沿岸流與泥沙搬運](https://oceanservice.noaa.gov/education/tutorial_currents/03coastal2.html)
- [NOAA：Coastal Impressions，連島沙洲](https://repository.library.noaa.gov/view/noaa/17386/noaa_17386_DS1.pdf)
