// The Google Map.
var map;

// The HTML element that contains the drop container.
var dropContainer;
var panel;
var geoJsonInput;
var downloadLink;
var searchInput, autocomplete, infowindow, infowindowContent, marker;

var selectedDataFeature = null;
var polygon = null;

var snappingInProgess = false;

var settings = {};
settings.snappingEnabled = true;
settings.snappingDistance = 25;
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
  var snappingEnabledInput = document.createElement('input');
  snappingEnabledInput.setAttribute('id', 'snapping-enabled');
  snappingEnabledInput.setAttribute('type', 'checkbox');
  snappingEnabledInput.setAttribute('value', 'enabled');
  if(settings.snappingEnabled) snappingEnabledInput.setAttribute('checked', 'checked');
  snappingEnabledInput.style.color = 'rgb(25,25,25)';
  snappingEnabledInput.style.fontFamily = 'Roboto,Arial,sans-serif';
  snappingEnabledInput.style.fontSize = '12px';
  snappingEnabledInput.style.lineHeight = '12px';
  snappingEnabledInput.style.paddingLeft = '5px';
  snappingEnabledInput.style.paddingRight = '5px';
  snappingEnabledInput.style.float = 'left';
  controlUI.appendChild(snappingEnabledInput);

  var snappingEnabledLabel = document.createElement('label');
  snappingEnabledLabel.setAttribute('for', 'snapping-enabled');
  snappingEnabledLabel.style.color = 'rgb(25,25,25)';
  snappingEnabledLabel.style.fontFamily = 'Roboto,Arial,sans-serif';
  snappingEnabledLabel.style.fontSize = '12px';
  snappingEnabledLabel.style.lineHeight = '20px';
  snappingEnabledLabel.style.paddingLeft = '5px';
  snappingEnabledLabel.style.paddingRight = '5px';
  snappingEnabledLabel.style.float = 'left';
  snappingEnabledLabel.innerHTML = 'snap to points, distance:';
  controlUI.appendChild(snappingEnabledLabel);

  var snappingDistanceInput = document.createElement('input');
  snappingDistanceInput.setAttribute('id', 'snapping-distance');
  snappingDistanceInput.setAttribute('type', 'number');
  snappingDistanceInput.setAttribute('min', 0);
  snappingDistanceInput.setAttribute('max', 100);
  snappingDistanceInput.setAttribute('value', settings.snappingDistance);
  snappingDistanceInput.style.color = 'rgb(25,25,25)';
  snappingDistanceInput.style.fontFamily = 'Roboto,Arial,sans-serif';
  snappingDistanceInput.style.fontSize = '12px';
  snappingDistanceInput.style.lineHeight = '12px';
  snappingDistanceInput.style.paddingLeft = '5px';
  snappingDistanceInput.style.paddingRight = '5px';
  snappingDistanceInput.style.textAlign = 'right';
  controlUI.appendChild(snappingDistanceInput);

  var snappingDistanceLabel = document.createElement('label');
  snappingDistanceLabel.setAttribute('for', 'snapping-distance');
  snappingDistanceLabel.style.color = 'rgb(25,25,25)';
  snappingDistanceLabel.style.fontFamily = 'Roboto,Arial,sans-serif';
  snappingDistanceLabel.style.fontSize = '12px';
  snappingDistanceLabel.style.lineHeight = '20px';
  snappingDistanceLabel.style.paddingLeft = '5px';
  snappingDistanceLabel.style.paddingRight = '5px';
  snappingDistanceLabel.style.float = 'right';
  snappingDistanceLabel.innerHTML = 'px';
  controlUI.appendChild(snappingDistanceLabel);

  snappingEnabledInput.addEventListener('change', function(e) {
    settings.snappingEnabled = e.target.checked;
    deselectLastFeature();
  });

  snappingDistanceInput.addEventListener('focus', function(e) {
    deselectLastFeature();
  });

  snappingDistanceInput.addEventListener('change', function(e) {
    // console.log(e.target.value);
    settings.snappingDistance = e.target.value;
    deselectLastFeature();
  });

}

