// StrwPineBlen web app's Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyDyHZCfd0bQKRxQuMqnFhnmkg5mHuTFKfM",
    authDomain: "trainstrainstrains-7859c.firebaseapp.com",
    databaseURL: "https://trainstrainstrains-7859c.firebaseio.com",
    projectId: "trainstrainstrains-7859c",
    storageBucket: "trainstrainstrains-7859c.appspot.com",
    messagingSenderId: "502989780027",
    appId: "1:502989780027:web:7a7119b75c77c06be5981e"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// database connection references
var db = firebase.database();
var playersRef = db.ref("/players");
// var chatRef = db.ref("/chat");
var connectedRef = db.ref(".info/connected");

// global vars to keep track of all player data locally
var playerName,
    player1LoggedIn = false,
    player2LoggedIn = false,
    playerNumber,
    playerObject,
    player1Object = {
        name: "",
        choice: "",
        wins: 0,
        losses: 0
    },
    player2Object = {
        name: "",
        choice: "",
        wins: 0,
        losses: 0
    },
    resetId;
//#endregion

//#region Database functions

// handle lost connection
connectedRef.on("value", function (snap) {
    if (!snap.val() && playerNumber) {
        db.ref("/players/" + playerNumber).remove();
        playerNumber = null;

        // reset screen
        showLoginScreen();
    }
}, errorHandler);

// when player is added, update respective loggedIn flag and playerObject
playersRef.on("child_added", function (childSnap) {
    window["player" + childSnap.key + "LoggedIn"] = true;
    window["player" + childSnap.key + "Object"] = childSnap.val();
}, errorHandler);

// when player is changed, update respective playerObject and stats
playersRef.on("child_changed", function (childSnap) {
    window["player" + childSnap.key + "Object"] = childSnap.val();

    updateStats();
}, errorHandler);

// when player is removed, reset respective playerObject and loggedIn flag
playersRef.on("child_removed", function (childSnap) {
    // chatRef.push({
    //     userId: "system",
    //     text: childSnap.val().name + " has disconnected"
    // });

    window["player" + childSnap.key + "LoggedIn"] = false;
    window["player" + childSnap.key + "Object"] = {
        name: "",
        choice: "",
        wins: 0,
        losses: 0
    };

    // // when both players have left, clear the chat
    // if (!player1LoggedIn && !player2LoggedIn) {
    //     chatRef.remove();
    // }
}, errorHandler);

// when general changes are made, perform bulk of game logic
playersRef.on("value", function (snap) {
    // update the player names
    $("#player-1").text(player1Object.name || "Waiting for Player 1");
    $("#player-2").text(player2Object.name || "Waiting for Player 2");

    // update which part of the player box is showing based on whether a selection has been made
    updatePlayerBox("1", snap.child("1").exists(), snap.child("1").exists() && snap.child("1").val().choice);
    updatePlayerBox("2", snap.child("2").exists(), snap.child("2").exists() && snap.child("2").val().choice);

    // display correct "screen" depending on logged in statuses
    if (player1LoggedIn && player2LoggedIn && !playerNumber) {
        loginPending();
    } else if (playerNumber) {
        showLoggedInScreen();
    } else {
        showLoginScreen();
    }

    // if both players have selected their choice, perform the comparison
    if (player1Object.choice && player2Object.choice) {
        rps(player1Object.choice, player2Object.choice);
    }

}, errorHandler);

//#endregion

//#region Click listeners 

// when the login button is clicked, add the new player to the open player slot
$("#login").click(function (e) {
    e.preventDefault();

    // check to see which player slot is available
    if (!player1LoggedIn) {
        playerNumber = "1";
        playerObject = player1Object;
    }
    else if (!player2LoggedIn) {
        playerNumber = "2";
        playerObject = player2Object;
    }
    else {
        playerNumber = null;
        playerObject = null;
    }

    // if a slot was found, update it with the new information
    if (playerNumber) {
        playerName = $("#player-name").val().trim();
        playerObject.name = playerName;
        $("#player-name").val("");

        $("#player-name-display").text(playerName);
        $("#player-number").text(playerNumber);

        db.ref("/players/" + playerNumber).set(playerObject);
        db.ref("/players/" + playerNumber).onDisconnect().remove();
    }
});

// send it to the database
$(".selection").click(function () {
    // for if the player isn't logged in
    if (!playerNumber) return;

    playerObject.choice = this.id;
    db.ref("/players/" + playerNumber).set(playerObject);

    $(".p" + playerNumber + "-selections").hide();
    $(".p" + playerNumber + "-selection-reveal").text(this.id).show();
});


/**
 * Compares 2 choices and determines a tie or winner
 * @param {string} p1choice strawberry, pineapple, blender
 * @param {string} p2choice strawberry, pineapple, blender
 */
