var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var num_players = 0;
var free_spots = [];

function Player (name, socket, index){
	this.name = name;
	this.index = index;
	this.socket = socket;
	this.balance = 7;
  this.cards = [];
  this.stringCards = '??';
  this.hiddenCards = '??';
}

var PLAYERS_PLAYING = 0;
var inprogress = false;
var turn = 0;
var contestable = null;
var blockable = null;
var used_deck = [];
var unused_deck = [];

function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

function startGame (){
  if (!inprogress){
    unused_deck = ['duke', 'duke', 'duke', 
              'captain', 'captain', 'captain', 
              'assassin', 'assassin', 'assassin',
              'contessa','contessa','contessa',
              'ambassador', 'ambassador', 'ambassador'];
    shuffle(unused_deck);
    turn = 0;
    contestable = null;
    blockable = null;
    used_deck = [];

    console.log('gameStarted');
    PLAYERS_PLAYING = players.length;
    for (var i = 0; i < PLAYERS_PLAYING; i++){
      io.sockets.emit('update-cards', {playerId: i + 1 , cards: players[i].hiddenCards});
      io.sockets.emit('update-balance', {playerId: i + 1, balance: 2});

	  players[i].cards.push(unused_deck.pop());
	  players[i].cards.push(unused_deck.pop());

	  players[i].stringCards = players[i].cards[0] + ':' + players[i].cards[1];
	  players[i].socket.emit('update-cards', {playerId: i + 1 , cards: players[i].stringCards});
    }
    inprogress = true;
    io.sockets.emit('update-log', {log : 'it is ' + players[turn].name + "'s turn"});
  }
}

function effect_faid(playersIndex){
	players[playersIndex].balance += 2;
    io.sockets.emit('update-balance', {balance: players[playersIndex].balance , playerId: playersIndex + 1});
}

function effect_tax(playersIndex){
	players[contestable.playersIndex].balance += 3;
    io.sockets.emit('update-balance', {balance: players[contestable.playersIndex].balance , playerId: contestable.playersIndex + 1}); 
}

function effect_ambassador(playersIndex){
	players[playersIndex].cards.push(unused_deck.pop());
	players[playersIndex].cards.push(unused_deck.pop());
	players[playersIndex].stringCards = '';
	for (var i = 0; i < players[playersIndex].cards.length; i++){
		players[playersIndex].stringCards += ':' + players[playersIndex].cards[i];
	}
	players[playersIndex].socket.emit('update-cards', {playerId: playersIndex + 1 , cards: players[playersIndex].stringCards});
	players[playersIndex].socket.emit('pick-shuffle-card');
	players[playersIndex].socket.emit('pick-shuffle-card');
	nextTurn();
}

function effect_assassinate(playersIndex, targetIndex){

}

function effect_steal(gainerIndex, loserIndex){

}

function effect_coup(playersIndex, targetIndex){
	if (players[playersIndex].balance >= 7){
		players[playersIndex].balance -= 7;
		io.sockets.emit('update-log', {log : players[playersIndex].name + ' coups' + players[targetIndex].name});
		io.sockets.emit('update-balance', {balance: players[playersIndex].balance , playerId: playersIndex + 1});
		players[targetIndex].socket.emit('pick-lose-card');
		nextTurn();
    }
}

function passiveAction(playersIndex, type){
  if (turn == playersIndex && !contestable && !blockable) {
    switch(type) {
      case 'income':
        io.sockets.emit('update-log', {log : players[playersIndex].name + ' took income'});
        players[playersIndex].balance += 1;
        io.sockets.emit('update-balance', {balance: players[playersIndex].balance , playerId: playersIndex + 1});
        nextTurn();
        break;
      case 'faid':
        io.sockets.emit('update-log', {log : players[playersIndex].name + ' takes foreign aid, does any duke wanna SAY SUMTING?!'});
        blockable = {playersIndex: playersIndex, type: 'faid', confirmed: [], bloackablePlayersIndex: ''};
        break;
      case 'tax':
        io.sockets.emit('update-log', {log : players[playersIndex].name + ' taxes, does any duke wanna SAY SUMTING?!'});
        contestable = {playersIndex: playersIndex, type: 'tax', contesablePlayersIndex: '', confirmed: []};
        break;
      case 'ambassador':
        io.sockets.emit('update-log', {log : players[playersIndex].name + ' ambassadors'});
        contestable = {playersIndex: playersIndex, type: 'ambassador', contesablePlayersIndex: '', confirmed: []};
        break;
      default:
      	console.log('no passive action');
        break;
    }
  }
}

