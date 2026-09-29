const express = require('express');
const router = express.Router();
const authMiddleware  = require('../middleware/auth.middleware.js');
const accountController = require('../controllers/account.controller.js');


/**
 *  - POST /api/accounts/
 *  - Create a new account
 *  - Protected Route
 */

router.post("/",authMiddleware.authMiddleware,accountController.createAccountController);

/**
 * - GET /api/accounts
 * - GET all accounts of the logged-in user
 * - Protected Route 
*/
router.get("/",authMiddleware.authMiddleware,accountController.getUserAccountsController);

/**
 * - GET /api/accounts/balance/:accountId 
*/
router.get("/balance/:accountId",authMiddleware.authMiddleware,accountController.getAccountBalanceController);

module.exports = router;