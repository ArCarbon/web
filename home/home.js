angular.module('sample.home', ['auth0', 'leaflet-directive', 'osel-search']).service('home-service', ['$http', '$window', 'auth', 'store', '$q', function($http, $window, auth, store, $q) {

  var awsCredentials = store.get('awsCreds');

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
    $scope.awsCreds = store.get('awsCreds');



    $scope.uploadSomeText = function uploadSomeText() {
      homeService.savePolygons([1, 2, 3]);
    };

    $scope.listFiles = function listFiles() {
      homeService.getPolygons();
    };

    $scope.logout = function() {
      auth.signout();
      store.remove('profile');
      store.remove('token');
      store.remove('awsCreds');
      $location.path('/login');
    }

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
    };



    angular.extend($scope, {
      defaults: {
        scrollWheelZoom: false
      },

      gower: {
        lat: 51.600147,
        lng: -4.127598,
        zoom: 15
      },

      liverpool: {
        lat: 53.415569,
        lng: -2.938499,
        zoom: 17
      },

      layers: {
        baselayers: {
          osm: {
            name: 'OpenStreetMap',
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            type: 'xyz'
          }
        },
        overlays: {
          mapbox_wheat: {
            name: 'Mapbox Wheat Paste',
            url: 'https://api.tiles.mapbox.com/v4/{mapid}/{z}/{x}/{y}.png?access_token={apikey}',
            type: 'xyz',
            layerOptions: {
              apikey: 'pk.eyJ1IjoiYnVmYW51dm9scyIsImEiOiJLSURpX0pnIn0.2_9NrLz1U9bpwMQBhVk97Q',
              mapid: 'bufanuvols.lia35jfp'
            },
            visible: false
          },
          matt_mapbox: {
            name: 'Matt Mapbox',
            url: 'https://api.tiles.mapbox.com/v4/{mapid}/{z}/{x}/{y}.png?access_token={apikey}',
            type: 'xyz',
            layerOptions: {
              apikey: 'pk.eyJ1IjoibWF0dGIiLCJhIjoiQVRzYTJ3OCJ9.yYsWZ5ejzjv8AkcY3OjBYA#15',
              mapid: 'truetoffee.96434d6f'
            },
            visible: true

          }
        }
      }
    });


    $scope.searchConfig = {
      placeholder: 'Type to search...',
      providers: [{ // AJAX based provider
        id: 'NAMES',
        method: 'GET',
        params: { // put an object here to send as query parameters
          q: '%s' // %s is a special value - it will be replaced with the user's search query
        },
        url: '/api/search/names',
        title: 'Places', // friendly name to display
        data: undefined, // when doing a POST, put an object here to send as form data
        onSelect: function(result, hideSearch) {
          console.log('got result: ' + JSON.stringify(result));
          hideSearch();
        }
      }, { // Function based provider
        id: 'ECHO_UPPERCASE',
        title: 'Echo',
        fn: function(term) {
          var upper = term;
          try {
            upper = term.toUpperCase();
          }
          catch (e) {}

          // return an array to illustrate how transformResponse can be used
          return [{
            text: upper
          }]
        },
        transformResponse: function(response) {
          // return an object with a results property containing the array
          return {
            results: response.map(function(e) {
              e.text = e.text + '!'; // add an exclamation mark to each result!
              return e;
            })
          };
        },
        onSelect: function(result, hideSearch) {
          console.log('got result: ' + JSON.stringify(result));
          hideSearch();
        }
      }]
    };

  }
]);
