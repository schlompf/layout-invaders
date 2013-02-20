﻿/**
* layout invaders, working alpha
*
* A space invaders inspired game for indesign
*
*
* Copyright (c) 2012, Philipp Geuder | philippgeuder.com
* Licensed under the MIT license:
* http://www.opensource.org/licenses/mit-license.php
*
*
*/

#targetengine "gameTime"

var debug = false;

var LAYOUT_INVADERS = {};

LAYOUT_INVADERS.game = (function () {

    //we need some variables ...
    
    var started = false;
    
    var player;
    var respawning = false;
    LAYOUT_INVADERS.playerShot = -1;
    var playerBullets = ["H", "E", "L", "V", "E", "T", "I", "C", "A"];
    var enemyBullets = ["C", "O", "M", "I","C", "S", "A", "N", "S"];
    var explosion;

    var enemyShots = new Array();

    var shotSize = {w: 3.5, h: 3.5}
    
    var board;
    var bg;
    var doc;
    var w;
    
    var texts;
    var patternStrings;
    var fonts = new Array();
    
    var pathToScriptFolder = File($.fileName).path; // get the path to the script folder (doesnt care if run from estk or indesign)
    
    var splashHeadline;
    var subHeadline;
    var callToAction;
    var explanation;
    var footer;
    
    
    var livesAndScore;
    var scoreNum = 0;
    var lives = 3;
    var highScores = new Array();
    
    var effects = new Array();
    var effectStrings;
    
    var gameOver = false;
    var endShown = false;
    var succeeded = false;
    
    var colorRandom;
    
    LAYOUT_INVADERS.dimensions = 200; // board is square, 200 mm x 200 mm
    LAYOUT_INVADERS.gameBounds = [17, 20, 180, 180] //y1,x1,y2,x2
    
    var frameLength = 33; // 30 fps
    var frameCount = 0; //frameCounter so that we have some sense of time ;)
    var pauseGame = false;
    
    var startFrameCount = 0;
    
    var enemies = new Array();
    var enemyStartPos = {x: LAYOUT_INVADERS.gameBounds[1]+10, y: 35}; // initial position of first enemy
    var enemyHorizontalGap = 9; // horizontal gap between enemies
    var enemyVerticalGap = 3; // vertical gap between enemies
    var row = 6; // 6 rows of enemies
    var col = 5; // 5 cols of enemies
    var enemySize = {h: 13, w: 18};
    var enemyGroup = new Array();
    var enemyDir = 1;
    
    LAYOUT_INVADERS.leftKey = false;
    LAYOUT_INVADERS.rightKey = false;
    LAYOUT_INVADERS.spaceKey = false;
    
    LAYOUT_INVADERS.characters = getStrings("characters.txt");

    function init() { // initialize some stuff
        
        w = new Window ("palette", "layout invaders"); // create panel
        var startButton = w.add ("button", undefined, "start game"); // add button
        startButton.onClick = function () {
            if(started == false) {
                clearSplashScreen(); // remove SplashScreen stuff
                bindEvents();
                startButton.text = "close game"; // ... BOOOM, it's a stop button
                started = true; // next click will close panel & game
            } else {
                w.close();// close panel, onClose event is fired
            }
        };

        w.show (); // make panel visible
        
        w.onClose = function () {
            stop(); //if panel is closed stop game
        } 
        
        doc = app.documents.add({ // create new document
            documentPreferences:{
                pageWidth: LAYOUT_INVADERS.dimensions,
                pageHeight: LAYOUT_INVADERS.dimensions,
                facingPages: false
            }
        });

        checkForFonts();
        
        setupColors();
        
        board = doc.pages[0]; // first page is our gameboard
        
        bg = board.rectangles.add({geometricBounds:[0, 0, LAYOUT_INVADERS.dimensions, LAYOUT_INVADERS.dimensions]}); //add rectangle to fill whole page
        bg.fillColor = "Black"; //fill black
        bg.strokeWeight = 0; // no stroke
        bg.locked = true; // lock rect
               
        // app.activeWindow.screenMode = ScreenModeOptions.PREVIEW_TO_PAGE; // switch to preview-mode
        // app.activeWindow.zoom(ZoomOptions.FIT_PAGE); // uncomment only if you use the above preview-mode

        app.activeWindow.screenMode = ScreenModeOptions.PRESENTATION_PREVIEW // switch to fullscreen preview-mode
        app.activeWindow.viewDisplaySetting = ViewDisplaySettings.HIGH_QUALITY; // we want high-quality
        
        texts = getStrings("texts.txt"); // get some strings out of file (using a custom helper function)
       
        showSplashScreen();
        
        player = LAYOUT_INVADERS.player();
        
        effectStrings = getStrings ("effects.txt"); // get effects strings out of file (using a custom helper function)

        //create lives and scoreboard
        var string = texts[6] + " " + texts[6] + " " + texts[6] + "  " + texts[7];
        livesAndScore = board.textFrames.add({contents: string, geometricBounds: [5, 0, 15, 200]});
        
        //apply styling
        livesAndScore.paragraphs.item(0).fillColor = "Black"; // fill black
        livesAndScore.paragraphs.item(0).fillTint = 70;
        livesAndScore.paragraphs.item(0).appliedFont = fonts[5];
        livesAndScore.paragraphs.item(0).pointSize = 24;
        livesAndScore.paragraphs.item(0).justification = Justification.centerAlign;
        
        formatLivesAndScore(texts[6]); //apply styling to individual strings
        
        //create enemies
        for(var k=0, species=0; k<row; k++){
            if(k%2 == 0){species++;}
            for(var l=0; l<col; l++) {
                var pos = {};
                //calculate position for each enemy
                pos.x = enemyStartPos.x + l*(enemySize.w + enemyHorizontalGap);
                pos.y = enemyStartPos.y + k*(enemySize.h + enemyVerticalGap);
           
                enemyFrame = board.textFrames.add({contents: LAYOUT_INVADERS.characters[species], geometricBounds: [pos.y, pos.x, pos.y+enemySize.h, pos.x+enemySize.w]});
                //apply styling
                enemyFrame.paragraphs.item(0).fillColor = "Paper"; // fill white/paper
                enemyFrame.paragraphs.item(0).appliedFont = fonts[0];
                enemyFrame.paragraphs.item(0).pointSize = 12;
                enemyFrame.paragraphs.item(0).leading = 13;
                enemyFrame.paragraphs.item(0).justification = Justification.centerAlign;
                               
                enemies.push(enemyFrame);
            }
        
        }
        enemyGroup = board.groups.add(enemies); // group enemies together so that we only need to move the group, not each enemy
        enemyGroup.visible = false; // dont display them just yet
    }

/**
* 
*   utility/helper functions 
*
*/

    function checkForFonts() {
        
        var displayMessage = false;

        //define all fonts & fontstyles to test
        fonts.push("Source Code Pro" + "\t" + "Regular"); // Source Code Pro by Paul D. Hunt | http://sourceforge.net/projects/sourcecodepro.adobe/files/
        
        fonts.push("Helvetica" + "\t" + "Regular");
        fonts.push("Comic Sans MS" + "\t" + "Regular");

        fonts.push("CHIP SB" + "\t" + "Regular"); // awesome CHIP font by gabrielfigueiredo | http://fontstruct.com/fontstructors/gabrielfigueiredo
        fonts.push("CHIP S" + "\t" + "Regular");
        fonts.push("CHIP SS" + "\t" + "Regular");
        fonts.push("CHIP SSB" + "\t" + "Regular");

        for(var i=0;i<fonts.length;i++) {
            try {
                var testFrame = doc.pages[0].textFrames.add({contents: "the ultimate test", geometricBounds: [0, 0, 10, 10]}); //create textframe to test if all fonts are installed on system
                testFrame.paragraphs.item(0).appliedFont = fonts[i];
                testFrame.remove();
            } catch (err) {
                fonts[i] = "Arial" + "\t" + "Regular"; // fall back to arial
                displayMessage = true;
            }
        }
       
        if(displayMessage == true) {
            alert("Some fonts are missing.\n\n For full experience please install all used fonts.\n See README.txt for full list.");
        }
    }
    
    function formatLivesAndScore(txt) {
        //adds styling to certain strings/chars
        
        app.findTextPreferences = NothingEnum.nothing; // now empty the find what field
        app.changeTextPreferences = NothingEnum.nothing; // empties the change to field
   
        app.findTextPreferences.findWhat = txt; // what do we want to find?
        app.changeTextPreferences.fillColor = "hotBlue"; // new styling
        app.changeTextPreferences.fillTint = 100;
        doc.changeText(); //execute changes
        
        app.findTextPreferences = NothingEnum.nothing; // now empty the find what field
        app.changeTextPreferences = NothingEnum.nothing; // empties the change to field
        
        app.findTextPreferences.findWhat = "A"; // what do we want to find?
        app.changeTextPreferences.pointSize = 32;
        doc.changeText(); //execute changes
        
        app.findTextPreferences = NothingEnum.nothing; // now empty the find what field
        app.changeTextPreferences = NothingEnum.nothing; // empties the change to field
        
        app.findTextPreferences.findWhat = "—"; // what do we want to find?
        app.changeTextPreferences.baselineShift = "5pt";
        doc.changeText(); //execute changes
        
        app.findTextPreferences = NothingEnum.nothing; // now empty the find what field
        app.changeTextPreferences = NothingEnum.nothing; // empties the change to field
        
        
        app.findTextPreferences.findWhat = "00"; // what do we want to find?
        app.changeTextPreferences.fillColor = "hotBlue"; // color change!
        app.changeTextPreferences.fillTint = 100;
        
        doc.changeText(); //execute changes
    }
    
    function getStrings(fileName) {
                    
        //"broken" first version:
        // kills self-defined colors/swatches. No clue why ... BUG?
        
//~         try{ 
//~             var myScript = app.activeScript; // if script is run from indesign, raises error if not
//~             pathToScriptFolder = File(myScript).parent; // get path to folder where script is located
//~         } catch (myError) {// so if estk is used to execute the script 
//~             pathToScriptFolder = File(myError.fileName).parent; // get path to folder where script is located
//~         }

        var read_file = File(pathToScriptFolder + "/" + fileName);
 
        if(read_file.exists){ // if we h ave a file
            read_file.open('r', undefined, undefined); // open file

            var pRaw = read_file.read(); // read it
            read_file.close();// then close file
        } else {
            return new Array();// we dont have any text, so return empty array 
        }
        
        return pRaw.split("\n</\*---\*/>\n"); // split text at lines with </*---*/>, then return the array
    }

    function getPatternStrings() {
        var p = new Array();
        
        p = getStrings("patterns.txt");
        
        var regexpCharArray = ["\\+","\\?","\\:","#","\\-"]; // characters to search
        var newCharArray = ["+","?",":","#","-"]; // replacement characters
        
        for(var v=0;v<p.length;v++){// loop through patternstrings
            var maxReplaceNum = 5;
            for(var t=0;t<maxReplaceNum;t++){ // call it 5 times
                var charPos = Math.floor(Math.random()*(regexpCharArray.length-1)); // get random index for regexpCharArray
                var replaceChar = new RegExp(regexpCharArray[charPos], "g"); // get character
                var newChar = newCharArray[Math.floor(Math.random()*(newCharArray.length-1))]; // get random replacement character
                var str = p[v];
                p[v] = str.replace(replaceChar, newChar); // replace characters
            }
        }
        return p;
    }

    function setupColors() {
        try{
            doc.colors.item("hotBlue").name; //raises error if undefined
        }
        catch (myError){
            doc.colors.add({name:"hotBlue", model:ColorModel.process, space: ColorSpace.RGB,
            colorValue:[0, 220, 255]});
        }
    }

    function stop(docClosed) {
        //check for idle Task/gameLoop-hack, if present remove it
        if (app.idleTasks.length == 0) {
            if(debug == true) {
                alert("There is no idle task.");
            }
        } else {
            var idleTaskName = "gameLoop";
            var idleTask = app.idleTasks.itemByName(idleTaskName); // get the idleTask
            
            if (idleTask != null) {
                idleTask.remove(); // remove it
                if(debug == true) {
                    alert("idle task removed!");
                }
            } else {
                if(debug == true) {
                    alert("There is no idle task named " + idleTaskName);
                }
            }
        }
    
        // remove keyboard eventlistener, error if not removed
        w.removeEventListener ("keydown", function (key) {keyDown (key)}); 
        w.removeEventListener ("keyup", function (key) {keyUp(key);});
        
        if(app.activeDocument == doc){ 
            doc.close(SaveOptions.no); //close document without saving
        }
    }


/**
* 
*   game logic 
*
*/

    
    function addPlayerShot() {
        LAYOUT_INVADERS.playerShot = board.textFrames.add({contents: playerBullets[0], geometricBounds: [player.pos.y-shotSize.h, player.pos.x-shotSize.w/2, player.pos.y, player.pos.x+shotSize.w/2]});

        //apply styling
        LAYOUT_INVADERS.playerShot.paragraphs.item(0).fillColor = "Paper"; // fill white/paper
        LAYOUT_INVADERS.playerShot.paragraphs.item(0).appliedFont = fonts[1];
        LAYOUT_INVADERS.playerShot.paragraphs.item(0).pointSize = 12;
        LAYOUT_INVADERS.playerShot.paragraphs.item(0).justification = Justification.centerAlign;
        
        var firstItem = playerBullets.shift(); //get first item and remove it from array...
        playerBullets.push(firstItem); //... and make it lastItem, so that we "cycle" through the bullets
        
        // add muzzle flash effect
        var xPos = player.pos.x;
        var yPos = player.pos.y - 3;
        addEffects({x: xPos,y: yPos}, 1);
    }

    function movePlayerShot() {
        if(LAYOUT_INVADERS.playerShot != -1) { // we have a shot
            LAYOUT_INVADERS.playerShot.move(undefined,[0,-5]); //move bullet 5mm up (x,y)
            checkPlayerShot();
        }
    }

    function checkPlayerShot() {
            
        if(LAYOUT_INVADERS.playerShot.geometricBounds[0] <= LAYOUT_INVADERS.gameBounds[0]) { // check if shot reached top boundary
            LAYOUT_INVADERS.playerShot.remove(); //remove shot from board
            LAYOUT_INVADERS.playerShot = -1;
            return;
        }
        
        for(var n=enemies.length-1; n>=0;n--){
            if(playerShotHitTest(enemies[n], LAYOUT_INVADERS.playerShot) == true) {
                // add effect "kaboom"
                var yEPos = enemies[n].geometricBounds[0]+enemySize.h/2;
                var xEPos = enemies[n].geometricBounds[1]+enemySize.w/2;                
                addEffects({x: xEPos, y: yEPos}, 2);
                
                var removedEnemy = enemies.splice(n, 1); //remove enemy from array
                removedEnemy[0].remove(); //remove enemy from board

                LAYOUT_INVADERS.playerShot.remove(); //remove shot from board
                LAYOUT_INVADERS.playerShot = -1;

                var enemySpecies;
                
                if(n>4*col-1) { //last two rows of enemies
                    enemySpecies = 1;
                } else if(n>2*col-1) {//3rd and 4th row of enemies
                    enemySpecies = 2;
                }
                else { //1st and 2nd row of enemies
                    enemySpecies = 3;
                }
                addScore(enemySpecies); // different enemies, dirrent score to add ;)
                return;
            }
        }
    }

    function playerShotHitTest(enemy, shot) {
        
        if((enemy.geometricBounds[0] <= shot.geometricBounds[0] && shot.geometricBounds[0] <= enemy.geometricBounds[2] && //y1 <= yb1 <= y2
            enemy.geometricBounds[1] <= shot.geometricBounds[1] && shot.geometricBounds[1] <= enemy.geometricBounds[3]) ||//x1 <= xb1 <= x2
           (enemy.geometricBounds[0] <= shot.geometricBounds[2] && shot.geometricBounds[2] <= enemy.geometricBounds[2] && //y1 <= yb2 <= y2
            enemy.geometricBounds[1] <= shot.geometricBounds[3] && shot.geometricBounds[3] <= enemy.geometricBounds[3])) {  //x1 <= xb2 <= x2
            return true;
        } else {
            return false;
        }
    }

    function moveEnemies() {
        if(typeof enemyGroup != "undefined" && enemies.length > 0) { // there are enemies to move?
            if(enemyGroup.visible == false) { // on first execution, enemyGroup is not visible
                enemyGroup.visible = true; // show enemies
            }
        
            var down = 0;
            if(enemyGroup.visibleBounds[3] >= LAYOUT_INVADERS.gameBounds[3] || enemyGroup.visibleBounds[1] <= LAYOUT_INVADERS.gameBounds[1] ) { //right boundary reached or left boundary reached
                enemyDir *= -1; // switch direction
                down = 10; // move down 10mm
            }
            
            enemyGroup.move(undefined,[0.5*enemyDir, down]) //move enemies relative
            
            if(enemyGroup.visibleBounds[2] >= LAYOUT_INVADERS.gameBounds[2]) { //enemies reached bottom
                gameOver = true; // game is over and...
                succeeded = false; // ... player lost!
            }
        } else {// no more enemies left ...
             gameOver = true; // game is over and...
             succeeded = true; // ... player won! :)   
        }
    }

    function enemyShoot() { // enemies shoot/drop letters too

        //currently enemies only shoot if player shoots
        //it is possible to change to other mechanisms.
        //script can deal with simultanious shots from enemies
        
        if(LAYOUT_INVADERS.spaceKey == true && LAYOUT_INVADERS.playerShot == -1) {
            if(Math.random()>.2) { //only 80% of time
                var enemyIndex = Math.floor(Math.random()*enemies.length); // get random enemy
                var enemyPos = {y: enemies[enemyIndex].geometricBounds[2], x: enemies[enemyIndex].geometricBounds[3]};//get enemy position for shoot
                addEnemyShot(enemyPos); //enemy, shoot!
            }
        }
    }

    function addEnemyShot(enemyPos) {
        var eShot = board.textFrames.add({contents: enemyBullets[0], geometricBounds: [enemyPos.y, enemyPos.x-enemySize.w/2-shotSize.w/2, enemyPos.y+shotSize.h, enemyPos.x-enemySize.w/2+shotSize.w/2]});

        //apply styling
        eShot.paragraphs.item(0).fillColor = "Paper"; // fill white/paper
        eShot.paragraphs.item(0).appliedFont = fonts[2];
        eShot.paragraphs.item(0).pointSize = 12;
        eShot.paragraphs.item(0).justification = Justification.centerAlign;
        
        var firstItem = enemyBullets.shift(); //get first item and remove it from array...
        enemyBullets.push(firstItem); //... and make it lastItem, so that we "cycle" through
        
        enemyShots.unshift(eShot); // add shot to beginning of array
    }

    function moveEnemyShots() {
        if(enemyShots.length > 0) { //We have shots from enemies?
            for(var n=enemyShots.length-1; n>=0;n--) {
                enemyShots[n].move(undefined,[0,5]); //move every bullet 5mm down (x,y)
                checkEnemyShot(n);
            }
            
        }
    }

    function checkEnemyShot(shotIndex) {
        if(enemyShotHitTest(player.pos, enemyShots[shotIndex]) == true) { // player was hit ... 

            var removedItem = enemyShots.splice(shotIndex, 1); //remove shot from array
            removedItem[0].remove(); //remove shot from board
            
            loseLive(); // we have casualties ... reduce lives accordingly
            return;
        }
        
        if(enemyShots[shotIndex].geometricBounds[2] >= LAYOUT_INVADERS.dimensions) { // check if shot reached bottom
            var removedItem = enemyShots.splice(shotIndex, 1); //remove shot from array
            removedItem[0].remove(); //remove shot from board
            return;
        }
    }

    function enemyShotHitTest(playerPos, enemyShot) {
        // check if enemyShot hit playerShip
        if((enemyShot.geometricBounds[2] >= LAYOUT_INVADERS.gameBounds[2] && playerPos.x-player.size.w/2 <= enemyShot.geometricBounds[1] && enemyShot.geometricBounds[1] <= playerPos.x+player.size.w/2) ||
            enemyShot.geometricBounds[2] >= LAYOUT_INVADERS.gameBounds[2] && playerPos.x-player.size.w/2 <= enemyShot.geometricBounds[3] && enemyShot.geometricBounds[3] <= playerPos.x+player.size.w/2){
            return true;
        } else {
            return false;
        }
    }

    function loseLive() {
        lives -= 1;
        updateLivesDisplay(); // update score display accordingly
        if(lives == 0) { // with 0 lives, no one can survive ;) ...
            gameOver = true; // ... so game is over and...
            succeeded = false; // ... player lost!
        } else {
            respawning = true; // player is allowed to respawn
        }
    }

    function updateLivesDisplay() {
        
        app.findTextPreferences = NothingEnum.nothing; // now empty the find what field
        app.changeTextPreferences = NothingEnum.nothing; // empties the change to field
        
        app.findTextPreferences.findWhat = texts[6] + " "; //what to search for? in this case, we search for the mini-spaceships in lives display
        var results = doc.findText(); // find text
        for(var i = 0; i<results.length; i++){
            if(i > lives-1){ //we start counting at 0 so lives-1; if we have more displayed ships than lives, remove 1 ship
                results[i].remove();
            }
        }
        
        app.findTextPreferences = NothingEnum.nothing; // now empty the find what field
        app.changeTextPreferences = NothingEnum.nothing; // empties the change to field
    }
    
    function addScore(species) {
        
        switch(species) {
            case 1:
                scoreNum += 10;
                break;
            case 2:
                scoreNum += 20;
                break;
            case 2:
                scoreNum += 30;
                break;
            //no emeny species 3 implemented just yet.
            case 3:
                scoreNum += 100;
                break;
        }
        
        changeScore(); // update score 
    }

    function changeScore() {
        
        app.findGrepPreferences = NothingEnum.nothing; // now empty the find what field
        app.changeGrepPreferences = NothingEnum.nothing; // empties the change to field
        
        app.findGrepPreferences.findWhat = "[0-9]{2,4}"; //find any number of 2, 3 or 4 digits, not really save but we know score will be the only matching element
        app.changeGrepPreferences.changeTo = scoreNum.toString();
        
        doc.changeGrep();// perform changes

        app.findGrepPreferences = NothingEnum.nothing; // now empty the find what field
        app.changeGrepPreferences = NothingEnum.nothing; // empties the change to field
    }

    function respawningPlayer() {
        var explosionSize = {h:30, w:52};
            
        if(startFrameCount == 0) { //on first execution ... 
            startFrameCount = frameCount; // save current frameCount
            pauseGame = true; // pause game except respawning

            player.hide(); // player was hit, so hide him
            
            var playerShipCenter = {y: player.pos.y+player.size.h/2, x: player.pos.x}; // calculate center
            
            explosion = board.textFrames.add({contents: effectStrings[0], geometricBounds: [playerShipCenter.y-explosionSize.h/2, playerShipCenter.x-explosionSize.w/2, playerShipCenter.y+explosionSize.h/2, playerShipCenter.x+explosionSize.w/2], 
                textFramePreferences:{
                    verticalJustification: VerticalJustification.CENTER_ALIGN
                }
            });

            //apply styling
            explosion.paragraphs.item(0).fillColor = "hotBlue"; // fill with custom color hotBlue ;)
            explosion.paragraphs.item(0).appliedFont = fonts[0];
            explosion.paragraphs.item(0).pointSize = 12;
            explosion.paragraphs.item(0).justification = Justification.centerAlign;
        }
        
        var delta = frameCount - startFrameCount; // calculate how many frames have passed
        
        if( delta == 20) { //20 frames passed
            explosion.properties = {contents: effectStrings[1]};
        } 
        
        if( delta == 40) { //40 frames passed
            explosion.remove();
        }    

        if( delta == 60) { //60 frames passed
            
            //move playerShip to respawn/initial position
            player.pos.x = LAYOUT_INVADERS.dimensions/2;
            player.pos.y = 180;
            player.show();
            
            //resetting keys, some might have been pressed when game paused.
            LAYOUT_INVADERS.leftKey = false;
            LAYOUT_INVADERS.rightKey = false;
            LAYOUT_INVADERS.spaceKey = false;
            
            pauseGame = false; //dont pause game anylonger
            respawning = false; // player is successfully respawned, so reset
            startFrameCount = 0; // resetting for next respawn ;)
        }
    }
    
    function addEffects(pos, type) {
        var smallSize = {h: 6, w: 14};
        var largeSize = {h: 26, w: 40};
        var effectSize = smallSize;
        var eContent = effectStrings[2];
        
        if(type == 2) {
            effectSize = largeSize;
            eContent = effectStrings[3];
        }
    
        var e = new Array();
        
        var eFrame = board.textFrames.add({contents: eContent, geometricBounds: [pos.y-effectSize.h/2, pos.x-effectSize.w/2, pos.y+effectSize.h/2, pos.x+effectSize.w/2], 
            textFramePreferences:{
                verticalJustification: VerticalJustification.CENTER_ALIGN
            }
        });

        eFrame.paragraphs.item(0).fillColor = "hotBlue"; // fill white/paper
        eFrame.paragraphs.item(0).appliedFont = fonts[0];
        eFrame.paragraphs.item(0).pointSize = 12;
        eFrame.paragraphs.item(0).justification = Justification.centerAlign;
        
        e.push(eFrame);
        e.push(type);
        e.push(frameCount);
        
        effects.push(e);
    }
    
    function showEffects() {
        for(var n=effects.length-1;n>=0;n--){ //iterate backwards because we will remove items
            var currentEffect = effects[n];
            var currentTextframe = currentEffect[0];
            var currentType = currentEffect[1];
            var delta = frameCount - currentEffect[2]; // calculate how many frames have passed
            
            if(currentType == 1) {
                if( delta >= 2) {
                    var removedEffect = effects.splice(n, 1); //remove effect from array
                    removedEffect[0][0].remove(); //remove effect from board
                }
            } else {
                if( delta == 3) {
                    currentTextframe.properties = {contents: effectStrings[0]};
                } 
                
                if( delta == 6) {
                    currentTextframe.properties = {contents: effectStrings[1]};
                }    

                if( delta >= 9) {
                    var removedEffect = effects.splice(n, 1); //remove effect from array
                    removedEffect[0][0].remove(); //remove effect from board
                }
            }
        }   
    }
    
    function showSplashScreen() {
        
        patternStrings = getPatternStrings();
        
        var patternLeft = board.textFrames.add({name: "patternLeft", label: "patternLeft", contents: patternStrings[0], geometricBounds: [0, 2, LAYOUT_INVADERS.dimensions, 15.5],
            textFramePreferences:{
                verticalJustification: VerticalJustification.CENTER_ALIGN
            }
        });
    
        //apply styling
        patternLeft.paragraphs.item(0).appliedFont = fonts[0];
        patternLeft.paragraphs.item(0).fillColor = "Black";
        patternLeft.paragraphs.item(0).fillTint = 60;
        patternLeft.paragraphs.item(0).pointSize = 12;
        
        var patternRight = patternLeft.duplicate();
        patternRight.properties = {name: "patternRight", label: "patternRight", contents: patternStrings[1], geometricBounds: [0, LAYOUT_INVADERS.dimensions-15.5, LAYOUT_INVADERS.dimensions, LAYOUT_INVADERS.dimensions-2 ]};
        patternRight.paragraphs.item(0).justification = Justification.RIGHT_ALIGN;
        patternRight.locked = true;
        patternLeft.locked = true;
        
        splashHeadline = board.textFrames.add({contents: texts[0], geometricBounds: [47, 0, 65, 200],
            textFramePreferences:{
                verticalJustification: VerticalJustification.CENTER_ALIGN
            }
        });
    
        //apply styling
        splashHeadline.paragraphs.item(0).appliedFont = fonts[3];
        splashHeadline.paragraphs.item(0).fillColor = "hotBlue";
        splashHeadline.paragraphs.item(0).pointSize = 64;
        splashHeadline.paragraphs.item(0).justification = Justification.CENTER_ALIGN;
        splashHeadline.paragraphs.item(0).underline = true;
        splashHeadline.paragraphs.item(0).underlineColor = "hotBlue";
        splashHeadline.paragraphs.item(0).underlineOffset = "6pt";
        splashHeadline.paragraphs.item(0).underlineWeight = "4.5pt";
        
        app.findTextPreferences = NothingEnum.nothing; // empty the "find what" field
        app.changeTextPreferences = NothingEnum.nothing; // empty the "change to" field
        
        app.findTextPreferences.findWhat = "layout"; // what do we want to find?
        app.changeTextPreferences.appliedFont = fonts[4];
        doc.changeText(); //execute changes
        
        app.findTextPreferences = NothingEnum.nothing; // empty the "find what" field
        app.changeTextPreferences = NothingEnum.nothing; // empty the "change to" field
        
        subHeadline = board.textFrames.add({contents: texts[1], geometricBounds: [65, 35, 71, 165],
            textFramePreferences:{
                verticalJustification: VerticalJustification.CENTER_ALIGN
            }
        });
        
        subHeadline.paragraphs.item(0).appliedFont = fonts[4];
        subHeadline.paragraphs.item(0).fillColor = "Black";
        subHeadline.paragraphs.item(0).fillTint = 80;
        subHeadline.paragraphs.item(0).pointSize = 16;
        subHeadline.paragraphs.item(0).justification = Justification.RIGHT_ALIGN;


        callToAction = board.textFrames.add({contents: texts[3], geometricBounds: [98, 0, 107, 200]});
        
        callToAction.paragraphs.item(0).appliedFont = fonts[6];
        callToAction.paragraphs.item(0).fillColor = "hotBlue";
        callToAction.paragraphs.item(0).pointSize = 48;
        callToAction.paragraphs.item(0).justification = Justification.CENTER_ALIGN;
        
        explanation = board.textFrames.add({contents: texts[4], geometricBounds: [118, 0, 142, 200]});
        
        explanation.paragraphs.item(0).appliedFont = fonts[6];
        explanation.paragraphs.item(0).fillColor = "Paper";
        explanation.paragraphs.item(0).pointSize = 32;
        explanation.paragraphs.item(0).justification = Justification.CENTER_ALIGN;
        
        footer = board.textFrames.add({contents: texts[5], geometricBounds: [180, 0, 200, 200]});
        
        footer.paragraphs.item(0).appliedFont = fonts[5];
        footer.paragraphs.item(0).fillColor = "Black";
        footer.paragraphs.item(0).fillTint = 80;
        footer.paragraphs.item(0).pointSize = 16;
        footer.paragraphs.item(0).justification = Justification.CENTER_ALIGN;
        
        footer.locked = true;
        explanation.locked = true;
        callToAction.locked = true;
        splashHeadline.locked = true;
        subHeadline.locked = true;
    }

    function clearSplashScreen() {
        //unlock all, so we can remove them
        footer.locked = false;
        explanation.locked = false;
        callToAction.locked = false;
        splashHeadline.locked = false;
        subHeadline.locked = false;
        
        footer.remove();
        explanation.remove();
        callToAction.remove();
        splashHeadline.remove();
        subHeadline.remove();
    }

    function gameEnd() {
        
        // first, clean screen
        player.remove();
        livesAndScore.remove();
        
        for(var n=0;n<enemyShots.length;n++) {
            enemyShots[n].remove(); //remove any leftover enemyShots
        }
        
        if(succeeded == false && typeof enemyGroup != "undefined") { // player lost and any enemies left? 
            enemyGroup.remove(); //TOFIX: sometimes enemygroup doesnt exist anymore but called anyways -> raises nasty error
        }
        
        if(LAYOUT_INVADERS.playerShot != -1){ //there is stil a bullet displayed? unlikely but well ...
            LAYOUT_INVADERS.playerShot.remove();
            LAYOUT_INVADERS.playerShot = -1;
        }
    
        for(var n=0;n<effects.length;n++){
            var currentEffect = effects[n];
            var currentTextframe = currentEffect[0];
            currentTextframe.remove(); //remove effect from board
        }
    
        var headlineContent;
        var msgContent;
        
        if(succeeded == true) {
            headlineContent = "You won!";
            msgContent = texts[8] + "\n Your Score: " + scoreNum;
            
        } else {
            headlineContent = "You lost!";
            msgContent = texts[9] + "\n Your Score: " + scoreNum;
        }
                 
        //display message
        var headline = board.textFrames.add({contents: headlineContent, geometricBounds: [0, 0, 120, 200],
            textFramePreferences:{
                verticalJustification: VerticalJustification.CENTER_ALIGN
            }
        });
        // add styling
        headline.paragraphs.item(0).appliedFont = fonts[6];
        headline.paragraphs.item(0).fillColor = "hotBlue"; // fill black
        headline.paragraphs.item(0).pointSize = 112;
        headline.paragraphs.item(0).justification = Justification.CENTER_ALIGN;
        headline.paragraphs.item(0).underline = true;
        headline.paragraphs.item(0).underlineColor = "Paper";
        headline.paragraphs.item(0).underlineOffset = "6pt";
        headline.paragraphs.item(0).underlineWeight = "5pt";
        
        var msg = board.textFrames.add({name: "msg", label: "msg", contents: msgContent, geometricBounds: [80, 20, 120, 180],
            textFramePreferences:{
                verticalJustification: VerticalJustification.CENTER_ALIGN
            }
        });
        // add styling
        msg.paragraphs.item(0).appliedFont = fonts[5];
        msg.paragraphs.item(0).fillColor = "Black"; // fill black
        msg.paragraphs.item(0).fillTint = 10;
        msg.paragraphs.item(0).pointSize = 32;
        msg.paragraphs.item(0).justification = Justification.CENTER_ALIGN;
        
        displayHighScores();
    }

    function displayHighScores(){
        getHighScores();
        
        var highScoresFrame = board.textFrames.add({ contents: " ", geometricBounds: [120, 0, 200, 200],
            textFramePreferences:{
                verticalJustification: VerticalJustification.CENTER_ALIGN
            }
        });
        // apply styling
        highScoresFrame.paragraphs.item(0).appliedFont = fonts[6];
        highScoresFrame.paragraphs.item(0).fillColor = "hotBlue"; // fill hotBlue
        highScoresFrame.paragraphs.item(0).pointSize = 32;
        highScoresFrame.paragraphs.item(0).justification = Justification.CENTER_ALIGN;
        
        
        var highScoresContent = " ";
        
        for(var i=0;i<highScores.length;i++){ // compose content for highscore display
            highScoresContent += i+1 + ". ";
            highScoresContent += highScores[i][0];
            highScoresContent += " ";
            highScoresContent += highScores[i][1];
            highScoresContent += "\n";
        }

        highScoresFrame.contents = highScoresContent;
        
        saveHighScores();
    }
    
    function getHighScores() {
        var highScoresStrings = getStrings("highscore.txt");
        
        if(highScoresStrings.length > 0) { // highscores already exist?
            var re = /[0-9]+$/;
            for(var i=0;i<highScoresStrings.length;i++) {
                highScores.push(new Array());
                name = highScoresStrings[i].split(re);// get everything except the numbers at the end,
                name = name[0].replace(/^\s\s*/, '');// trim surrounding whitespace
                name = name.replace(/\s\s*$/, '');
                score = highScoresStrings[i].match(re); // get the numbers at the end
                highScores[i][0] = name;
                highScores[i][1] = score;
            }
            
            for(var i=0;i<highScores.length;i++) {
                if(scoreNum >= highScores[i][1] ) {
                    var name = prompt("You scored " + scoreNum + " points\nPlease enter your name below:","",undefined);
                    if(name == '') {
                        break;// no name entered or canceled, so no entry!
                    }
                    highScores[i][0] = name;
                    highScores[i][1] = scoreNum;
                    break;
                }
            }
        } else { // no highscores yet ... doesn't work yet, getStrings returns something even if highscore.txt doesnt exist/is empty. need to investigate further ;) 
            var name = prompt("You scored " + scoreNum + " points\nPlease enter your name below:","",undefined);
            if(name != '') {// save entry only if name is entered
                highScores.push(new Array());
                highScores[0][0] = name;
                highScores[0][1] = scoreNum;
            }
            
        }
    }

    function saveHighScores() {
        
        var filepath = pathToScriptFolder + "/" + "highscore.txt";
        var write_file = File(filepath);
            
        if(!write_file.exists){
            write_file = new File(filepath); // if the file doesn't exist create one
        }

        var out;// our output

        if( write_file!='' ){   
          //Open the file for writing.   
          out = write_file.open( 'w', undefined, undefined );
          write_file.encoding = "UTF-8";
          write_file.lineFeed = "Unix"; //convert to UNIX lineFeed
        }
        
        if( out != false ){  
            for(var i=0;i<highScores.length;i++){ //loop through all 
                if(i != highScores.length-1) { //if isn't last element
                    write_file.writeln(highScores[i][0] + " " + highScores[i][1]);
                    write_file.writeln("</*---*/>");
                } else { // is last element
                    write_file.write(highScores[i][0] + " " + highScores[i][1]); // prevents new line at the end of file
                }
            }

            write_file.close();  
        }
    }
    
    function bindEvents() {
        var gameLoopTask = app.idleTasks.add({name:"gameLoop", sleep: frameLength}); //HACK: create idleTask for a gameloop, setTimeout/setInterval not available
        var gameLoopTaskEventListener = gameLoopTask.addEventListener(IdleEvent.ON_IDLE, callGameLoop, false);
        
        if(debug == true) {
            $.writeln("Created gameLoop/idle task " + gameLoopTask.name + "; added event listener on " + gameLoopTaskEventListener.eventType);
        }
        
        w.addEventListener ("keydown", function (key) {
            keyDown(key);
        });
    
        w.addEventListener ("keyup", function (key) {
            keyUp(key);
        });
    }

    function keyDown(k) {
        if(pauseGame == false) { // only if game is not paused ...
            var keyname = k.keyName;
            if(keyname == "Space" && LAYOUT_INVADERS.playerShot == -1) {
                LAYOUT_INVADERS.spaceKey = true;
            }
            
            if (keyname == "Left") {
                LAYOUT_INVADERS.leftKey = true;
            }
        
            if (keyname == "Right") {
                LAYOUT_INVADERS.rightKey = true;
            }
        }
    }

    function keyUp (k){
        if(pauseGame == false) {// only if game is not paused ...
            var keyname = k.keyName;
            if(keyname == "Space") {
                LAYOUT_INVADERS.spaceKey = false;
            }
        
            if (keyname == "Left") {
                LAYOUT_INVADERS.leftKey = false;
            }
        
            if (keyname == "Right") {
                LAYOUT_INVADERS.rightKey = false;
            }
        }
    }
    
    function gameLoop() { //gameLoop Code
        if(pauseGame == false) {// only if game is not paused ...
            if(gameOver == false) {
                player.move();
                player.draw(board, fonts);
                moveEnemies();
                enemyShoot();
                player.shoot();
                movePlayerShot();
                moveEnemyShots();
                showEffects();
                if(debug == true) {
                    $.writeln("drawn!");
                }
            } else if(gameOver == true && endShown == false){
                gameEnd();
                endShown = true;
            }
        }
        if(respawning == true) {
            respawningPlayer();
        }
        frameCount++;
    }

    return {
        init: init,
        gameLoop: gameLoop,
        addPlayerShot: addPlayerShot
    };
})();

