angular.module('sample.login', [
    'auth0'
  ])
  .controller('LoginCtrl', ['$log', '$scope', 'auth', '$location', 'store', '$rootScope', function HomeController($log, $scope, auth, $location, store, $rootScope) {

    $scope.login = function() {
      auth.signin({}, function(profile, token) {
        store.set('profile', profile);
        store.set('token', token);
        $location.path("/");
        $scope.getAWSToken(token);
      }, function(error) {
        $log.log("There was an error logging in" + error);
      });
    };

    $scope.getAWSToken = function(id_token) {
      auth.getToken({
        api: 'aws',
        targetClientId: AUTH0_CLIENT_ID,
        id_token: id_token,
        scope: 'openid',
        role: "arn:aws:iam::345848811994:role/access-to-s3-per-user",
        principal: "arn:aws:iam::345848811994:saml-provider/auth0-provider",
        success: function() {} // workaround to allow .then to get proper result as argument
      }).then(function(result) {
        store.set('awsCredentials', result.Credentials);
          console.log('got aws credentials', result.Credentials);
        $scope.$apply();
      });
      $log.log(auth.getDelegationToken);
    };

    

  }]);