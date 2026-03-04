// ArcGIS modules will be loaded at runtime via $arcgis.import
let Map, MapView, GraphicsLayer, TileLayer, VectorTileLayer, FeatureLayer, SketchViewModel, Basemap;
let Extent, SimpleMarkerSymbol, SpatialReference, Graphic, Point, SimpleRenderer, SimpleLineSymbol;
let addressToLocations, locationToAddress, PopupTemplate, geometryService, BufferParameters, Query;
let Legend, Expand, LayerList, Compass, Locate;

let view;

const addProject = {
    createMap: createMap
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

        const _Extent = await $arcgis.import("@arcgis/core/geometry/Extent.js");
        Extent = _Extent && (_Extent.default ?? _Extent);

        const _SimpleMarker = await $arcgis.import("@arcgis/core/symbols/SimpleMarkerSymbol.js");
        SimpleMarkerSymbol = _SimpleMarker && (_SimpleMarker.default ?? _SimpleMarker);

        const _Compass = await $arcgis.import("@arcgis/core/widgets/Compass.js");
        Compass = _Compass && (_Compass.default ?? _Compass);

        const _Locate = await $arcgis.import("@arcgis/core/widgets/Locate.js");
        Locate = _Locate && (_Locate.default ?? _Locate);

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

    const locate = new Locate({ view });
    view.ui.add(locate, "top-right");
}

window.addProject = addProject;