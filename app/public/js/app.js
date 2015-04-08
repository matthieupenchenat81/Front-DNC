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
    controller: 'LoginCtrl'
  }).state("home", {
    url: "/conversation",
    templateUrl: "partials/home.html",
    controller: 'MainCtrl'
  }).state("home.message", {
    url: "/{pseudo}",
    templateUrl: "partials/messages.html"
  });

});

app.factory('Tools', function($rootScope) {

        // Node Js - Request to serveur
        var net = require('net');
        var client = undefined;
        var user = undefined; 

        return {

            getClient: function () {
                return client;
            },
            deleteClient: function() {
              client.destroy();
            },
            createClient: function() {
              client = new net.Socket();
            },
            setUser: function (pUser) {
              user = pUser;
            },
            getUser: function () {
              return user;
            }
        };
    }
);

app.controller('LoginCtrl', function($scope, $state, $rootScope, Tools) {

    $scope.login = function(user) {

      // Node JS 
      var HOST = '127.0.0.1';
      var PORT = 2222;

      Tools.createClient();
      Tools.getClient().connect(PORT, HOST, function() {

          console.log('CONNECTED TO: ' + HOST + ':' + PORT);
          Tools.getClient().write('/newname '+ user);

          $state.go('home.message', {
            pseudo: 'all'
          });
          Tools.setUser(user);
      });
    };
});

