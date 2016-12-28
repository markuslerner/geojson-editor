// The Google Map.
var map;

// The HTML element that contains the drop container.
var dropContainer;
var panel;
var geoJsonInput;
var downloadLink;

var selectedDataFeature = null;
var polygon = null;

var snappingInProgess = false;

var settings = {};
settings.snapDistance = 25;
settings.zoomRatios = {
  20: 1128.497220,
  19: 2256.994440,
  18: 4513.988880,
  17: 9027.977761,
  16: 18055.955520,
  15: 36111.911040,
  14: 72223.822090,
  13: 144447.644200,
  12: 288895.288400,
  11: 577790.576700,
  10: 1155581.153000,
  9: 2311162.307000,
  8: 4622324.614000,
  7: 9244649.227000,
  6: 18489298.450000,
  5: 36978596.910000,
  4: 73957193.820000,
  3: 147914387.600000,
  2: 295828775.300000,
  1: 591657550.500000
};

function CustomControl(controlDiv, settings) {

  // Set CSS for the control border.
  var controlUI = document.createElement('div');
  controlUI.style.backgroundColor = '#fff';
  controlUI.style.border = '2px solid #fff';
  controlUI.style.borderRadius = '2px';
  controlUI.style.boxShadow = '0 1px 4px -1px rgba(0,0,0,.3)';
  controlUI.style.cursor = 'pointer';
  controlUI.style.marginBottom = '22px';
  controlUI.style.textAlign = 'center';
  controlUI.title = 'Click to recenter the map';
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior.
  var snapDistanceInput = document.createElement('input');
  snapDistanceInput.setAttribute('id', 'snap-distance');
  snapDistanceInput.setAttribute('type', 'number');
  snapDistanceInput.setAttribute('min', 0);
  snapDistanceInput.setAttribute('max', 100);
  snapDistanceInput.setAttribute('value', settings.snapDistance);
  snapDistanceInput.style.color = 'rgb(25,25,25)';
  snapDistanceInput.style.fontFamily = 'Roboto,Arial,sans-serif';
  snapDistanceInput.style.fontSize = '12px';
  snapDistanceInput.style.lineHeight = '12px';
  snapDistanceInput.style.paddingLeft = '5px';
  snapDistanceInput.style.paddingRight = '5px';
  controlUI.appendChild(snapDistanceInput);

  var label = document.createElement('label');
  label.setAttribute('for', 'snap-distance');
  label.style.color = 'rgb(25,25,25)';
  label.style.fontFamily = 'Roboto,Arial,sans-serif';
  label.style.fontSize = '12px';
  label.style.lineHeight = '20px';
  label.style.paddingLeft = '5px';
  label.style.paddingRight = '5px';
  label.style.float = 'left';
  label.innerHTML = 'Snap distance';
  controlUI.appendChild(label);

  snapDistanceInput.addEventListener('change', function(e) {
    // console.log(e.target.value);
    settings.snapDistance = e.target.value;
  });

}

