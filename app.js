angular.module('sample', [
    'auth0',
    'ngRoute',
    'sample.home',
    'sample.login',
    'angular-storage',
    'angular-jwt',
    'ngMaterial'
  ])
  .config(function myAppConfig($routeProvider, authProvider, $httpProvider, $locationProvider,
    jwtInterceptorProvider, $mdThemingProvider) {
    $routeProvider
      .when('/', {
        controller: 'HomeCtrl',
        templateUrl: 'home/home.html',
        pageTitle: 'Homepage',
        requiresLogin: true
      })
      .when('/login', {
        controller: 'LoginCtrl',
        templateUrl: 'login/login.html',
        pageTitle: 'Login'
      });

    $mdThemingProvider.definePalette('arcarbon', {
      '50': 'daeac6',
      '100': 'daeac6',
      '200': 'daeac6',
      '300': 'daeac6',
      '400': 'daeac6',
      '500': '15693b',
      '600': 'e53935',
      '700': '15693b',
      '800': '15693b',
      '900': '15693b',
      'A100': 'ff8a80',
      'A200': 'ff5252',
      'A400': 'ff1744',
      'A700': 'd50000',
      'contrastDefaultColor': 'light', // whether, by default, text (contrast)
      // on this palette should be dark or light
      'contrastDarkColors': ['50', '100', //hues which contrast should be 'dark' by default
        '200', '300', '400', 'A100'
      ],
      'contrastLightColors': undefined // could also specify this if default was 'dark'
    });

    $mdThemingProvider.theme('default').primaryPalette('arcarbon');

    authProvider.init({
      domain: AUTH0_DOMAIN,
      clientID: AUTH0_CLIENT_ID,
      loginUrl: '/login'
    });

    jwtInterceptorProvider.tokenGetter = function(store) {
      return store.get('token');
    }

    // Add a simple interceptor that will fetch all requests and add the jwt token to its authorization header.
    // NOTE: in case you are calling APIs which expect a token signed with a different secret, you might
    // want to check the delegation-token example
    $httpProvider.interceptors.push('jwtInterceptor');
  }).run(function($rootScope, auth, store, jwtHelper, $location) {
    $rootScope.$on('$locationChangeStart', function() {
      if (!auth.isAuthenticated) {
        var token = store.get('token');
        if (token) {
          if (!jwtHelper.isTokenExpired(token)) {
            auth.authenticate(store.get('profile'), token);
          }
          else {
            $location.path('/login');
          }
        }
      }

    });
    
    $rootScope.$on('logout', function() {
      auth.signout();
      store.remove('profile');
      store.remove('token');
      store.remove('awsCredentials');
      $location.path('/login');
    });
  })
  .controller('AppCtrl', ['$scope', '$location', 'store', 'auth', function AppCtrl($scope, $location, store, auth) {

    $scope.$on('$routeChangeSuccess', function(e, nextRoute) {
      if (nextRoute.$$route && angular.isDefined(nextRoute.$$route.pageTitle)) {
        $scope.pageTitle = nextRoute.$$route.pageTitle + ' | Auth0 Sample';
      }
    });
    
    $scope.auth = auth; // make available at top level
    
    
    
  }])

;