function createAutoComplete() {
  searchInput = document.getElementById('pac-input');
  autocomplete = new google.maps.places.Autocomplete(searchInput);

  // Bind the map's bounds (viewport) property to the autocomplete object,
  // so that the autocomplete requests use the current map bounds for the
  // bounds option in the request.
  autocomplete.bindTo('bounds', map);

  // Set the data fields to return when the user selects a place.
  autocomplete.setFields(['address_components', 'geometry', 'icon', 'name']);

  infowindow = new google.maps.InfoWindow();
  infowindowContent = document.getElementById('infowindow-content');
  infowindow.setContent(infowindowContent);

  if(marker === undefined) {
    marker = new google.maps.Marker({
      map,
    });
  }

  var mapSearchfieldClear = document.getElementById('map-searchfield-clear');
  mapSearchfieldClear.addEventListener('click', function() {
    searchInput.value = '';
    marker.setVisible(false);
    infowindow.close();
  });

  autocomplete.addListener('place_changed', function() {
    infowindow.close();
    marker.setVisible(false);

    var place = autocomplete.getPlace();
    if(!place.geometry) {
      // User entered the name of a Place that was not suggested and
      // pressed the Enter key, or the Place Details request failed.
      // window.alert('No details available for input: \'' + place.name + '\'');
      return;
    }

    // If the place has a geometry, then present it on a map.
    if(place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);
    }
    marker.setPosition(place.geometry.location);
    marker.setVisible(true);
    // updateLocation(place.geometry.location.lat(), place.geometry.location.lng());

    // var address = '';
    // if(place.address_components) {
    //   address = [
    //     ((place.address_components[2] && place.address_components[2].short_name) || '')
    //   ].join(' ');
    // }

    // infowindowContent.children['place-icon'].src = place.icon;
    infowindowContent.children['place-name'].textContent = place.name;
    // infowindowContent.children['place-address'].textContent = address;
    infowindow.open(map, marker);

  });
}