function targetAction(playersIndex, targetName, type){
  if (turn == playersIndex && !contestable && !blockable) {
    var targetIndex;
    for (var i = 0; i < PLAYERS_PLAYING; i++){
      if(players[i].name == targetName){
        targetIndex = i;
      }
    }
    console.log(type);
    console.log(targetName);
    switch(type) {
		case 'coup':
			effect_coup(playersIndex, targetIndex);
			break;
		default:
			break;
    }
  }
}

function nextTurn(){
  blockable = null;
  contestable = null;
  turn++;
  if (turn == PLAYERS_PLAYING){
    turn = 0;
  }
  io.sockets.emit('update-log', {log : 'it is ' + players[turn].name + "'s turn"});
}

function updateCards(playersIndex){
	for(var j = 0; j < PLAYERS_PLAYING; j++){
		if (playersIndex == j){
		  players[j].socket.emit('update-cards', {playerId: playersIndex + 1 , cards: players[playersIndex].stringCards});
		}else{
		  players[j].socket.emit('update-cards', {playerId: playersIndex + 1 , cards: players[playersIndex].hiddenCards});
		}
	}
}

function destroyCard(card){
	used_deck.push(card);
}

function shuffleCard(socket, card){
	players[socket.playersIndex].stringCards = '';
	players[socket.playersIndex].hiddenCards = '';
	for (var i = 0; i < players[socket.playersIndex].cards.length; i++){
		if (players[socket.playersIndex].cards[i] == card){
			unused_deck.push(players[socket.playersIndex].cards.splice(i,1));
			shuffle(unused_deck);
			break;
		}
	}

	for (var i = 0; i < players[socket.playersIndex].cards.length; i++){
		players[socket.playersIndex].stringCards += ':' + players[socket.playersIndex].cards[i];
		players[socket.playersIndex].hiddenCards += '?';
	}
	updateCards(socket.playersIndex);
}

function loseCard(socket, card){
  if (players[socket.playersIndex].cards.length == 1){
    io.sockets.emit('update-log', {log : players[socket.playersIndex].name + ' LOST THE GAME!!'});
    io.sockets.emit('update-cards', {playerId: socket.playersIndex + 1 , cards: 'LOST'});
    players[socket.playersIndex] = null;
    return;
  }
  players[socket.playersIndex].stringCards = '';
  players[socket.playersIndex].hiddenCards = '';
  for (var i = 0; i < players[socket.playersIndex].cards.length; i++){
    if (players[socket.playersIndex].cards[i] == card){
    	destroyCard(players[socket.playersIndex].cards.splice(i,1));
    	break;
    }
  }

  for (var i = 0; i < players[socket.playersIndex].cards.length; i++){
  	players[socket.playersIndex].stringCards += ':' + players[socket.playersIndex].cards[i];
  	players[socket.playersIndex].hiddenCards += '?';
  }
  updateCards(socket.playersIndex);
}

function hasCard(player, card){
  for (var i = 0; i < player.cards.length; i++){
    if (player.cards[i] == card){
      return true;
    }
  }
  return false;
}

function block(socket){
  if (blockable){
    io.sockets.emit('update-log', {log : players[socket.playersIndex].name + ' blocks, do you contest?'});
    switch(blockable.type){
      case 'faid':
        contestable = {playersIndex: socket.playersIndex, type: 'block-faid', contesablePlayersIndex: blockable.playersIndex, confirmed: []};
        blockable = null;
        break;
    }
  }
}

