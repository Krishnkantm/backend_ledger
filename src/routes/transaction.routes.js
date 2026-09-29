const {Router} = require('express');
const authMiddleware = require('../middleware/auth.middleware.js');
const transactionController = require('../controllers/transaction.controller.js');

const transactionRoutes = Router();

/**
 * - POST /api/transactions/
 * - Create a new transaction
 */

transactionRoutes.post('/',authMiddleware.authMiddleware, transactionController.createTransaction);


/**
 * - POST /api/transactions/system/initial-funds 
 * - Create a new transaction for system initial funds
*/

transactionRoutes.post('/system/initial-funds',authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundsTransaction);

module.exports = transactionRoutes;