function init() {
  // Initialise the map.
  map = new google.maps.Map(document.getElementById('map-holder'), {
    center: {lat: 0, lng: 0},
    zoom: 3,
    mapTypeControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT
    },
    streetViewControl: false
  });
  map.data.setControls(['Point', 'LineString', 'Polygon']);
  map.data.setControlPosition(google.maps.ControlPosition.TOP_RIGHT);
  map.data.setStyle({
    editable: false,
    draggable: false
  });
  map.addListener('click', handleMapClick);
  document.addEventListener('keydown', handleKeyDown);

  var customControlDiv = document.createElement('div');
  customControlDiv.style.marginTop = '10px';
  customControlDiv.style.marginRight = '10px';
  var customControl = new CustomControl(customControlDiv, settings);
  customControlDiv.index = 1;
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(customControlDiv);

  bindDataLayerListeners(map.data);

  // Retrieve HTML elements.
  dropContainer = document.getElementById('drop-container');
  panel = document.getElementById('panel');
  var mapContainer = document.getElementById('map-holder');
  geoJsonInput = document.getElementById('geojson-input');
  downloadLink = document.getElementById('download-link');

  createAutoComplete();

  // Resize the geoJsonInput textarea.
  resizeGeoJsonInput();

  // Set up the drag and drop events.
  // First on common events.
  [geoJsonInput, mapContainer, dropContainer].forEach(function(container) {
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

function snapPointOnPath(path, index) {
  if(settings.snappingDistance === 0) {
    return false;
  }

  snappingInProgess = true;

  var latLng = path.getAt(index);

  var snappedPoint = settings.snappingEnabled ? getSnappedPoint(latLng) : latLng;

  try {
    path.setAt(index, snappedPoint);
  } catch(e) {
    console.error('Error setting point: ' + e);
  }

  updateDataFeatureFromFeature();

  snappingInProgess = false;

  var snapped = snappedPoint !== latLng;
  return snapped;
}

function getSnappedPoint(latLng) {
  var maxDistance = 0;
  var zoom = map.getZoom();
  if(settings.zoomRatios[zoom] !== undefined) {
    maxDistance = settings.zoomRatios[zoom] / 1000000000 * settings.snappingDistance;
  }
  var maxDistanceSquared = maxDistance * maxDistance;

  // snap point at index to all points of all other features:
  var snappedPoint = latLng;

  map.data.forEach(function(feature) {
    if(feature !== selectedDataFeature) {
      var geometry = feature.getGeometry();

      geometry.forEachLatLng(function(latLng2) {
        var distanceSquared = getDistanceSquared(latLng, latLng2);
        if(distanceSquared < maxDistanceSquared) {
          snappedPoint = latLng2;
          maxDistanceSquared = distanceSquared;
        }
      });
    }
  });

  return snappedPoint;
}

// Refresh download link.
function refreshDownloadLinkFromGeoJson() {
  let value = geoJsonInput.value;
  // value = value.replace(/[^\x20-\x7E]+/g, ""); // replace non-ascii characters
  // value = Base64.encode(value);
  value = unescape(encodeURIComponent(value));
  downloadLink.href = "data:;base64," + btoa(value);
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

function getDistanceSquared(latLng1, latLng2) {
  var dLat = latLng1.lat() - latLng2.lat();
  var dLng = latLng1.lng() - latLng2.lng();
  return dLat * dLat + dLng * dLng;
}

function handleMapClick(e) {
  deselectLastFeature();
}

function handleKeyDown(e) {
  if(e.key === 'Backspace' || e.key === 'Delete') {
    if(selectedDataFeature !== null) {
      map.data.remove(selectedDataFeature);
      deselectLastFeature();
    }
  }
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
    selectedDataFeature = null;
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

    case 'Point':
      polygon = new google.maps.Marker({
        position: geometry.get(),
        draggable: true
      });
      polygon.addListener('dragend', function(e) {
      	if(settings.snappingEnabled) {
       	  var snappedPoint = getSnappedPoint(e.latLng);
    	  polygon.setPosition(snappedPoint);
    	}
        updateDataFeatureFromFeature();
      });
      break;

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
     if(e.path !== undefined && e.vertex !== undefined) {
       var path = polygon.getPaths().getAt(e.path);

       if(path.getArray().length > 3) {
        path.removeAt(e.vertex);
       }
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

      case 'Point':
        selectedDataFeature.setGeometry(new google.maps.Data.Point(polygon.getPosition()));
        break;

    }

  }
}

function addPathListeners(path, pathIndex) {
	google.maps.event.addListener(path, 'set_at', function(index, oldLatLng) {
    // var newLatLng = path.getAt(index);
    // console.log("set_at", index, snappingInProgess);
    if(!snappingInProgess) {
      snapPointOnPath(this, index);
    }

  });

  google.maps.event.addListener(path, 'insert_at', function(index) {
    // console.log("insert_at", index);
    if(!snappingInProgess) {
      snapPointOnPath(this, index);
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

function deleteAllFeatures() {
  map.data.forEach(function(feature) {
    // If you want, check here for some constraints.
    map.data.remove(feature);
  });
}

function handleDrop(e) {
  deselectLastFeature();
  deleteAllFeatures();

  e.preventDefault();
  e.stopPropagation();
  hidePanel();

  var files = e.dataTransfer.files;
  if(files.length) {
    // process file(s) being dropped
    // grab the file data from each file
    for(var i = 0, file; file = files[i]; i++) {
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
  geoJsonInput.style.height = panelRect.bottom - geoJsonInputRect.top - 50 + "px";
}
