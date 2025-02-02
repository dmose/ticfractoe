/*global console,$ */

function GameSaverSession() {
}
GameSaverSession.prototype = {
  emailAddress: null,
  loggedIn: false,
  
  login: function gss_login(onLoginComplete) {
    this._onLoginComplete = onLoginComplete || function () {};
    
    // XXX only works in browsers that support ECMAscript bind
    navigator.id.getVerifiedEmail(this._gotVerifiedEmail.bind(this));
  },
  
  _gotVerifiedEmail: function gss_gotVerifiedEmail(assertion) {
    var self = this;
    var audience = document.domain || 'null';
    if (assertion) {
      $.ajax({
        type: 'POST',
        // XXX you didn't see the hardcoded localhost here.  just keep moving.
        url: 'http://localhost:54321/api/login',
        data: { assertion: assertion, audience: audience },
        success: function(res, status, xhr) {
          if (res) {
            self.emailAddress = res;
            self._onLoginComplete();
            self.loggedIn = true;
          } else {
            console.log("BrowserID validation async POST failure");
          }
        },
        error: function(res, status, xhr) {  
          console.log("BrowserID validation sync POST failure");
        }
      });
    } else {
      console.log("BrowserID validation failed: no assertion returned");
    }
  }
};

// grab some settings from the query string
var settings = { boardsize: 300, maxdepth: 2 };
try {
  if(location.search) {
    location.search.substring(1).split('&').forEach(function(x) { var l = x.split('='); settings[l[0]] = l[1]; });
  }
}
catch(ex) {}
const MAX_DEPTH = settings.maxdepth;
const BOARD_SIZE = settings.boardsize;
const SQUARE_SIZE = BOARD_SIZE / 3;
const POS_X = [0,SQUARE_SIZE,SQUARE_SIZE*2,0,SQUARE_SIZE,SQUARE_SIZE*2,0,SQUARE_SIZE,SQUARE_SIZE*2];
const POS_Y = [0,0,0,SQUARE_SIZE,SQUARE_SIZE,SQUARE_SIZE,SQUARE_SIZE*2,SQUARE_SIZE*2,SQUARE_SIZE*2];
var board = [null,null,null,null,null,null,null,null,null];
var states = [];
var turn = 0;
var zooming = 0;
var zoomingToX = 0, zoomingToY = 0;
var timerVal = -1;

function setMessage(m)
{
  document.getElementById('message').firstChild.textContent = m;
}

function drawBoard(cx)
{
  cx.beginPath();
  for(var i=SQUARE_SIZE; i<BOARD_SIZE; i+=SQUARE_SIZE) {
    cx.moveTo(i,0);
    cx.lineTo(i,BOARD_SIZE);
    cx.moveTo(0,i);
    cx.lineTo(BOARD_SIZE,i);
  }
  cx.closePath();
  cx.stroke();
}

function drawMoveAt(cx, player, square)
{
  var lw = cx.lineWidth;
  cx.lineWidth = 4;
  cx.save();
  // leave a little bit of room around it
  cx.translate(POS_X[square] + 0.05*SQUARE_SIZE,POS_Y[square] + 0.05*SQUARE_SIZE);
  cx.scale(0.9,0.9);
  cx.beginPath();
  if(player == 0) { // X
    cx.moveTo(0,0);
    cx.lineTo(SQUARE_SIZE,SQUARE_SIZE);
    cx.moveTo(SQUARE_SIZE,0);
    cx.lineTo(0,SQUARE_SIZE);
  }
  else { // O
    cx.arc(SQUARE_SIZE/2,SQUARE_SIZE/2,SQUARE_SIZE/2,0,2*Math.PI,false);
  }
  cx.closePath();
  cx.stroke();
  cx.restore();
  cx.lineWidth = lw;
}

function isFinished()
{
  if (board[0] != null &&
  ((board[0] == board[1] && board[0] == board[2]) ||
     (board[0] == board[3] && board[0] == board[6]) ||
     (board[0] == board[4] && board[0] == board[8])))
     return board[0];

  if (board[2] != null &&
  ((board[2] == board[5] && board[2] == board[8]) ||
     (board[2] == board[4] && board[2] == board[6])))
    return board[2];

  if (board[3] != null &&
  board[3] == board[4] && board[3] == board[5])
    return board[3];

  if (board[6] != null &&
  board[6] == board[7] && board[6] == board[8])
    return board[6];

  if(board[1] != null &&
  board[1] == board[4] && board[1] == board[7])
    return board[1];

  return -1;
}

