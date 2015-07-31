angular.module('sample.home', ['auth0', 'osel-search']).service('home-service', ['$http', '$window', 'auth', 'store', '$q', '$rootScope', 'login-service', '$mdToast', function($http, $window, auth, store, $q, $rootScope, loginService, $mdToast) {

  var service = this;

  var folderPrefix = 'json/';
  var bucket = new $window.AWS.S3({
    params: {
      Bucket: 'arcarbon.user.data'
    }
  });

  // watch localstorage, until aws credentials are available
  $rootScope.$watch(function() {
    return store.get('awsCredentials');
  }, function(awsCredentials) {
    if (awsCredentials) {
      bucket.config.credentials = new $window.AWS.Credentials(awsCredentials.AccessKeyId, awsCredentials.SecretAccessKey, awsCredentials.SessionToken);
      console.log(bucket.config.credentials);
      
      if (!!bucket.config.credentials.expired) {
        console.log('token expired... logging out');
        $rootScope.$emit('logout');
      } else {
        console.log('token valid')
        $mdToast.cancel();
        service.ready = true;
      }
    } else {
      console.log('no aws token found, waiting...');
      var toastConfig = $mdToast.simple();
      toastConfig.hideDelay(0);
      toastConfig.content('Sorry, we couln\'t load your saved data.');
      toastConfig.position('top right');
      service.toast = $mdToast.show(toastConfig);
      
      
    }
  });

  service.ready = false;


  service.getPolygons = function() {
    console.log('getting polygons @ ' + folderPrefix + auth.profile.user_id + '/polygons.json');

    // return a promise
    return $q(function(resolve, reject) {
      bucket.getObject({
        Bucket: 'arcarbon.user.data',
        Key: folderPrefix + auth.profile.user_id + '/polygons.json'
      }, function(err, data) {
        if (err) {
          reject(err);
        }
        else {
          // convert buffer to string, try to parse JSON
          var parsed = JSON.parse(String.fromCharCode.apply(null, data.Body));
          if (parsed) {
            resolve(parsed);
          }
          else {
            reject();
          }
        }
      });
    });

  };

  service.savePolygons = function savePolygons(polygons) {

    // return a promise
    return $q(function(resolve, reject) {

      var params = {
        Key: folderPrefix + auth.profile.user_id + '/polygons.json',
        ContentType: 'application/json',
        Body: JSON.stringify(polygons),
        ACL: 'private'
      };
      bucket.putObject(params, function(err, data) {
        if (err) {
          reject(err);
        }
        else {
          resolve();
        }
      })
    });

  };

}]).controller('HomeCtrl', ['$scope', 'auth', '$http', '$location', 'store', '$mdSidenav', '$window', 'home-service', '$rootScope', '$mdDialog',
  function HomeController($scope, auth, $http, $location, store, $mdSidenav, $window, homeService, $rootScope, $mdDialog) {

    $scope.logout = function logout() {
      $rootScope.$emit('logout');
    };

    var liverpool = {
      lat: 53.415569,
      lng: -2.938499,
      zoom: 17
    };

    var center = liverpool;
    var basemap = new $window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    // var basemap = new $window.L.tileLayer('https://api.ordnancesurvey.co.uk/mapping_api/service/zxy/EPSG:900913/Zoom%20Map%20Tactical%203857/{z}/{x}/{y}.png?&apikey=lva0L1DIiJ6MkP7V1bGYXfpc2A6XMLg');
    var boundaries = new $window.L.TileLayer('https://api.tiles.mapbox.com/v4/truetoffee.96434d6f/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWF0dGIiLCJhIjoiQVRzYTJ3OCJ9.yYsWZ5ejzjv8AkcY3OjBYA#15');

    $scope.map = $window.L.map('map', {
      center: [center.lat, center.lng],
      zoom: center.zoom,
      layers: [basemap],
      crs: $window.L.CRS.EPSG3857
    });

    var drawnItems = new $window.L.FeatureGroup();
    $window.drawnItems = drawnItems;
    // $scope.map.addLayer(drawnItems);
    var drawControl = new $window.L.Control.Draw({
      edit: {
        featureGroup: drawnItems
      },
      draw: { // only allow polygon drawing tool
        polygon: true,
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false
      }
    });
    $scope.map.addControl(drawControl);

    $window.L.control.layers({
      OSM: basemap
    }, {
      drawing: drawnItems
    }).addTo($scope.map);

    // when user finishes drawing a shape
    // save the polygons back to AWS
    $scope.map.on('draw:created', function(e) {
      e.layer.setStyle({
        fillColor: "#15693b",
        color: "#15693b",
        opacity: 1,
        fillOpacity: 0.3,
        weight: 3
      });
      drawnItems.addLayer(e.layer);
      
      var area = $window.LGeo.area(e.layer); // meters squared
      var hectares = area / 10000;
      
      console.log('new polygon created', e.type, e.layer._latlngs, area);
      
      e.layer.properties = e.layer.properties || {};
      
      if (area) {
        // persist area on the properties object for that feature
        e.layer.properties.area = area;

        // display area in a popup, and also print out to console
        e.layer.bindPopup(hectares.toFixed(2) + ' ha');
        e.layer.on('click', function(feature) {
          console.log('clicked', (area).toFixed(2) + 'm sq');
        });
      }
      
      // if (!e.layer.properties.guid) {
        
      //   e.layer.properties.guid = guid();
      //   console.log('setting guid', e.layer);
      //   $window.l = e.layer;
      // }

      // ==== now SAVE everything ====
      save();
      $scope.$apply();

    });

    $scope.getTotalArea = function() {
      if ($scope.features) {
        return $scope.features.map(function(f) {
          return f.properties.area;
        }).reduce(function(prev, curr) {
          return prev + curr;
        }, 0);
      }

      return 0;
    };



    var cancelWatchForUserPolygons = $scope.$watch(function() {
      return homeService.ready
    }, function(ready) {
      if (!!ready) {
        homeService.getPolygons().then(function(polygons) {
          console.log('got initial polygons from AWS:', polygons);

          $scope.features = polygons.features;

          // homeService.savePolygons({
          //   type: 'FeatureCollection',
          //   features: [{
          //     type: 'Feature',
          //     properties: {
          //       guid: 1234
          //     },
          //     geometry: {
          //       type: 'Polygon',
          //       coordinates: [
          //         [
          //           [-2.941417694091797, 53.41606741491586],
          //           [-2.9413533210754395, 53.415133824711646],
          //           [-2.9384565353393555, 53.41508906302262],
          //           [-2.938671112060547, 53.41614414744581],
          //           [-2.941417694091797, 53.41606741491586]
          //         ]
          //       ]
          //     }
          //   }]
          // });
          // return;

          // use proj4leaflet to parse geoJSON into a new layer
          var layer = new $window.L.Proj.geoJson(polygons);

          layer.setStyle({
            fillColor: "#15693b",
            color: "#15693b",
            opacity: 1,
            fillOpacity: 0.3,
            weight: 3
          });

          // attach click handlers for each feature on the layer
          layer.getLayers().forEach(function(featureLayer) {
            var area = $window.LGeo.area(featureLayer); // meters squared
            var hectares = area / 10000;

            // some shapes might not have an area... linestring i'm looking at you!
            if (area) {
              // persist area on the properties object for that feature
              featureLayer.feature.properties = featureLayer.feature.properties || {};
              featureLayer.feature.properties.area = area;

              // display area in a popup, and also print out to console
              featureLayer.bindPopup(hectares.toFixed(2) + ' ha');
              featureLayer.on('click', function(feature) {
                console.log('clicked', feature.target._leaflet_id, (area).toFixed(2) + 'm sq');
              });
            }
          });

          // keep track of feature layers in the drawnItems layer
          drawnItems.addLayer(layer).addTo($scope.map);
        });

        cancelWatchForUserPolygons(); // unregister $watch event
      }
    }, true);


    var save = function save() {
      // get all features from the layer as geoJSON
      var features = [];
      $window.drawnItems.getLayers().forEach(function(layer) {
        if (layer.hasOwnProperty('_latlngs')) {
          var geoJSON = layer.toGeoJSON();
          geoJSON.properties = {
            area: $window.LGeo.area(layer),
            guid: guid() // todo check if we ever overwrite the guid by mistake?
          }
          features.push(geoJSON);
        } else {
          for (var l in layer._layers) {
            if (layer._layers.hasOwnProperty(l)) {
              features.push(layer._layers[l].toGeoJSON());
            }
          }
        }
      });
      homeService.savePolygons({
        type: 'FeatureCollection',
        features: features
      });

      $scope.features = features;
      console.log('new features', features);
      
    };

    $scope.deleteField = function deleteField(feature) {
      console.log('delete', feature);
      $scope.features.splice($scope.features.indexOf(feature),1);
      
      var layer = drawnItems.getLayers()[0];
      var featureLayer;
      for (var l in layer._layers) {
        if (layer._layers.hasOwnProperty(l)) {
          if (layer._layers[l].feature.properties.guid === feature.properties.guid) {
            console.log('removed layer', layer._layers[l]);
            layer.removeLayer(layer._layers[l]);
          }
        }
      }
      
      save();
      
    };
    
    // onboarding modal
    // $mdDialog.show({
    //   clickOutsideToClose: true,
    //   scope: $scope,
    //   preserveScope: true,
    //   templateUrl: 'onboarding.html'
    // });

    
    var guid = function guid() {
      var s4 = function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
      };
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

  }
]);
