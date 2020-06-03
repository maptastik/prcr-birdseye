// GLOBALS
//// VARIABLES
const addressSearchBoxEl = document.getElementById("searchBox");
const addressSearchButtonEl = document.getElementById("addressSearchButton");
const addressSearchMarkerToggleEl = document.getElementById("addressSearchMarkerToggle");
const addressQueryBaseUrl = 'https://maps.raleighnc.gov/arcgis/rest/services/Locators/RaleighAddresses/GeocodeServer/findAddressCandidates?outFields=*&outSR=4326&f=json&Single+Line+Input=';
const parcelSearchBoxEl = document.getElementById("parcelSearchBox");
const parcelSearchButtonEl = document.getElementById("parcelSearchButton")
const parcelQueryBaseUrl = 'https://maps.wakegov.com/arcgis/rest/services/Property/Parcels/MapServer/0/query?f=json&outSR=4326&outFields=PIN_NUM&where=PIN_NUM='
const parcelSearchMarkerToggleEl = document.getElementById("parcelSearchMarkerToggle");
const parksCheckBox = document.getElementById('parksCheckBox');
const clearSearchButtonEl = document.getElementById("clearSearchButton");
const parksURL = 'https://opendata.arcgis.com/datasets/43b5d6bf9d6e400599498d052545d331_0.geojson';
const greenwaysCheckBox = document.getElementById('greenwaysCheckBox');
const greenwaysURL = 'https://opendata.arcgis.com/datasets/23836bb9145943d485252d9665020ff1_0.geojson';
const greenwayPropertiesCheckBoxEl = document.getElementById('greenwayPropertiesCheckBox');
const greenwayPropertiesURL = 'https://maps.raleighnc.gov/arcgis/rest/services/Parks/Greenway/MapServer/3/query?f=json&where=1=1&outSR=4326&geometryPrecision=7';

//// FUNCTIONS
////// UI
function toggleLayer(checkBox, layer) {
    if (checkBox.checked == true) {
        layer.setVisible(true)
    } else {
        layer.setVisible(false)
    }
}
////// Data
function esriJsonToGeoJson(data) {
    let features = []
    for (feature of data.features) {
        features.push(Terraformer.ArcGIS.parse(feature))
    }
    return turf.featureCollection(features)
}