function contest(socket){
  if (contestable){
    io.sockets.emit('update-log', {log : players[socket.playersIndex].name + ' CONTESTS!!'});
    var loser;
    switch(contestable.type){
    	case 'block-faid':
	        if (socket.playersIndex != contestable.contesablePlayersIndex){
	        	io.sockets.emit('update-log', {log : 'its not your turn ' + players[socket.playersIndex].name + ', you cannot contest'});
	        	return;
	        }
	        
	        if (hasCard(players[contestable.playersIndex], 'duke')){
	          loser = socket.playersIndex;
	        }else{
	          loser = contestable.playersIndex;

	          effect_faid(socket.playersIndex);
	        }
	        break;

    	case 'tax':
	        if (hasCard(players[contestable.playersIndex], 'duke')){
	        	loser = socket.playersIndex;
	        	effect_tax(contestable.playersIndex);
	        }else{
	        	loser = contestable.playersIndex;
	        }
	        break;

	    case 'ambassador':
	    	if (hasCard(players[contestable.playersIndex], 'ambassador')){
	        	loser = socket.playersIndex;
	        	effect_ambassador(contestable.playersIndex);
	        }else{
	        	loser = contestable.playersIndex;
	        }
	    	break;
    }
    io.sockets.emit('update-log', {log : players[loser].name + ' LOST!! Pick a card to discard.'});
    players[loser].socket.emit('pick-lose-card');
    nextTurn();
  }
}

function dontblock (socket) {
  if (blockable){
    io.sockets.emit('update-log', {log : players[socket.playersIndex].name + ' does not block'});
    blockable.confirmed[socket.playersIndex] = true;
    for (var i = 0; i < PLAYERS_PLAYING; i++){
      if (players[i] && !blockable.confirmed[i]){
        return;
      }
    }
    switch(blockable.type){
      case 'faid':
        io.sockets.emit('update-log', {log : 'nobody blocks and ' + players[socket.playersIndex].name + ' takes foreign aid'});
        effect_faid(socket.playersIndex);
        break;
    }
    nextTurn();
  }
}

function dontcontest(socket) {
  if (contestable){
    io.sockets.emit('update-log', {log : players[socket.playersIndex].name + ' does not contest'});
    contestable.confirmed[socket.playersIndex] = true;
    for (var i = 0; i < PLAYERS_PLAYING; i++){
      if (players[i] && !contestable.confirmed[i]){
        return;
      }
    }
    switch(contestable.type){
      	case 'tax':
        	io.sockets.emit('update-log', {log : 'nobody contests and ' + players[contestable.playersIndex].name + ' taxes'});
        	effect_tax(contestable.playersIndex);
        	break;
      	case 'ambassador':
	       	effect_ambassador(contestable.playersIndex);
	    	break;
    }
    contestable = null;
    nextTurn();
  }
}

var players = [];

app.get('/', function(req, res){
  res.sendfile('index.html');
});

app.get('/styling', function(req, res){
  res.sendfile('styling.css');
});

io.on('connection', function(socket){
	console.log('a user connected');

	if (free_spots.length){
		console.log("free spots");
		players[free_spots[free_spots.length-1]] = new Player('default', socket, free_spots[free_spots.length-1]);
    socket.playersIndex = free_spots[free_spots.length-1];
		free_spots.pop();
	}else {
		console.log("no free spots");
		players.push(new Player('default', socket, num_players));
    socket.playersIndex = num_players;
		num_players++;
	}

  socket.on('save-name', function(data){
    console.log('saving name');

    players[this.playersIndex].name = data.name;
    for (var i = 0; i < players.length; i++){
      io.sockets.emit('update-name', {playerId: i + 1 , name: players[i].name});
    }

    io.sockets.emit('update-log', {log : data.name + ' has joined the game'});
    console.log('name saved');
  });

	socket.on('passiveAction', function(data){
    passiveAction(this.playersIndex, data.type);
  });

  socket.on('targetAction', function(data){
    targetAction(this.playersIndex, data.targetName, data.type);
  });
  
  socket.on('startGame', function(){
    startGame();
  });

  socket.on('dontblock', function(){
    dontblock(this);
  });

  socket.on('block', function(){
    block(this);
  });

  socket.on('contest', function(){
    contest(this);
  });

  socket.on('dontcontest', function(){
    dontcontest(this);
  });

  socket.on('lose-card', function(data){
    loseCard(this, data.card);
  });

  socket.on('shuffle-card', function(data){
    shuffleCard(this, data.card);
  });

  socket.on('show-my-cards', function(data){
  	//not used i dont think
    this.emit('update-cards', {playerId: this.playersIndex + 1 , cards: players[this.playersIndex].stringCards});
    console.log('name saved');
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');

    free_spots.push(this.playersIndex);

  });
});

http.listen(3000, function(){
  	console.log('listening on *:3000');
});