function init() {
  // Initialise the map.
  map = new google.maps.Map(document.getElementById('map-holder'), {
    center: {lat: 0, lng: 0},
    zoom: 3
  });
  map.data.setControls(['Point', 'LineString', 'Polygon']);
  map.data.setControlPosition(google.maps.ControlPosition.TOP_RIGHT);
  map.data.setStyle({
    editable: false,
    draggable: false
  });
  map.addListener('click', handleMapClick);

  var customControlDiv = document.createElement('div');
  customControlDiv.style.marginTop = '5px';
  customControlDiv.style.marginRight = '10px';
  var customControl = new CustomControl(customControlDiv, settings);
  customControlDiv.index = 0;
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(customControlDiv);

  bindDataLayerListeners(map.data);

  // Retrieve HTML elements.
  dropContainer = document.getElementById('drop-container');
  panel = document.getElementById('panel');
  var mapContainer = document.getElementById('map-holder');
  geoJsonInput = document.getElementById('geojson-input');
  downloadLink = document.getElementById('download-link');

  // Resize the geoJsonInput textarea.
  resizeGeoJsonInput();

  // Set up the drag and drop events.
  // First on common events.
  [mapContainer, dropContainer].forEach(function(container) {
    google.maps.event.addDomListener(container, 'drop', handleDrop);
    google.maps.event.addDomListener(container, 'dragover', showPanel);
  });

  // Then map-specific events.
  google.maps.event.addDomListener(mapContainer, 'dragstart', showPanel);
  google.maps.event.addDomListener(mapContainer, 'dragenter', showPanel);

  // Then the overlay specific events (since it only appears once drag starts).
  google.maps.event.addDomListener(dropContainer, 'dragend', hidePanel);
  google.maps.event.addDomListener(dropContainer, 'dragleave', hidePanel);
  // Set up events for changing the geoJson input.
  google.maps.event.addDomListener(
      geoJsonInput,
      'input',
      refreshDataFromGeoJson);
  google.maps.event.addDomListener(
      geoJsonInput,
      'input',
      refreshDownloadLinkFromGeoJson);

  // Set up events for styling.
  google.maps.event.addDomListener(window, 'resize', resizeGeoJsonInput);
}
google.maps.event.addDomListener(window, 'load', init);

// Refresh different components from other components.
function refreshGeoJsonFromData() {
  map.data.toGeoJson(function(geoJson) {
    geoJsonInput.value = JSON.stringify(geoJson, null, 2);
    refreshDownloadLinkFromGeoJson();
  });
}

// Replace the data layer with a new one based on the inputted geoJson.
function refreshDataFromGeoJson() {
  deselectLastFeature();

  var newData = new google.maps.Data({
    map: map,
    style: map.data.getStyle(),
    controls: ['Point', 'LineString', 'Polygon']
  });
  try {
    var userObject = JSON.parse(geoJsonInput.value);
    var newFeatures = newData.addGeoJson(userObject);
  } catch (error) {
    newData.setMap(null);
    if (geoJsonInput.value !== "") {
      setGeoJsonValidity(false);
    } else {
      setGeoJsonValidity(true);
    }
    return;
  }
  // No error means GeoJSON was valid!
  map.data.setMap(null);
  map.data = newData;

  bindDataLayerListeners(newData);
  setGeoJsonValidity(true);

  setTimeout(fitMapToAllFeatures, 17);
  
}

// function handleMouseMove(path, index) {
//   return function(e) {
//     console.log('handleMouseMove()', e);
//     console.log(path);
//     console.log(index);

//     if(index !== undefined) {
//     	// e.stop();

//     	// console.log(e.latLng.toString());

//     	// snapPoint(path, index, e.latLng);

//     	// var latLng = path.getAt(index);

// 	  }

//   };
// }

function snapPoint(path, index) {
  if(settings.snapDistance === 0) {
    return false;
  }

  snappingInProgess = true;

  var latLng = path.getAt(index);
  // console.log(latLng.toString());

  var maxDistance = 0;
  var zoom = map.getZoom();
  if(settings.zoomRatios[zoom] !== undefined) {
    maxDistance = settings.zoomRatios[zoom] / 1000000000 * settings.snapDistance;
  }

  // snap point at index to all points of all other features:
  var snappingPoint = latLng;
  var snapped = false;

  map.data.forEach(function(feature) {
  	if(feature !== selectedDataFeature) {
	    var geometry = feature.getGeometry();
	    
	    geometry.forEachLatLng(function(latLng2) {
        var distance = getDistance(latLng, latLng2);
	      if(latLng !== latLng2 && distance < maxDistance) {
	        snappingPoint = latLng2;
          snapped = true;
          maxDistance = distance;
	      }
	    });
	}

  });

  path.setAt(index, snappingPoint);

  updateDataFeatureFromFeature();

  snappingInProgess = false;

  return snapped;
}

