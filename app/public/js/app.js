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
    url: "/conversation",
    templateUrl: "partials/home.html",
    controller: "MainCtrl"
  }).state("home.message", {
    url: "/{pseudo}",
    templateUrl: "partials/messages.html",
  });

});


app.controller('MainCtrl', function ($scope, $state, $rootScope) {
    
    $scope.login = function(user) {
      $state.go('home.message', {
        pseudo: 'all'
      });
      $rootScope.userName = user;
    };

    $scope.closeModal = function() {
      $('#options').modal('hide');
    };

    $scope.logout = function() {
      $state.go('login');
    };

    $scope.isGeneralConversation = function() {
      return ($scope.currentConversation == 'all');
    };

    $scope.openConversation = function(nickname) {

      $scope.currentConversation = nickname;
      $state.go('home.message', {
        pseudo: nickname
      });
    };

    $scope.currentConversation = 'all';
});

