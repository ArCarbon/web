angular.module('sample.home', ['auth0', 'osel-search']).service('home-service', ['$http', '$window', 'auth', 'store', '$q', '$rootScope', function($http, $window, auth, store, $q, $rootScope) {

  var service = this;

  var folderPrefix = 'json/';
  var bucket = new $window.AWS.S3({
    params: {
      Bucket: 'landapp.user.data'
    }
  });

  // watch localstorage, until aws credentials are available
  $rootScope.$watch(function() {
    return store.get('awsCredentials');
  }, function(awsCredentials) {
    if (awsCredentials) {
      bucket.config.credentials = new $window.AWS.Credentials(awsCredentials.AccessKeyId, awsCredentials.SecretAccessKey, awsCredentials.SessionToken);
      service.ready = true;
    }
  });

  service.ready = false;


  service.getPolygons = function() {
    console.log('getting polygons @ ' + folderPrefix + auth.profile.user_id + '/polygons.json');

    // return a promise
    return $q(function(resolve, reject) {
      bucket.getObject({
        Bucket: 'landapp.user.data',
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

}]).controller('HomeCtrl', ['$scope', 'auth', '$http', '$location', 'store', '$mdSidenav', '$window', 'home-service', '$rootScope',
  function HomeController($scope, auth, $http, $location, store, $mdSidenav, $window, homeService, $rootScope) {


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
      draw: { // only allow polygon and rectangle drawing tools
        polygon: true,
        polyline: false,
        rectangle: true,
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
      console.log('new polygon created', e.type, e.layer._latlngs);

      var area = $window.LGeo.area(e.layer); // meters squared
      var hectares = area / 10000;

      if (area) {
        // persist area on the properties object for that feature
        e.layer.properties = e.layer.properties || {};
        e.layer.properties.area = area;

        // display area in a popup, and also print out to console
        e.layer.bindPopup(hectares.toFixed(2) + ' ha');
        e.layer.on('click', function(feature) {
          console.log('clicked', (area).toFixed(2) + 'm sq');
        });
      }


      // ==== now SAVE everything ====
      // get all features from the layer as geoJSON
      var features = [];
      $window.drawnItems.getLayers().forEach(function(layer) {
        if (layer.hasOwnProperty('_latlngs')) {
          features.push(layer.toGeoJSON());
        }
        else {
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

    });

    
    


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
          //     properties: null,
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


    // var parseGridRef = function parseGridRef(gridref) {
    //   gridref = String(gridref).trim();

    //   // check for fully numeric comma-separated gridref format
    //   var match = gridref.match(/^(\d+),\s*(\d+)$/);
    //   if (match) {
    //     return {
    //       e: match[1],
    //       n: match[2]
    //     };
    //   }

    //   // validate format
    //   match = gridref.match(/^[A-Z]{2}\s*[0-9]+\s*[0-9]+$/i);
    //   if (!match) {
    //     return {}
    //   }

    //   // get numeric values of letter references, mapping A->0, B->1, C->2, etc:
    //   var l1 = gridref.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    //   var l2 = gridref.toUpperCase().charCodeAt(1) - 'A'.charCodeAt(0);
    //   // shuffle down letters after 'I' since 'I' is not used in grid:
    //   if (l1 > 7) l1--;
    //   if (l2 > 7) l2--;

    //   // convert grid letters into 100km-square indexes from false origin (grid square SV):
    //   var e100km = ((l1 - 2) % 5) * 5 + (l2 % 5);
    //   var n100km = (19 - Math.floor(l1 / 5) * 5) - Math.floor(l2 / 5);

    //   // skip grid letters to get numeric (easting/northing) part of ref
    //   var en = gridref.slice(2).trim().split(/\s+/);
    //   // if e/n not whitespace separated, split half way
    //   if (en.length == 1) en = [en[0].slice(0, en[0].length / 2), en[0].slice(en[0].length / 2)];

    //   // validation
    //   if (e100km < 0 || e100km > 6 || n100km < 0 || n100km > 12) return {};
    //   if (en.length != 2) return {};
    //   if (en[0].length != en[1].length) return {};

    //   // standardise to 10-digit refs (metres)
    //   en[0] = (en[0] + '00000').slice(0, 5);
    //   en[1] = (en[1] + '00000').slice(0, 5);

    //   var e = e100km + en[0];
    //   var n = n100km + en[1];

    //   return {
    //     e: e,
    //     n: n,
    //     gridRef: gridref.replace(/^[a-z]{2}[0-9]+/i, gridref.slice(0, 2) + ' ' + gridref.slice(2))
    //   };
    // };

    // var x = [{
    //   id: 'NAMES',
    //   method: 'GET',
    //   params: {
    //     q: '%s'
    //   },
    //   url: $window.rootPath + 'api/search/names',
    //   title: 'Places',
    //   transformResponse: function(response) {
    //     return {
    //       results: response.data.map(function(result) {
    //         var texts = [result.name];
    //         if (result.locality) {
    //           texts.push(result.locality);
    //         }
    //         result.text = texts.join(', ');
    //         result.projection = 'EPSG:27700';
    //         return result;
    //       })
    //     };
    //   },
    //   onSelect: function(result, hideSearch) {
    //     console.log(result.x, result.y);
    //     hideSearch();
    //   }
    // }, {
    //   id: 'ADDRESSES',
    //   method: 'GET',
    //   params: {
    //     q: '%s'
    //   },
    //   url: $window.rootPath + 'api/search/addresses',
    //   title: 'Addresses',
    //   transformResponse: function(response) {
    //     var capitalise = function capitalise(str) {
    //       return str.toLowerCase().replace(/\b\w/g, function(char) {
    //         return char.toUpperCase();
    //       });
    //     };

    //     var postcodeRegex = /(GIR ?0AA|[A-PR-UWYZ]([0-9]{1,2}|([A-HK-Y][0-9]([0-9ABEHMNPRV-Y])?)|[0-9][A-HJKPS-UW]) ?[0-9][ABD-HJLNP-UW-Z]{2})/i;

    //     return {
    //       results: response.data.map(function(result) {
    //         // lowercase all text
    //         // capitalise each word
    //         // uppercase all postcodes
    //         // replace spaces in postcode with non-breaking spaces
    //         result.text = capitalise(result.name).replace(postcodeRegex, function(m) {
    //           return m.toUpperCase().replace(' ', ' ');
    //         });
    //         result.projection = 'EPSG:27700';
    //         return result;
    //       })
    //     };
    //   },
    //   onSelect: function(result, hideSearch) {
    //     console.log(result.x, result.y);
    //     hideSearch();
    //   }
    // }];

    // $scope.searchConfig = {
    //   placeholder: 'Search',
    //   providers: [{
    //     id: 'GRIDREF',
    //     title: 'Grid Reference',
    //     fn: function(term) {
    //       var location = {};

    //       if (/^[a-z]/i.test(term.trim())) {
    //         location = parseGridRef(term);
    //       }

    //       if (location && location.e && location.n) {
    //         return {
    //           results: [{
    //             text: location.gridRef.toUpperCase(),
    //             e: location.e,
    //             n: location.n,
    //             projection: 'EPSG:27700'
    //           }]
    //         };
    //       }

    //       return {
    //         results: []
    //       }
    //     },
    //     onSelect: function(result, hideSearch) {
    //       console.log(result.x, result.y);
    //       hideSearch();
    //     }
    //   }, {
    //     id: 'COORDS',
    //     title: 'Coordinates',
    //     fn: function(term) {
    //       var location = {};

    //       if (/^[0-9]/i.test(term.trim())) {
    //         location = parseGridRef(term);
    //       }

    //       if (location && location.e && location.n) {
    //         return {
    //           results: [{
    //             text: location.e + ' ' + location.n,
    //             e: location.e,
    //             n: location.n,
    //             projection: 'EPSG:27700'
    //           }]
    //         };
    //       }

    //       return {
    //         results: []
    //       }
    //     },
    //     onSelect: function(result, hideSearch) {
    //       console.log(result.x, result.y);
    //       hideSearch();
    //     }
    //   }]
    // };

  }
]);
