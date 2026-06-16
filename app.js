const GOOGLE_API_KEY = "AIzaSyAlYjXrvlLKC1pclVSDxMbYjfoVoBN1slg";

const GOOGLE_PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const SEARCH_RADIUS = 3000;
const MAX_WHEEL_PLACES = 24;
const STORAGE_KEYS = {
  favorites: 'food-slots-favorites'
};
const ALLOWED_RESTAURANT_PRIMARY_TYPES = new Set([
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

function isActualRestaurant(place) {
  const primaryType = `${place?.primaryType || ''}`.toLowerCase();
  return ALLOWED_RESTAURANT_PRIMARY_TYPES.has(primaryType);
}
const FOOD_CATEGORY_DEFS = [
  { id: 'ramen', label: '拉麵', emoji: '🍜' },
  { id: 'hotpot', label: '火鍋', emoji: '🍲' },
  { id: 'bbq', label: '燒肉', emoji: '🍖' },
  { id: 'curry', label: '咖哩', emoji: '🍛' },
  { id: 'burger', label: '漢堡', emoji: '🍔' },
  { id: 'sushi', label: '壽司', emoji: '🍣' },
  { id: 'snack', label: '小吃', emoji: '🥟' },
  { id: 'fried', label: '炸物', emoji: '🍗' },
  { id: 'taiwanese', label: '台式料理', emoji: '🥘' },
  { id: 'other', label: '其他餐廳', emoji: '🍽️' }
];

const mockPlaces = [
  { name: '巷口牛肉麵', type: 'restaurant', cuisine: '麵食' },
  { name: '阿姨滷肉飯', type: 'restaurant', cuisine: '飯類' },
  { name: '深夜鹽酥雞', type: 'fast_food', cuisine: '炸物' },
  { name: '轉角咖啡', type: 'cafe', cuisine: '咖啡甜點' },
  { name: '老店鍋燒意麵', type: 'restaurant', cuisine: '麵食' },
  { name: '小火鍋之家', type: 'restaurant', cuisine: '火鍋' },
  { name: '早餐大王', type: 'fast_food', cuisine: '早餐' },
  { name: '日式拉麵屋', type: 'restaurant', cuisine: '日式' }
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
  message.textContent = '定位成功，已取得目前座標。';
  setStatus('success', '定位成功');
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
  applyFallback('定位失敗，使用預設資料');
  message.textContent = `定位失敗：${reason}`;
}

function requestLocation() {
  if (!('geolocation' in navigator)) {
    locationData.hidden = true;
    message.textContent = '定位失敗：此瀏覽器不支援 Geolocation API';
    setStatus('error', '定位失敗');
    applyFallback('定位失敗，使用預設資料');
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
      loadNearbyPlacesGoogle(position.coords.latitude, position.coords.longitude);
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

function buildOverpassQuery(lat, lng) {
  return `[out:json][timeout:25];
(
  node["amenity"~"restaurant|fast_food"](around:${SEARCH_RADIUS},${lat},${lng});
  way["amenity"~"restaurant|fast_food"](around:${SEARCH_RADIUS},${lat},${lng});
  relation["amenity"~"restaurant|fast_food"](around:${SEARCH_RADIUS},${lat},${lng});
);
out center tags;`;
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
  const foodCategory = inferFoodCategory({
    name,
    primaryType,
    rawTypes,
    primaryTypeDisplayName
  });

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
    category: foodCategory.id,
    categoryLabel: foodCategory.label,
    categoryEmoji: foodCategory.emoji,
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

  const foodCategory = inferFoodCategory({
    name: tags.name,
    primaryType: tags.amenity || 'restaurant',
    rawTypes: [tags.amenity || 'restaurant'],
    primaryTypeDisplayName: ''
  });

  return {
    placeId: tags['place_id'] || tags.id || '',
    name: tags.name,
    address: tags['addr:full'] || tags['addr:street'] || tags['addr:city'] || '',
    rating: '無評分',
    rawTypes: [tags.amenity || 'restaurant'],
    primaryType: tags.amenity || 'restaurant',
    primaryTypeDisplayName: '',
    category: foodCategory.id,
    categoryLabel: foodCategory.label,
    categoryEmoji: foodCategory.emoji,
    lat: placeLat,
    lng: placeLng,
    distance: calculateDistance(lat, lng, placeLat, placeLng),
    googleMapsUrl: '',
    source: 'overpass'
  };
}

function normalizeMockPlace(place) {
  const foodCategory = inferFoodCategory({
    name: place.name,
    primaryType: place.type,
    rawTypes: [place.type],
    primaryTypeDisplayName: place.cuisine || ''
  });

  return {
    placeId: '',
    name: place.name,
    address: '',
    rating: '無評分',
    rawTypes: [place.type],
    primaryType: place.type,
    primaryTypeDisplayName: place.cuisine || '',
    category: foodCategory.id,
    categoryLabel: foodCategory.label,
    categoryEmoji: foodCategory.emoji,
    lat: null,
    lng: null,
    distance: null,
    googleMapsUrl: '',
    source: 'mock'
  };
}

function inferFoodCategory(place) {
  const name = `${place?.name || ''}`.toLowerCase();
  const primaryType = `${place?.primaryType || ''}`.toLowerCase();
  const primaryTypeDisplayName = `${place?.primaryTypeDisplayName || ''}`.toLowerCase();
  const rawTypes = Array.isArray(place?.rawTypes)
    ? place.rawTypes.map((item) => String(item).toLowerCase())
    : [];
  const combined = `${name} ${primaryTypeDisplayName} ${rawTypes.join(' ')}`;

  // Google 的明確餐廳主類型優先，避免只靠店名猜。
  const primaryTypeCategoryMap = {
    ramen_restaurant: 'ramen',
    hot_pot_restaurant: 'hotpot',
    barbecue_restaurant: 'bbq',
    hamburger_restaurant: 'burger',
    sushi_restaurant: 'sushi',
    taiwanese_restaurant: 'taiwanese'
  };

  const mappedCategoryId = primaryTypeCategoryMap[primaryType];
  if (mappedCategoryId) {
    return FOOD_CATEGORY_DEFS.find((category) => category.id === mappedCategoryId);
  }

  // Google 只標成一般 restaurant 時，才用名稱與顯示類型補充分類。
  const keywordRules = [
    { id: 'ramen', keywords: ['拉麵', 'ramen', '麵屋', '豚骨', 'ラーメン'] },
    { id: 'hotpot', keywords: ['火鍋', '鍋物', '麻辣鍋', '涮涮鍋', 'hotpot', 'hot pot', 'shabu'] },
    { id: 'bbq', keywords: ['燒肉', '焼肉', 'yakiniku', '烤肉'] },
    { id: 'curry', keywords: ['咖哩', '咖喱', 'curry'] },
    { id: 'burger', keywords: ['漢堡', 'burger', 'hamburger'] },
    { id: 'sushi', keywords: ['壽司', '鮨', 'sushi', '迴轉壽司', '回轉壽司'] },
    { id: 'fried', keywords: ['鹽酥雞', '鹹酥雞', '雞排', '炸雞', 'fried chicken'] },
    { id: 'snack', keywords: ['小吃', '麵線', '滷味', '肉圓', '蚵仔煎', '臭豆腐', '刈包'] },
    { id: 'taiwanese', keywords: ['台菜', '台式', '滷肉飯', '魯肉飯', '便當', '熱炒'] }
  ];

  for (const rule of keywordRules) {
    if (rule.keywords.some((keyword) => combined.includes(keyword.toLowerCase()))) {
      return FOOD_CATEGORY_DEFS.find((category) => category.id === rule.id);
    }
  }

  return FOOD_CATEGORY_DEFS.find((category) => category.id === 'other');
}

function buildFoodCategories(places) {
  const categories = createEmptyFoodCategories();

  for (const place of places) {
    // 直接使用 normalize 階段保存的分類；沒有時才重新推論。
    const inferred = place.category
      ? FOOD_CATEGORY_DEFS.find((category) => category.id === place.category)
      : inferFoodCategory(place);
    const category = inferred || FOOD_CATEGORY_DEFS.find((item) => item.id === 'other');
    const target = categories.find((item) => item.id === category.id);

    target.places.push({
      ...place,
      category: category.label,
      categoryId: category.id,
      categoryEmoji: category.emoji
    });
  }

  for (const category of categories) {
    category.places.sort(sortPlaces);
  }

  return categories;
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

function samplePlaces(places, limit) {
  if (places.length <= limit) return places;

  const pool = places.slice();
  const selected = [];

  while (selected.length < limit && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }

  return selected;
}

function applyPlaces(places, sourceText) {
  currentPlaces = places;
  foodCategories = buildFoodCategories(currentPlaces);
  selectedCategories = [];
  activeCategoryId = '';
  resultSectionReset();
  setPlacesStatus(sourceText);
  analysisSummary.textContent = `已分析 ${foodCategories.filter((category) => category.places.length > 0).length} 種料理類型，共 ${currentPlaces.length} 間附近店家`;
  generateBtn.disabled = currentPlaces.length === 0;
  renderAnalysisGrid();
  renderSlots();
  renderRecommendations();
  renderActiveCategory();
  renderFavorites();
}

function resultSectionReset() {
  activeCategoryEmoji.textContent = '🍜';
  activeCategoryTitle.textContent = '尚未抽選';
  activeCategoryMeta.textContent = '請先按下「今晚吃什麼」';
  activePlacesList.innerHTML = '<div class="empty-state">目前尚未抽出料理，先按下「今晚吃什麼」吧。</div>';
  recommendationsList.innerHTML = '';
}

function applyFallback(reasonText) {
  const fallback = samplePlaces(mockPlaces.map(normalizeMockPlace), MAX_WHEEL_PLACES);
  applyPlaces(fallback, reasonText);
}

async function loadNearbyPlacesGoogle(lat, lng) {
  setPlacesStatus('Google Places 搜尋中...');
  message.textContent = 'Google Places 搜尋中...';

  try {
    const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.primaryType,places.primaryTypeDisplayName,places.googleMapsUri'
      },
      body: JSON.stringify({
        includedPrimaryTypes: [...ALLOWED_RESTAURANT_PRIMARY_TYPES],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: lat,
              longitude: lng
            },
            radius: 3000
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Google Places HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawPlaces = Array.isArray(data.places) ? data.places : [];
    const places = rawPlaces
      .map((place) => normalizeGooglePlace(place, lat, lng))
      .filter((place) =>
        place &&
        place.name &&
        isActualRestaurant(place)
      );

    if (!places.length) {
      setPlacesStatus('Google Places 沒有資料，改用 Overpass');
      message.textContent = 'Google Places 沒有資料，改用 Overpass';
      await loadNearbyPlaces(lat, lng);
      return;
    }

    places.sort(sortPlaces);
    applyPlaces(samplePlaces(places, MAX_WHEEL_PLACES), `Google Places 已找到 ${places.length} 間附近店家`);
  } catch (error) {
    setPlacesStatus('Google Places 發生錯誤，改用 Overpass');
    message.textContent = 'Google Places 發生錯誤，改用 Overpass';
    await loadNearbyPlaces(lat, lng);
  }
}

async function loadNearbyPlaces(lat, lng, options = {}) {
  const noDataText = options.noDataText || 'Overpass 沒有資料，使用預設資料';
  const errorText = options.errorText || 'API 全部失敗，使用預設資料';

  setPlacesStatus('Overpass 搜尋中...');

  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: `data=${encodeURIComponent(buildOverpassQuery(lat, lng))}`
    });

    if (!response.ok) {
      throw new Error(`Overpass HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawPlaces = Array.isArray(data.elements) ? data.elements : [];
    const places = rawPlaces
      .map((element) => normalizeOverpassElement(element, lat, lng))
      .filter((place) => place && place.name);

    if (!places.length) {
      applyFallback(noDataText);
      return;
    }

    places.sort(sortPlaces);
    applyPlaces(samplePlaces(places, MAX_WHEEL_PLACES), `已找到 ${places.length} 間附近店家`);
  } catch (error) {
    applyFallback(errorText);
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
      console.error('[GooglePlacesDebug] file:// detected', {
        protocol,
        hostname,
        isLocal
      });
      return;
    }

    if (!hasGeolocation) {
      const messageText = '此瀏覽器不支援 Geolocation';
      setDebugResult(messageText);
      setDebugError(messageText);
      updateDebugField(debugLocation, '失敗：此瀏覽器不支援 Geolocation');
      console.error('[GooglePlacesDebug] navigator.geolocation missing', {
        protocol,
        hostname
      });
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
      console.error('[GooglePlacesDebug] GOOGLE_API_KEY missing or placeholder', {
        protocol,
        hostname,
        keyValue: GOOGLE_API_KEY,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
      });
      return;
    }

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.primaryType,places.primaryTypeDisplayName,places.googleMapsUri'
      },
      body: JSON.stringify({
        includedPrimaryTypes: [...ALLOWED_RESTAURANT_PRIMARY_TYPES],
        maxResultCount: 5,
        locationRestriction: {
          circle: {
            center: {
              latitude: lat,
              longitude: lng
            },
            radius: 1000
          }
        }
      })
    });

    let json = null;
    try {
      json = await response.json();
    } catch (parseError) {
      console.error('[GooglePlacesDebug] JSON parse error', parseError);
      json = { parseError: String(parseError?.message || parseError) };
    }

    const places = Array.isArray(json?.places) ? json.places : [];

    updateDebugField(debugPlacesResult, `HTTP ${response.status} / response.ok = ${response.ok} / 找到 ${places.length} 間店`);
    setDebugError(`回傳 JSON:\n${JSON.stringify(json, null, 2)}`);

    console.log('[GooglePlacesDebug] response', {
      ok: response.ok,
      status: response.status,
      json
    });

    if (!response.ok) {
      const errorText = describeHttpError(response.status, json);
      setDebugError([
        errorText || `HTTP ${response.status}`,
        json?.error?.message ? `message: ${json.error.message}` : '',
        json?.error?.status ? `status: ${json.error.status}` : '',
        json?.error?.details ? `details: ${JSON.stringify(json.error.details)}` : ''
      ].filter(Boolean).join('\n'));
      console.error('[GooglePlacesDebug] Google Places error response', {
        status: response.status,
        responseOk: response.ok,
        json
      });
      return;
    }

    if (!places.length) {
      const zeroResultsText = 'ZERO_RESULTS 或 places 為空：附近沒有符合條件的店，或半徑太小';
      setDebugResult(`HTTP ${response.status} / response.ok = ${response.ok} / 找到 0 間店`);
      setDebugError(zeroResultsText);
      console.error('[GooglePlacesDebug] no places returned', { status: response.status, json });
      return;
    }

    setDebugResult(`HTTP ${response.status} / response.ok = ${response.ok} / 找到 ${places.length} 間店`);
  } catch (error) {
    console.error('[GooglePlacesDebug] unexpected error', error);
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

function renderAnalysisGrid() {
  const activeId = activeCategoryId;
  analysisGrid.innerHTML = foodCategories
    .map((category) => {
      const activeClass = category.id === activeId ? ' active' : '';
      const disabled = category.places.length === 0 ? ' disabled' : '';
      const preview = category.places[0]?.name || '等待資料';
      return `
        <button
          class="analysis-card${activeClass}"
          type="button"
          data-action="select-category"
          data-category-id="${escapeHtml(category.id)}"
          ${disabled}
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

function renderSlots() {
  const slotLabelNumbers = ['❶', '❷', '❸'];
  slotEls.forEach((slotEl, index) => {
    const category = selectedCategories[index];
    if (!category) {
      slotEl.className = 'slot-card slot-empty';
      slotEl.innerHTML = `
        <div class="slot-index">${slotLabelNumbers[index]}</div>
        <div class="slot-content">
          <span class="slot-emoji">?</span>
          <span class="slot-label">等待抽選</span>
        </div>
      `;
      return;
    }

    slotEl.className = 'slot-card filled';
    slotEl.innerHTML = `
      <div class="slot-index">${slotLabelNumbers[index]}</div>
      <div class="slot-content">
        <span class="slot-emoji">${escapeHtml(category.emoji)}</span>
        <span class="slot-label">${escapeHtml(category.label)}</span>
      </div>
      <span class="slot-count">${category.places.length} 間</span>
    `;
  });
}

function renderRecommendations() {
  if (!selectedCategories.length) {
    recommendationsList.innerHTML = '<div class="empty-state">先按下「今晚吃什麼」，系統會抽出三個不同料理類型。</div>';
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
  if (!activeCategoryId) {
    activeCategoryEmoji.textContent = '🍜';
    activeCategoryTitle.textContent = '尚未抽選';
    activeCategoryMeta.textContent = '請先按下「今晚吃什麼」';
    activePlacesList.innerHTML = '<div class="empty-state">目前尚未抽出料理，先按下「今晚吃什麼」吧。</div>';
    return;
  }

  const category = foodCategories.find((item) => item.id === activeCategoryId);
  if (!category) {
    activeCategoryEmoji.textContent = '🍜';
    activeCategoryTitle.textContent = '尚未抽選';
    activeCategoryMeta.textContent = '請先按下「今晚吃什麼」';
    activePlacesList.innerHTML = '<div class="empty-state">找不到這個料理分類，請重新抽選一次。</div>';
    return;
  }

  activeCategoryEmoji.textContent = category.emoji;
  activeCategoryTitle.textContent = category.label;
  activeCategoryMeta.textContent = category.places.length
    ? `附近有 ${category.places.length} 間店家`
    : '這個料理分類目前沒有符合的店家';

  if (!category.places.length) {
    activePlacesList.innerHTML = '<div class="empty-state">這個料理分類目前沒有符合的店家。可以重新抽選，看看別的料理。</div>';
    return;
  }

  activePlacesList.innerHTML = category.places
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

function pickThreeCategories() {
  const available = foodCategories.filter((category) => category.places.length > 0);
  const pool = available.length >= 3 ? available : foodCategories;
  const shuffled = shuffle(pool.slice());
  selectedCategories = shuffled.slice(0, 3);
  activeCategoryId = selectedCategories[0]?.id || '';
  renderSlots();
  renderRecommendations();
  renderActiveCategory();
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function selectCategory(categoryId) {
  activeCategoryId = categoryId;
  renderRecommendations();
  renderActiveCategory();
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

function initApp() {
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
}

initApp();
