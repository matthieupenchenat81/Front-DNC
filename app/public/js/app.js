'use strict';

var app = angular.module('clientdnc', ['ui.router'])
  .factory('GUI', function() {
    return require('nw.gui');
  })
  .factory('Window', ['GUI', function(gui) {
    return gui.Window.get();
  }])

// These configs present the differents state of page. (html partials)
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


// This factory allows to access from different controllers the username and the clientSocket.
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

// This is the login controller
app.controller('LoginCtrl', function($scope, $state, $rootScope, Tools) {

    $scope.login = function(user, HOST, PORT) {

      if(PORT != undefined && PORT != '' && HOST != undefined && HOST != '') {
        // Create and connect the client to host
        Tools.createClient();
        Tools.getClient().connect(PORT, HOST, function() {

            console.log('CONNECTED TO: ' + HOST + ':' + PORT);
            Tools.getClient().write('/newname '+ user);

            // Redirect to home state
            $state.go('home.message', {
              pseudo: 'all'
            });
            Tools.setUser(user);
        });
      }
    };

    $scope.port = "2222";
    $scope.ip = "localhost";
});

app.controller('MainCtrl', function ($scope, $state, $rootScope, Tools) {


  //
  //
  //
  // Function to animate (with JavaScript) this app (some events)
  // to open modal, open a discussion, etc..
  //
  //
    
    // This function is used to close the modal (away from keyboard)
    $scope.closeModal = function() {
      $('#options').modal('hide');
    };

    // If the modal is hidden not by clicking on image, there is also /enable message
    $('#options').on('hidden.bs.modal', function () {
      Tools.getClient().write('/enable');
    });

    // This function is used to open the modal (away from keyboard)
    $scope.openModal = function() {
      $('#options').modal('show');
    }

    // This function allow to know if the app is currently in generalConversation state
    $scope.isGeneralConversation = function() {
      return ($scope.currentConversation == 'all');
    };

    // Allow to open a conversation (private or general)
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

    // Return the current conversation (messages)
    $scope.getCurrentConversation = function() {
      
      angular.forEach($scope.conversation, function(el) {
        if(el.name == $scope.currentConversation)
          $scope.messages = el.messages;
      });
      return $scope.messages;
    };

    // Allow to know if the current conversation has been accepted
    $scope.hasAccepted = function() {
      for (var i = $scope.conversation.length - 1; i >= 0; i--) {
        if($scope.conversation[i].name == $scope.currentConversation)
          return $scope.conversation[i].hasAccepted;
      };
    };

    // To accept a conversation (from view)
    $scope.acceptConversation = function() {
      for (var i = $scope.conversation.length - 1; i >= 0; i--) {
        if($scope.conversation[i].name == $scope.currentConversation)
          $scope.conversation[i].hasAccepted = true;
      };
    };

    // To reject a conversation (from view)
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

    // To know if the conversation is waiting for a accept or reject from the other user
    $scope.isWaiting = function() {
      for (var i = $scope.conversation.length - 1; i >= 0; i--) {
        if($scope.conversation[i].name == $scope.currentConversation)
          return $scope.conversation[i].isWaiting;
      };
    };

    // To know if the user has been asked to have a conversation from an other
    $scope.hasBeenAsked = function() {
      for (var i = $scope.conversation.length - 1; i >= 0; i--) {
        if($scope.conversation[i].name == $scope.currentConversation)
          return $scope.conversation[i].hasBeenAsked;
      };
    };

    // Allow to know if the user is asking to share a file 
    $scope.isAskingToShare = function(message) {
      if(message.status == 'received' && message.text.indexOf('asking to share:') != -1)
        return true;
      return false;
    };

    // Function to init main controller
    $scope.init = function() {
  
      $scope.messages = [];
      $scope.conversation = [];

      $scope.currentConversation = 'all';
      $scope.conversation.push({name: 'all', messages: []});

      $scope.userName = Tools.getUser();
      $scope.userList();
    };


  //
  //
  //
  //  All these followed functions send messages from client to serveur
  //
  //
  //

    // Calling this function, the user will be log out from DNC
    $scope.logout = function() {
      Tools.getClient().write('/quit');
    };

    // To get disable from DNC
    $scope.putAsdisable = function() {
      Tools.getClient().write('/disable');      
    };

    // To get enable from DNC
    $scope.putAsEnable = function() {
      Tools.getClient().write('/enable');      
    };

    // Allow to change the username
    $scope.changeUserName = function(newname) {

      if(newname != '' && newname != undefined)
        Tools.getClient().write('/name '+ newname);
    };

    // Allow to send a message in general discussion
    $scope.sendMessage = function(message) {

      if($scope.isGeneralConversation()) {
        Tools.getClient().write(message);
      }
    };

    // Allow to send a private message
    $scope.sendPrivateMessage = function() {
      var message = $('#privateMessageId').val();
      if(message != undefined && message != '') {
        Tools.getClient().write('/pm ' + $scope.currentConversation + ' ' + message);
      }
      $scope.fileName = $("#file").val().replace(/.*(\/|\\)/, '');
      if($scope.fileName != '') {
        setTimeout(function() {
          Tools.getClient().write('/pmfile ' + $scope.currentConversation + ' ' + $("#file").val());
          //Make input empty =>
          var control = $("#file");
          control.replaceWith( control = control.clone( true ) );
        }, 1000);
      }
    };

    // When accepting a file, this function is called and download the file
    $scope.downloadFile = function() {
      var net = require('net');
      var fs = require('fs');

      net.createServer(function(socket){
        var buffer = new Buffer(0, 'binary');

        socket.on("data", function(data){
          buffer = Buffer.concat([buffer, new Buffer(data,'binary')]);
        });

        socket.on("end", function(data) {
          fs.writeFile($scope.fileName, buffer, function(err) {
            if(err) {
              console.log(err);
            } else {
              console.log("file wrote with success");
            }
          }); 

        });
    
      }).listen(2221);
    };

    // This function allow to send a file to an other user
    $scope.sendFile = function(path, ip, port) {
      
      var net = require('net');
      var fs = require('fs');

      var PORT = port;
      var HOST = ip;
      var FILEPATH = path;

      var client = new net.Socket()

      //connect to the server
      client.connect(PORT,HOST,function() {
          'Client Connected to server'

          //send a file to the server
          var fileStream = fs.createReadStream(FILEPATH);
          fileStream.on('error', function(err){
              console.log(err);
          })

          fileStream.on('open',function() {
              fileStream.pipe(client);
          });

      });

      //handle closed
      client.on('close', function() {
          console.log('server closed connection')
      });

      client.on('error', function(err) {
          console.log(err);
      });
    };

    // To accept private conversation sending /acceptpm message to the serveur
    $scope.acceptPrivateConversation = function() {
      Tools.getClient().write('/acceptpm '+ $scope.currentConversation);
    };

    // To reject private conversation sending a /rejectpm message to the serveur
    $scope.rejectPrivateConversation = function() {
      Tools.getClient().write('/rejectpm '+ $scope.currentConversation);
    };

    // To send a request to begin a private conversation
    $scope.askToTalk = function() {
      Tools.getClient().write('/askpm '+ $scope.currentConversation);
    };

    // To accept a file from an user 
    $scope.acceptfile = function() {
      Tools.getClient().write('/acceptfile ' + $scope.currentConversation + ' ' + '2221' + ' ' + $scope.path);
    };

    // To reject a file from an user
    $scope.rejectfile = function() {
      Tools.getClient().write('/rejectfile ' + $scope.currentConversation + ' ' + $scope.path);
    };

    // To get users list
    $scope.userList = function() {
      Tools.getClient().write('/userlist');
    };

    // To get users list away
    $scope.userListAway = function() {
      Tools.getClient().write('/userlistaway');
    };

    // To init the main controller
    $scope.init(); 



  //
  //
  //
  //  All these following instrutions is about data received from serveur 
  //  There is a specific behaviour depending on data received
  //
  //

    Tools.getClient().on('data', function(data) {
        
        console.log('DATA: ' + data);

        // User list enabled
        if(data.toString().indexOf('300 ') != -1) {

          var users = data.toString().split("300 ")[1].split(' ');
          $scope.users = users;

          var index = $scope.users.indexOf($scope.userName);
          if (index > -1)
            $scope.users.splice(index, 1);
          
          angular.forEach($scope.users, function(el) {
            if(el != $scope.userName)
              $scope.conversation.push({name: el, messages: [], hasAccepted: false, isWaiting: false});
          });
          $scope.userListAway();
        };

        // User list disabled
        if(data.toString().indexOf('301 ') != -1) {

          var afkUsers = data.toString().split('301 ')[1].split(' ');
          $scope.afkUsers = afkUsers;  

          angular.forEach($scope.afkUsers, function(el) {
            if(el != $scope.userName)
              $scope.conversation.push({name: el, messages: [], hasAccepted: false, isWaiting: false});
          });
        };


        //SUCC_NICKNAME_CHANGED_TO
        if(data.toString().indexOf('203 ') != -1) {
          
          $scope.userName = $scope.newname;
          $scope.newname = '';
        };

        //SUCC_MESSAGE_SENDED
        if(data == ('202')) {

          angular.forEach($scope.conversation, function(el) {
            if(el.name == 'all')
              el.messages.push({status: 'sended', text: $scope.messageToSend, sender: $scope.userName});
          });
          $scope.messageToSend = '';
        };

        //SUCC_DISABLED
        if(data == ('210')) {
          $scope.openModal();
        };

        //SUCCESSFUL_LOGOUT
        if(data == ('201')) {
          // Close the client socket completely
          Tools.deleteClient();
          
          // redirect login route 
          $state.go('login');
        }

        //SUCC_ENABLED
        if(data == ('209')) {
          $scope.closeModal();
        };

        //NEW_MSG Biboo lll
        if(data.toString().indexOf('304 ') != -1) {
          var sender = data.toString().split(' ')[1];
          var text = data.toString().split(sender+ ' ')[1];
          angular.forEach($scope.conversation, function(el) {
            if(el.name == 'all')
              el.messages.push({status: 'received', text: text, sender: sender});
          });
        }

        //IS_NOW_DISABLE alooo
        if(data.toString().indexOf('311 ') != -1) {
          var user = data.toString().split(' ')[1];
          var index = $scope.users.indexOf(user);
          if (index > -1) {
            $scope.users.splice(index, 1);
            if(!$scope.afkUsers) $scope.afkUsers = [];
            $scope.afkUsers.push(user);

            if($scope.currentConversation == user)
              $scope.openConversation('all');
          }
        }

        //IS_NOW_ENABLE Biboo
        if(data.toString().indexOf('310 ') != -1) {
          var user = data.toString().split(' ')[1];
          var index = $scope.afkUsers.indexOf(user);
          if (index > -1) {
            $scope.afkUsers.splice(index, 1);
            $scope.users.push(user);
          }
        }

        //HAS_LEFT alooo
        if(data.toString().indexOf('303 ') != -1) {
          var user = data.toString().split(' ')[1];
          if($scope.users == undefined) $scope.users = [];
          var index = $scope.afkUsers.indexOf(user);
          if (index > -1)
            $scope.afkUsers.splice(index, 1);

          var index2 = $scope.users.indexOf(user);
          if (index2 > -1)
            $scope.users.splice(index2, 1);
        }


        //HAS_JOIN bobibbb
        if(data.toString().indexOf('302 ') != -1) {
          var user = data.toString().split(' ')[1];
          if($scope.users == undefined) $scope.users = [];
          $scope.users.push(user);
          $scope.conversation.push({name: user, messages: [], hasAccepted: false, isWaiting: false});
        }


        //SUCCESSFUL_ASKED
        if(data.toString().indexOf('206') != -1) {
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
        if(data.toString().indexOf('308') != -1) {
          var sender = data.toString().split(' ')[1];
          angular.forEach($scope.conversation, function(el) {
            if(el.name == sender)
              el.messages.push({status: 'received', text: 'conversation accepted', sender: $scope.currentConversation});
          });
          $scope.acceptConversation();  
        }
        
        //PRIVATE_DISCU_REFUSED_FROM
        if(data.toString().indexOf('309') != -1) {
          var sender = data.toString().split(' ')[1];
          angular.forEach($scope.conversation, function(el) {
            if(el.name == sender)
              el.messages.push({status: 'received', text: 'conversation rejected', sender: $scope.currentConversation});
          });
          $scope.rejectConversation();
        }

        //SUCC_PM_SENDED
        if(data.toString().indexOf('205') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation)
              el.messages.push({status: 'sended', text: $('#privateMessageId').val(), sender: $scope.userName});
          });
          $('#privateMessageId').val('');
        }

        //NEW_PM Quentin blabla
        if(data.toString().indexOf('306') != -1) {
          var sender = data.toString().split(' ')[1];
          var text = data.toString().split(sender + ' ')[1];
          angular.forEach($scope.conversation, function(el) {
            if(el.name == sender)
              el.messages.push({status: 'received', text: text, sender: sender});
          });
        }

        //ASKING_FOR_PM Quentin
        if(data.toString().indexOf('307 ') != -1) {
          var sender = data.toString().split(' ')[1];
          angular.forEach($scope.conversation, function(el) {
            if(el.name == sender) {
              el.messages.push({status: 'received', text: 'asking for a conversation', sender: sender});
              el.hasBeenAsked = true;
            }
          });
        }

        //SUCCESSFUL_REFUSED
        if(data.toString().indexOf('208') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation) {
              el.messages.push({status: 'sended', text: 'conversation rejected', sender: $scope.userName});
              el.hasBeenAsked = false;
            }
          });
          $scope.rejectConversation();
        }

        //SUCCESSFUL_ACCEPTED
        if(data.toString().indexOf('207') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation) {
              el.messages.push({status: 'sended', text: 'conversation accepted', sender: $scope.userName});
              el.hasBeenAsked = false;
            }
          });
          $scope.acceptConversation();
        }

        //SUCC_PMFILE
        if(data.toString().indexOf('211') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation) {
              el.messages.push({status: 'sended', text: 'asking to share: ' + $scope.fileName, sender: $scope.userName});
            }
          });
          $scope.fileName = '';
        }

        //NEW_FILE_REQUEST Malibu81
        if(data.toString().indexOf('312 ') != -1) {
          var sender = data.toString().split(' ')[1];
          $scope.path = data.toString().split(sender)[1];
          var fileName = $scope.path.replace(/.*(\/|\\)/, '');
          $scope.fileName = fileName;
          angular.forEach($scope.conversation, function(el) {
            if(el.name == sender) {
              el.messages.push({status: 'received', text: 'asking to share: ' + fileName, sender: sender});
            }
          });
        }


        //313: CAN_SEND_FILE <nick> <port> <ip> <path>
        if(data.toString().indexOf('313 ') != -1) {
          var sender = data.toString().split(' ')[1];
          var args= data.toString().split('313 ')[1];
          var port = args.split(' ')[2];
          var ip = args.split(' ')[1];
          var path = data.toString().split(port+ ' ')[1];
          angular.forEach($scope.conversation, function(el) {
            if(el.name == sender) {
              el.messages.push({status: 'received', text: 'file received', sender: sender});
            }
          });
          $scope.sendFile(path, ip, port);
        }

        //314: HAS_REJECT_FILE <nick> <path>
        if(data.toString().indexOf('314 ') != -1) {
          var sender = data.toString().split(' ')[1];
          var path = data.toString().split(sender+ ' ')[1];
          angular.forEach($scope.conversation, function(el) {
            if(el.name == sender) {
              el.messages.push({status: 'received', text: 'has rejected: ' + path.replace(/.*(\/|\\)/, ''), sender: sender});
            }
          });
        }


        //SUCC_ACCEPTED_FILE
        if(data.toString().indexOf('212 ') != -1) {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation) {
              el.messages.push({status: 'sended', text: 'file accepted', sender: $scope.userName});
            }
          });
          $scope.downloadFile();
        }

        //SUCC_REFUSED_FILE
        if(data.toString() == '213') {
          angular.forEach($scope.conversation, function(el) {
            if(el.name == $scope.currentConversation) {
              el.messages.push({status: 'sended', text: 'file rejected', sender: $scope.userName});
            }
          });
        }                

        // Refresh scope
        $scope.$apply();
    });
});