const GOOGLE_API_KEY = "AIzaSyAlYjXrvlLKC1pclVSDxMbYjfoVoBN1slg";

const GOOGLE_PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

const DEFAULT_SEARCH_RADIUS = 600;
const LUNCH_SEARCH_RADIUS = 800;

let mealModeOverride = null;

function isLunchTime(date = new Date()) {
  const totalMinutes =
    date.getHours() * 60 +
    date.getMinutes();

  return (
    totalMinutes >= 11 * 60 &&
    totalMinutes < 14 * 60 + 30
  );
}

function getEffectiveMealMode(date = new Date()) {
  if (mealModeOverride === 'lunch') {
    return 'lunch';
  }

  if (mealModeOverride === 'default') {
    return 'default';
  }

  return isLunchTime(date)
    ? 'lunch'
    : 'default';
}

let currentMealMode = getEffectiveMealMode();

function getCurrentSearchRadius() {
  return currentMealMode === 'lunch'
    ? LUNCH_SEARCH_RADIUS
    : DEFAULT_SEARCH_RADIUS;
}

const LUNCH_CATEGORY_IDS = [
  'ramen',
  'burger',
  'sushi',
  'taiwanese',
  'japanese',
  'chinese',
  'korean',
  'southeast_asian',
  'western',
  'fast_food',
  'other_restaurant'
];

function getAvailableCategoryDefs() {
  if (currentMealMode !== 'lunch') {
    return FOOD_CATEGORY_DEFS;
  }

  return FOOD_CATEGORY_DEFS.filter((category) =>
    LUNCH_CATEGORY_IDS.includes(category.id)
  );
}

let refreshIntervalId = null;

function refreshMealModeByTime() {
  applyMealMode(getEffectiveMealMode());
}

// 十、依新架構改名與限制
const MAX_CACHED_PLACES_PER_CATEGORY = 60;
const MAX_VISIBLE_PLACES_PER_CATEGORY = 6;

const STORAGE_KEYS = {
  favorites: 'food-slots-favorites'
};

// 1. 宣告 Google Places API (New) Table A 中官方認證之可用於搜尋與分類的餐廳 Primary Types
const GOOGLE_RESTAURANT_PRIMARY_TYPES = new Set([
  'restaurant',
  'american_restaurant',
  'asian_restaurant',
  'barbecue_restaurant',
  'brazilian_restaurant',
  'breakfast_restaurant',
  'brunch_restaurant',
  'buffet_restaurant',
  'chinese_restaurant',
  'fast_food_restaurant',
  'french_restaurant',
  'greek_restaurant',
  'hamburger_restaurant',
  'hot_pot_restaurant',
  'indian_restaurant',
  'indonesian_restaurant',
  'italian_restaurant',
  'japanese_restaurant',
  'korean_restaurant',
  'lebanese_restaurant',
  'mediterranean_restaurant',
  'mexican_restaurant',
  'middle_eastern_restaurant',
  'pizza_restaurant',
  'ramen_restaurant',
  'seafood_restaurant',
  'spanish_restaurant',
  'steak_house',
  'sushi_restaurant',
  'taiwanese_restaurant',
  'thai_restaurant',
  'turkish_restaurant',
  'vegan_restaurant',
  'vegetarian_restaurant',
  'vietnamese_restaurant'
]);

// 2. 料理分類映射 (由 primaryType 直接映射至目標分類)
const PRIMARY_TYPE_TO_CATEGORY = {
  ramen_restaurant: 'ramen',
  hot_pot_restaurant: 'hotpot',
  barbecue_restaurant: 'bbq',
  hamburger_restaurant: 'burger',
  sushi_restaurant: 'sushi',
  taiwanese_restaurant: 'taiwanese',
  chinese_restaurant: 'chinese',
  japanese_restaurant: 'japanese',
  korean_restaurant: 'korean',
  thai_restaurant: 'southeast_asian',
  vietnamese_restaurant: 'southeast_asian',
  indonesian_restaurant: 'southeast_asian',
  italian_restaurant: 'western',
  french_restaurant: 'western',
  american_restaurant: 'western',
  pizza_restaurant: 'western',
  steak_house: 'western',
  fast_food_restaurant: 'fast_food'
};

const FOOD_CATEGORY_DEFS = [
  { id: 'ramen', label: '拉麵', emoji: '🍜' },
  { id: 'hotpot', label: '火鍋', emoji: '🍲' },
  { id: 'bbq', label: '燒肉', emoji: '🍖' },
  { id: 'burger', label: '漢堡', emoji: '🍔' },
  { id: 'sushi', label: '壽司', emoji: '🍣' },
  { id: 'taiwanese', label: '台式料理', emoji: '🥘' },
  { id: 'japanese', label: '日式料理', emoji: '🍱' },
  { id: 'chinese', label: '中式料理', emoji: '🥢' },
  { id: 'korean', label: '韓式料理', emoji: '🇰🇷' },
  { id: 'southeast_asian', label: '東南亞料理', emoji: '🍛' },
  { id: 'western', label: '西式料理', emoji: '🍝' },
  { id: 'fast_food', label: '速食', emoji: '🍟' },
  {
    id: 'other_restaurant',
    label: '其他餐廳',
    emoji: '🍽️',
    keywords: [
      'restaurant',
      '餐廳',
      '料理'
    ]
  }
];

// 三、建立分類搜尋設定 (所有 Type 均符合官方 API 表格)
const CATEGORY_SEARCH_CONFIG = {
  ramen: {
    textQueries: ['拉麵', '日式拉麵', '豚骨拉麵', '麵屋'],
    fallbackKeywords: ['拉麵', 'ramen', 'ラーメン', '麵屋', '豚骨']
  },
  hotpot: {
    textQueries: ['火鍋', '鍋物', '麻辣鍋', '涮涮鍋'],
    fallbackKeywords: ['火鍋', '鍋物', '麻辣鍋', '涮涮鍋', 'hotpot', 'hot pot', 'shabu']
  },
  bbq: {
    textQueries: ['燒肉', '日式燒肉', '烤肉'],
    fallbackKeywords: ['燒肉', '焼肉', 'yakiniku', '烤肉']
  },
  burger: {
    textQueries: ['漢堡', '美式漢堡', '漢堡店'],
    fallbackKeywords: ['漢堡', 'burger', 'hamburger']
  },
  sushi: {
    textQueries: ['壽司', '日本料理壽司', '迴轉壽司'],
    fallbackKeywords: ['壽司', '鮨', 'sushi', '迴轉壽司', '回轉壽司']
  },
  taiwanese: {
    textQueries: ['台式料理', '台灣小吃', '滷肉飯', '熱炒'],
    fallbackKeywords: ['滷肉飯', '魯肉飯', '便當', '熱炒', '排骨飯', '雞肉飯']
  },
  japanese: {
    textQueries: ['日式料理', '日本料理', '定食', '丼飯'],
    fallbackKeywords: ['日式', '定食', '丼飯', '烏龍麵', '天婦羅', '居酒屋', '和食']
  },
  chinese: {
    textQueries: ['中式料理', '中餐廳', '川菜', '粵菜'],
    fallbackKeywords: ['川菜', '粵菜', '小籠包', '點心', '水餃', '麵食', '牛肉麵']
  },
  korean: {
    textQueries: ['韓式料理', '韓國料理', '韓式餐廳'],
    fallbackKeywords: ['韓式', '泡菜', '石鍋', '銅盤', '韓國']
  },
  southeast_asian: {
    textQueries: ['東南亞料理', '泰式料理', '越南料理', '印尼料理'],
    fallbackKeywords: ['泰式', '越式', '印尼', '咖哩', 'curry', '河粉', '打拋']
  },
  western: {
    textQueries: ['西式料理', '義式料理', '美式餐廳', '牛排', '義大利麵'],
    fallbackKeywords: ['義式', '披薩', 'pizza', '義大利麵', '牛排', 'steak', 'pasta', '法式']
  },
  fast_food: {
    textQueries: ['速食', '炸雞', '鹹酥雞', '雞排'],
    fallbackKeywords: ['炸雞', '麥當勞', '肯德基', '摩斯', '鹹酥雞', '鹽酥雞', '雞排']
  },
  other_restaurant: {
    textQueries: ['餐廳', '附近餐廳'],
    fallbackKeywords: []
  }
};

