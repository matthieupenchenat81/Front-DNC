'use strict';

var app = angular.module('clientdnc', ['ui.router'])
  .factory('GUI', function() {
    return require('nw.gui');
  })
  .factory('Window', ['GUI', function(gui) {
    return gui.Window.get();
  }])
  
app.config(function ($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.otherwise("/login");

  $stateProvider.state("login", {
    url: "/login",
    templateUrl: "partials/login.html",
    controller: "MainCtrl"
  }).state("home", {
    url: "/home",
    templateUrl: "partials/home.html",
    controller: "MainCtrl"
  });

});


app.controller('MainCtrl', function ($scope, $state) {
    
    $scope.login = function() {
      $state.go('home');
    };

    $scope.closeModal = function() {
      $('#options').modal('hide');
    };

    $scope.logout = function() {
      $state.go('login');
    };
});

