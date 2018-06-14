const router = require('express').Router();
const validation = require('../lib/validation');

exports.router = router;

// Verification schema for consoles
const addConsoleReviewSchema = {
    consoleID:  { required: true },
    userID:     { required: true },
    rating:     { required: true },    
    review:     { required: true }
};

const updateConsoleReviewSchema = {
    consoleID:  { required: false },
    userID:     { required: false },
    rating:     { required: false },    
    review:     { required: false }
};

// Check if user has reviewed this console previously.
function existingReviewByUser(userID, consoleID, pool) {

}

// Add a new console review to the console reviews SQL database.
function insertNewConsoleReview(info, pool) {
    
}

// Route for posting a new console review.
router.post('/', function (req, res, next) {

});

// Updates console review info by ID.
function updateConsoleReviewByID(id, info, pool){

} 

// Route to update a console review by reviewID
router.put('/:consoleID', function(req, res, next) {

});

// Delete console review by reviewID.
function deleteConsoleReviewByID(id, pool) {

}

// Route to delete a console review by reviewID.
router.delete('/:consoleID', function (req, res, next) {

});

// Function to retrieve information about a specific review by reviewID.
function getConsoleReviewByID(id, pool) {

}

// Route for getting a specific console review by reviewID
router.get('/:consoleID', function (req, res, next) {

});

// Route for list of console reviews.
router.get('/', function(req, res) {

});