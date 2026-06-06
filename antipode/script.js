const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const primaryCoords = document.getElementById("primary-coords");
const antipodeCoords = document.getElementById("antipode-coords");

const primaryMap = L.map("map-primary", {
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  zoomControl: true,
  worldCopyJump: true,
});

const antipodeMap = L.map("map-antipode", {
  center: getAntipode(DEFAULT_CENTER[0], DEFAULT_CENTER[1]),
  zoom: DEFAULT_ZOOM,
  zoomControl: true,
  worldCopyJump: true,
});

const tileLayerOptions = {
  attribution: TILE_ATTRIBUTION,
  maxZoom: 19,
};

L.tileLayer(TILE_URL, tileLayerOptions).addTo(primaryMap);
L.tileLayer(TILE_URL, tileLayerOptions).addTo(antipodeMap);

window.antipodeApp = {
  primaryMap,
  antipodeMap,
  getAntipode,
};

let isSyncing = false;

syncFrom(primaryMap, antipodeMap);
updateLabels(primaryMap.getCenter());

primaryMap.on("move", () => syncFrom(primaryMap, antipodeMap));
primaryMap.on("zoom", () => syncFrom(primaryMap, antipodeMap));
antipodeMap.on("move", () => syncFrom(antipodeMap, primaryMap));
antipodeMap.on("zoom", () => syncFrom(antipodeMap, primaryMap));

window.addEventListener("antipode:set-center", (event) => {
  const detail = event.detail ?? {
    lat: Number.parseFloat(document.body.dataset.antipodeLat ?? ""),
    lng: Number.parseFloat(document.body.dataset.antipodeLng ?? ""),
    zoom: Number.parseFloat(document.body.dataset.antipodeZoom ?? ""),
  };
  const { lat, lng, zoom } = detail;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return;
  }

  primaryMap.setView([lat, lng], typeof zoom === "number" ? zoom : primaryMap.getZoom(), {
    animate: false,
  });
});

window.addEventListener("resize", () => {
  primaryMap.invalidateSize();
  antipodeMap.invalidateSize();
});

function syncFrom(sourceMap, targetMap) {
  if (isSyncing) {
    return;
  }

  isSyncing = true;

  const sourceCenter = sourceMap.getCenter();
  const antipodeCenter = getAntipode(sourceCenter.lat, sourceCenter.lng);
  const targetZoom = sourceMap.getZoom();

  targetMap.setView(antipodeCenter, targetZoom, {
    animate: false,
    reset: false,
  });

  updateLabels(sourceMap === primaryMap ? sourceCenter : L.latLng(antipodeCenter));

  isSyncing = false;
}

function getAntipode(lat, lng) {
  const antipodeLat = -lat;
  const antipodeLng = normalizeLongitude(lng + 180);
  return [antipodeLat, antipodeLng];
}

function normalizeLongitude(lng) {
  return ((lng + 540) % 360) - 180;
}

function updateLabels(primaryCenter) {
  const antipodeCenter = getAntipode(primaryCenter.lat, primaryCenter.lng);
  primaryCoords.textContent = formatCoords(primaryCenter.lat, primaryCenter.lng);
  antipodeCoords.textContent = formatCoords(antipodeCenter[0], antipodeCenter[1]);
}

function formatCoords(lat, lng) {
  return `${formatCoordinate(lat, "N", "S")}, ${formatCoordinate(lng, "E", "W")}`;
}

function formatCoordinate(value, positiveLabel, negativeLabel) {
  const absoluteValue = Math.abs(value).toFixed(4);
  const direction = value >= 0 ? positiveLabel : negativeLabel;
  return `${absoluteValue}° ${direction}`;
}