// Refresh download link.
function refreshDownloadLinkFromGeoJson() {
  downloadLink.href = "data:;base64," + btoa(geoJsonInput.value);
}

// Apply listeners to refresh the GeoJson display on a given data layer.
function bindDataLayerListeners(dataLayer) {
  dataLayer.addListener('addfeature', refreshGeoJsonFromData);
  dataLayer.addListener('removefeature', refreshGeoJsonFromData);
  dataLayer.addListener('setgeometry', refreshGeoJsonFromData);
  dataLayer.addListener('click', selectFeature);
}

function getDistanceManhattan(latLng1, latLng2) {
  var dLat = latLng1.lat() - latLng2.lat();
  var dLng = latLng1.lng() - latLng2.lng();
  return Math.abs(dLat) + Math.abs(dLng);
}

function getDistance(latLng1, latLng2) {
  var dLat = latLng1.lat() - latLng2.lat();
  var dLng = latLng1.lng() - latLng2.lng();
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function handleMapClick(e) {
  deselectLastFeature();
}

function selectFeature(e) {
  deselectLastFeature();

  selectedDataFeature = e.feature;

  convertDataFeatureToFeature();
}

function deselectLastFeature() {
  if(polygon !== null) {
    polygon.setMap(null);
    polygon = null;
  }
}

function convertDataFeatureToFeature() {
  var geometry = selectedDataFeature.getGeometry();
  
  polygon = null;

  switch(geometry.getType()) {
  	case 'Polygon':
      var paths = [];
      var linearRings = geometry.getArray();
      linearRings.forEach(function(linearRing) {
        var points = [];
        linearRing.forEachLatLng(function(latLng) {
          points.push(latLng);
        });
        paths.push(points);
      });

  	  polygon = new google.maps.Polygon({
	    paths: paths,
	    strokeColor: '#FF0000',
	    strokeOpacity: 0.8,
	    strokeWeight: 2,
	    editable: true,
	    fillColor: '#FF0000',
	    fillOpacity: 0.35
	  });
	  polygon.getPaths().forEach(addPathListeners);
	  break;

	case 'LineString':
      var points = [];
      geometry.forEachLatLng(function(latLng) {
        points.push(latLng);
      });

  	  polygon = new google.maps.Polyline({
	    path: points,
	    strokeColor: '#FF0000',
	    strokeOpacity: 0.8,
	    strokeWeight: 2,
	    editable: true
	  });
	  addPathListeners(polygon.getPath(), 0);
	  break;

  // case 'Point':
  //     polygon = new google.maps.Marker({
  //     position: geometry.get(),
  //     strokeColor: '#FF0000',
  //     strokeOpacity: 0.8,
  //     strokeWeight: 2,
  //     draggable: true
  //   });
  //   break;

  }

  if(polygon === null) {
  	return;
  } else {

	  polygon.setMap(map);

	  // google.maps.event.addListener(polygon, 'mousedown', function(e) {
	  //     console.log("mousedown", e.latLng.toString(), e);

	  //   // polygon.mouseMoveListener = google.maps.event.addListener(polygon, 'mousemove', handleMouseMove(path, e.vertex));

	  // //   polygon.mouseMoveListener = map.addListener('drag', function(event) {
	  //     // console.log("drag", event.latLng.toString());
	  // //  });

	  // });

	  // google.maps.event.addListener(polygon, 'mouseup', function(e) {
	  //     console.log("mouseup", e.latLng.toString());

	  //     // google.maps.event.removeListener(polygon.mouseMoveListener);
	  //     // map.removeListener(polygon.mouseMoveListener);
	  // });

	  google.maps.event.addListener(polygon, 'rightclick', function(e) {
	    console.log(e);

	    if(e.path !== undefined && e.vertex !== undefined) {
	      polygon.getPaths().getAt(e.path).removeAt(e.vertex);
	    }

	  });
	}

}

function updateDataFeatureFromFeature() {
  if(selectedDataFeature !== null && polygon !== null) {
    switch(selectedDataFeature.getGeometry().getType()) {
      case 'Polygon':
        var paths = [];
        polygon.getPaths().forEach(function(path) {
          var points = [];
          path.forEach(function(latLng) {
            points.push(latLng);
          });
          paths.push(points);
        });
        selectedDataFeature.setGeometry(new google.maps.Data.Polygon(paths));
        break;

      case 'LineString':
        var points = [];
        polygon.getPath().forEach(function(latLng) {
          points.push(latLng);
        });
        selectedDataFeature.setGeometry(new google.maps.Data.LineString(points));
        break;
    }

  }
}

function addPathListeners(path, pathIndex) {
	google.maps.event.addListener(path, 'set_at', function(index, oldLatLng) {
      // var newLatLng = path.getAt(index);
      // console.log("set_at", index);
      if(!snappingInProgess) {
        snapPoint(this, index);
      }

    });

    google.maps.event.addListener(path, 'insert_at', function(index) {
      // console.log("insert_at", index);
      if(!snappingInProgess) {
        snapPoint(this, index);
      }

    });

    google.maps.event.addListener(path, 'remove_at', function(index) {
      updateDataFeatureFromFeature();
    });
}

// Display the validity of geoJson.
function setGeoJsonValidity(newVal) {
  if (!newVal) {
    geoJsonInput.className = 'invalid';
  } else {
    geoJsonInput.className = '';
  }
}

// Control the drag and drop panel. Adapted from this code sample:
// https://developers.google.com/maps/documentation/javascript/examples/layer-data-dragndrop
function showPanel(e) {
  e.stopPropagation();
  e.preventDefault();
  dropContainer.className = 'visible';
  return false;
}

function hidePanel() {
  dropContainer.className = '';
}

function processPoints(geometry, callback, thisArg) {
  if (geometry instanceof google.maps.LatLng) {
    callback.call(thisArg, geometry);
  } else if (geometry instanceof google.maps.Data.Point) {
    callback.call(thisArg, geometry.get());
  } else {
    geometry.getArray().forEach(function(g) {
      processPoints(g, callback, thisArg);
    });
  }
}

function handleDrop(e) {
  deselectLastFeature();

  e.preventDefault();
  e.stopPropagation();
  hidePanel();

  var files = e.dataTransfer.files;
  if (files.length) {
    // process file(s) being dropped
    // grab the file data from each file
    for (var i = 0, file; file = files[i]; i++) {
      var reader = new FileReader();
      reader.onload = function(e) {
        map.data.addGeoJson(JSON.parse(e.target.result));
      };
      reader.onerror = function(e) {
        console.error('reading failed');
      };
      reader.readAsText(file);
    }
  } else {
    // process non-file (e.g. text or html) content being dropped
    // grab the plain text version of the data
    var plainText = e.dataTransfer.getData('text/plain');
    if (plainText) {
      map.data.addGeoJson(JSON.parse(plainText));
    }
  };

  setTimeout(fitMapToAllFeatures, 17);

  // prevent drag event from bubbling further
  return false;
}

function fitMapToAllFeatures() {
  var bounds = new google.maps.LatLngBounds();

  map.data.forEach(function(feature) {
    var geometry = feature.getGeometry();
    
    geometry.forEachLatLng(function(latLng) {
      bounds.extend(latLng);
    });

  });

  map.fitBounds(bounds);
}

// Styling related functions.
function resizeGeoJsonInput() {
  var geoJsonInputRect = geoJsonInput.getBoundingClientRect();
  var panelRect = panel.getBoundingClientRect();
  geoJsonInput.style.height = panelRect.bottom - geoJsonInputRect.top - 8 + "px";
}
