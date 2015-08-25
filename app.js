var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var connected_players = [];
var game;
var HEROS = ["Ambassador", "Assassin", "Captain", "Contessa", "Duke"];

function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

function Card (hero){
  this.hero = hero || "";
  switch (hero){
    case "Ambassador":
      this.description = "Draw two cards, put back two cards after looking";
      break;
    case "Assassin":
      this.description = "kill someone for 3 coins";
      break;
    case "Captain":
      this.description = "steal 2 coins";
      break;
    case "Contessa":
      this.description = "blocks assassination";
      break;
    case "Duke":
      this.description = "can tax";
      break;
  }
}

function Deck (){
  this.unusedCards = [];
  this.deadCards = [];

  for (var i=0; i < 15; i++){
    var card = new Card (HEROS[i%5]);
    this.unusedCards.push(card)
  }
}

Deck.prototype.shuffle = function (){
  shuffle(this.unusedCards);
}

Deck.prototype.drawOne = function (){
  return this.unusedCards.pop();
}

Deck.prototype.putBackOne = function (card){
  this.unusedCards.push(card);
}

function Player (socket, name){
  this.socket = socket || "";
  this.name = name || "";
  this.cards = [];
  this.balance = 2;
  this.isDead = false;
  this.isPlaying = false;
}

function Game (players, deck){
  this.players = players;
  this.deck = deck;
  this.playersReplied = 0;
  this.playersLeft = players.length;
  this.started = false;
  this.turnAction = {actioner: "", action: "", target: ""};
  this.turnIndex = 0;
}

Game.prototype.startGame = function (){
  if (this.started){
    console.log("game has already been started");
    return;
  }

  for (var i = 0; i < this.players.length; i++){
    this.players[i].isPlaying = true;

    for (var j = 0; j < 2; j++){
      this.players[i].cards.push(this.deck.unusedCards.pop());
    }
  }
}

Game.prototype.updateClient = function (){
  for(var i = 0; i < this.players.length; i++){
    if (this.players[i].isDead){
      continue;
    }
    var data = {name: this.players[i].name, balance: this.players[i].balance, stringCards: ""};

    for (var j=0; j < this.players[i].cards.length; j++){
      data.stringCards += "?";
    }
    io.sockets.emit('update-client', data);

    data.stringCards = "";
    for (var j=0; j < this.players[i].cards.length; j++){
      data.stringCards += this.players[i].cards[j].hero;
    }
    this.players[i].socket.emit('update-client', data);
  }
}

Game.prototype.playerAction = function (actioner, action, targetName){
  this.turnAction = {actioner: actioner, action: action, targetName: targetName};
  io.sockets.emit('update-log', {log: actioner.name + " " + action + " " + targetName})
}

Game.prototype.playerReply = function (reply, card){
  if (reply == "block"){
    if (this.turnAction.action == "assassinate"){

    }else if
  }else if (reply == "challenge"){

  }else{

  }
}

app.get('/', function(req, res){
  res.sendfile('index.html');
});

app.get('/styling', function(req, res){
  res.sendfile('styling.css');
});

io.on('connection', function(socket){
  var self = this;
	console.log('a user connected');

  socket.on('join-game', function(data){
    this.player = new Player (this, data.name);
    connected_players.push(this.player);

    for(var i = 0; i < connected_players.length; i++){
      io.sockets.emit('update-client', {name: connected_players[i].name});
    }
  });

  socket.on('start-game', function(){
    game = new Game (connected_players, new Deck());
    game.startGame();
    game.updateClient();
  });

  socket.on('player-action', function(data){
    game.playerAction(this.player, data.action, data.targetName);
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(3000, function(){
  	console.log('listening on *:3000');
});