app.controller('MainCtrl', function ($scope, $state, $rootScope, Tools) {
    

    $scope.closeModal = function() {
      $('#options').modal('hide');
    };

    $scope.openModal = function() {
      $('#options').modal('show');
    }
    
    $scope.logout = function() {
      Tools.getClient().write('/quit');
    };

    $scope.isGeneralConversation = function() {

      return ($scope.currentConversation == 'all');
    };

    $scope.openConversation = function(nickname) {

      $scope.currentConversation = nickname;
      $state.go('home.message', {
        pseudo: nickname
      });

      // Search existance of this conversation
      var exist = false;
      angular.forEach($scope.conversation, function(el) {
        if(el.name == nickname)
          exist = true;
      })
      // If conversation don't exist
      if(exist == false)
        $scope.conversation.push({name: nickname, messages: [], hasAccepted: false, isWaiting: false});
    };

    $scope.getCurrentConversation = function() {
      
      angular.forEach($scope.conversation, function(el) {
        if(el.name == $scope.currentConversation)
          $scope.messages = el.messages;
      });
      return $scope.messages;
    };

    $scope.putAsdisable = function() {
      Tools.getClient().write('/disable');      
    }

    $scope.putAsEnable = function() {
      Tools.getClient().write('/enable');      
    }

    $scope.changeUserName = function(newname) {

      Tools.getClient().write('/name '+ newname);
    };

    $scope.sendMessage = function(message) {

      if($scope.isGeneralConversation()) {
        Tools.getClient().write(message);
      }
    };

    $scope.sendPrivateMessage = function(message) {
      Tools.getClient().write('/pm ' + $scope.currentConversation + ' ' + message);
      console.log('/pm ' + $scope.currentConversation + ' ' + message);
      //$scope.privateMessageToSend = message;
    };

    $scope.hasAccepted = function() {
      for (var i = $scope.conversation.length - 1; i >= 0; i--) {
        if($scope.conversation[i].name == $scope.currentConversation)
          return $scope.conversation[i].hasAccepted;
      };
    };

    //$scope.getMessageToSend = function() {
    //   for (var i = $scope.conversation.length - 1; i >= 0; i--) {
    //     if($scope.conversation[i].name == $scope.currentConversation) {
    //       if(!$scope.conversation[i].messageToSend)
    //         $scope.conversation[i].messageToSend = '';
    //       return $scope.conversation[i].messageToSend;
    //     }
          
    //   };
    // };

    // $scope.resetMessageToSend = function() {
    //   for (var i = $scope.conversation.length - 1; i >= 0; i--) {
    //     if($scope.conversation[i].name == $scope.currentConversation)
    //       $scope.conversation[i].messageToSend = '';
    //   };
    // };

    $scope.acceptConversation = function() {
      for (var i = $scope.conversation.length - 1; i >= 0; i--) {
        if($scope.conversation[i].name == $scope.currentConversation)
          $scope.conversation[i].hasAccepted = true;
      };
    };

    $scope.rejectConversation = function() {
      for (var i = $scope.conversation.length - 1; i >= 0; i--) {
        if($scope.conversation[i].name == $scope.currentConversation)
          $scope.conversation[i].hasAccepted = false;
      };
    };

    $scope.askToTalk = function() {
      Tools.getClient().write('/askpm '+ $scope.currentConversation);
    };

    $scope.isWaiting = function() {
      for (var i = $scope.conversation.length - 1; i >= 0; i--) {
        if($scope.conversation[i].name == $scope.currentConversation)
          return $scope.conversation[i].isWaiting;
      };
    };

    $scope.init = function() {
  
      $scope.messages = [];
      $scope.conversation = [];

      $scope.currentConversation = 'all';
      $scope.conversation.push({name: 'all', messages: []});

      $scope.userName = Tools.getUser();
    };

    $scope.init();

    // Add a 'data' event handler for the client socket
    // data is what the server sent to this socket
    Tools.getClient().on('data', function(data) {
        
        console.log('DATA: ' + data);

        //ERR_NICKNAME_ALREADY_USED
        //ERR_INVALID_NICKNAME
        //ERR_NICKNAME_ALREADY_USED
        //ERR_USER_HAS_NOT_ASK
        //ERR_DEST_NOT_FOUND
        //ERR_NOT_ACCEPTED

        //CHANNEL_JOINED_AS nicknameUSERLISTUSERLISTAWAY
        if(data.toString().indexOf('CHANNEL_JOINED_AS') != -1) {
          var users = data.toString().split("USERLIST")[1].split('USERLISTAWAY')[0].split(" ");
          users.shift();
          $scope.users = users;

          var afkUsers = data.toString().split('USERLISTAWAY')[1].split(" ");
          afkUsers.shift();
          $scope.afkUsers = afkUsers;  
        };

        //SUCC_NICKNAME_CHANGED_TO
        if(data.toString().indexOf('SUCC_NICKNAME_CHANGED_TO') != -1) {
          
          //var arr = data.toString().split(" ");
          $scope.userName = $scope.newname;
          $scope.newname = '';
        };

        //SUCCESSFUL_MESSAGE_SENDED
        if(data == ('SUCCESSFUL_MESSAGE_SENDED')) {

          angular.forEach($scope.conversation, function(el) {
            if(el.name == 'all')
              el.messages.push({status: 'sended', text: $scope.messageToSend, sender: $scope.userName});
          });
          $scope.messageToSend = '';
        };

        //SUCC_DISABLED
        if(data == ('SUCC_DISABLED')) {
          $scope.openModal();
        };

        //SUCCESSFUL_LOGOUT
        if(data == ('SUCCESSFUL_LOGOUT')) {
          // Close the client socket completely
          Tools.deleteClient();
          
          // redirect login route 
          $state.go('login');
        }

        //SUCC_ENABLED
        if(data == ('SUCC_ENABLED')) {
          $scope.closeModal();
        };

        //NEW_MSG Biboo lll
        if(data.toString().indexOf('NEW_MSG') != -1) {
          var sender = data.toString().split(' ')[1];
          var text = data.toString().split(sender+ ' ')[1];
          angular.forEach($scope.conversation, function(el) {
            if(el.name == 'all')
              el.messages.push({status: 'received', text: text, sender: sender});
          });
        }

        //IS_NOW_DISABLE alooo
        if(data.toString().indexOf('IS_NOW_DISABLE') != -1) {
          var user = data.toString().split(' ')[1];
          var index = $scope.users.indexOf(user);
          if (index > -1) {
            $scope.users.splice(index, 1);
            $scope.afkUsers.push(user);
          }
        }

        //IS_NOW_ENABLE Biboo
        if(data.toString().indexOf('IS_NOW_ENABLE') != -1) {
          var user = data.toString().split(' ')[1];
          var index = $scope.afkUsers.indexOf(user);
          if (index > -1) {
            $scope.afkUsers.splice(index, 1);
            $scope.users.push(user);
          }
        }

        //HAS_LEFT alooo
        if(data.toString().indexOf('HAS_LEFT') != -1) {
          var user = data.toString().split(' ')[1];
          var index = $scope.afkUsers.indexOf(user);
          if (index > -1)
            $scope.afkUsers.splice(index, 1);

          var index2 = $scope.users.indexOf(user);
          if (index2 > -1)
            $scope.users.splice(index2, 1);
        }


        //HAS_JOIN bobibbb
        if(data.toString().indexOf('HAS_JOIN') != -1) {
          var user = data.toString().split(' ')[1];
          $scope.users.push(user);
        }


        //SUCCESSFUL_ASKED
        if(data.toString().indexOf('SUCCESSFUL_ASKED') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation)
              el.messages.push({status: 'sended', text: 'asking for a conversation', sender: $scope.userName});
          });

          for (var i = $scope.conversation.length - 1; i >= 0; i--) {
            if($scope.conversation[i].name == $scope.currentConversation)
              $scope.conversation[i].isWaiting = true;
          };
        }

        //SUCC_PRIVATE_DISCUSSION_ACCEPTED
        if(data.toString().indexOf('SUCC_PRIVATE_DISCUSSION_ACCEPTED') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation)
              el.messages.push({status: 'received', text: 'conversation accepted', sender: $scope.currentConversation});
          });
          $scope.acceptConversation();  
        }
        
        //SUCC_PRIVATE_DISCUSSION_REFUSED
        if(data.toString().indexOf('SUCC_PRIVATE_DISCUSSION_REFUSED') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation)
              el.messages.push({status: 'received', text: 'conversation rejected', sender: $scope.currentConversation});
          });
          $scope.rejectConversation();
        }

        //SUCC_PM_SENDED
        if(data.toString().indexOf('SUCC_PM_SENDED') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation)
              el.messages.push({status: 'sended', text: $scope.privateMessageToSend, sender: $scope.userName});
          });
          $scope.privateMessageToSend = '';
        }

        // Refresh scope
        $scope.$apply();
    });
});


