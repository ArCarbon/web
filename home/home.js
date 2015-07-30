angular.module('sample.home', ['auth0', 'leaflet-directive'])
  .controller('HomeCtrl', ['$scope', 'auth', '$http', '$location', 'store', '$mdSidenav', '$window',
    function HomeController($scope, auth, $http, $location, store, $mdSidenav, $window) {



      $scope.auth = auth;
      $scope.awsCreds = store.get('awsCreds');


      var folderPrefix = 'json/';
      $scope.bucket = new $window.AWS.S3({
        params: {
          Bucket: 'landapp.user.data'
        }
      });
      $scope.bucket.config.credentials = new $window.AWS.Credentials($scope.awsCreds.AccessKeyId, $scope.awsCreds.SecretAccessKey, $scope.awsCreds.SessionToken)

      $scope.uploadSomeText = function uploadSomeText() {
        var objKey = folderPrefix + $scope.auth.profile.user_id + '/test.json';
        console.log(objKey);
        var params = {
          Key: objKey,
          ContentType: 'application/json',
          Body: JSON.stringify({
            content: $scope.someText
          }),
          ACL: 'private'
        };
        $scope.bucket.putObject(params, function(err, data) {
          if (err) {
            console.error(err);
          }
          console.log('finished put');
        })
      };

      $scope.listFiles = function listFiles() {
        $scope.bucket.listObjects({
          Prefix: folderPrefix + $scope.auth.profile.user_id
        }, function(err, data) {
          if (err) {
            console.error(err);
          }

          $scope.files = [];

          for (var i in data.Contents) {
            $scope.bucket.getSignedUrl('getObject', {
              Expires: 24 * 60,
              Key: data.Contents[i].Key
            }, function(err, url_bucket) {
              $scope.files.push({
                url: url_bucket,
                name: data.Contents[i].Key.replace(folderPrefix + $scope.auth.profile.user_id + '/', ''),
                date: $window.moment(new Date(data.Contents[i].LastModified)).fromNow(),
                key: data.Contents[i].Key
              });
            });
          }

          $scope.$apply();


        });
      };

      $scope.callApi = function() {
        // Just call the API as you'd do using $http
        $http({
          url: 'http://localhost:3001/secured/ping',
          method: 'GET'
        }).then(function() {
          alert("We got the secured data successfully");
        }, function(response) {
          if (response.status == 0) {
            alert("Please download the API seed so that you can call it.");
          }
          else {
            alert(response.data);
          }
        });
      }

      $scope.logout = function() {
        auth.signout();
        store.remove('profile');
        store.remove('token');
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
                mapid: 'mattb.12ff96fa'
              },
              visible: true

            }
          }
        }
      });

    }
  ]);