const mockPlaces = [
  { name: '巷口牛肉麵', primaryType: 'restaurant', cuisine: '麵食' },
  { name: '阿姨滷肉飯', primaryType: 'taiwanese_restaurant', cuisine: '飯類' },
  { name: '深夜鹽酥雞', primaryType: 'fast_food_restaurant', cuisine: '炸物' },
  { name: '老店鍋燒意麵', primaryType: 'restaurant', cuisine: '麵食' },
  { name: '小火鍋之家', primaryType: 'hot_pot_restaurant', cuisine: '火鍋' },
  { name: '美式大漢堡', primaryType: 'hamburger_restaurant', cuisine: '漢堡' },
  { name: '日式拉麵屋', primaryType: 'ramen_restaurant', cuisine: '日式' },
  { name: '壽司專賣店', primaryType: 'sushi_restaurant', cuisine: '壽司' }
];

const statusPill = document.getElementById('statusPill');
const statusText = document.getElementById('statusText');
const message = document.getElementById('message');
const locationData = document.getElementById('locationData');
const latitudeEl = document.getElementById('latitude');
const longitudeEl = document.getElementById('longitude');
const accuracyEl = document.getElementById('accuracy');
const placesStatus = document.getElementById('placesStatus');
const analysisSummary = document.getElementById('analysisSummary');
const analysisGrid = document.getElementById('analysisGrid');
const generateBtn = document.getElementById('generateBtn');
const slotEls = [
  document.getElementById('slot1'),
  document.getElementById('slot2'),
  document.getElementById('slot3')
];
const recommendationsList = document.getElementById('recommendationsList');
const activeCategoryEmoji = document.getElementById('activeCategoryEmoji');
const activeCategoryTitle = document.getElementById('activeCategoryTitle');
const activeCategoryMeta = document.getElementById('activeCategoryMeta');
const activePlacesList = document.getElementById('activePlacesList');
const favoritesCount = document.getElementById('favoritesCount');
const favoritesList = document.getElementById('favoritesList');
const debugProtocol = document.getElementById('debugProtocol');
const debugHostname = document.getElementById('debugHostname');
const debugLocalhost = document.getElementById('debugLocalhost');
const debugGeolocationSupport = document.getElementById('debugGeolocationSupport');
const debugLocation = document.getElementById('debugLocation');
const debugApiKey = document.getElementById('debugApiKey');
const debugPlacesResult = document.getElementById('debugPlacesResult');
const debugError = document.getElementById('debugError');
const debugTestBtn = document.getElementById('debugTestBtn');

let currentLocation = null;
let currentPlaces = [];
let foodCategories = createEmptyFoodCategories();
let selectedCategories = [];
let activeCategoryId = '';
let favorites = loadFavorites();
let debugCurrentPosition = null;
let isSpinning = false;

// 七、快取儲存與快取鍵值產生
const categoryPlaceCache = new Map();
let fallbackPlacesPool = null;

function getCategoryCacheKey(categoryId, lat, lng) {
  return [
    categoryId,
    lat.toFixed(3),
    lng.toFixed(3),
    getCurrentSearchRadius()
  ].join('|');
}

