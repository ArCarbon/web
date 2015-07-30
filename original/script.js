var app = angular.module('StarterApp', ['ngMaterial', 'auth0', 'angular-storage', 'angular-jwt']);

app.config(function (authProvider) {
  authProvider.init({
    domain: 'craigsnyders.eu.auth0.com',
    clientID: 'a6UdPChDVcXFOuzWiJjI8Whudzq3orgg'
  });
});

app.run(function(auth) {
  // This hooks all auth events to check everything as soon as the app starts
  auth.hookEvents();
});

app.controller('LoginCtrl', ['$scope', '$http', 'auth', 'store', '$location',
function ($scope, $http, auth, store, $location) {
  $scope.login = function () {
    auth.signin({}, function (profile, token) {
      // Success callback
      store.set('profile', profile);
      store.set('token', token);
      $location.path('/');
    }, function () {
      // Error callback
    });
  }
}]);

app.controller('AppCtrl', ['$scope', '$mdSidenav', function($scope, $mdSidenav) {

    $scope.farmShowing = true;
    $scope.projectShowing = true;

    $scope.toggleSidenav = function(menuId) {
        $mdSidenav(menuId).toggle();
    };


    $scope.toggleFeature = function() {
        $scope.farmShowing = !$scope.farmShowing;
        if (map.hasLayer(featureLayer)) {
            map.removeLayer(featureLayer);
            this.className = '';
        }
        else {
            map.addLayer(featureLayer);
            this.className = 'active';
        }
    }

    $scope.toggleFeatureGroup = function() {
        $scope.projectShowing = !$scope.projectShowing;
        if (map.hasLayer(featureGroup)) {
            map.removeLayer(featureGroup);
            this.className = '';
        }
        else {
            map.addLayer(featureGroup);
            this.className = 'active';
        }
    }


}]);




L.mapbox.accessToken = 'pk.eyJ1IjoiamVyZW15ZXZhbnMiLCJhIjoiZTYyY2E2MDUyZGVkMTJiZjdjNGUzNjE3MWU3MDdhODYifQ.PZpDGrNiRrwUvP8TpnoQ5w';
var map = L.mapbox.map('map').setView([51.189, -0.654], 15);
var layers = document.getElementById('menu-ui');

addLayer(L.mapbox.tileLayer('mapbox.streets'), 'Base Map', 1);
// addLayer(L.mapbox.tileLayer('jeremyevans.765a2692'), 'Jeremy', 2);
// addLayer(L.mapbox.tileLayer('examples.bike-locations'), 'Bike Stations', 3);

function addLayer(layer, name, zIndex) {
    layer
        .setZIndex(zIndex)
        .addTo(map);

    // Create a simple layer switcher that
    // toggles layers on and off.
    /*var link = document.createElement('a');
    link.href = '#';
    link.className = 'active';
    link.innerHTML = name;

    link.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (map.hasLayer(layer)) {
            map.removeLayer(layer);
            this.className = '';
        }
        else {
            map.addLayer(layer);
            this.className = 'active';
        }
    };

    layers.appendChild(link);*/
}



var featureLayer = L.mapbox.featureLayer()
    .addTo(map);

featureLayer.loadURL('farm.geojson');





var featureGroup = L.featureGroup().addTo(map);

// Define circle options
// http://leafletjs.com/reference.html#circle
var circle_options = {
    color: '#fff', // Stroke color
    opacity: 1, // Stroke opacity
    weight: 10, // Stroke weight
    fillColor: '#000', // Fill color
    fillOpacity: 0.6 // Fill opacity
};

var circle_one = L.circle([38.89415, -77.03738], 20, circle_options).addTo(featureGroup);
var circle_two = L.circle([38.89415, -77.03578], 20, circle_options).addTo(featureGroup);

// Create array of lat,lon points
var line_points = [
    [38.893596444352134, -77.0381498336792],
    [38.89337933372204, -77.03792452812195],
    [38.89316222242831, -77.03761339187622],
    [38.893028615148424, -77.03731298446655],
    [38.892920059048464, -77.03691601753235],
    [38.892903358095296, -77.03637957572937],
    [38.89301191422077, -77.03592896461487],
    [38.89316222242831, -77.03549981117249],
    [38.89340438498248, -77.03514575958252],
    [38.893596444352134, -77.0349633693695]
];

// Define polyline options
// http://leafletjs.com/reference.html#polyline
var polyline_options = {
    color: '#000'
};

// Defining a polygon here instead of a polyline will connect the
// endpoints and fill the path.
// http://leafletjs.com/reference.html#polygon
var polyline = L.polyline(line_points, polyline_options).addTo(featureGroup);

var drawControl = new L.Control.Draw({
    edit: {
        featureGroup: featureGroup
    }
}).addTo(map);

map.on('draw:created', function(e) {
    e.layer
    featureGroup.addLayer(e.layer);
    console.log(e.layer);
});