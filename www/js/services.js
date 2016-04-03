angular.module('starter.services', ['ngResource'])

/**
 * A simple example service that returns a book.
 */
.factory('Wikipedia', function($q, $resource, $location) {
    // Might use a resource here that returns a JSON array
    var baseUrl = 'http://zh.m.wikisource.org/w/api.php'

    var wikiSearch = $resource(baseUrl, {
      action: 'parse',
      prop: 'text',
      format: 'json',
      callback: 'JSON_CALLBACK',
    }, {
      get: {
        method: 'JSONP'
      }
    });

    return {
      search: function(page) {
        var q = $q.defer();
        console.log('Searching Wikipedia: ' + baseUrl +
          "?action=parse&prop=text&page=" + page);
        if (/\&redirect\=no$/.test(page)) {
          page = page.substring(0, page.length - '&redirect=no'.length);
        }

        wikiSearch.get({
          page: page
        }, function(val) {
          q.resolve(val);
        }, function(httpResponse) {
          q.reject(httpResponse);
        });
        return q.promise;
      },

      format: function(text) {
        if (!text) return text;
        text = text.replace(/href=\"\#/g, 'anchor=\"');
        text = text.replace(/href=\"\/wiki\//g, 'href=\"\#tab/book/');
        text = text.replace(/href=\"\/w\/index\.php\?title\=/g,
          'href=\"\#tab/book/');
        // console.log($location.search({j:true}).url());

        // text = text.replace(/href=\"#/g, 'href=\"#' + $location.search({j:true}).url() + '=');
        // console.log(text);
        return text;
      }

    };
  })
  .factory('DB', function($window, $q, $cordovaSQLite, $ionicPlatform, Utils) {
    var db;
    return {
      getDb: function() {
        if (db) return db;
        if (!ionic.Platform.isWebView()) {
          db = $window.openDatabase("boook.db", "1.0", "Boook", 1024 *
            1024);
          console.log("in browser");
        } else {
          db = $cordovaSQLite.openDB({
            name: "boook.db"
          });
          console.log("in webview");
        }
        console.log(db);
        return db;
      }
    };
  }).factory('Fav', function($window, $q, $cordovaSQLite, $ionicPlatform, Utils,
    DB) {
    var db;

    var favService = {
      getDb: function() {
        if (db) return db;
        else db = DB.getDb();
        return db;
      },
      clean: function() {
        var dropTable = "DROP TABLE favorite";
        $cordovaSQLite.execute(this.getDb(), dropTable).then(function(res) {
          console.log("drop tb favorite, rowsAffected: " + res.rowsAffected);
        }, function(err) {
          console.error("fail drop tb favorite: " + err.code + ": " +
            err.message);
        });
      },
      prepare: function() {
        // var createTables = "DROP TABLE favorite";
        var createTables =
          "CREATE TABLE IF NOT EXISTS favorite (_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, name VARCHAR UNIQUE, categoryId INTEGER DEFAULT 0,  isFav INTEGER NOT NULL DEFAULT 1, lastUpdateTime INTEGER DEFAULT CURRENT_TIMESTAMP, last_read_chapter VARCHAR, last_read_text VARCHAR, last_read_scrolling VARCHAR)"
        $cordovaSQLite.execute(this.getDb(), createTables).then(function(
          res) {
          console.log("prepared tb favorite, rowsAffected: " + res.rowsAffected);
        }, function(err) {
          console.error("fail prepare tb favorite: " + err.code +
            ": " + err.message);
        });

        // var initTable = "UPDATE favorite set categoryId = 0";
        // $cordovaSQLite.execute(db, initTable).then(function(res) {
        //   console.log("inited tb favorite, rowsAffected: " + res.rowsAffected);
        // }, function (err) {
        //   console.error("fail init tb favorite: " + err.code + ": " + err.message);
        // });

        var query = "SELECT _id FROM favorite limit 1";
        $cordovaSQLite.execute(db, query, []).then(function(res) {
          if (res.rows.length == 0) { //if no favorite
            console.log("no favorite yet, init with some books...");
            var bookNames = ['五燈會元', '脂硯齋重評石頭記']; //, '西遊記'



            // var bookNames=['禮記','論語','莊子', '關尹子', '六祖壇經', '五燈會元', '脂硯齋重評石頭記'];//, '西遊記'

            // var initTable = "INSERT INTO favorite(name) values ('莊子'), ('禮記'), ('關尹子'), ('Wikisource:佛教典籍'), ('聖經_\(和合本\)'), ('脂硯齋重評石頭記'), ('西遊記')";
            // $cordovaSQLite.execute(db, initTable, []).then(function(res) {
            //   console.log("inited tb favorite, rowsAffected: " + res.rowsAffected);
            // }, function (err) {
            //   console.error("fail init tb favorite: " + err.code + ": " + err.message);
            // });
          } else {
            console.log("favorites has already intialized before");
          }
        }, function(err) {
          console.error("fail to check favorite: " + err.code + ": " +
            err.message);
        });
      },
      save: function(name, isFav) {
        var q = $q.defer();
        if (isFav == undefined) {
          isFav = 1;
        }
        var recover =
          "UPDATE favorite SET isFav = ?, lastUpdateTime = ? WHERE name = ?";
        $cordovaSQLite.execute(db, recover, [isFav, new Date().getTime(),
            name
          ])
          .then(function(res) {
            console.log("update favorite " + name + ", rowsAffected: " +
              res.rowsAffected);
            if (isFav > 0 && res.rowsAffected == 0) {
              var insert =
                "INSERT INTO favorite(name,isFav) VALUES (?,?)";
              $cordovaSQLite.execute(db, insert, [name, isFav]).then(
                function(res) {
                  console.log("saved favorite, rowsAffected: " + res.rowsAffected);
                  q.resolve();
                },
                function(err) {
                  console.error("fail to save favorite: " + err.code +
                    ": " + err.message);
                  q.reject(err);
                });
            } else {
              q.resolve();
            }
          }, function(err) {
            console.error("fail to recover favorite: " + err.code +
              ": " + err.message);
            q.reject(err);

          });
        return q.promise;
      },
      get: function(name) {
        var q = $q.defer();
        var query = "SELECT * FROM favorite where name = ? ";
        $cordovaSQLite.execute(db, query, [name]).then(function(res) {
          console.log("get favorite " + name + ", number found: " +
            res.rows.length);
          q.resolve(res.rows.length > 0 ? res.rows.item(0) : null);
        }, function(err) {
          console.error("fail to get favorite: " + err.code + ": " +
            err.message);
          q.reject(err);
        });
        return q.promise;
      },
      delete: function(name) {
        console.log("delete favorite...: " + name);

        var q = $q.defer();

        var parentName = Utils.parentName(name);
        this.get(parentName).then(function(fav) {
          var isFav = 0;
          if (fav && fav.isFav > 0) {
            isFav = 2;
            console.log("delete favorite: parent is favorited ");
          }

          var query =
            "UPDATE favorite set isFav = ?, lastUpdateTime = CURRENT_TIMESTAMP  where name = ? ";
          $cordovaSQLite.execute(db, query, [isFav, name]).then(
            function(res) {
              console.log("delete favorite: " + res.rowsAffected);
              q.resolve();
            },
            function(err) {
              console.error("fail to delete favorite: " + err.code +
                ": " + err.message);
              q.reject(err);
            });
        });

        return q.promise;
      },
      saveReadPosition: function(name, text, scrolling) {
        //  categoryId INTEGER DEFAULT 0,  isFav INTEGER NOT NULL DEFAULT 1, lastUpdateTime INTEGER DEFAULT CURRENT_TIMESTAMP, last_read_chapter VARCHAR, last_read_text VARCHAR)"
        var q = $q.defer();
        var parentName = Utils.parentName(name);
        if (!parentName) {
          return;
        }
        if (text.length > 200) text = text.substring(0, 200) + "..."; //limit last read size to 200;
        name = name.substring(parentName.length);
        var recover =
          "UPDATE favorite SET last_read_chapter = ?, last_read_text = ?, last_read_scrolling = ?, lastUpdateTime = ? WHERE name = ?";
        $cordovaSQLite.execute(db, recover, [name, text, scrolling, new Date().getTime(),
            parentName
          ])
          .then(function(res) {
            console.log("saveReadPosition for favorite " + parentName + ", set last_read_chapter: " + name +
              ", last_read_text: " + text + ", rowsAffected: " +
              res.rowsAffected);
            q.resolve();
          }, function(err) {
            console.error("fail to saveReadPosition for favorite: " + err.code +
              ": " + err.message);
            q.reject(err);

          });
        return q.promise;
      },
      getLastReadPostion: function(name) {
        var q = $q.defer();
        var parentName = Utils.parentName(name);
        if (!parentName) {
          q.resolve(null);
          return q.promise;
        }
        name = name.substring(parentName.length);

        var query = "SELECT last_read_scrolling FROM favorite where name = ? and last_read_chapter = ? ";
        $cordovaSQLite.execute(db, query, [parentName, name]).then(function(res) {
          console.log("getLastReadPostion " + parentName +
            name + ", found: " +
            res.rows.length);
          q.resolve(res.rows.length > 0 ? res.rows.item(0).last_read_scrolling : null);
        }, function(err) {
          console.error("fail to get last read position: " + err.code + ": " +
            err.message);
          q.reject(err);
        });
        return q.promise;
      },
      list: function() {
        var q = $q.defer();
        var query =
          "SELECT * FROM favorite where isFav = 1 order by name";
        $cordovaSQLite.execute(db, query, []).then(function(res) {
          console.log("list favorites: " + res.rows.length);
          var list = [];
          for (var i = 0; i < res.rows.length; i++) {
            list[i] = res.rows.item(i);
          }
          q.resolve(res.rows);
        }, function(err) {
          console.error("fail to get favorite: " + err.code + ": " +
            err.message);
          q.reject(err);
        });
        return q.promise;
      },
    };
    return favService;
  })
  .factory('Cat', function($q, $window, $cordovaSQLite, DB) {
    var db;

    return {
      getDb: function() {
        if (db) return db;
        else db = DB.getDb();
        return db;
      },
      clean: function() {
        var dropTable = "DROP TABLE category";
        $cordovaSQLite.execute(this.getDb(), dropTable).then(function(res) {
          console.log("drop tb category, rowsAffected: " + res.rowsAffected);
        }, function(err) {
          console.error("fail drop tb favorite: " + err.code + ": " +
            err.message);
        });
      },
      prepare: function() {
        // var createTables = "DROP TABLE category";
        var createTables =
          "CREATE TABLE IF NOT EXISTS category (_id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR UNIQUE, parentCategoryId INTEGER DEFAULT 0);"
        $cordovaSQLite.execute(this.getDb(), createTables).then(function(
          res) {
          console.log("prepared tb category, rowsAffected: " + res.rowsAffected);
        }, function(err) {
          console.error("fail to prepare tb  categories: " + err.code +
            ": " +
            err.message);
        });

        var query = "SELECT * FROM category where _id = 0";
        $cordovaSQLite.execute(db, query, []).then(function(res) {
          if (res.rows.length == 0) {
            var initTable =
              "INSERT INTO category(_id,name,parentCategoryId) values (0,'books',0)";
            $cordovaSQLite.execute(db, initTable, []).then(function(res) {
              console.log("inited tb category, rowsAffected: " +
                res.rowsAffected);
            }, function(err) {
              console.error("fail init tb category: " + err.code +
                ": " + err.message);
            });
          }
        }, function(err) {
          console.error("fail to check categories: " + err.code + ": " +
            err.message);
          return null;
        });
      },
      save: function(name, parentCategoryId) {
        var insert =
          "INSERT INTO category(name,parentCategoryId) VALUES (?,?)";
        $cordovaSQLite.execute(db, insert, [name, parentCategoryId]).then(
          function(res) {
            console.log("saved category, rowsAffected: " + res.rowsAffected);
          },
          function(err) {
            console.error("fail to save categories: " + err.code + ": " +
              err.message);
          });
      },
      get: function(id) {
        var q = $q.defer();
        var query = "SELECT * FROM category where _id = ? ";
        $cordovaSQLite.execute(db, query, [id]).then(function(res) {
          console.log("get category: " + res);
          q.resolve(res.rows.length == 0 ? null : res.rows.item(0));
        }, function(err) {
          console.error("fail to get category: " + err.code + ": " +
            err.message);
          q.reject(err);
        });
        return q.promise;
      },
      list: function() {
        var q = $q.defer();
        var query =
          "SELECT * FROM category order by parentCategoryId, name";
        $cordovaSQLite.execute(db, query, []).then(function(res) {
          console.log("list categories: " + res.rows.length);
          q.resolve(res.rows);
        }, function(err) {
          console.error("fail to get categories: " + err.code + ": " +
            err.message);
          q.reject(err);
        });
        return q.promise;
      },

      listFavorites: function() {
        var q = $q.defer();
        var query =
          "SELECT c._id as catId, c.name as catName, c.parentCategoryId as parentCatId, f.name as name, f._id as favId, f.isFav as isFav, f.last_read_chapter as lastReadChapter, f.last_read_text as lastReadText FROM category as c left join favorite as f on c._id = f.categoryId where f.isFav = 1 order by f.lastUpdateTime desc, c.parentCategoryId, c.name,f.name";
        $cordovaSQLite.execute(DB.getDb(), query).then(function(res) {
          console.log("listFavorites with categories: " + res.rows.length);
          var list = [];
          for (var i = 0; i < res.rows.length; i++) {
            var item = res.rows.item(i);
            // list[i] = item;
            list[i] = {
              catId: item.catId,
              catName: item.catName,
              parentCatId: item.parentCatId,
              name: item.name,
              favId: item.favId,
              isFav: item.isFav,
              lastReadChapter: item.lastReadChapter,
              lastReadText: item.lastReadText
            };
            console.log(list[i]);
          }
          console.log(list);
          q.resolve(list);
        }, function(err) {
          console.error("fail to get categories: " + err.code + ": " +
            err.message);
          q.reject(err);
        });
        return q.promise;
      },
      findFavorite: function(favorites, name) {
        for (var i = 0; i < favorites.length; i++) {
          var fav = favorites[i];
          if (fav.name == name) {
            return name;
          }
        }
        return null;
      }

    };
  }).factory('History', function($q, $window, $cordovaSQLite, $rootScope, DB) {
    var db;

    var history = {
      getDb: function() {
        if (db) return db;
        else db = DB.getDb();
        return db;
      },
      clean: function() {
        var dropTable = "DROP TABLE history";
        $cordovaSQLite.execute(this.getDb(), dropTable).then(function(res) {
          console.log("drop tb history, rowsAffected: " + res.rowsAffected);
        }, function(err) {
          console.error("fail drop tb history: " + err.code + ": " +
            err.message);
        });
      },
      prepare: function() {
        var createTables =
          "CREATE TABLE IF NOT EXISTS history (_id INTEGER PRIMARY KEY AUTOINCREMENT, _name VARCHAR UNIQUE, _value VARCHAR DEFAULT '');"
        $cordovaSQLite.execute(this.getDb(), createTables).then(function(
          res) {
          console.log("prepared tb category, rowsAffected: " + res.rowsAffected);
          history.get("nightMode").then(function(value) {
            console.info("settings.nightMode=" + value);
            $rootScope.nightMode = value == "true" ? true : false;
          });
          history.get("traditionalChinese").then(function(value) {
            console.info("settings.traditionalChinese=" + value);
            $rootScope.traditionalChinese = value == "true" ?
              true :
              false;
          });
          history.get("fontSize").then(function(value) {
            console.info("fontSize=" + value);
            $rootScope.fontSize = value ? value: 24;
          });
        }, function(err) {
          console.error("fail to prepare tb  categories: " + err.code +
            ": " +
            err.message);
        });
      },
      save: function(name, value) {
        var replace = "replace into history(_name,_value) VALUES (?,?)";
        $cordovaSQLite.execute(db, replace, [name, value]).then(
          function(res) {
            console.log("saved history, rowsAffected: " + res.rowsAffected);
          },
          function(err) {
            console.error("fail to save history: " + err.code + ": " +
              err.message);
          });
      },
      get: function(name) {
        var q = $q.defer();
        var query = "SELECT _value FROM history where _name = ? ";
        $cordovaSQLite.execute(db, query, [name]).then(function(res) {
          console.log("get history: " + res);
          q.resolve(res.rows.length == 0 ? null : res.rows.item(0)._value);
        }, function(err) {
          console.error("fail to get history: " + err.code + ": " +
            err.message);
          q.reject(err);
        });
        return q.promise;
      }
    };
    return history;
  })
  .factory('Settings', function($q, $window, $cordovaSQLite, $rootScope, DB) {
    var db;

    var Settings = {
      getDb: function() {
        if (db) return db;
        else db = DB.getDb();
        return db;
      },
      clean: function() {
        var dropTable = "DROP TABLE settings";
        $cordovaSQLite.execute(this.getDb(), dropTable).then(function(res) {
          console.log("drop tb settings, rowsAffected: " + res.rowsAffected);
        }, function(err) {
          console.error("fail drop tb settings: " + err.code + ": " +
            err.message);
        });
      },
      prepare: function() {
        var createTables =
          "CREATE TABLE IF NOT EXISTS settings (_id INTEGER PRIMARY KEY AUTOINCREMENT, _name VARCHAR UNIQUE, _value VARCHAR DEFAULT '');"
        $cordovaSQLite.execute(this.getDb(), createTables).then(function(
          res) {
          console.log("prepared tb category, rowsAffected: " + res.rowsAffected);
          Settings.get("nightMode").then(function(value) {
            console.info("settings.nightMode=" + value);
            $rootScope.nightMode = value == "true" ? true : false;
          });
          Settings.get("traditionalChinese").then(function(value) {
            console.info("settings.traditionalChinese=" + value);
            $rootScope.traditionalChinese = value == "true" ?
              true :
              false;
          });
          Settings.get("fontSize").then(function(value) {
            console.info("fontSize=" + value);
            $rootScope.fontSize = value ? value: 24;
          });
          Settings.get("fontWeight").then(function(value) {
            console.info("fontWeight=" + value);
            $rootScope.fontWeight = value ? value: "normal";
          });
          Settings.get("brightness").then(function(value) {
            console.info("brightness=" + value);
            $rootScope.fontbrightnessSize = value ? value: 60;
          });
        }, function(err) {
          console.error("fail to prepare tb  categories: " + err.code +
            ": " +
            err.message);
        });
      },
      save: function(name, value) {
        var replace = "replace into settings(_name,_value) VALUES (?,?)";
        $cordovaSQLite.execute(db, replace, [name, value]).then(
          function(res) {
            console.log("saved settings, rowsAffected: " + res.rowsAffected);
          },
          function(err) {
            console.error("fail to save settings: " + err.code + ": " +
              err.message);
          });
      },
      get: function(name) {
        var q = $q.defer();
        var query = "SELECT _value FROM settings where _name = ? ";
        $cordovaSQLite.execute(db, query, [name]).then(function(res) {
          console.log("get settings: " + res);
          q.resolve(res.rows.length == 0 ? null : res.rows.item(0)._value);
        }, function(err) {
          console.error("fail to get settings: " + err.code + ": " +
            err.message);
          q.reject(err);
        });
        return q.promise;
      }
    };
    return Settings;
  })
  .factory('LastRead', function($q, $window, $cordovaSQLite, $rootScope, DB, Settings) {

  })
  .factory('Files', function($ionicPlatform, $cordovaFile, $q, ShortHash) {
    var dir = 'boook/';
    // $ionicPlatform.ready(function() {
    //   // dir = cordova.file.dataDirectory;
    //   window.resolveLocalFileSystemURL(dir, function(d) {
    //     console.log("data directory: " + d.fullPath + ": " + d.name +
    //       ": " +
    //       d.toURL());
    //     // dir = "Documents/";
    //   });
    // });
    return {
      clean: function() {
        $cordovaFile.listDir(dir).then(function(entries) {
          console.log('list dir ' + dir + ": " + entries);
          for (var i = 0; i < entries.length; i++) {
            entries[i].remove();
          }
        }, function(err) {
          console.error('clean file error: ' + dir + ", " + err.code +
            ", " + err.message);
        });
      },
      prepare: function() {
        $cordovaFile.createDir(dir, false).then(function(result) {
          console.log('prepare dir result: ' + ", " + dir + "," +
            result);
        }, function(err) {
          console.error('prepare file error: ' + dir + ", " + err.code +
            ", " +
            err.message);
        });
      },
      exists: function(name) {

        console.log("check file: " + name);
        var file = dir + ShortHash.unique(name);
        var q = $q.defer();
        $cordovaFile.checkFile(file).then(function(result) {
          console.log('file already exists: ' + file + ": " +
            result);
          q.resolve(true);
        }, function(err) {
          if (err.code == 1) {
            q.resolve(false);
            console.error('Not found, save file... : ' + file);
          } else {
            console.error('Check file error: ' + file + ": " + err.code +
              ": " +
              err.message);
            q.reject(err);
          }
        });
        return q.promise;
      },
      save: function(name, title, text) {

        console.log("save file: " + name + "," + title);
        var file = dir + ShortHash.unique(name);
        var q = $q.defer();
        $cordovaFile.checkFile(file).then(function(result) {
          console.log('file already exists: ' + file + ": " +
            result);
          q.resolve();
        }, function(err) {
          if (err.code == 1) {
            console.error('Not found, save file... : ' + file);
            var data = title.length + ":" + title + text;
            var compressed = LZString.compressToUTF16(data);
            console.log("Size of compressed is: " + compressed.length +
              " from " +
              data.length);

            $cordovaFile.writeFile(file, compressed, {}).then(
              function(
                result) {
                console.log('write file result ' + file + ": " +
                  result);
                q.resolve();
              },
              function(err) {
                console.error('write file error: ' + file + ": " +
                  err.code + ": " +
                  err.message);
                q.reject(err);
              });

          } else {
            console.error('Check file error: ' + file + ": " + err.code +
              ": " +
              err.message);
            q.reject(err);
          }
        });
        return q.promise;
      },

      get: function(name) {

        var fileName = dir + ShortHash.unique(name);
        console.log('Read file: ' + fileName);
        var q = $q.defer();

        $cordovaFile.readAsText(fileName).then(function(result) {
          var data = LZString.decompressFromUTF16(result); //name.length + ":" + name + content;
          var lenIndex = data.indexOf(':');
          var nameLen = parseInt(data.substring(0, lenIndex));
          var title = data.substring(lenIndex + 1, lenIndex + 1 +
            nameLen);
          var text = data.substring(lenIndex + 1 + nameLen);
          q.resolve({
            title: title,
            text: text
          });
        }, function(err) {
          console.error('read file error: ' + fileName + ": " + err
            .code +
            ": " +
            err.message);
          q.reject();
        });
        return q.promise;
      }
    };
  })
  .factory('Utils', function() {
    return {
      hideTabs: function(isHide) {
        if (isHide) {
          angular.element(document.getElementById('tabs')).addClass(
            'tabs-item-hide')
        } else {
          angular.element(document.getElementById('tabs')).removeClass(
            'tabs-item-hide')
        }
      },
      parentName: function(name) {
        var index = name.indexOf('/');
        if (index > 0) {
          return name.substring(0, index);
        } else {
          return null;
        }
      }
    };
  })
  .directive('compile', ['$compile', function($compile) {
    return function(scope, element, attrs) {
      scope.$watch(
        function(scope) {
          // watch the 'compile' expression for changes
          return scope.$eval(attrs.compile);
        },
        function(value) {
          // when the 'compile' expression changes
          // assign it into the current DOM
          element.html(value);

          // compile the new DOM and link it to the current
          // scope.
          // NOTE: we only compile .childNodes so that
          // we don't get into infinite loop compiling ourselves
          $compile(element.contents())(scope);
        }
      );
    };
  }])

/**~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		* Anchor Smooth Scroll - Smooth scroll to the given anchor on click
		*   adapted from this stackoverflow answer: http://stackoverflow.com/a/21918502/257494
		~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
//angular.module('yourapp')
.directive('anchor', function($location, $ionicScrollDelegate, $timeout) {
    'use strict';

    return {
      restrict: 'A',
      replace: false,
      scope: {
        'anchor': '@'
      },

      link: function($scope, $element, $attrs) {
        initialize();
        console.log("init ", $element)

        /* initialize -
				~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        function initialize() {
          createEventListeners();
        }

        /* createEventListeners -
				~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        function createEventListeners() {
          // listen for a click
          $element.on('click', function() {
            console.log("got to anchor: ", $scope.anchor)
              // set the hash like a normal anchor scroll
            $timeout(function() {
              $location.hash($scope.anchor);
              // console.log("anchorScroll by: ", $ionicScrollDelegate.$getByHandle('bookScroll'));
              $ionicScrollDelegate.$getByHandle('bookScroll').anchorScroll(
                true);
            });
          });
        }

      }
    };
  })
  .factory('FavTask', function($ionicPlatform, $cordovaFile, $sce, Wikipedia,
    Utils, Fav, Files) {
    return {
      fetchBook: function(id, name, isFav, isCheckSubBooks) {
        var that = this;
        Wikipedia.search(name).then(function(resp) {
          var book = resp.parse;
          if (book && book.text) {
            var bk = book.title;
            book.title = bk; //bk.indexOf(':') > 0 ? bk.substring(bk.indexOf(':') + 1) : bk
            book.text = $sce.trustAsHtml(Wikipedia.format(book.text[
              '*']));
            console.log("to save file: " + name + ", " + book.title);
            Files.save(name, book.title, book.text).then(function() {
              that.storeSubBooks(name, book.text, isCheckSubBooks);
            }, function(err) {
              console.error('Fail to save Book: ' + error);
            });
          } else {
            console.error("not found book from wiki: " + resp);
          }
        }, function(error) {
          console.error('Unable to get Book: ' + error);
        });
      },


      //check if favorite
      storeFavBook: function(name, isFav, isCheckSubBooks) {
        console.debug('----storeFavBook: ' + name + ", " + isFav + ", " +
          isCheckSubBooks);
        var that = this;
        Fav.get(name).then(function(fav) {
          if (fav && fav.isFav > 0) {
            //try read from file sys
            Files.exists(name).then(function(exists) {
              if (!exists) {
                that.fetchBook(fav._id, name, fav.isFav,
                  isCheckSubBooks);
              } else {
                if (isCheckSubBooks) {
                  Files.get(name).then(function(book) {
                    that.storeSubBooks(name, book.text,
                      isCheckSubBooks);
                  });
                }
              }
            });
          } else if (!fav) {
            Fav.save(name, isFav).then(function() {
              that.storeFavBook(name, isFav, isCheckSubBooks);
            });

          }
        });
      },

      storeSubBooks: function(name, text, isCheckSubBooks) {
        var that = this;
        //fetch sub-books of the book if found
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        // console.debug("------" + tempDiv);

        angular.forEach(tempDiv.getElementsByTagName('UL'), function(ele,
          index) {
          angular.forEach(ele.getElementsByTagName('LI'), function(
            ele,
            index) {
            angular.forEach(ele.getElementsByTagName('A'),
              function(
                ele, index) {
                var link = ele.href;
                console.debug("--" + link);
                if (link) {
                  var i = link.indexOf("\#tab/book/");
                  if (i >= 0) {
                    var subBookName = link.substring(i +
                      "\#tab/book/".length,
                      link.length);
                    subBookName = decodeURIComponent(
                      subBookName);
                    if (subBookName.indexOf(name + "/") == 0) {
                      console.debug('Find sub-book: ' +
                        subBookName);
                      that.storeFavBook(subBookName, 2,
                        isCheckSubBooks);
                    }
                  }
                }
              });
          });
        });
      }
    };
  }).factory('Ctrls', function(Fav, FavTask) {
    return {
      toggleFavorite: function(ionicModal, scope, name, favorite, onUpdated) {
        console.log("toggleFavorite: " + name + ": " + favorite);
        $scope = scope;

        if (favorite == 1) {
          scope.removeFavorite = function() {
            console.debug('do remove book: ' + name);
            Fav.delete(name).then(onUpdated);
            $scope.removalBookModal.remove();
          };
          $scope.cancelRemoveFavorite = function() {
            console.debug('hide removalBookModal');
            $scope.removalBookModal.remove();
          };
          console.debug('build and show removalBookModal');
          $scope.bookTitle = name;
          ionicModal.fromTemplateUrl(
            'model-confirm-removal-favorite.html', {
              scope: $scope,
              animation: 'slide-in-up'
            }).then(function(modal) {
            console.debug('model: ' + modal);
            $scope.removalBookModal = modal;
            modal.show();
            //Cleanup the modal when we're done with it!
            $scope.$on('$destroy', function() {
              if ($scope.removalBookModal) {
                $scope.removalBookModal.remove();
              }
            });
          });

        } else if (favorite == 2) {
          Fav.save(name).then(onUpdated);
        } else {
          Fav.save(name).then(function() {
            FavTask.storeFavBook(name, 1, true)
            if (onUpdated) onUpdated();
          });
        }
      },
    };
  }).factory('Flickr', function($q, $resource, FLICKR_API_KEY) {
    var baseUrl = 'http://api.flickr.com/services/rest/'

    var flickrSearch = $resource(baseUrl, {
      method: 'flickr.groups.pools.getPhotos',
      group_id: '1463451@N25',
      safe_search: 1,
      jsoncallback: 'JSON_CALLBACK',
      api_key: FLICKR_API_KEY,
      format: 'json'
    }, {
      get: {
        method: 'JSONP'
      }
    });

    return {
      search: function(tags, lat, lng) {
        var q = $q.defer();
        console.log('Searching flickr for tags', tags);
        flickrSearch.get({
          tags: tags,
          lat: lat,
          lng: lng
        }, function(val) {
          q.resolve(val);
        }, function(httpResponse) {
          q.reject(httpResponse);
        });

        return q.promise;
      }
    };
  }).factory('ShortHash', function() {
    //see https://github.com/bibig/node-shorthash

    // refer to: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
    var bitwise = function(str) {
      var hash = 0;
      if (str.length == 0) return hash;
      for (var i = 0; i < str.length; i++) {
        var ch = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
    };

    // 10进制转化成62进制以内的进制
    // convert 10 binary to customized binary, max is 62
    var binaryTransfer = function(integer, binary) {
      binary = binary || 62;
      var stack = [];
      var num;
      var result = '';
      var sign = integer < 0 ? '-' : '';

      function table(num) {
        var t = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return t[num];
      }

      integer = Math.abs(integer);

      while (integer >= binary) {
        num = integer % binary;
        integer = Math.floor(integer / binary);
        stack.push(table(num));
      }

      if (integer > 0) {
        stack.push(table(integer));
      }

      for (var i = stack.length - 1; i >= 0; i--) {
        result += stack[i];
      }

      return sign + result;
    };


    /**
     * why choose 61 binary, because we need the last element char to replace the minus sign
     * eg: -aGtzd will be ZaGtzd
     */
    return {
      unique: function(text) {
        var id = binaryTransfer(bitwise(text + "b"), 61);
        var r = id.replace('-', 'Z');
        // console.info("unique: " + text + " -> " + r);
        return r;
      }
    };

  });