LAYOUT_INVADERS.player = function () {
    var size = {h: 13, w: 21};
    var pos = {};
    //initial position
    pos.x = LAYOUT_INVADERS.dimensions/2;
    pos.y = 180;
        
    var playerShip;

    function draw(board, fonts) {
        if( typeof playerShip == "undefined") { // ship doesn't exist yet?
            //create textFrame
            playerShip = board.textFrames.add({name: "player ship", label: "player ship", contents: LAYOUT_INVADERS.characters[0], geometricBounds: [pos.y, pos.x-size.w/2, pos.y+size.h, pos.x+size.w/2]});
            //add styling    
            playerShip.paragraphs.item(0).fillColor = "hotBlue";
            playerShip.paragraphs.item(0).appliedFont = fonts[0];
            playerShip.paragraphs.item(0).pointSize = 14;
            playerShip.paragraphs.item(0).justification = Justification.centerAlign;
            
        } else {// ship did exist
            playerShip.geometricBounds = [pos.y, pos.x-size.w/2, pos.y+size.h, pos.x+size.w/2]; // update position
        }
    }
    
    function move() {
        if(LAYOUT_INVADERS.leftKey == true) {
            pos.x -= 2.5;// move to the left, 2.5mm
            if(pos.x<=LAYOUT_INVADERS.gameBounds[1]+size.w/2){ // left boundary reached?
                pos.x=LAYOUT_INVADERS.gameBounds[1]+size.w/2; // don't move further left
            }
        }
        if(LAYOUT_INVADERS.rightKey == true) {
            pos.x += 2.5;// move to the right, 2.5mm
            if(pos.x>=LAYOUT_INVADERS.gameBounds[3]-size.h/2){// right boundary reached?
                pos.x=LAYOUT_INVADERS.gameBounds[3]-size.h/2;// don't move further right
            }
        }
    }

    function shoot() {
        if(LAYOUT_INVADERS.spaceKey == true && LAYOUT_INVADERS.playerShot == -1){
            LAYOUT_INVADERS.game.addPlayerShot();
        }
    }

    function hide() {
        playerShip.visible = false;
    }

    function show() {
        playerShip.visible = true;
    }
    
    function remove() {
        playerShip.remove();
    }
    
    return {
        draw: draw,
        move: move,
        hide: hide,
        show: show,
        remove: remove,
        pos: pos,
        shoot: shoot,
        size: size
    };
};

function callGameLoop() {
    // this adds only one restore step each time the gameloop is called. Otherwise every action would create one and there would be a write to disk each time 
    app.doScript(LAYOUT_INVADERS.game.gameLoop, ScriptLanguage.javascript, undefined, UndoModes.fastEntireScript, "gameLoop"); 
}

app.doScript(LAYOUT_INVADERS.game.init, ScriptLanguage.javascript, undefined, UndoModes.fastEntireScript, "Game started"); // run the script