angular.module('sample.home', ['auth0', 'osel-search']).service('home-service', ['$http', '$window', 'auth', 'store', '$q', function($http, $window, auth, store, $q) {

  var awsCredentials = store.get('awsCredentials');

  var folderPrefix = 'json/';
  var bucket = new $window.AWS.S3({
    params: {
      Bucket: 'landapp.user.data'
    }
  });
  bucket.config.credentials = new $window.AWS.Credentials(awsCredentials.AccessKeyId, awsCredentials.SecretAccessKey, awsCredentials.SessionToken)



  this.getPolygons = function() {


    console.log('getting signed url for', folderPrefix + auth.profile.user_id + '/polygons.json');

    return $q(function(resolve, reject) {

      bucket.getObject({
        Bucket: 'landapp.user.data',
        Key: folderPrefix + auth.profile.user_id + '/polygons.json'
      }, function(err, data) {
        if (err) {
          reject(err);
        }
        else {
          var parsed = JSON.parse(String.fromCharCode.apply(null, data.Body));
          if (parsed && parsed.data) {
            resolve(parsed.data);
          }
          else {
            reject();
          }
        }
      });
    });

  };

  this.savePolygons = function savePolygons(polygons) {
    return $q(function(resolve, reject) {

      var params = {
        Key: folderPrefix + auth.profile.user_id + '/polygons.json',
        ContentType: 'application/json',
        Body: JSON.stringify({
          data: polygons
        }),
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

}]).controller('HomeCtrl', ['$scope', 'auth', '$http', '$location', 'store', '$mdSidenav', '$window', 'home-service',
  function HomeController($scope, auth, $http, $location, store, $mdSidenav, $window, homeService) {



    $scope.auth = auth;
    $scope.awsCredentials = store.get('awsCredentials');


    $scope.logout = function() {
      auth.signout();
      store.remove('profile');
      store.remove('token');
      store.remove('awsCredentials');
      $location.path('/login');
    }

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
      layers: [basemap, boundaries],
      crs: $window.L.CRS.EPSG3857
    });

    var drawnItems = new $window.L.FeatureGroup();
    $window.drawnItems = drawnItems;
    // $scope.map.addLayer(drawnItems);
    var drawControl = new $window.L.Control.Draw({
      edit: {
        featureGroup: drawnItems
      }
    });
    $scope.map.addControl(drawControl);



    // event fires when user finishes drawing a shape
    $scope.map.on('draw:created', function(e) {
      drawnItems.addLayer(e.layer);
      console.log('new polygon created', e.layer._latlngs);

      homeService.savePolygons(drawnItems.toGeoJSON());
    });

    $window.L.control.layers({
      OSM: basemap
    }, {
      boundaries: boundaries,
      drawing: drawnItems
    }).addTo($scope.map);

    $scope.polygons = [];

    homeService.getPolygons().then(function(polygons) {
      console.log('got initial polygons', polygons);

      // polygons.forEach(function(polygon) {
      var layer = new $window.L.Proj.geoJson(polygons);
      console.log(layer);
      drawnItems.addLayer(layer).addTo($scope.map);
      $scope.polygons = polygons;
      // })
    });

    // persist polygons whenever the list changes
    $scope.$watch('polygons', function(newVal, oldVal) {
      if (newVal && newVal.length > 0 && newVal !== oldVal) {
        // homeService.savePolygons(newVal);
        console.log('saving polygons', newVal)
      }
    }, true);

    homeService.savePolygons({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-2.941417694091797, 53.41606741491586],
              [-2.9413533210754395, 53.415133824711646],
              [-2.9384565353393555, 53.41508906302262],
              [-2.938671112060547, 53.41614414744581]
            ]
          ]
        }
      }]
      // crs: {
      //   type: 'EPSG',
      //   properties: {
      //     code: '3857'
      //   }
      // }
    });


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