// 六、讓每次結果不同 (Fisher-Yates Shuffle)
function randomizePlaces(places) {
  const result = [...places];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createEmptyFoodCategories() {
  return FOOD_CATEGORY_DEFS.map((def) => ({
    ...def,
    places: []
  }));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function updateDebugField(element, value) {
  if (!element) return;
  element.textContent = value;
}

function setDebugError(value) {
  updateDebugField(debugError, value || '-');
}

function setDebugResult(value) {
  updateDebugField(debugPlacesResult, value || '-');
}

function isLocalhostLike(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function getApiKeyStatus() {
  return Boolean(GOOGLE_API_KEY && GOOGLE_API_KEY !== 'YOUR_API_KEY_HERE');
}

function describeHttpError(status, errorPayload) {
  const details = [];
  if (status === 403) {
    details.push('403 / REQUEST_DENIED：可能是 API Key 限制、Places API 沒啟用、Billing 沒設定');
  }
  const errorMessage = `${errorPayload?.error?.message || errorPayload?.message || ''}`.toUpperCase();
  const errorStatus = `${errorPayload?.error?.status || errorPayload?.status || ''}`.toUpperCase();

  if (errorMessage.includes('REFERERNOTALLOWEDMAPERROR') || errorStatus.includes('REFERERNOTALLOWEDMAPERROR')) {
    details.push('RefererNotAllowedMapError：localhost 或目前網域沒有加入 Website restrictions');
  }
  if (errorMessage.includes('API_KEY_INVALID') || errorStatus.includes('API_KEY_INVALID')) {
    details.push('API_KEY_INVALID：API Key 錯誤或已刪除');
  }
  if (errorMessage.includes('REQUEST_DENIED') || errorStatus.includes('REQUEST_DENIED')) {
    details.push('REQUEST_DENIED：API Key 可能被限制，或相關 API 尚未啟用');
  }
  if (errorMessage.includes('ZERO_RESULTS')) {
    details.push('ZERO_RESULTS：附近沒有符合條件的店，或半徑太小');
  }
  if (!details.length && status && status >= 400) {
    details.push(`HTTP 錯誤：${status}`);
  }
  return details.join('；');
}

function explainDebugFetchFailure(error) {
  const messageText = `${error?.message || ''}`;
  if (messageText.includes('Failed to fetch') || messageText.toLowerCase().includes('cors')) {
    return 'CORS / Failed to fetch：可能是瀏覽器前端直接呼叫被阻擋，建議改用後端代理';
  }
  return messageText || '未知錯誤';
}

function setStatus(state, text) {
  statusPill.classList.remove('loading', 'success', 'error');
  statusPill.classList.add(state);
  statusText.textContent = text;
}

function showLocation(position) {
  const { latitude, longitude, accuracy } = position.coords;
  latitudeEl.textContent = latitude.toFixed(6);
  longitudeEl.textContent = longitude.toFixed(6);
  accuracyEl.textContent = `${Math.round(accuracy)} 公尺`;
  locationData.hidden = false;
  message.textContent = '定位成功，已可開始進行拉霸抽選！';
  setStatus('success', '定位成功');
  generateBtn.disabled = false;
}

function showError(error) {
  locationData.hidden = true;
  let reason = '未知錯誤';
  switch (error.code) {
    case error.PERMISSION_DENIED:
      reason = '使用者已拒絕定位權限';
      break;
    case error.POSITION_UNAVAILABLE:
      reason = '目前無法取得定位資訊';
      break;
    case error.TIMEOUT:
      reason = '定位逾時';
      break;
  }
  setStatus('error', '定位失敗');
  message.textContent = `定位失敗：${reason}。仍可進行抽選（將使用預設/Overpass 數據來源）。`;
  currentLocation = { lat: 25.033964, lng: 121.564468 }; // 預設台北 101
  generateBtn.disabled = false;
}

function requestLocation() {
  if (!('geolocation' in navigator)) {
    locationData.hidden = true;
    message.textContent = '定位失敗：此瀏覽器不支援 Geolocation API';
    setStatus('error', '定位失敗');
    currentLocation = { lat: 25.033964, lng: 121.564468 };
    generateBtn.disabled = false;
    return;
  }

  setStatus('loading', '正在取得位置');
  message.textContent = '正在嘗試取得目前位置，請稍候...';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      showLocation(position);
    },
    (error) => showError(error),
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

function setPlacesStatus(text) {
  placesStatus.textContent = text;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  if (typeof lat1 !== 'number' || typeof lng1 !== 'number' || typeof lat2 !== 'number' || typeof lng2 !== 'number') {
    return null;
  }
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 供 Debug 整合測試與通用搜尋使用
function buildGoogleTextSearchRequest(query, lat, lng) {
  return {
    textQuery: query,
    includedType: 'restaurant',
    strictTypeFiltering: true,
    languageCode: 'zh-TW',
    regionCode: 'TW',
    pageSize: 20,
    rankPreference: 'RELEVANCE',
    locationBias: {
      circle: {
        center: {
          latitude: lat,
          longitude: lng
        },
        radius: getCurrentSearchRadius()
      }
    }
  };
}

function buildOverpassQuery(lat, lng) {
  const radius = getCurrentSearchRadius();
  return `[out:json][timeout:25];
(
  node["amenity"~"restaurant|fast_food"](around:${radius},${lat},${lng});
  way["amenity"~"restaurant|fast_food"](around:${radius},${lat},${lng});
  relation["amenity"~"restaurant|fast_food"](around:${radius},${lat},${lng});
);
out center tags;`;
}

// 嚴格餐廳篩選
function isActualRestaurant(place) {
  if (!place) return false;
  if (place.source === 'overpass') {
    const primaryType = String(place.primaryType || '').toLowerCase();
    return primaryType === 'restaurant' || primaryType === 'fast_food';
  }
  const primaryType = String(place.primaryType || '').toLowerCase();
  return GOOGLE_RESTAURANT_PRIMARY_TYPES.has(primaryType);
}

// 料理分類判定
function assignFoodCategory(place) {
  const name = `${place?.name || ''}`.toLowerCase();
  const primaryType = `${place?.primaryType || ''}`.toLowerCase();
  const primaryTypeDisplayName = `${place?.primaryTypeDisplayName || ''}`.toLowerCase();
  const rawTypes = Array.isArray(place?.rawTypes)
    ? place.rawTypes.map((item) => String(item).toLowerCase())
    : [];
  const combined = `${name} ${primaryTypeDisplayName} ${rawTypes.join(' ')}`;

  let categoryId = PRIMARY_TYPE_TO_CATEGORY[primaryType];

  if (!categoryId || categoryId === 'restaurant' || categoryId === 'fast_food') {
    const keywordRules = Object.entries(CATEGORY_SEARCH_CONFIG)
      .filter(([_, conf]) => conf.fallbackKeywords && conf.fallbackKeywords.length > 0)
      .map(([id, conf]) => ({ id, keywords: conf.fallbackKeywords }));

    for (const rule of keywordRules) {
      if (rule.keywords.some((keyword) => combined.includes(keyword.toLowerCase()))) {
        categoryId = rule.id;
        break;
      }
    }
  }

  if (categoryId) {
    if (categoryId === 'thai_restaurant' || categoryId === 'vietnamese_restaurant' || categoryId === 'indonesian_restaurant') {
      categoryId = 'southeast_asian';
    } else if (categoryId === 'italian_restaurant' || categoryId === 'french_restaurant' || categoryId === 'mexican_restaurant' || categoryId === 'pizza_restaurant' || categoryId === 'american_restaurant') {
      categoryId = 'western';
    } else if (categoryId === 'fast_food_restaurant') {
      categoryId = 'fast_food';
    }
  }

  const finalCategoryDef = FOOD_CATEGORY_DEFS.find((cat) => cat.id === categoryId) ||
    FOOD_CATEGORY_DEFS.find((cat) => cat.id === 'other_restaurant');

  return {
    ...place,
    category: finalCategoryDef.id,
    categoryLabel: finalCategoryDef.label,
    categoryEmoji: finalCategoryDef.emoji
  };
}

function normalizeGooglePlace(place, lat, lng) {
  const name = place?.displayName?.text || '';
  const address = place?.formattedAddress || '';
  const rating = typeof place?.rating === 'number' ? place.rating : '無評分';
  const rawTypes = Array.isArray(place?.types) ? place.types : [];
  const primaryType = place?.primaryType || '';
  const primaryTypeDisplayName = place?.primaryTypeDisplayName?.text || place?.primaryTypeDisplayName || '';
  const placeLat = typeof place?.location?.latitude === 'number' ? place.location.latitude : null;
  const placeLng = typeof place?.location?.longitude === 'number' ? place.location.longitude : null;

  if (!name || typeof placeLat !== 'number' || typeof placeLng !== 'number') {
    return null;
  }

  return {
    placeId: place?.id || '',
    name,
    address,
    rating,
    rawTypes,
    primaryType,
    primaryTypeDisplayName,
    lat: placeLat,
    lng: placeLng,
    distance: calculateDistance(lat, lng, placeLat, placeLng),
    googleMapsUrl: place?.googleMapsUri || '',
    source: 'google'
  };
}

function normalizeOverpassElement(element, lat, lng) {
  const tags = element.tags || {};
  const placeLat = typeof element.lat === 'number' ? element.lat : element.center?.lat;
  const placeLng = typeof element.lon === 'number' ? element.lon : element.center?.lon;

  if (!tags.name || typeof placeLat !== 'number' || typeof placeLng !== 'number') {
    return null;
  }

  const primaryType = tags.amenity || 'restaurant';

  return {
    placeId: tags['place_id'] || String(element.id) || '',
    name: tags.name,
    address: tags['addr:full'] || tags['addr:street'] || tags['addr:city'] || '',
    rating: '無評分',
    rawTypes: [primaryType],
    primaryType: primaryType,
    primaryTypeDisplayName: '',
    lat: placeLat,
    lng: placeLng,
    distance: calculateDistance(lat, lng, placeLat, placeLng),
    googleMapsUrl: '',
    source: 'overpass'
  };
}

function normalizeMockPlace(place) {
  const primaryType = place.primaryType || 'restaurant';
  return {
    placeId: '',
    name: place.name,
    address: '',
    rating: '無評分',
    rawTypes: [primaryType],
    primaryType: primaryType,
    primaryTypeDisplayName: place.cuisine || '',
    lat: null,
    lng: null,
    distance: null,
    googleMapsUrl: '',
    source: 'mock'
  };
}

// 建立後端 Fallback 快取池 (Overpass 或 Mock)
async function ensureFallbackPool(lat, lng) {
  if (fallbackPlacesPool !== null) return;
  setPlacesStatus('正在加載 Fallback 店家資料庫...');
  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: `data=${encodeURIComponent(buildOverpassQuery(lat, lng))}`
    });
    if (!response.ok) throw new Error('Overpass HTTP error');
    const data = await response.json();
    const rawPlaces = Array.isArray(data.elements) ? data.elements : [];
    fallbackPlacesPool = rawPlaces
      .map((el) => normalizeOverpassElement(el, lat, lng))
      .filter((place) => place && place.name && isActualRestaurant(place))
      .map(assignFoodCategory);
  } catch (error) {
    console.warn('Overpass fallback failed, using Mock data', error);
    const normalizedMock = mockPlaces.map(normalizeMockPlace);
    fallbackPlacesPool = normalizedMock
      .filter(isActualRestaurant)
      .map(assignFoodCategory);
  }
}

// 四、建立單一分類搜尋函式 (Core of Two-Stage Architecture)
async function fetchGoogleTextSearch(query, lat, lng, pageToken = '') {
  const requestBody = {
    textQuery: query,
    includedType: 'restaurant',
    strictTypeFiltering: true,
    languageCode: 'zh-TW',
    regionCode: 'TW',
    pageSize: 20,
    rankPreference: 'RELEVANCE',
    locationBias: {
      circle: {
        center: {
          latitude: lat,
          longitude: lng
        },
        radius: getCurrentSearchRadius()
      }
    }
  };

  if (pageToken) {
    requestBody.pageToken = pageToken;
  }

  const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask':
        'places.id,' +
        'places.displayName,' +
        'places.formattedAddress,' +
        'places.location,' +
        'places.rating,' +
        'places.userRatingCount,' +
        'places.types,' +
        'places.primaryType,' +
        'places.primaryTypeDisplayName,' +
        'places.googleMapsUri,' +
        'nextPageToken'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    let errorDetails = '';
    try {
      errorDetails = await response.text();
    } catch (_) {
      errorDetails = '';
    }
    throw new Error(`Google Places Text Search HTTP ${response.status}: ${errorDetails}`);
  }

  return response.json();
}