function rps(p1choice, p2choice) {
    $(".p1-selection-reveal").text(p1choice);
    $(".p2-selection-reveal").text(p2choice);

    showSelections();

    if (p1choice == p2choice) {
        //tie
        $("#feedback").text("TIE");
    }
    else if ((p1choice == "strawberry" && p2choice == "blender") || (p1choice == "pineapple" && p2choice == "strawberry") || (p1choice == "blender" && p2choice == "pineapple")) {
        // p1 wins
        $("#feedback").html("<small>" + p1choice + " beats " + p2choice + "</small><br/><br/>" + player1Object.name + " wins!");

        if (playerNumber == "1") {
            playerObject.wins++;
        } else {
            playerObject.losses++;
        }
    } else {
        // p2 wins
        $("#feedback").html("<small>" + p2choice + " beats " + p1choice + "</small><br/><br/>" + player2Object.name + " wins!");

        if (playerNumber == "2") {
            playerObject.wins++;
        } else {
            playerObject.losses++;
        }
    }

    resetId = setTimeout(reset, 3000);
}

/**
 * Reset the round
 */
function reset() {
    clearTimeout(resetId);

    playerObject.choice = "";

    db.ref("/players/" + playerNumber).set(playerObject);

    $(".selection-reveal").hide();
    $("#feedback").empty();
}

/**
 * Update stats for both players based off most recently-pulled data
 */
function updateStats() {
    ["1", "2"].forEach(playerNum => {
        var obj = window["player" + playerNum + "Object"];
        $("#p" + playerNum + "-wins").text(obj.wins);
        $("#p" + playerNum + "-losses").text(obj.losses);
    });

    player1LoggedIn ? $(".p1-stats").show() : $(".p1-stats").hide();
    player2LoggedIn ? $(".p2-stats").show() : $(".p2-stats").hide();
}

/**
 * Update the player box state
 * @param {string} playerNum 1 or 2
 * @param {boolean} exists 
 * @param {boolean} choice 
 */
function updatePlayerBox(playerNum, exists, choice) {
    if (exists) {
        if (playerNumber != playerNum) {
            if (choice) {
                $(".p" + playerNum + "-selection-made").show();
                $(".p" + playerNum + "-pending-selection").hide();
            } else {
                $(".p" + playerNum + "-selection-made").hide();
                $(".p" + playerNum + "-pending-selection").show();
            }
        }
    } else {
        $(".p" + playerNum + "-selection-made").hide();
        $(".p" + playerNum + "-pending-selection").hide();
    }
}

function errorHandler(error) {
    console.log("Error:", error.code);
}

//#endregion

//#region Display functions

function loginPending() {
    $(".pre-connection, .pre-login, .post-login, .selections").hide();
    $(".pending-login").show();
}

function showLoginScreen() {
    $(".pre-connection, .pending-login, .post-login, .selections").hide();
    $(".pre-login").show();
}

function showLoggedInScreen() {
    $(".pre-connection, .pre-login, .pending-login").hide();
    $(".post-login").show();
    if (playerNumber == "1") {
        $(".p1-selections").show();
    } else {
        $(".p1-selections").hide();
    }
    if (playerNumber == "2") {
        $(".p2-selections").show();
    } else {
        $(".p2-selections").hide();
    }
}

function showSelections() {
    $(".selections, .pending-selection, .selection-made").hide();
    $(".selection-reveal").show();
}
window.onload = function () {
    // when the send button is clicked, send the message to the database
    $("#gifBtn").on("click", function () {
        $("#gifs-appear-here").empty();
        // Constructing a queryURL for smoothie gif
        queryURL =
            "https://api.giphy.com/v1/gifs/search?q=smoothies&api_key=o2BMu32QNHXQZs2A5dgV6kntwDSDTrXU&limit=3";

        // Performing an AJAX request with the queryURL
        $.ajax({
            url: queryURL,
            method: "GET"
        }).then(function (response) {
            console.log(queryURL);
            console.log(response);
            // storing the data from the AJAX request in the results variable
            var results = response.data;
            console.log(results)
            for (var i = 0; i < results.length; i++) {
                // Creating and storing a div tag
                gifDiv = $("<div>");
                // Creating a paragraph tag with the result item's rating
                p = $("<p>").text("Rating: " + results[i].rating);
                // Creating and storing an image tag
                gifImage = $("<img>");
                // Setting the src attribute of the image to a property pulled off the result item
                gifImage.attr("src", results[i].images.fixed_height.url);
                // Appending the paragraph and image tag to the gifDiv
                gifDiv.append(p);
                gifDiv.prepend(gifImage);
                // Prependng the gifDiv to the HTML page in the "#gifs-appear-here" div
                $("#gifs-appear-here").prepend(gifDiv);
            }
            $("#gifs-appear-here").prepend(results);
        });
    });
}

//#endregion