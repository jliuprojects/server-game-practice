var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var num_players = 0;
var free_spots = [];

function Player (name, socket, index){
	this.name = name;
	this.index = index;
	this.socket = socket;
	this.balance = 2;
	this.cards = [];
}

var players = [];

app.get('/', function(req, res){
  res.sendfile('index.html');
});

io.on('connection', function(socket){
	console.log('a user connected');

	if (free_spots.length){
		console.log("free spots");
		players[free_spots[0]] = new Player('jason', socket, free_spots[0]);
		free_spots.pop();
	}else {
		console.log("no free spots");
		players.push(new Player('jason', socket, num_players));
		num_players++;
	}
	


	socket.emit('update-balance', {balance:2});

	socket.on('disconnect', function(){
		console.log('user disconnected');
    	console.log(this.id);
    	for (var i = 0; i < players.length; i++){
  			if (players[i].socket.id == this.id){
  				free_spots.push(i);
  				break;
  			}
  		}
  	});

  	socket.on('tax', function(data){
  		console.log('user tax');
  		for (var i = 0; i < players.length; i++){
  			if (players[i].socket.id == this.id){
  				if ('player' + (i + 1) == data.parent){
  					players[i].balance += 3;
  					io.sockets.emit('update-balance', {balance:players[i].balance , playerId:players[i].index + 1});	
  				}
  				break;
  			}
  		}
  	});
});

http.listen(3000, function(){
  	console.log('listening on *:3000');
});