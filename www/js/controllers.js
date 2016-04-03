angular.module('starter.controllers', [])

.controller('DashCtrl', function($ionicPlatform, $rootScope, $scope, $state,
  $rootScope, $timeout, $ionicModal, Utils, Cat, Fav, FavTask, Ctrls) {
  Utils.hideTabs(false);
  console.debug('show library');
  $scope.libraryBooks = ['禮記', '論語', '莊子', '關尹子', '六祖壇經', '五燈會元',
    '脂硯齋重評石頭記'
  ];

  var loadFavorites = function(cb) {
    Cat.listFavorites().then(function(favs) {

      $rootScope.favorites = favs;
      if (cb) cb(favs);
    });
  };
  $scope.showLibrary = function() {
    // $scope.addBook = function(name){
    //   console.debug('add book: ' + name);
    //   Fav.save(name).then(function(){
    //     FavTask.storeFavBook(name,1, true)
    //     loadFavorites();//refresh favs on added
    //   });
    // };

    $scope.toggleFavorite = function(name, isFav) {
      console.log("toggleFavorite: " + name + ": " + isFav);
      Ctrls.toggleFavorite($ionicModal, $scope, name, isFav ? 1 : 0,
        loadFavorites);
    };

    $scope.isFav = function(name) {
      if (!$rootScope.favorites) return false;
      for (var i = 0; i < $rootScope.favorites.length; i++) {
        if ($rootScope.favorites[i].name == name) {
          return true;
        }
      }
      return false;
    }

    $scope.isNotLib = function(fav) {
      return $scope.libraryBooks.indexOf(fav.name) == -1;
    }

    $ionicModal.fromTemplateUrl('model-library.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      console.debug('model: ' + modal);
      $scope.libraryModal = modal;
      modal.show();
      //Cleanup the modal when we're done with it!
      $scope.$on('$destroy', function() {
        if ($scope.libraryModal) {
          $scope.libraryModal.remove();
        }
      });
    });
  };

  //show lib if no fav
  $ionicPlatform.ready(function() {
    loadFavorites(function(favs) {
      if (!favs || favs.length == 0) {
        $scope.showLibrary();
      }
    });
  });
})

