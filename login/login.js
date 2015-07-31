angular.module('sample.login', [
    'auth0'
  ])
  .service('login-service', ['$log', 'auth', '$location', 'store', function($log, auth, $location, store) {
    
    var service = this;
    
    service.login = function login() {
      auth.signin({}, function(profile, token) {
        store.set('profile', profile);
        store.set('token', token);
        $location.path("/");
        service.getAWSToken(token);
      }, function(error) {
        $log.log("There was an error logging in" + error);
      });
    };
    
    service.getAWSToken = function getAWSToken(id_token) {
      console.log('getting aws token');
      auth.getToken({
        api: 'aws',
        targetClientId: AUTH0_CLIENT_ID, // global :(
        id_token: id_token,
        scope: 'openid',
        role: "arn:aws:iam::663335984539:role/access-to-s3-per-user",
        principal: "arn:aws:iam::663335984539:saml-provider/auth0-provider",
        success: function() {} // workaround to allow .then to get proper result as argument
      }).then(function(result) {
        store.set('awsCredentials', result.Credentials);
        console.log('got aws credentials', result.Credentials);
      });
    }
    
  }])
  .controller('LoginCtrl', ['login-service', '$log', '$scope', 'auth', '$location', 'store', '$rootScope', function HomeController(loginService, $log, $scope, auth, $location, store, $rootScope) {

    $scope.login = function() {
      loginService.login();
    };

    $scope.getAWSToken = function(id_token) {
      loginService.getAWSToken(id_token);
    };

  }]);