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
      //var HOST = '172.31.190.68';
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
      if(message != undefined) {
        Tools.getClient().write('/pm ' + $scope.currentConversation + ' ' + message);
        $scope.privateMessageToSend = message;
      }
      $scope.fileName = $("#file").val().replace(/.*(\/|\\)/, '');
      if($scope.fileName != '') {
        setTimeout(function() {
          Tools.getClient().write('/pmfile ' + $scope.currentConversation + ' ' + $scope.fileName);
          //Make input empty =>
          var control = $("#file");
          control.replaceWith( control = control.clone( true ) );
        }, 1000);
      }
    };

    $scope.hasAccepted = function() {
      for (var i = $scope.conversation.length - 1; i >= 0; i--) {
        if($scope.conversation[i].name == $scope.currentConversation)
          return $scope.conversation[i].hasAccepted;
      };
    };

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

      for (var i = $scope.conversation.length - 1; i >= 0; i--) {
        if($scope.conversation[i].name == $scope.currentConversation)
          $scope.conversation[i].isWaiting = false;
      };
    };

    $scope.acceptPrivateConversation = function() {
      Tools.getClient().write('/acceptpm '+ $scope.currentConversation);
    };

    $scope.rejectPrivateConversation = function() {
      Tools.getClient().write('/rejectpm '+ $scope.currentConversation);
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

    $scope.hasBeenAsked = function() {
      for (var i = $scope.conversation.length - 1; i >= 0; i--) {
        if($scope.conversation[i].name == $scope.currentConversation)
          return $scope.conversation[i].hasBeenAsked;
      };
    };

    $scope.acceptfile = function() {
      Tools.getClient().write('/acceptfile ' + $scope.currentConversation + ' ' + '<file_name>' + ' ' + '<IP>' + ' ' + '<PORT>');
    }

    $scope.rejectfile = function() {
      Tools.getClient().write('/rejectfile ' + $scope.currentConversation + ' ' + '<file_name>');
    }

    $scope.isAskingToShare = function(message) {
      if(message.status == 'received' && message.text.indexOf('asking to share:') != -1)
        return true;
      return false;
    }

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

        //SUCC_CHANNEL_JOINEDUSERLIST Malibu81USERLISTAWAY
        if(data.toString().indexOf('SUCC_CHANNEL_JOINED') != -1) {
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

        //SUCC_MESSAGE_SENDED
        if(data == ('SUCC_MESSAGE_SENDED')) {

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

        //PRIVATE_DISCU_ACCEPTED_FROM
        if(data.toString().indexOf('PRIVATE_DISCU_ACCEPTED_FROM') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation)
              el.messages.push({status: 'received', text: 'conversation accepted', sender: $scope.currentConversation});
          });
          $scope.acceptConversation();  
        }
        
        //PRIVATE_DISCU_REFUSED_FROM
        if(data.toString().indexOf('PRIVATE_DISCU_REFUSED_FROM') != -1) {
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
          $('#privateMessageId').val('');
          $scope.privateMessageToSend = '';
          $rootScope.privateMessageToSend = '';
        }

        //NEW_PM Quentin blabla
        if(data.toString().indexOf('NEW_PM') != -1) {
          var sender = data.toString().split(' ')[1];
          var text = data.toString().split(sender + ' ')[1];
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation)
              el.messages.push({status: 'received', text: text, sender: sender});
          });
        }

        //ASKING_FOR_PM Quentin
        if(data.toString().indexOf('ASKING_FOR_PM') != -1) {
          var sender = data.toString().split(' ')[1];
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation) {
              el.messages.push({status: 'received', text: 'asking for a conversation', sender: sender});
              el.hasBeenAsked = true;
            }
          });
        }


        //SUCCESSFUL_REFUSED
        if(data.toString().indexOf('SUCCESSFUL_REFUSED') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation) {
              el.messages.push({status: 'sended', text: 'conversation rejected', sender: $scope.userName});
              el.hasBeenAsked = false;
            }
          });
          $scope.rejectConversation();
        }

        //SUCCESSFUL_ACCEPTED
        if(data.toString().indexOf('SUCCESSFUL_ACCEPTED') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation) {
              el.messages.push({status: 'sended', text: 'conversation accepted', sender: $scope.userName});
              el.hasBeenAsked = false;
            }
          });
          $scope.acceptConversation();
        }

        //SUCC_PMFILE
        if(data.toString().indexOf('SUCC_PMFILE') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation) {
              el.messages.push({status: 'sended', text: 'asking to share: ' + $scope.fileName, sender: $scope.userName});
            }
          });
          $scope.fileName = '';
        }

        //NEW_FILE_REQUEST Malibu81
        if(data.toString().indexOf('NEW_FILE_REQUEST') != -1) {
          var sender = data.toString().split(' ')[1];
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation) {
              el.messages.push({status: 'received', text: 'asking to share: ' + $scope.fileName, sender: sender});
            }
          });
        }


        // Refresh scope
        $scope.$apply();
    });
});


