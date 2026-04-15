// ArcGIS modules will be loaded at runtime via $arcgis.import
let Map, MapView, GraphicsLayer, TileLayer, VectorTileLayer, FeatureLayer, SketchViewModel, Basemap;
let Extent, SimpleMarkerSymbol, SpatialReference, Graphic, Point, SimpleRenderer, SimpleLineSymbol;
let addressToLocations, locationToAddress, PopupTemplate, geometryService, BufferParameters, Query;
let Legend, Expand, LayerList, Compass, Locate, locator;

let view;
let highlightGraphic;
let parcelHighlightLayer; // Globally scoped GraphicsLayer for highlighting polygons
let parcelLayer; // Globally scoped FeatureLayer for querying

const addProject = {
    createMap: createMap,
    enableCursorCoordinates: enableCursorCoordinates,
    enableAddressSuggest: enableAddressSuggest,
    goToLocation: goToLocation
};

async function ensureArcGIS() {
    if (Map) return; 
    try {
        const _Map = await $arcgis.import("@arcgis/core/Map.js");
        Map = _Map && (_Map.default ?? _Map);

        const _MapView = await $arcgis.import("@arcgis/core/views/MapView.js");
        MapView = _MapView && (_MapView.default ?? _MapView);

        const _SpatialRef = await $arcgis.import("@arcgis/core/geometry/SpatialReference.js");
        SpatialReference = _SpatialRef && (_SpatialRef.default ?? _SpatialRef);

        const _Basemap = await $arcgis.import("@arcgis/core/Basemap.js");
        Basemap = _Basemap && (_Basemap.default ?? _Basemap);

        const _TileLayer = await $arcgis.import("@arcgis/core/layers/TileLayer.js");
        TileLayer = _TileLayer && (_TileLayer.default ?? _TileLayer);

        const _VectorTileLayer = await $arcgis.import("@arcgis/core/layers/VectorTileLayer.js");
        VectorTileLayer = _VectorTileLayer && (_VectorTileLayer.default ?? _VectorTileLayer);

        const _GraphicsLayer = await $arcgis.import("@arcgis/core/layers/GraphicsLayer.js");
        GraphicsLayer = _GraphicsLayer && (_GraphicsLayer.default ?? _GraphicsLayer);

        const _Extent = await $arcgis.import("@arcgis/core/geometry/Extent.js");
        Extent = _Extent && (_Extent.default ?? _Extent);

        const _SimpleMarker = await $arcgis.import("@arcgis/core/symbols/SimpleMarkerSymbol.js");
        SimpleMarkerSymbol = _SimpleMarker && (_SimpleMarker.default ?? _SimpleMarker);

        const _Compass = await $arcgis.import("@arcgis/core/widgets/Compass.js");
        Compass = _Compass && (_Compass.default ?? _Compass);

        const _Locate = await $arcgis.import("@arcgis/core/widgets/Locate.js");
        Locate = _Locate && (_Locate.default ?? _Locate);

        const _FeatureLayer = await $arcgis.import("@arcgis/core/layers/FeatureLayer.js");
        FeatureLayer = _FeatureLayer && (_FeatureLayer.default ?? _FeatureLayer);

        const _locator = await $arcgis.import("@arcgis/core/rest/locator.js");
        locator = _locator && (_locator.default ?? _locator);

        const _Graphic = await $arcgis.import("@arcgis/core/Graphic.js");
        Graphic = _Graphic && (_Graphic.default ?? _Graphic);

        geometryService = await $arcgis.import("@arcgis/core/rest/geometryService.js");
        
        console.log('main.js: ArcGIS modules loaded');
    } catch (err) {
        console.error('main.js: failed to load ArcGIS modules', err);
        throw err;
    }
}

