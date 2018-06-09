const router = module.exports = require('express').Router();

//router.use('/businesses', require('./businesses').router);
//router.use('/reviews', require('./reviews').router);
//router.use('/photos', require('./photos').router);
router.use('/users', require('./users').router);
router.use('/games', require('./games').router);
router.use('/consoles', require('./consoles').router);
router.use('/rentals', require('./rentals').router);
router.use('/console_reviews', require('./console_reviews').router);
router.use('/game_reviews', require('./game_reviews').router);