async function searchPlacesByCategory(categoryId, lat, lng) {
  const config = CATEGORY_SEARCH_CONFIG[categoryId];
  if (!config) {
    return [];
  }

  // 1. 檢查快取
  const cacheKey = getCategoryCacheKey(categoryId, lat, lng);
  const cached = categoryPlaceCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    cached.fromCache = true;
    return cached.places;
  }

  // 2. 判斷是否需要 Fallback 模式 (無 API 金鑰)
  if (!getApiKeyStatus()) {
    await ensureFallbackPool(lat, lng);
    const categoryPlaces = fallbackPlacesPool.filter((p) => p.category === categoryId);
    categoryPlaceCache.set(cacheKey, {
      places: categoryPlaces,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 分鐘快取
    });
    return categoryPlaces;
  }

  // 3. 呼叫 Google Places Text Search (New)
  const allRawPlaces = [];
  const randomizedQueries = randomizePlaces(config.textQueries).slice(0, 2);
  let hasSuccess = false;

  for (const query of randomizedQueries) {
    let pageToken = '';

    try {
      for (let page = 0; page < 2; page += 1) {
        const data = await fetchGoogleTextSearch(query, lat, lng, pageToken);
        hasSuccess = true;

        if (Array.isArray(data.places)) {
          allRawPlaces.push(...data.places);
        }

        pageToken = data.nextPageToken || '';
        if (!pageToken) {
          break;
        }
      }
    } catch (err) {
      console.error(`Google Places Search query "${query}" failed:`, err);
      // 不要因為一個失敗就中斷其他 query
    }

    // 如果已經取得足夠店家，可以提早結束，不過考慮到後續還要過濾距離去重，這裡可以暫不嚴格提早結束
    if (allRawPlaces.length >= 60) {
      break;
    }
  }

  if (!hasSuccess && allRawPlaces.length === 0) {
    // 所有 query 都失敗，使用 Fallback
    await ensureFallbackPool(lat, lng);
    const categoryPlaces = fallbackPlacesPool.filter((p) => p.category === categoryId);
    categoryPlaceCache.set(cacheKey, {
      places: categoryPlaces,
      expiresAt: Date.now() + 5 * 60 * 1000
    });
    return categoryPlaces;
  }

  // 4. 正規化、驗證與歸類
  const categoryDef = FOOD_CATEGORY_DEFS.find((cat) => cat.id === categoryId) ||
    FOOD_CATEGORY_DEFS.find((cat) => cat.id === 'other_restaurant');

  const results = allRawPlaces
    .map((place) => normalizeGooglePlace(place, lat, lng))
    .filter((place) => {
      return (
        place &&
        typeof place.distance === 'number' &&
        place.distance <= getCurrentSearchRadius()
      );
    })
    .filter((place) => isActualRestaurant(place))
    .map(place => ({
      ...place,
      category: categoryId,
      categoryLabel: categoryDef.label,
      categoryEmoji: categoryDef.emoji
    }));

  // 5. 去除重複
  const seenPlaceIds = new Set();
  const seenFallbackKeys = new Set();

  const uniqueResults = results.filter((place) => {
    if (place.placeId) {
      if (seenPlaceIds.has(place.placeId)) {
        return false;
      }
      seenPlaceIds.add(place.placeId);
      return true;
    }

    const fallbackKey = `${place.name}|${place.address}`.trim().toLowerCase();
    if (seenFallbackKeys.has(fallbackKey)) {
      return false;
    }
    seenFallbackKeys.add(fallbackKey);
    return true;
  });

  // 6. 存入快取
  const finalResults = randomizePlaces(uniqueResults).slice(0, MAX_CACHED_PLACES_PER_CATEGORY);

  categoryPlaceCache.set(cacheKey, {
    places: finalResults,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  return finalResults;
}

function sortPlaces(a, b) {
  const distanceA = typeof a.distance === 'number' ? a.distance : Number.POSITIVE_INFINITY;
  const distanceB = typeof b.distance === 'number' ? b.distance : Number.POSITIVE_INFINITY;
  if (distanceA !== distanceB) {
    return distanceA - distanceB;
  }
  const ratingA = typeof a.rating === 'number' ? a.rating : 0;
  const ratingB = typeof b.rating === 'number' ? b.rating : 0;
  return ratingB - ratingA;
}

function resultSectionReset() {
  const isLunch = currentMealMode === 'lunch';
  activeCategoryEmoji.textContent = '🍜';
  activeCategoryTitle.textContent = '尚未抽選';
  activeCategoryMeta.textContent = isLunch ? '請先按下「午餐吃什麼」' : '請先按下「今晚吃什麼」';
  activePlacesList.innerHTML = `<div class="empty-state">目前尚未抽出料理，先按下「${isLunch ? '午餐吃什麼' : '今晚吃什麼'}」吧。</div>`;
  recommendationsList.innerHTML = '';
}

function renderAnalysisGrid() {
  const activeId = activeCategoryId;
  analysisGrid.innerHTML = foodCategories
    .map((category) => {
      const activeClass = category.id === activeId ? ' active' : '';
      const preview = category.places[0]?.name || '等待資料';
      return `
        <button
          class="analysis-card${activeClass}"
          type="button"
          data-action="select-category"
          data-category-id="${escapeHtml(category.id)}"
        >
          <div class="analysis-card-head">
            <span class="analysis-emoji">${escapeHtml(category.emoji)}</span>
            <span class="analysis-count">${category.places.length} 間</span>
          </div>
          <div class="analysis-label">${escapeHtml(category.label)}</div>
          <div class="analysis-sub">${escapeHtml(preview)}</div>
        </button>
      `;
    })
    .join('');
}

function renderSlots(forceRender = false) {
  const slotLabelNumbers = ['❶', '❷', '❸'];

  slotEls.forEach((slotEl, index) => {
    if (isSpinning && !forceRender) return;

    const category = selectedCategories[index];

    if (!category) {
      slotEl.className = 'slot-card slot-empty';
      slotEl.removeAttribute('data-category-id');

      slotEl.innerHTML = `
        <div class="slot-index">${slotLabelNumbers[index]}</div>

        <div class="slot-window">
          <div
            class="slot-reel"
            style="transform: translate3d(0, 0, 0); transition: none;"
          >
            <div class="slot-reel-item">
              <span class="slot-emoji">?</span>

              <span class="slot-text">
                <span class="slot-label">等待抽選</span>
              </span>
            </div>
          </div>
        </div>
      `;

      return;
    }

    slotEl.className = 'slot-card filled is-stopped is-final';
    slotEl.dataset.categoryId = category.id;

    slotEl.innerHTML = `
      <div class="slot-index">${slotLabelNumbers[index]}</div>

      <div class="slot-window">
        <div
          class="slot-reel"
          style="transform: translate3d(0, 0, 0); transition: none;"
        >
          <div class="slot-reel-item">
            <span class="slot-emoji">
              ${escapeHtml(category.emoji)}
            </span>

            <span class="slot-text">
              <span class="slot-label">
                ${escapeHtml(category.label)}
              </span>

              <span class="slot-count">
                ${category.places.length} 間
              </span>
            </span>
          </div>
        </div>
      </div>
    `;
  });
}

function renderRecommendations() {
  if (!selectedCategories.length) {
    const isLunch = currentMealMode === 'lunch';
    recommendationsList.innerHTML = `<div class="empty-state">先按下「${isLunch ? '午餐吃什麼' : '今晚吃什麼'}」，系統會抽出三個不同料理類型。</div>`;
    return;
  }

  recommendationsList.innerHTML = selectedCategories
    .map((category) => `
      <button
        type="button"
        class="recommendation-chip${category.id === activeCategoryId ? ' active' : ''}"
        data-action="select-category"
        data-category-id="${escapeHtml(category.id)}"
      >
        ${escapeHtml(category.emoji)} ${escapeHtml(category.label)}
      </button>
    `)
    .join('');
}

function renderActiveCategory() {
  const isLunch = currentMealMode === 'lunch';
  if (!activeCategoryId) {
    activeCategoryEmoji.textContent = '🍜';
    activeCategoryTitle.textContent = '尚未抽選';
    activeCategoryMeta.textContent = isLunch ? '請先按下「午餐吃什麼」' : '請先按下「今晚吃什麼」';
    activePlacesList.innerHTML = `<div class="empty-state">目前尚未抽出料理，先按下「${isLunch ? '午餐吃什麼' : '今晚吃什麼'}」吧。</div>`;
    return;
  }

  const category = foodCategories.find((item) => item.id === activeCategoryId);
  if (!category) {
    activeCategoryEmoji.textContent = '🍜';
    activeCategoryTitle.textContent = '尚未抽選';
    activeCategoryMeta.textContent = isLunch ? '請先按下「午餐吃什麼」' : '請先按下「今晚吃什麼」';
    activePlacesList.innerHTML = '<div class="empty-state">找不到這個料理分類，請重新抽選一次。</div>';
    return;
  }

  activeCategoryEmoji.textContent = category.emoji;
  activeCategoryTitle.textContent = category.label;
  activeCategoryMeta.textContent = category.places.length
    ? `附近有 ${category.places.length} 間店家（目前顯示前 ${Math.min(MAX_VISIBLE_PLACES_PER_CATEGORY, category.places.length)} 間）`
    : '這個料理分類目前沒有符合的店家';

  if (!category.places.length) {
    activePlacesList.innerHTML = '<div class="empty-state">這個料理分類附近暫無店家。可以重新抽選，看看別的料理。</div>';
    return;
  }

  const visiblePlaces = category.places.slice(0, MAX_VISIBLE_PLACES_PER_CATEGORY);

  activePlacesList.innerHTML = visiblePlaces
    .map((place) => renderPlaceCard(place, category))
    .join('');
}

function renderPlaceCard(place, category) {
  const favoriteKey = getFavoriteKey({
    name: place.name,
    rating: place.rating,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    category: category.label
  });
  const isFavorite = favorites.some((item) => getFavoriteKey(item) === favoriteKey);
  const ratingText = formatRating(place.rating);
  const distanceText = formatDistance(place.distance);
  const addressText = place.address ? place.address : '地址未知';

  return `
    <article class="place-card" data-place-key="${escapeHtml(favoriteKey)}">
      <div class="place-head">
        <div>
          <h3 class="place-name">${escapeHtml(place.name)}</h3>
          <div class="place-badges">
            <span class="badge">⭐ ${escapeHtml(ratingText)}</span>
            <span class="badge">📍 ${escapeHtml(distanceText)}</span>
            <span class="badge">🏷 ${escapeHtml(place.source)}</span>
          </div>
        </div>
        <button
          type="button"
          class="icon-btn${isFavorite ? ' active' : ''}"
          data-action="toggle-favorite"
          data-category="${escapeHtml(category.label)}"
          data-name="${escapeHtml(place.name)}"
          data-rating="${escapeHtml(String(place.rating ?? '無評分'))}"
          data-address="${escapeHtml(addressText)}"
          data-lat="${escapeHtml(String(place.lat ?? ''))}"
          data-lng="${escapeHtml(String(place.lng ?? ''))}"
        >${isFavorite ? '💔 取消' : '❤️ 收藏'}</button>
      </div>
      <p class="place-address">${escapeHtml(addressText)}</p>
      <div class="place-actions">
        <button
          type="button"
          class="btn btn-secondary"
          data-action="open-map"
          data-place-id="${escapeHtml(place.placeId || '')}"
          data-place-name="${escapeHtml(place.name || '')}"
          data-place-lat="${escapeHtml(String(place.lat ?? ''))}"
          data-place-lng="${escapeHtml(String(place.lng ?? ''))}"
          data-place-google-maps-url="${escapeHtml(place.googleMapsUrl || '')}"
        >📍 Google Maps</button>
        <button
          type="button"
          class="btn btn-secondary"
          data-action="toggle-favorite"
          data-category="${escapeHtml(category.label)}"
          data-name="${escapeHtml(place.name)}"
          data-rating="${escapeHtml(String(place.rating ?? '無評分'))}"
          data-address="${escapeHtml(addressText)}"
          data-lat="${escapeHtml(String(place.lat ?? ''))}"
          data-lng="${escapeHtml(String(place.lng ?? ''))}"
        >${isFavorite ? '💔 取消收藏' : '❤️ 收藏'}</button>
      </div>
    </article>
  `;
}

function renderFavorites() {
  favoritesCount.textContent = `${favorites.length} 筆`;

  if (!favorites.length) {
    favoritesList.innerHTML = '<div class="empty-state">還沒有收藏店家。看到喜歡的店，按下 ❤️ 收藏 就會出現在這裡。</div>';
    return;
  }

  favoritesList.innerHTML = favorites
    .map((item) => `
      <article class="favorite-card" data-favorite-key="${escapeHtml(getFavoriteKey(item))}">
        <div class="favorite-top">
          <div>
            <h3 class="favorite-name">${escapeHtml(item.name)}</h3>
            <div class="favorite-meta">
              <span class="badge">⭐ ${escapeHtml(formatRating(item.rating))}</span>
              <span class="badge">📍 ${escapeHtml(formatDistance(item.distance))}</span>
              <span class="badge">${escapeHtml(item.category)}</span>
            </div>
          </div>
          <button
            type="button"
            class="icon-btn active"
            data-action="remove-favorite"
            data-favorite-key="${escapeHtml(getFavoriteKey(item))}"
          >移除</button>
        </div>
        <p class="place-address">${escapeHtml(item.address || '地址未知')}</p>
      </article>
    `)
    .join('');
}

function spinReel(slotEl, availableCategories, targetCategory, duration) {
  return new Promise((resolve) => {
    slotEl.classList.remove('slot-empty', 'filled', 'is-stopped', 'is-final');
    slotEl.classList.add('slot-card', 'filled', 'is-spinning');

    const reel = slotEl.querySelector('.slot-reel');
    if (!reel) { resolve(); return; }

    reel.style.transition = 'none';
    reel.style.transform = 'translate3d(0, 0, 0)';
    reel.style.willChange = 'transform';

    const itemCount = Math.floor(Math.random() * 8) + 18;
    const items = [];
    for (let i = 0; i < itemCount - 1; i++) {
      const randomCat = availableCategories[Math.floor(Math.random() * availableCategories.length)];
      items.push(randomCat);
    }
    items.push(targetCategory);

    reel.innerHTML = items
      .map((cat) => `
        <div class="slot-reel-item">
          <span class="slot-emoji">
            ${escapeHtml(cat.emoji)}
          </span>

          <span class="slot-text">
            <span class="slot-label">
              ${escapeHtml(cat.label)}
            </span>

            <span class="slot-count">
              抽選中
            </span>
          </span>
        </div>
      `)
      .join('');

    const firstItem = reel.querySelector('.slot-reel-item');
    const itemHeight = firstItem ? firstItem.offsetHeight : 48;
    const targetTranslateY = -(items.length - 1) * itemHeight;

    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const actualDuration = isReducedMotion ? 100 : duration;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        reel.style.transition = `transform ${actualDuration}ms cubic-bezier(0.2, 0.8, 0.1, 1.1)`;
        reel.style.transform = `translate3d(0, ${targetTranslateY}px, 0)`;

        let resolved = false;
        const finish = () => {
          if (resolved) return;
          resolved = true;
          slotEl.classList.remove('is-spinning');
          slotEl.classList.add('is-stopped');
          reel.style.willChange = 'auto';
          resolve();
        };

        reel.addEventListener('transitionend', finish, { once: true });
        setTimeout(finish, actualDuration + 100);
      });
    });
  });
}