.controller('BookCtrl', function($scope, $rootScope, $state, $ionicPlatform,
  $ionicGesture, $anchorScroll, $ionicScrollDelegate, $cordovaFile, $timeout, $stateParams, $sce, $ionicModal,
  Wikipedia, Utils, Fav, FavTask, Files, Ctrls, Settings) {
  // $anchorScroll.disableAutoScrolling()
  // console.log('Hide tabs on bookCtrl');
  // Utils.hideTabs(true);
  // if(!$scope.hideTabEventHandlerRegistered ){
  //   $ionicGesture.on('doubletap', function(){
  //       console.log('Show tabs on double tap');
  //       Utils.hideTabs(false);
  //       $timeout.cancel($rootScope.tabHideTimer);
  //       $rootScope.tabHideTimer = $timeout(function (){
  //         console.log('now auto hide tabs.');
  //         Utils.hideTabs(true);
  //       }, 5000);
  //   }, angular.element(document.getElementById('bookView')));
  //   $scope.hideTabEventHandlerRegistered = true;
  // }

  var name = $stateParams.name;
  console.log('Book Name: ' + name);
  console.info("continue last read position: " + $stateParams.continue);

  $scope.goHome = function() {
    $state.go('tab.dash');
  };

  var getFavBook = function(cb) {

    Fav.get(name).then(function(fav) {
      $scope.fav = fav;
      $scope.favorite = fav ? fav.isFav : 0;
      console.log("IsFav: " + $scope.favorite);
      if (cb) cb(fav);
    });
  };

  var updateBookTextStyle = function(book) {
    console.log("translate to simplified chinese: " + book);
    if ($rootScope.traditionalChinese === false && book && !book.simplified) {
      return {
        title: TongWenWFU.convertToSimpliedChinese(book.title),
        text: TongWenWFU.convertToSimpliedChinese((typeof book.text ===
          'string' ?
          book.text : book.text.toString())),
        simplified: true
      }
    }
  }
  $rootScope.$watch('traditionalChinese', function() {
    $scope.book = updateBookTextStyle($scope.book);
  });

  var setBook = function(book) {
    if ($rootScope.traditionalChinese === undefined) {
      Settings.get("traditionalChinese").then(function(value) {
        console.info("settings.traditionalChinese=" + value);
        $rootScope.traditionalChinese = value == "true" ? true :
          false;
      });
    }
    if ($rootScope.traditionalChinese === false) {
      $scope.book = updateBookTextStyle(book);
    } else {
      $scope.book = book;
    }

    var isContinue = $stateParams.continue;
    if (isContinue) {

      Fav.getLastReadPostion(name).then(function(scrolling) {
        console.info("scroll tto " + scrolling);
        if (scrolling) {
          $ionicScrollDelegate.scrollTo(0, parseInt(scrolling), true);
        };
      });
    }
  };

  $scope.toggleFavorite = function() {
    if (!name) return;
    console.log("toggleFavorite: " + name + ": " + $scope.favorite);
    console.log(Ctrls);
    console.log(Ctrls.toggleFavorite.toString());
    Ctrls.toggleFavorite($ionicModal, $scope, name, $scope.favorite,
      getFavBook);
    $rootScope.favorites = null;
  };

  var fetchBook = function() {
    Wikipedia.search(name).then(function(resp) {
      var book = resp.parse;
      if (book && book.text) {
        var bk = book.title;
        book.title = bk; //bk.indexOf(':') > 0 ? bk.substring(bk.indexOf(':') + 1) : bk
        book.text = $sce.trustAsHtml(Wikipedia.format(book.text['*']));
        setBook(book);
        if ($scope.favorite > 0) {
          //save the missing favorite book
          Files.save(name, book.title, book.text);
        }
      } else {
        console.error("not found: " + resp);
        setTimeout(function() {
          window.history.back();
        }, 100);
      }
    }, function(error) {
      console.error('Unable to get Book: ' + +error.code + ": " +
        error.message);
    });
  };

  $ionicPlatform.ready(function() {
    //check if favorite
    if (!name) {
      if ($rootScope.favorites && $rootScope.favorites.length > 0) {
        var item = $rootScope.favorites[0];
        name = item.lastReadChapter ? item.name + item.lastReadChapter : item.name;
        console.info("use last read book: " + name);
      } else {
        $state.go("tab.dash");
        console.info("redirect to dash page for book choose");
        return;
      }
    }
    getFavBook(function(fav) {
      if (fav) {
        //try read from file sys
        Files.get(fav.name).then(function(book) {
          setBook(book);
        }, function(err) {
          //if could not find in file sys, load from web
          fetchBook();
        });
      } else {
        fetchBook();
      }
    });

  });

  //save last read position before leaving page
  $scope.$on('$destroy', function() {
    if (!$scope.favorite || $scope.favorite <= 0) {
      console.info("do not save read position for non-fav book:" + name);
      return;
    }
    console.info("leaving book reading of " + name);
    Settings.save("last_read", name);
    // var scrollTop = document.getElementsByClassName('book-content')[0].parentElement.scrollTop;
    // console.info("scroll position at: " + scrollTop);
    var height = window.innerHeight / 2,
      width = window.innerWidth / 3;
    var wholeText = document.getElementsByClassName('book-content')[0].textContent;
    do { //find a proper element in the view port
      var element = document.elementFromPoint(width, height);

      if (element && element.textContent != "" && element.textContent.length > 8 && wholeText != element.textContent) {
        var text = element.textContent.trim();
        var top = $ionicScrollDelegate.getScrollPosition().top;
        var scrolling = document.getElementsByClassName('scroll')[0].style.webkitTransform;
        console.info("read at: " + text + ", scrolling: " + scrolling + " , top: " + top);
        Fav.saveReadPosition(name, text, top);
        break;
      }
      height -= 5;
    } while (height > 60);
  });

}).controller("SettingsCtrl", function($scope, $rootScope, $state,
  $ionicPlatform, Utils, Settings) {
  Utils.hideTabs(false);

  $ionicPlatform.ready(function() { //load settings from db

  });

  // $scope.$watch('fontSize', function() {
  // 	console.info("fontSizeChanged: " + $scope.fontSize);
  // 	Settings.save("fontSize", $scope.fontSize);
  // 	$rootScope.fontSize = $scope.fontSize;
  // });
  //toggle handlers
  $scope.nightModeChanged = function() {
    console.info("nightMode Changed from" + $rootScope.nightMode);
    $rootScope.nightMode = !$rootScope.nightMode;
    Settings.save("nightMode", $rootScope.nightMode);
  };

  $scope.traditionalChineseChanged = function() {
    console.info("traditionalChinese Changed from " + $rootScope.traditionalChinese);
    $rootScope.traditionalChinese = !$rootScope.traditionalChinese;
    Settings.save("traditionalChinese", $rootScope.traditionalChinese);
  };

  $scope.fontSizeChanged = function(oldFontSize) {
    var fontSize = document.getElementsByName("fontSize")[0].value;

    console.info("fontSizeChanged: " + fontSize);
    Settings.save("fontSize", fontSize);
    $rootScope.fontSize = fontSize;
  };
  $scope.fontWeightChanged = function(oldFontWeight) {
    var fontWeight = document.getElementsByName("fontWeight")[0].value;

    console.info("fontWeightChanged: " + fontWeight);
    Settings.save("fontWeight", fontWeight);
    $rootScope.fontWeight = fontWeight;
  };

  $scope.brightnessChanged = function(oldBrightness) {
    var brightness = document.getElementsByName("brightness")[0].value;
    console.info("brightnessChanged: " + brightness);
    Settings.save("brightness", brightness);
    $rootScope.brightness = brightness;
  };

});