// MAIN FUNCTION
function GetMap() {

    // Initialize map
    let map = new Microsoft.Maps.Map("#mapView", {
        mapTypeId: Microsoft.Maps.MapTypeId.aerial,
        center: new Microsoft.Maps.Location(35.80786, -78.641941),
        zoom: 12
    })

    let pushpinLayer = new Microsoft.Maps.Layer();
    let parcelPINLayer = new Microsoft.Maps.Layer();
    let parksLayer = new Microsoft.Maps.Layer();
    let greenwaysLayer = new Microsoft.Maps.Layer();
    let greenwayPropertiesLayer = new Microsoft.Maps.Layer();
    for (layer of [pushpinLayer, parcelPINLayer, parksLayer, greenwaysLayer, greenwayPropertiesLayer]) {
        map.layers.insert(layer)
    }

    greenwayPropertiesLayer.setVisible(false);

    // Search by address
    addressSearchButtonEl.addEventListener('click', () => {
        let addressQueryURL = `${addressQueryBaseUrl}${addressSearchBoxEl.value}`
        fetch(addressQueryURL)
            .then(result => result.json())
            .then(data => {
                console.log(data)
                let candidates = data.candidates;
                if (candidates.length > 0) {
                    let topCandidateLocation = candidates[0].location;
                    selectedSuggestion(topCandidateLocation.x, topCandidateLocation.y)
                } else {
                    alert("No results returned. Check to make sure you have spelled everything correctly. You may need to simplify.")
                }
            })
    })

    function selectedSuggestion(x, y) {
        pushpinLayer.clear()
        parcelPINLayer.clear()
        pushpinLayer.setVisible(true)
        let pushpinLocation = new Microsoft.Maps.Location(y, x);
        let pushpin = new Microsoft.Maps.Pushpin(pushpinLocation);
        pushpinLayer.add(pushpin)
        let rect = new Microsoft.Maps.LocationRect.fromLocations([pushpinLocation])
        rect.height = 0.005;
        rect.width = 0.005;
        console.log(rect)
        map.setView({
            bounds: rect
        })
    }

    // Toggles marker for searched address
    addressSearchMarkerToggleEl.addEventListener('change', () => {
        toggleLayer(addressSearchMarkerToggleEl, pushpinLayer)
    })

    // Search by parcel PIN
    parcelSearchButtonEl.addEventListener('click', () => {
        let parcelQueryURL = `${parcelQueryBaseUrl}${parcelSearchBoxEl.value}`
        parcelPINLayer.clear()
        pushpinLayer.clear()
        fetch(parcelQueryURL)
            .then(response => response.json())
            .then(data => {
                if (data.features.length > 0) {
                    let parcelPINGeoJson = esriJsonToGeoJson(data)

                    Microsoft.Maps.loadModule('Microsoft.Maps.GeoJson', () => {
                        let parcelPINFeatures = Microsoft.Maps.GeoJson.read(parcelPINGeoJson, {
                            polygonOptions: {
                                fillColor: 'rgba(0,0,0,0)',
                                strokeColor: 'rgb(0,255,255,0.9)',
                                strokeThickness: 2
                            }
                        });

                        parcelPINLayer.add(parcelPINFeatures)
                        parcelPINLayer.setVisible(true)
                        let parcelPINPrimitives = parcelPINLayer.getPrimitives()
                        let rect = Microsoft.Maps.LocationRect.fromShapes(parcelPINPrimitives)
                        map.setView({
                            bounds: rect,
                            padding: 80
                        })
                    })
                } else {
                    alert('No parcel with that PIN')

                }

            })
    });
    // Toggles marker for searched address
    parcelSearchMarkerToggleEl.addEventListener('change', () => {
        toggleLayer(parcelSearchMarkerToggleEl, parcelPINLayer)
    })

    // Clear search settings
    clearSearchButtonEl.addEventListener("click", () => {
        parcelPINLayer.clear();
        pushpinLayer.clear();
        parcelSearchBoxEl.value = '';
        parcelSearchMarkerToggleEl.checked = true;
        addressSearchBoxEl.value = '';
        addressSearchMarkerToggleEl.checked = true;

    })

    // Load Parks
    fetch(parksURL)
        .then(response => response.json())
        .then(data => {
            Microsoft.Maps.loadModule('Microsoft.Maps.GeoJson', () => {
                let parkFeatures = Microsoft.Maps.GeoJson.read(data, {
                    polygonOptions: {
                        fillColor: 'rgba(76,175,80, 0.3)',
                        strokeColor: '#121212',
                        strokeThickness: 0.5
                    }
                });
                parksLayer.add(parkFeatures)
            })
        })
    parksCheckBox.addEventListener('change', () => {
        toggleLayer(parksCheckBox, parksLayer)
    })

    // Load Greenways
    fetch(greenwaysURL)
        .then(response => response.json())
        .then(data => {
            Microsoft.Maps.loadModule('Microsoft.Maps.GeoJson', () => {
                let gwFeatures = Microsoft.Maps.GeoJson.read(data, {
                    polylineOptions: {
                        strokeColor: 'rgba(255,152,0,0.8)',
                        strokeThickness: 2
                    }
                })
                greenwaysLayer.add(gwFeatures)
            })
        })
    greenwaysCheckBox.addEventListener('change', () => {
        toggleLayer(greenwaysCheckBox, greenwaysLayer)
    })

    // Load Greenway Propeties
    fetch(greenwayPropertiesURL)
        .then(response => response.json())
        .then(data => {
            let greenwayPropertiesGeoJson = esriJsonToGeoJson(data)
            Microsoft.Maps.loadModule('Microsoft.Maps.GeoJson', () => {
                let greenwayPropertiesFeatures = Microsoft.Maps.GeoJson.read(greenwayPropertiesGeoJson, {
                    polygonOptions: {
                        fillColor: 'rgba(255,193,7,0.3)',
                        strokeColor: '#121212',
                        strokeThickness: 0
                    }
                })
                greenwayPropertiesLayer.add(greenwayPropertiesFeatures)
            })
        })
    greenwayPropertiesCheckBoxEl.addEventListener('change', () => {
        toggleLayer(greenwayPropertiesCheckBoxEl, greenwayPropertiesLayer)
    })
}