// 十一、Debug 區更新彙整
function updateDebugPanel(searchReport) {
  const lines = [];
  lines.push(`=== 抽選分類搜尋除錯資訊 ===`);
  lines.push(`本次抽中分類: ${searchReport.categories.map(c => `${c.label} (${c.id})`).join(', ')}`);

  searchReport.details.forEach(detail => {
    lines.push(`--------------------`);
    lines.push(`分類: ${detail.label} (${detail.id})`);
    lines.push(`搜尋型態 (request types): ${JSON.stringify(detail.requestTypes)}`);
    lines.push(`是否使用快取: ${detail.fromCache ? '是 ✅' : '否 ❌'}`);
    lines.push(`API 回傳筆數: ${detail.rawCount}`);
    lines.push(`過濾後剩餘筆數: ${detail.filteredCount}`);
    lines.push(`是否重新 Shuffle: ${detail.shuffled ? '是 ✅' : '否 ❌'}`);
    if (detail.errorMessage) {
      lines.push(`錯誤訊息: ${detail.errorMessage}`);
    }
  });

  if (debugError) {
    debugError.textContent = lines.join('\n');
  }
  if (debugPlacesResult) {
    debugPlacesResult.textContent = `抽選搜尋完成，${searchReport.details.filter(d => d.fromCache).length} 個使用快取`;
  }
}

