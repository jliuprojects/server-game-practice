function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

var HEROS = ["Ambassador", "Assassin", "Captain", "Contessa", "Duke"];

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

// var players = [new Player(),new Player(),new Player(),new Player()];
// var deck = new Deck();
// var game = new Game (players, deck);