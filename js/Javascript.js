(function($) {
	$.fn.minesweeper = function(settings) {
		var showMenu = false;
		// if no settings specified, menu will appear
		if(settings == undefined){
			showMenu = true;
		}
		// set default configuration
		settings = jQuery.extend({
				// game settings
				cols: 		20,		
				rows:		20,		
				mines:		20,		
				difficulty:	"beginner" ,		
				// debug
				debug:			false	
			},settings);

/* Difficulty object */
function difficulty(cols, rows, mines){
	this.cols = cols;
	this.rows = rows;
	this.mines = mines;
}
		var difficulty_beginner = new difficulty(20,20,10);

		//global variables
		var container = this;
		var matrix;
		var gameFinished;
		var round;
		var minesLeft;
		var flagButton;
		
		log(settings);
		
		// If settings are valid:  initialize
		var settingsCheck = checkSettings();
		if ( settingsCheck == true && showMenu == false ){
			log("settings OK, no menu needed");
			init(); // initialize
		}
		else { // if settings are invalid or not present
			// get last settings from local storage
			if (typeof(localStorage) != "undefined" ) {
				log("local storage is available");
				try {
					if ( localStorage.getItem("minesweeperCurrentSettings" ) ){
						var raw = localStorage.getItem("minesweeperCurrentSettings" );
						raw = raw.split("|");
						settings.difficulty = raw[0];
						settings.cols = raw[1];
						settings.rows = raw[2];
						settings.mines = raw[3];
						log("settings loaded successfuly from local storage");
					}
					else {
						log("no previously saved settings in localstorage");
					}
				}
				catch (e) {
					log("Localstorage error!", "error"); 
					log(e, "error"); 
				}
			}
			renderMenu(); // render menu
		}

// Check whether settings are valid
function checkSettings(){
	log("commencing settings check");
	var errors = new Array();
	if (settings.cols % 1 != 0 || settings.cols < 1){
		errors.push("cols settings incorrect. cols: "+ settings.cols +" (settings.cols % 1 != 0 || settings.cols < 1");
	}
	if (settings.rows % 1 != 0 || settings.rows < 1){
		errors.push("rows settings incorrect. rows: "+ settings.rows +" (settings.rows % 1 != 0 || settings.rows < 1)");
	}
	if (settings.mines % 1 != 0 || settings.mines < 1 || (settings.mines >= settings.rows * settings.cols) ){
		errors.push("mines settings incorrect. mines: "+ settings.mines +" (settings.mines % 1 != 0 || settings.mines < 1 || (settings.mines >= settings.rows * settings.cols)");
	}
	// to-do: check difficulty
	// to-do: only check rows, cols, mines if no difficulty is set and vice versa
	if (errors.length > 0) {
		if (settings.debug == true) {
			log("Settings check failed!","error");
			for (e in errors){
				log(errors[e],"error");
			}
		}
		return errors;
	}
	else {
		log("Settings check successful");
		return true;
	}
}

// Renders board cells and assigns click events
function renderBoard() {
	log("Board rendering started with: " + settings.cols + "x" + settings.rows);
	var cells = 0; //number of cells rendered
	var field = $("<div></div>")
	
	function flagCell (target){
		if(gameFinished == false){
			if ( $(target).hasClass("flag") ){
				$(target).removeClass("flag");
				foundMines--;
				update(minesLeft);
			}
			else {
				$(target).addClass("flag");
				foundMines++;
				update(minesLeft);
			}
			return false;
		}
		log("Game already finished. Start a new game to play some more");
	}
	
	$(field).addClass("field");
	for (var y = 0; y < settings.rows; y++){
		var row = $("<div></div>");
		$(row).addClass("row");
		matrix[y] = new Array();
		for (var x = 0; x < settings.cols; x++){
			var cell = $("<div>&nbsp;</div>");
			$(cell).data({"x":x, "y":y});
			$(cell).bind("contextmenu", function(e) {
				if(gameFinished == false){
					return flagCell(this);
				}
				else {
					alert("Refresh for a new game");
					return false;
				}
			});

			$(cell).click( function() { // cell click event
				if(gameFinished == false){
					if (round == 1){
						// start the stopwatch
						var update = function() {
							if (stopwatchSeconds == 59){
								stopwatchMinutes++;
								stopwatchSeconds = 0;
							}
							else {
								stopwatchSeconds++;
							}
							$(stopwatch).children("span").html( addZerosToNumber(stopwatchMinutes,2) + ":" + addZerosToNumber(stopwatchSeconds,2) );
						}
						stopwatchInterval = setInterval(update, 1000);
					}
					if ( $(flagButton).hasClass("pressed") == true ){
						return flagCell(this);
					}
					else if ( !$(this).hasClass("flag") ){ // disable clicking flagged cells
						$(this).addClass("revealed");
						// remove left and right click events
						$(this).unbind("click");
						$(this).unbind("contextmenu");
	
						var mines = mineCheck(this); // check for mines
						
						// redistribute mines if the player hit a mine on the first cell
						if( round == 1 && mines === true){
							log("stepped on a mine on the first round. Redistributing mines ...", "warn");
							// empty matrix
							for (mY in matrix ) {
								for (mX in matrix[mY] ) {
									$(matrix[mY][mX]).data("mine",false);
								}
							}
							layMines( $(this).data("x")*1, $(this).data("y")*1 ); // lay new mines, avoid clicked cell
							mines = mineCheck(this); // check for mines again
						}
						
						// player hit the mine
						if (mines === true){
							clearTimeout(stopwatchInterval);
							
							gameFinished = true;
							$(this).addClass("mine");
							$(this).addClass("dead");
							//reveal all mines
							revealAllMines();
							//to-do: handle new game after game ends
							alert("You hit a mine X-(\nBetter luck next time ...\nGame time: "+addZerosToNumber(stopwatchMinutes,2) + ":" + addZerosToNumber(stopwatchSeconds,2));
							var highScores = getHighScores();
							displayHighScores(highScores);
							return false;
						}
						else if (mines == 0){
							revealSafeCells(this);
							// reveal all safe cells connected to the current one
						}
						else { // for cells that are not safe add a number and class
							$(this).addClass("mines"+mines);
							$(this).html(mines);
						}
						checkVictory(); // Check if player won
						round++;
					}
				}
				else {
					alert("Reload for new game");
				}
			});
			matrix[y][x] = cell;
			row.append( cell );
			cells++;
		}
		$(field).append( row );
	}
	$(container).append( field );
	$(container).addClass("minesweeper-board");
	log("Board rendering completed. Total cells rendered: " + cells);
	log(matrix);
}

// Check for mines on the current cell and on neighbouring cells
function mineCheck(cell) {
	var x = $(cell).data("x")*1;
	var y = $(cell).data("y")*1;

	log( "mine check commenced at x: " + x + " y: " + y );
	
	// check for mine on the current cell
	if( $(cell).data("mine") == true ){
		log( "mine at " + x + "x" + y + "!", "warn" );
		return true;
	}
	
	var neighbourhood = [ 
		[x-1,y-1],
		[x,y-1],
		[x+1,y-1],
		[x-1,y],
		[x+1,y],
		[x-1,y+1],
		[x,y+1],
		[x+1,y+1]
	]; // coordinates of neighbouring cells
	
	var mines = 0;
	// Check neighbourhood for mines
	for (nCell in neighbourhood ) {
		var x = neighbourhood[nCell][0] 
		var y = neighbourhood[nCell][1]
		// check if x and y are within existing range
		// check if neighboring cell is a mine
		if ( x >= 0 && x < settings.cols && y >= 0 && y < settings.rows && $(matrix[y][x]).data("mine") == true ){
			mines++;
		}
	}
	log( "found " + mines + " mines nearby" );
	return mines;
}

// function reveals all mines when player looses and shows flagged and non-flagged mines
function revealAllMines(){
	for (mY in matrix ) {
		for (mX in matrix[mY] ) {
			if ( $(matrix[mY][mX]).data("mine") == true ) {
				$(matrix[mY][mX]).addClass("mine");
				$(matrix[mY][mX]).addClass("revealed");
			}
		}
	}
}

// reveal all cells that are next to safe cells that are connected to the original safe cell and are not already revealed
function revealSafeCells(cell) {
	var x = $(cell).data("x")*1;
	var y = $(cell).data("y")*1;
	var neighbourhood = [ 
		[x-1,y-1],
		[x,y-1],
		[x+1,y-1],
		[x-1,y],
		[x+1,y],
		[x-1,y+1],
		[x,y+1],
		[x+1,y+1]
	]; // coordinates of neighbouring cells
	
	for (nCell in neighbourhood ) {
		var x = neighbourhood[nCell][0] // overrides previous variable
		var y = neighbourhood[nCell][1] // overrides previous variable

		/* check if x and y are within existing range
		 * check if cell is not already revealed
		 * check if cell is not flagged
		 * than reveal it
		 */
		if ( x >= 0 && x < settings.cols && y >= 0 && y < settings.rows && ( $(matrix[y][x]).hasClass("revealed") == false) && ( $(matrix[y][x]).hasClass("flag") == false) ){
			$(matrix[y][x]).addClass("revealed");
			$(matrix[y][x]).unbind("click");
			
			var mines = mineCheck(matrix[y][x]);
			
			if ( mines == 0 ) {
				revealSafeCells( matrix[y][x] );
			}
			else {
				$(matrix[y][x]).addClass("mines"+mines);
				$(matrix[y][x]).html(mines);
			}
		}
	}
}

/* Distributes mines on the field
 * optional avoidX and avoidY are used to make sure player will not step on a mine in the first round
*/
function layMines(avoidX, avoidY) {
	var mines = 0;
	var loopbreaker = 0;
	logGroup("mine laying"); // groups mine laying attempts into a group
	while ( mines < settings.mines && loopbreaker < 10000 ) {
		cX = Math.floor(Math.random() * settings.cols + 1)-1;
		cY = Math.floor(Math.random() * settings.rows + 1)-1;
		
		log(cX + "x" + cY + "(avoid " + avoidX + "x" + avoidY + ") : " + ( $(matrix[cY][cX]).data("mine") != true ) + " | " + ( (cX != avoidX) || (cY != avoidY) ) );
		

		if( $(matrix[cY][cX]).data("mine") != true && ( (cX != avoidX) || (cY != avoidY) ) ){
			$(matrix[cY][cX]).data("mine", true) ;
			log("mine set at " + cX + "x" + cY );
			mines++;
		}
		loopbreaker++;
	}
	if (loopbreaker >= 1000) {
		log("layMines error. Maximum number of iterations reached","error");
	}
	logGroup("end"); // end of the console group
	log(mines + " mines laid, armed and ready! Mine density " + Math.round( mines / ( settings.cols * settings.rows) * 100 ) / 100 + " mines per square");
} 

/* function checks victory: if number of revealed cells matches total number of cells minus number of mines.
 * therefor it is not necesary to flag all mines, just to reveal all cells with nomines (and not step on any mines in the process)
 */  
function checkVictory(){
	if( $(container).find(".revealed").length == settings.cols*settings.rows - settings.mines ) {
		clearTimeout(stopwatchInterval); // stop stopwatch
		//remove all click events
		revealAllMines();
		var allCells = $(container).find(".row div");
		$(allCells).unbind("click");
		$(allCells).unbind("contextmenu");
		
		//save high scores
		var gameTime = addZerosToNumber(stopwatchMinutes,2) + ":" + addZerosToNumber(stopwatchSeconds,2);
		var name = prompt("Congratulation! You have found all the mines. :-)\nGame time: " + gameTime + "\n\n" + "Do you wish to save your score?\nEnter name:", "anonymous");
		
		var highScores = getHighScores();
		
		if (name != "" && name != undefined){
			highScores.push(name + ";" + settings.difficulty + ";" + settings.cols + ";" + settings.rows + ";" + settings.mines + ";" + gameTime);
			saveHighScores(highScores);
		}
		
		displayHighScores(highScores);
		
		return true;
	}
	return false;
}

//Sets up game variables, sets up board and lays mines
function init() {
	matrix = new Array();
	gameFinished = false;
	round = 1;
	foundMines = 0;

	renderBoard(); // render playing board
	layMines(); // distribute mines

	var panel = $("<div></div>");
	$(panel).addClass("panel");


	//render mines left
	minesLeft = $("<div></div>");
	$(minesLeft).addClass("mines-left");
	$(minesLeft).attr("title","Mines left");
	$(minesLeft).html("<span>" + settings.mines + "</span>");
	
	//render flag button
	flagButton = $("<div></div>");
	$(flagButton).addClass("flag-button");
	$(flagButton).attr("title","Toggle flagging mines");
	$(flagButton).click( function(){
		$(this).toggleClass("pressed");
	} );
	$(flagButton).html("<span>&nbsp;</span>");
	//render new game button
	var newGame = $("<div></div>");
	$(newGame).addClass("new-game");
	$(newGame).html("<span>New game</span>");
	$(newGame).attr("title","Close current game and start a new one");
	$(newGame).click( function(){
		cleanup();
		renderMenu()
	} );
	
	//assemble panel
	$(panel).append( $(flagButton) );
	$(panel).append( $(minesLeft) );
	$(container).append( $(panel) );

	log("Game begun " + addZerosToNumber(curr_hour,2) + ":" + addZerosToNumber(curr_min,2) + "");
}

// Logs to firebug console if available and if debug: true
function log(message,type){
	if (typeof console != "undefined" && typeof console.log != "undefined" &&settings.debug == true){
		switch(type){
			case undefined:
				console.log(message);
				break;
			case "error":
				console.error(message);
				break;
			case "warn":
				console.warn(message);
				break;
			default:
				return false;
		}
	}
	return false;
}

// Handles log groups with firebug console if available and if debug: true
function logGroup(group){
	if (typeof console != "undefined" && typeof console.group != "undefined" &&settings.debug == true){
		switch(group){
			case "end":
				console.groupEnd();
				break;
			default:
				console.group(group);
		}
	}
	return false;
}

	}
})(jQuery);