// 五、拉霸流程改造
async function pickThreeCategories() {
  if (isSpinning || !currentLocation) return;

  isSpinning = true;
  generateBtn.disabled = true;
  generateBtn.textContent = '抽選中...';

  try {
    activeCategoryEmoji.textContent = '🍜';
    activeCategoryTitle.textContent = '抽選中...';
    activeCategoryMeta.textContent = '正在尋找美味店家...';
    activePlacesList.innerHTML = '<div class="empty-state">等待轉輪停止並加載美食資料...</div>';
    recommendationsList.innerHTML = '';

    // 1. 準備可供抽選的主要分類 (排除 'other_restaurant' 作為抽選選項以保持體驗優良)
    const pool = getAvailableCategoryDefs().filter(c => c.id !== 'other_restaurant');

    // 2. 隨機抽出最多 3 個分類
    let results = [];
    const poolCopy = pool.slice();
    while (results.length < 3 && poolCopy.length > 0) {
      const idx = Math.floor(Math.random() * poolCopy.length);
      results.push(poolCopy.splice(idx, 1)[0]);
    }

    // 3. 只針對這 3 個分類搜尋店家資料
    await Promise.allSettled(
      results.map(async (category) => {
        try {
          const places = await searchPlacesByCategory(category.id, currentLocation.lat, currentLocation.lng);
          category.places = randomizePlaces(places);
        } catch (err) {
          console.error(`Failed to fetch places for category ${category.id}:`, err);
          category.places = [];
        }

        // 同步更新至全域 foodCategories 狀態以利分析卡片連動與 preview
        const targetCat = foodCategories.find(c => c.id === category.id);
        if (targetCat) {
          targetCat.places = category.places;
        }
      })
    );

    slotEls.forEach(el => el.className = 'slot-card slot-empty');

    // 4. 播放拉霸動畫 (只播放有結果的 slot)
    const slotLabelNumbers = ['❶', '❷', '❸'];
    const spinPromises = [];
    slotEls.forEach((slotEl, idx) => {
      const targetCat = results[idx];
      if (targetCat) {
        spinPromises.push(spinReel(slotEl, pool, targetCat, 1600 + idx * 400));
      } else {
        slotEl.className = 'slot-card slot-empty';
        slotEl.innerHTML = `
          <div class="slot-index">${slotLabelNumbers[idx]}</div>
          <div class="slot-window">
            <div class="slot-reel" style="transform: translate3d(0, 0, 0); transition: none;">
              <div class="slot-reel-item">
                <span class="slot-emoji">?</span>
                <span class="slot-label">等待抽選</span>
              </div>
            </div>
          </div>
        `;
      }
    });

    await Promise.all(spinPromises);

    const lastActiveIdx = results.length - 1;
    if (lastActiveIdx >= 0) {
      slotEls[lastActiveIdx].classList.add('is-final');
    }

    const debugReport = {
      categories: results,
      details: []
    };

    results.forEach((category) => {
      // 收集除錯資訊
      const cacheKey = getCategoryCacheKey(category.id, currentLocation.lat, currentLocation.lng);
      const isCached = categoryPlaceCache.get(cacheKey)?.fromCache || false;
      const config = CATEGORY_SEARCH_CONFIG[category.id];

      debugReport.details.push({
        id: category.id,
        label: category.label,
        requestTypes: config ? config.includedPrimaryTypes : [],
        fromCache: isCached,
        rawCount: category.places.length,
        filteredCount: category.places.length,
        shuffled: true,
        errorMessage: null
      });

      // 重置 cache 中的 fromCache 旗標避免下次誤判
      const rawCached = categoryPlaceCache.get(cacheKey);
      if (rawCached) delete rawCached.fromCache;
    });

    selectedCategories = results;
    activeCategoryId = selectedCategories[0]?.id || '';

    // 更新 Debug 資訊與介面
    updateDebugPanel(debugReport);

    renderRecommendations();
    renderActiveCategory();
    renderAnalysisGrid();
    renderSlots(true);

    // 更新分析統計列
    const totalCount = foodCategories.reduce((acc, cat) => acc + cat.places.length, 0);
    const activeCatCount = foodCategories.filter(c => c.places.length > 0).length;
    analysisSummary.textContent = `已載入 ${activeCatCount} 種料理，共有 ${totalCount} 間推薦店家。`;
  } catch (err) {
    console.error('抽選流程發生不可預期錯誤', err);
  } finally {
    isSpinning = false;
    generateBtn.disabled = false;
    generateBtn.textContent = currentMealMode === 'lunch' ? '午餐吃什麼' : '今晚吃什麼';
  }
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function selectCategory(categoryId) {
  // 當手動點擊切換時，對該類店家重新做一次 Fisher-Yates 隨機排序，符合「每次顯示店家順序要有變化」
  const category = foodCategories.find((item) => item.id === categoryId);
  if (category && category.places.length > 0) {
    category.places = randomizePlaces(category.places);
  }
  activeCategoryId = categoryId;
  renderRecommendations();
  renderActiveCategory();
  renderAnalysisGrid();
}

function getFavoriteKey(item) {
  return [
    item.category || '',
    item.name || '',
    item.lat ?? '',
    item.lng ?? ''
  ].join('|');
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.favorites);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
  } catch {
    // Ignore storage write failures.
  }
}

