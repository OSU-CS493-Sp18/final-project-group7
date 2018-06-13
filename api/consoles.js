const router = require('express').Router();
const validation = require('../lib/validation');

exports.router = router;

// Verification schema for consoles
const addConsoleSchema = {
    name:           { required: true },
    price:          { required: true },
    tvrequirements: { required: true }
};

const updateConsoleSchema = {
    name:           { required: false },
    price:          { required: false },
    tvrequirements: { required: false }
};


// Add a new console to the consoles SQL database.
function insertNewConsole(info, pool) {
    
}

// Route for posting a new console.
router.post('/', function (req, res, next) {

});

// Updates console info by ID.
function updateConsoleByID(id, info, pool){

} 

// Route to update a new console by consoleID
router.put('/:consoleID', function(req, res, next) {

});

// Delete console by consoleID.
function deleteConsoleByID(id, pool) {

}

// Route to delete a game.
router.delete('/:consoleID', function (req, res, next) {

});

// Function to retrieve information about a specific console.
function getConsoleByID(id, pool) {

}

// Route for getting a specific console by consoleID
router.get('/:consoleID', function (req, res, next) {

});


// Support functions for getting paginated console list.
// Get a console count, to help with pagincation.
function getConsoleCount(pool){

}

// Get a page for the paginated list.
function getConsolePage(page, totalCount, pool){

}

// Route for paginated list of consoles.
router.get('/', function(req, res) {

});