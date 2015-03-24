// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'ngCordova', 'starter.controllers',
  'starter.services'
])

.run(function($ionicPlatform, $ionicGesture, $rootScope, $timeout,
  $cordovaSQLite, Fav, Cat, Files, FavTask, Settings) {
  $ionicPlatform.ready(function() {
    console.log('ioni ready, init app...');
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
    // Fav.clean();Cat.clean(); Files.clean();
    Fav.prepare();
    Cat.prepare();
    Files.prepare();
    Files.prepare();
    Settings.prepare();

    // Cat.listFavorites().then(function(favs) {
    //   for (i = 0; i < favs.length; i++) {
    //      FavTask.storeFavBook(favs[i].name,favs[i].isFav,true);
    //   }
    // }, function(error) {
    //   console.error('Unable to get favorites', error);
    // });

  });

  // $rootScope.$on('$routeChangeSuccess', function(newRoute, oldRoute) {
  //   $location.hash($routeParams.j);
  //   $anchorScroll();
  // });


})

.config(function($stateProvider, $urlRouterProvider, $uiViewScrollProvider) {

    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js
    $stateProvider

    // setup an abstract state for the tabs directive
      .state('tab', {
      url: "/tab",
      abstract: true,
      templateUrl: "templates/tabs.html"
    })

    // Each tab has its own nav history stack:

    .state('tab.dash', {
      url: '/dash',
      views: {
        'tab-dash': {
          templateUrl: 'templates/tab-dash.html',
          controller: 'DashCtrl'
        }
      }
    })

    .state('tab.friends', {
        url: '/friends',
        views: {
          'tab-friends': {
            templateUrl: 'templates/tab-friends.html',
            controller: 'FriendsCtrl'
          }
        }
      })
      .state('tab.friend-detail', {
        url: '/friend/:friendId',
        views: {
          'tab-friends': {
            templateUrl: 'templates/friend-detail.html',
            controller: 'FriendDetailCtrl'
          }
        }
      })

    .state('tab.book', {
      url: "/book/{name:.+}",
      views: {
        'tab-book': {
          templateUrl: 'templates/tab-book.html',
          controller: 'BookCtrl'
        }
      }
    })

    .state('tab.settings', {
      url: "/settings",
      views: {
        'tab-settings': {
          templateUrl: 'templates/tab-settings.html',
          controller: 'SettingsCtrl'
        }
      }
    });

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/tab/dash');
    $uiViewScrollProvider.useAnchorScroll();

  })
  // .run(function($ionicPlatform, $rootScope, $location, $anchorScroll, $stateParams) {
  // $ionicPlatform.ready(function() {
  //   $rootScope.$on('$routeChangeSuccess', function(newRoute, oldRoute) {
  //     console.log("routeChangeSuccess: ", newRoute, oldRoute);
  //     $location.hash($stateParams.j);
  //     $anchorScroll();
  //   });
  // });
  // })
;