function toggleFavorite(place) {
  const favoriteKey = getFavoriteKey(place);
  const index = favorites.findIndex((item) => getFavoriteKey(item) === favoriteKey);

  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.unshift({
      name: place.name,
      rating: place.rating,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      category: place.category
    });
  }

  saveFavorites();
  renderFavorites();
  renderActiveCategory();
}

function getGoogleMapsUrl(place) {
  if (place?.googleMapsUrl) {
    return place.googleMapsUrl;
  }
  const placeName = encodeURIComponent(place?.name || '');
  const placeId = encodeURIComponent(place?.placeId || '');

  if (place?.placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${placeName}&query_place_id=${placeId}`;
  }
  if (place?.name) {
    return `https://www.google.com/maps/search/?api=1&query=${placeName}`;
  }
  if (typeof place?.lat === 'number' && typeof place?.lng === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.lat},${place.lng}`)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=`;
}

function formatDistance(distance) {
  if (typeof distance !== 'number' || Number.isNaN(distance)) {
    return '距離未知';
  }
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)} 公里`;
  }
  return `${Math.round(distance)} 公尺`;
}

function formatRating(rating) {
  if (rating === null || rating === undefined || rating === '') {
    return '無評分';
  }
  if (typeof rating === 'number') {
    return rating.toFixed(1);
  }
  return String(rating);
}

function bindInteractiveLists() {
  const slotsGrid = document.querySelector('.slots-grid');
  if (slotsGrid) {
    slotsGrid.addEventListener('click', (event) => {
      if (isSpinning) return;
      const slotCard = event.target.closest('.slot-card.filled');
      if (!slotCard) return;
      const categoryId = slotCard.dataset.categoryId;
      if (categoryId) {
        selectCategory(categoryId);
      }
    });
  }

  analysisGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="select-category"]');
    if (!button || button.disabled) return;
    const categoryId = button.dataset.categoryId;
    if (!categoryId) return;
    selectCategory(categoryId);
  });

  recommendationsList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="select-category"]');
    if (!button) return;
    const categoryId = button.dataset.categoryId;
    if (!categoryId) return;
    selectCategory(categoryId);
  });

  activePlacesList.addEventListener('click', (event) => {
    const mapButton = event.target.closest('[data-action="open-map"]');
    if (mapButton) {
      const place = {
        placeId: mapButton.dataset.placeId || '',
        name: mapButton.dataset.placeName || '',
        lat: mapButton.dataset.placeLat ? Number(mapButton.dataset.placeLat) : null,
        lng: mapButton.dataset.placeLng ? Number(mapButton.dataset.placeLng) : null,
        googleMapsUrl: mapButton.dataset.placeGoogleMapsUrl || ''
      };
      const mapUrl = getGoogleMapsUrl(place);
      if (mapUrl) {
        window.open(mapUrl, '_blank');
      }
      return;
    }

    const button = event.target.closest('[data-action="toggle-favorite"]');
    if (!button) return;
    const card = button.closest('[data-place-key]');
    if (!card) return;
    const category = button.dataset.category || '';
    const name = button.dataset.name || '';
    const rating = button.dataset.rating || '無評分';
    const address = button.dataset.address || '';
    const lat = button.dataset.lat ? Number(button.dataset.lat) : null;
    const lng = button.dataset.lng ? Number(button.dataset.lng) : null;
    const currentCategory = foodCategories.find((item) => item.label === category);
    toggleFavorite({
      name,
      rating,
      address,
      lat,
      lng,
      category: currentCategory?.label || category
    });
  });

  favoritesList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="remove-favorite"]');
    if (!button) return;
    const key = button.dataset.favoriteKey;
    if (!key) return;
    favorites = favorites.filter((item) => getFavoriteKey(item) !== key);
    saveFavorites();
    renderFavorites();
    renderActiveCategory();
  });
}

async function runGooglePlacesDebugTest() {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const isLocal = isLocalhostLike(hostname);
  const hasGeolocation = Boolean(navigator.geolocation);
  const hasApiKey = getApiKeyStatus();

  updateDebugField(debugProtocol, protocol);
  updateDebugField(debugHostname, hostname || '(空白)');
  updateDebugField(debugLocalhost, isLocal ? '是' : '否');
  updateDebugField(debugGeolocationSupport, hasGeolocation ? '是' : '否');
  updateDebugField(debugApiKey, hasApiKey ? '已填入' : '尚未填入');
  setDebugResult('檢查中');
  setDebugError('-');

  try {
    if (protocol === 'file:') {
      const messageText = '目前是 file://，請改用 localhost 或 https';
      setDebugResult(messageText);
      setDebugError('file:// 檢查失敗：請用 Live Server 或 localhost 開啟');
      updateDebugField(debugLocation, '失敗：file:// 無法測試定位/Google Places');
      return;
    }

    if (!hasGeolocation) {
      const messageText = '此瀏覽器不支援 Geolocation';
      setDebugResult(messageText);
      setDebugError(messageText);
      updateDebugField(debugLocation, '失敗：此瀏覽器不支援 Geolocation');
      return;
    }

    let position = debugCurrentPosition || (currentLocation
      ? {
        coords: {
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          accuracy: null
        }
      }
      : null);
    if (!position) {
      position = await getCurrentPositionOnce();
      debugCurrentPosition = position;
    }

    updateDebugField(
      debugLocation,
      `成功：${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
    );

    if (!hasApiKey) {
      const messageText = '尚未填入 Google API Key';
      setDebugResult(messageText);
      setDebugError(messageText);
      return;
    }

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    const requestBody = buildGoogleTextSearchRequest('餐廳', lat, lng);
    const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType,places.primaryTypeDisplayName,places.googleMapsUri,nextPageToken'
      },
      body: JSON.stringify(requestBody)
    });

    let json = null;
    try {
      json = await response.json();
    } catch (parseError) {
      json = { parseError: String(parseError?.message || parseError) };
    }

    const places = Array.isArray(json?.places) ? json.places : [];

    updateDebugField(debugPlacesResult, `HTTP ${response.status} / response.ok = ${response.ok} / 找到 ${places.length} 間店`);
    setDebugError(`回傳 JSON:\n${JSON.stringify(json, null, 2)}`);

    if (!response.ok) {
      const errorText = describeHttpError(response.status, json);
      setDebugError([
        errorText || `HTTP ${response.status}`,
        json?.error?.message ? `message: ${json.error.message}` : '',
        json?.error?.status ? `status: ${json.error.status}` : '',
        json?.error?.details ? `details: ${JSON.stringify(json.error.details)}` : ''
      ].filter(Boolean).join('\n'));
      return;
    }

    if (!places.length) {
      const zeroResultsText = 'ZERO_RESULTS 或 places 為空：附近沒有符合條件的店，或半徑太小';
      setDebugResult(`HTTP ${response.status} / response.ok = ${response.ok} / 找到 0 間店`);
      setDebugError(zeroResultsText);
      return;
    }

    setDebugResult(`HTTP ${response.status} / response.ok = ${response.ok} / 找到 ${places.length} 間店`);
  } catch (error) {
    const failureText = explainDebugFetchFailure(error);
    updateDebugField(debugPlacesResult, '測試失敗');
    setDebugError([
      failureText,
      error?.message ? `message: ${error.message}` : '',
      error?.status ? `status: ${error.status}` : '',
      error?.details ? `details: ${JSON.stringify(error.details)}` : ''
    ].filter(Boolean).join('\n'));
  }
}

