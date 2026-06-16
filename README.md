# Food Slots
今晚吃什麼？

Food Slots 是一個手機優先的附近餐廳探索頁面，會依據目前位置抓取附近店家，分析料理類型，抽出三個今晚可選的料理方向，並提供收藏功能。

## 功能

- Geolocation 定位
- Google Places API Nearby Search
- Overpass API 備援
- 料理類型分析
- Food Slots 推薦 UI
- 店家清單顯示
- Google Maps 開啟
- localStorage 收藏功能

## 使用技術

- HTML
- CSS
- JavaScript
- Canvas-free UI
- Geolocation API
- Google Places API (New)
- Overpass API
- localStorage

## 在 localhost 執行

建議使用 VS Code Live Server 開啟 `index.html`。

也可以用任何本機靜態伺服器：

- `npx serve`
- `python -m http.server`
- Live Server extension

## 設定 Google Places API Key

請打開 [app.js](./app.js)，把這一行：

```js
const GOOGLE_API_KEY = "YOUR_API_KEY_HERE";
```

替換成你自己的 Google Places API Key。

注意：

- Key 不要提交到公開 repo
- 建議在 Google Cloud Console 設定限制
- 需要啟用 Places API
- 需要設定 Billing

## 部署到 GitHub Pages

1. 將專案推到 GitHub repository
2. 到 GitHub repo 的 Settings
3. 開啟 Pages
4. Source 選擇 `Deploy from a branch`
5. Branch 選擇 `main` 或 `master`
6. Folder 選擇 `/root`
7. 儲存後等待 GitHub Pages 建置完成

部署後可以直接用 GitHub Pages 網址開啟。

## 注意

- 定位功能需要 HTTPS 或 localhost 才能正常使用
- 如果用 `file://` 直接開啟，Geolocation 通常無法正常運作
- Google Places API 建議使用正式 key 與適當限制，不要把真 key 寫死在公開倉庫