async function waitForMapDiv() {
    while (!document.getElementById("mapDiv")) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function createMap() {
    await waitForMapDiv();
    await ensureArcGIS();

    var basemap = new Basemap({
        baseLayers: [
            new TileLayer({
                url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
            }),
            new VectorTileLayer({
                url: "https://www.arcgis.com/sharing/rest/content/items/30d6b8271e1849cd9c3042060001f425/resources/styles/root.json",
                id: 'hybridRef'
            })
        ]
    });

    const map = new Map({ basemap: basemap });

    // Assign to the global 'view' variable
    view = new MapView({
        container: "mapDiv",
        map: map,
        zoom: 9,
        center: [-75.5244, 39.1582] // Center of Delaware
    });

    view.padding = {
        top: 80,
        right: 10,
        bottom: 8
    };

    view.ui.move("zoom", "top-right");

    const compass = new Compass({ view });
    view.ui.add(compass, "top-right");

    const locate = new Locate({ 
        view: view,
        useHeadingEnabled: false,
        goToOverride: function(view, options) {
            options.target.scale = 1500;
            return view.goTo(options.target);
        },
        geolocationOptions: {
            maximumAge: 0,
            timeout: 15000,
            enableHighAccuracy: false
        }
    });

    locate.on("locate-error", function(event) {
        console.error("Locate error: ", event.error.message);
        alert("Locate failed: " + event.error.message + "\n\nPlease ensure Location Services are enabled in Windows Settings and your browser has permission.");
    });

    view.ui.add(locate, "top-right");

    // Load FeatureLayer module first if not already loaded
    parcelLayer = new FeatureLayer({
        url: "https://firstmap.delaware.gov/arcgis/rest/services/PlanningCadastre/Parcels/FeatureServer/0",
        outFields: ["*"], // Returns all fields for the query later
        opacity: 0.5 // Optionally make it slightly transparent if desired
    });

    // We optionally add it to map so the user can see parcel outlines
    map.add(parcelLayer);

    // Initialize the globally scoped graphics layer for polygon highlights
    parcelHighlightLayer = new GraphicsLayer();
    map.add(parcelHighlightLayer);

    // Zoom to clicked location and drop/update highlight
    view.on("click", async (event) => {
        if (!event.mapPoint) return;
        const { longitude, latitude } = event.mapPoint;
        view.goTo({ center: [longitude, latitude], zoom: 17 });

        if (highlightGraphic) {
            view.graphics.remove(highlightGraphic);
            highlightGraphic = null;
        }

        if (Graphic) {
            highlightGraphic = new Graphic({
                geometry: {
                    type: "point",
                    x: event.mapPoint.longitude,
                    y: event.mapPoint.latitude,
                    spatialReference: { wkid: 4326 }
                },
                symbol: {
                    type: "simple-marker",
                    style: "circle",
                    size: 14,
                    color: [255, 0, 0, 0.9],
                    outline: null
                }
            });
            view.graphics.add(highlightGraphic);
        }

        // Call the reusable feature selection function
        await selectParcel(event.mapPoint);
    });
}

// Dedicated function for handling parcel selection and rendering
async function selectParcel(point) {
    if (!parcelLayer || !parcelHighlightLayer || !Graphic) return;

    try {
        const query = parcelLayer.createQuery();
        query.geometry = {
            type: "point",
            x: point.longitude,
            y: point.latitude,
            spatialReference: { wkid: 4326 }
        };
        query.spatialRelationship = "intersects";
        query.returnGeometry = true;
        query.outSpatialReference = { wkid: 4326 }; // Ensures the returned polygon also matches
        query.outFields = ["*"];

        const results = await parcelLayer.queryFeatures(query);
        console.log("Features found:", results?.features?.length || 0, results);

        if (results.features && results.features.length > 0) {
            // Take the search result geometry
            const featureGeometry = results.features[0].geometry;

            // Create a new Graphic object using that geometry
            const parcelGraphic = new Graphic({
                geometry: featureGeometry,
                symbol: {
                    type: "simple-fill",
                    color: [0, 100, 255, 0.3], // Semi-transparent blue color
                    outline: {
                        color: [0, 100, 255, 1], // Solid blue outline
                        width: 2
                    }
                },
                attributes: results.features[0].attributes // Copy fields just in case
            });

            // Clear any existing graphics from the GraphicsLayer and add this new graphic
            parcelHighlightLayer.removeAll();
            parcelHighlightLayer.add(parcelGraphic);
        } else {
            // Nothing found - optionally clear the selection map
            parcelHighlightLayer.removeAll();
        }
    } catch (error) {
        console.error("Parcel query failed: ", error);
    }
}

function enableCursorCoordinates(displayId) {
    const el = document.getElementById(displayId);
    if (!el || !view) return;

    view.on("pointer-move", (event) => {
        const mapPoint = view.toMap(event);
        if (!mapPoint) return;
        const lat = mapPoint.latitude?.toFixed(6) ?? "-";
        const lon = mapPoint.longitude?.toFixed(6) ?? "-";
        el.textContent = `Lat: ${lat}, Lon: ${lon}`;
    });
}

async function enableAddressSuggest(inputId, suggestionsContainerId) {
    // Map creation already loads ArcGIS. We don't rely on locator.suggestLocations here; use REST fetch for reliability.
    const input = document.getElementById(inputId);
    const list = document.getElementById(suggestionsContainerId);
    if (!input || !list) return;

    const geocodeSuggestUrl = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest";
    const geocodeFindUrl = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";
    // Delaware bounding box to bias/limit suggestions
    const searchExtent = {
        xmin: -75.789,
        ymin: 38.451,
        xmax: -74.986,
        ymax: 39.839,
        spatialReference: { wkid: 4326 }
    };
    let debounceHandle;

    const clearList = () => {
        list.innerHTML = "";
        list.style.display = "none";
    };

    const selectLocation = async (text) => {
        if (!view) return;
        try {
            const url = `${geocodeFindUrl}?f=json` +
                `&singleLine=${encodeURIComponent(text)}` +
                `&maxLocations=1` +
                `&outFields=*` +
                `&countryCode=USA` +
                `&searchExtent=${encodeURIComponent(JSON.stringify(searchExtent))}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`Find HTTP ${resp.status}`);
            const data = await resp.json();
            const candidates = data?.candidates ?? [];
            if (candidates.length === 0) return;
            const loc = candidates[0].location;
            if (loc && typeof loc.x === "number" && typeof loc.y === "number") {
                view.goTo({ center: [loc.x, loc.y], zoom: 17 });

                if (highlightGraphic) {
                    view.graphics.remove(highlightGraphic);
                    highlightGraphic = null;
                }

                if (Graphic) {
                    highlightGraphic = new Graphic({
                        geometry: {
                            type: "point",
                            x: loc.x,
                            y: loc.y,
                            spatialReference: { wkid: 4326 }
                        },
                        symbol: {
                            type: "simple-marker",
                            style: "circle",
                            size: 14,
                            color: [255, 0, 0, 0.9],
                            outline: null
                        }
                    });
                    view.graphics.add(highlightGraphic);
                }
            }
        } catch (err) {
            console.error("main.js: address select/zoom failed", err);
        }
    };

    input.addEventListener("blur", () => {
        setTimeout(clearList, 150);
    });

    input.addEventListener("input", () => {
        const text = input.value.trim();
        clearTimeout(debounceHandle);

        if (!text) {
            clearList();
            return;
        }

        debounceHandle = setTimeout(async () => {
            try {
                const url = `${geocodeSuggestUrl}?f=json` +
                    `&text=${encodeURIComponent(text)}` +
                    `&maxSuggestions=10` +
                    `&countryCode=USA` +
                    `&searchExtent=${encodeURIComponent(JSON.stringify(searchExtent))}`;
                const resp = await fetch(url);
                if (!resp.ok) throw new Error(`Suggest HTTP ${resp.status}`);
                const data = await resp.json();
                const results = data?.suggestions ?? [];

                if (!results || results.length === 0) {
                    clearList();
                    return;
                }

                list.innerHTML = results
                    .map(r => `<div class="address-suggest-item" data-value="${(r.text || "").replace(/"/g, '&quot;')}">${r.text || ""}</div>`)
                    .join("");
                list.style.display = "block";

                [...list.querySelectorAll('.address-suggest-item')].forEach(item => {
                    item.addEventListener('mousedown', () => {
                        input.value = item.getAttribute('data-value') ?? item.textContent;
                        clearList();
                        const chosen = item.getAttribute('data-value') ?? item.textContent ?? "";
                        if (chosen) selectLocation(chosen);
                    });
                });
            } catch (err) {
                console.error("main.js: address suggest failed", err);
                clearList();
            }
        }, 200);
    });
}

function goToLocation(longitude, latitude) {
    if (!view) return;

    view.goTo({ center: [longitude, latitude], zoom: 17 });

    if (highlightGraphic) {
        view.graphics.remove(highlightGraphic);
        highlightGraphic = null;
    }

    if (Graphic) {
        highlightGraphic = new Graphic({
            geometry: {
                type: "point",
                x: longitude,
                y: latitude,
                spatialReference: { wkid: 4326 }
            },
            symbol: {
                type: "simple-marker",
                style: "circle",
                size: 14,
                color: [255, 0, 0, 0.9],
                outline: null
            }
        });
        view.graphics.add(highlightGraphic);
    }
}

window.addProject = addProject;