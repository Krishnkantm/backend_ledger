const transactionModel = require('../models/transaction.model.js');
const ledgerModel = require('../models/ledger.model.js');
const emailService = require('../services/email.service.js');
const accountModel = require('../models/account.model.js');
const mongoose = require('mongoose');

/**
 * - Create a new transaction
 *  THE 10-STEP TRASFER FLOW:
 *  1. Validation request 
 *  2. Validate idempotency key
 *  3. Chek account status 
 *  4. Derive sender and balance fro ledger
 *  5. Create tansaction (PENDING)
 *  6. Create DEBIT ledger entry 
 *  7. Create CREDIT ledger entry
 *  8. Mark transaction as COMPLETED
 *  9. Commit MongoDB session 
 *  10. Send email notification 
 */

async function createTransaction(req, res) {
    /**
     * 1 validation request 
    */
    
    const {fromAccount, toAccount, amount, idempotencyKey} = req.body;
    
    if(!fromAccount || !toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message: "From account, to account, amount and idempotency key are required",
            status: "failed",
        })
    }

    const fromUserAccount = await accountModel.findOne({_id: fromAccount});
    const toUserAccount = await accountModel.findOne({_id: toAccount});

    if(!fromUserAccount || !toUserAccount){
        return res.status(400).json({
            message: "From account or to account not found",
            status: "failed",
        })
    }

    /**
     * 2 Validate idempotency key
    */
    
    const isTransactionExists = await transactionModel.findOne({idempotencyKey: idempotencyKey});

    if(isTransactionExists){
        if(isTransactionExists.status === "COMPLETED"){
            return res.status(200).json({
                message: "Transaction already completed",
                status: "success",
                transaction: isTransactionExists
            })
        }

        if(isTransactionExists.status === "PENDING"){
            return res.status(200).json({
                message: "Transaction is already in progress",
                status: "success",
                transaction: isTransactionExists
            })
        }

        if(isTransactionExists.status === "FAILED"){
            return res.status(200).json({
                message: "Transaction has failed previously",
                status: "failed",
                transaction: isTransactionExists
            })
        }

        if(isTransactionExists.status === "REVERSED"){
            return res.status(200).json({
                message: "Transaction has been reversed previously",
                status: "failed",
                transaction: isTransactionExists
            })
        }
    }

    /**
     * 3 Check account status
    */

    if(fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE"){
        return res.status(400).json({
            message: "From account or to account is not active",
            status: "failed",
        })
    }

    /**
     * 4 Derive sender and balance from ledger 
    */

    const  balance = await fromUserAccount.getBalance();
    
    if(balance < amount){
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}.Required amount is ${amount}`,
            status: "failed",
        })
    }

    let transaction;

    try{
        /**
         * 5 Create transaction (PENDING) 
        */

        const session = await mongoose.startSession();
        session.startTransaction();
        
         transaction = (await transactionModel.create([{
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"

        }],{session}))[0];

        const debitLedgerEntry = await ledgerModel.create([{
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT",
        }],{session});

        await (()=>{
            return new Promise((resolve)=> setTimeout(resolve,10*1000));
            })()

        const creditLedgerEntry = await ledgerModel.create([{
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT",
        }],{session});

        await transactionModel.findOneAndUpdate(
            {_id: transaction._id},
            {status: "COMPLETED"},
            {session}
        )

        await session.commitTransaction();
        session.endSession();

        /**
         * 10 Send email notification 
        */

        await emailService.sendTransactionEmail(req.user.email,req.user.name,amount,toAccount);

        return res.status(200).json({
            message: "Transaction completed successfully",
            status: "success",
            transaction: transaction
        })
    }
    catch{
       return res.status(400).json({
         message: "Transaction is Pending due to some issue, please retry after sometime"
       })
    }    
}

async function createInitialFundsTransaction(req, res) {

    const {toAccount, amount, idempotencyKey} = req.body;

    if(!toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message: "To account, amount and idempotency key are required",
            status: "failed",
        })
    }

    const toUserAccount = await accountModel.findOne({_id: toAccount});

    if(!toUserAccount){
        return res.status(400).json({
            message: "To account not found",
            status: "failed",
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    });

    if(!fromUserAccount){
        return res.status(400).json({
            message: "System user account not found",
            status: "failed",
        })
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    })

    const debitLedgerEntry = await ledgerModel.create([{
        account : fromUserAccount._id,
        amount : amount,
        transaction : transaction._id,
        type : "DEBIT"
    }],{session})

    // await (()=>{
    //     return new Promise((resolve) => setTimeout(resolve,100*1000));
    // })()

    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount : amount,
        transaction: transaction._id,
        type: "CREDIT"
    }],{session})

    transaction.status = "COMPLETED"
    await transaction.save({session});

    await session.commitTransaction()
    session.endSession()

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction : transaction
    })
}   

module.exports = { createTransaction, createInitialFundsTransaction}