function getCurrentPositionOnce() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
}

function updateMealModeUI() {
  const isLunch = currentMealMode === 'lunch';

  const subtitle = document.querySelector('.hero .subtitle');
  if (subtitle) {
    subtitle.textContent = isLunch
      ? '今天太陽好大!午餐吃什麼?'
      : '哇!天怎麼黑了!晚餐吃什麼?';
  }

  document.title = isLunch
    ? '午餐時間! | 今天太陽好大!午餐吃什麼?'
    : '晚餐時間! | 哇!天怎麼黑了!晚餐吃什麼?';

  document.body.dataset.mealMode = currentMealMode;

  if (generateBtn && !isSpinning) {
    generateBtn.textContent = isLunch ? '午餐吃什麼' : '今晚吃什麼';
  }

  const recTitle = document.querySelector('#recommendationsList')?.closest('.section')?.querySelector('.section-title h2');
  if (recTitle) {
    recTitle.textContent = isLunch ? '午餐推薦' : '今晚推薦';
  }

  if (!activeCategoryId) {
    if (activeCategoryMeta) {
      activeCategoryMeta.textContent = isLunch ? '請先按下「午餐吃什麼」' : '請先按下「今晚吃什麼」';
    }
    if (activePlacesList) {
      const emptyDiv = activePlacesList.querySelector('.empty-state');
      if (emptyDiv) {
        emptyDiv.textContent = isLunch
          ? '快呀!先按下「午餐吃什麼」吧。'
          : '快呀!先按下「今晚吃什麼」吧。';
      }
    }
  }

  if (!selectedCategories.length && recommendationsList) {
    const emptyDiv = recommendationsList.querySelector('.empty-state');
    if (emptyDiv) {
      emptyDiv.textContent = isLunch
        ? '快呀!先按下「午餐吃什麼」。'
        : '快呀!先按下「今晚吃什麼」。';
    }
  }

  const footer = document.querySelector('.footer');
  if (footer) {
    footer.textContent = isLunch
      ? 'Food Slots 午餐!就決定吃你了!!'
      : 'Food Slots 晚餐!就決定吃你了!!!';
  }
}

function syncMealModeTesterButtons() {
  const buttons = document.querySelectorAll('[data-test-meal-mode]');
  if (!buttons.length) {
    return;
  }

  const activeMode = mealModeOverride === null ? 'auto' : mealModeOverride;

  buttons.forEach((button) => {
    button.classList.toggle(
      'active',
      button.dataset.testMealMode === activeMode
    );
  });
}

function applyMealMode(nextMode) {
  if (nextMode === currentMealMode) {
    updateMealModeUI();
    syncMealModeTesterButtons();
    return;
  }

  currentMealMode = nextMode;

  updateMealModeUI();
  syncMealModeTesterButtons();
}

function initMealModeTester() {
  const buttons = document.querySelectorAll('[data-test-meal-mode]');
  if (!buttons.length) {
    return;
  }

  syncMealModeTesterButtons();

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const selectedMode = button.dataset.testMealMode;

      if (selectedMode === 'auto') {
        mealModeOverride = null;
      } else if (
        selectedMode === 'lunch' ||
        selectedMode === 'default'
      ) {
        mealModeOverride = selectedMode;
      } else {
        return;
      }

      applyMealMode(getEffectiveMealMode());
    });
  });
}

function initApp() {
  currentMealMode = getEffectiveMealMode();
  updateMealModeUI();
  initMealModeTester();

  foodCategories = createEmptyFoodCategories();
  bindInteractiveLists();
  renderAnalysisGrid();
  renderSlots();
  renderRecommendations();
  renderActiveCategory();
  renderFavorites();
  generateBtn.disabled = true;
  generateBtn.addEventListener('click', pickThreeCategories);
  debugTestBtn.addEventListener('click', runGooglePlacesDebugTest);
  requestLocation();
  runGooglePlacesDebugTest();

  if (!refreshIntervalId) {
    refreshIntervalId = setInterval(refreshMealModeByTime, 60 * 1000);
  }
}

initApp();