function fillPossibilities(cx,player,n,depth)
{
  //too small to see anyway
  if(depth > MAX_DEPTH)
    return;
  cx.save();
  states.push(board.map(function(x) { return x; }));
  board[n] = player;
  //console.log(player + ': ' + n + ' (' + states.length + ' states)\n');
  //console.log(board + '\n');
  //TODO: see if that move won the game
  // translate and scale down into this space
  cx.translate(POS_X[n],POS_Y[n]);
  cx.scale(1/3,1/3);
  var w = isFinished();
  if(w != null && w > -1) {
    // somebody won
    cx.fillStyle = (w == 0 ? "red" : "blue");
    cx.fillRect(0,0,BOARD_SIZE,BOARD_SIZE);
  }
  drawBoard(cx);
  for(var i=0; i<board.length; i++) {
    if(board[i] != null) {
      drawMoveAt(cx,board[i],i);
    }
  }

  // now find the next free move for the other player
  if(w == -1 || w == null) {
    player = 1 - player;
    for(var i=0; i<board.length; i++) {
      if(board[i] == null) {
        fillPossibilities(cx,player,i,depth+1);
      }
    }
  }
  board = states[states.length-1];
  states.pop();
  cx.restore();
}

function showSekrit()
{
  document.getElementById("sekrit").style.display = '';
  return false;
}

function onLoginComplete() {
    $("#login").hide();
    $("#loadsave").show();
}

var gameSaverSession;

function onLoad()
{

  gameSaverSession = new GameSaverSession();

  // XXX if cookie, set state to logged in
   
  // XXX else set up for login
  
  // hide our loading & saving
  $("#loadsave").hide();

  // tell it to initiate the process when clicked
  $("#login").click(function () { gameSaverSession.login(onLoginComplete) });

  if(settings.sekrit) {
    showSekrit();
  }
  var x = document.getElementById("x");
  var y = document.getElementById("y");
  x.width = x.height = y.width = y.height = BOARD_SIZE;
  x.style.width = x.style.height = y.style.width = y.style.height = BOARD_SIZE + 'px';
  var cx = x.getContext("2d");
  cx.clearRect(0,0,BOARD_SIZE,BOARD_SIZE);
  cx.lineWidth = 2;
  cx.lineCap = 'round';
  drawBoard(cx);

  //dump('------------\n');
  for(var i=0; i<9; i++) {
    fillPossibilities(cx,0,i,0);
  }
  setMessage(['X','O'][turn] + "'s turn.");
}

function doTurn()
{
  timerVal = -1;
  var cx = document.getElementById("x").getContext("2d");
  cx.clearRect(0,0,BOARD_SIZE,BOARD_SIZE);
  drawBoard(cx);

  var w = isFinished();
  for(var i=0; i<9; i++) {
    if(board[i] == null) {
      if(w == -1 || w == null)
        fillPossibilities(cx,turn,i,0);
    }
    else {
      drawMoveAt(cx, board[i], i);
    }
  }
  if(w != null && w > -1) {
    setMessage(['X','O'][w] + " is the winner!");
    turn = -1;
  }
  else if(board.filter(function(x) { return x == null; }).length == 0) { // no moves left
    setMessage("It's a draw!");
    turn = -1;
  }
  else {
    setMessage(['X','O'][turn] + "'s turn.");
  }
}

function zoom()
{
  var x,y;
  timerVal = -1;
  x = y = BOARD_SIZE / 2 - SQUARE_SIZE / 2;
  var cx = document.getElementById("x").getContext("2d");
  cx.clearRect(0,0,BOARD_SIZE,BOARD_SIZE);
  // roughly the 10th root of 3
  cx.scale(1.116125,1.116125);
  cx.drawImage(document.getElementById("y"),
               -zoomingToX*zooming/9,-zoomingToY*zooming/9);
  zooming++;
  if(zooming < 10) {
    timerVal = setTimeout(zoom, 20);
  }
  else {
    setMessage("Redrawing...");
    cx.restore();
    timerVal = setTimeout(doTurn, 10);
  }
}

function clickCanvas(ev)
{
  if(turn == -1 || timerVal != -1)
    return;

  var r = Math.floor((ev.clientY) / SQUARE_SIZE);
  var c = Math.floor((ev.clientX) / SQUARE_SIZE);
  var n = c + 3*r;
  if(board[n] != null) {
    setMessage("Please choose an unoccupied square.  Still " + ['X','O'][turn] + "'s turn.");
  }
  else {
    board[n] = turn;
    turn = 1 - turn;
    setMessage("Moving...");
    var ccx = document.getElementById("x");
    var ccy = document.getElementById("y")
    var cx = ccx.getContext("2d");
    var cy = ccy.getContext("2d");
    cy.clearRect(0,0,BOARD_SIZE,BOARD_SIZE);
    cy.drawImage(ccx,0,0);

    zoomingToX = POS_X[n];
    zoomingToY = POS_Y[n];
    document.getElementById("x").getContext("2d").save();
    zooming = 0;
    timerVal = setTimeout(zoom,20);
  }
}

function startOver()
{
  if(timerVal != -1)
    clearTimeout(timerVal);

  timerVal = -1;
  board = [null,null,null,null,null,null,null,null,null];
  states = [];
  turn = 0;
  onLoad();
  return false;
}
