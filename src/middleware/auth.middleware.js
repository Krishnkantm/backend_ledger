const userModel = require("../models/user.model.js");
const jwt = require("jsonwebtoken");
const tokenBlackListModel = require("../models/blackList.model.js")


async function authMiddleware(req,res,next){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    //condition 1 : check if token is present or not
    if(!token){
        return res.status(401).json({
            success:false,
            message:"Unauthorized access",
            status: "failed"
        })
    }

    const isBlackListed = await tokenBlackListModel.findOne({token})

    if(isBlackListed){
        return res.status(401).json({
            message: "Unauthorized access, token in invalid"
        })
    }

    //condition 2 : verify the token
    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId);

        req.user = user;
        return next();
    }
    catch(err){
        return res.status(401).json({
            success:false,
            message:"Unauthorized access",
            status: "failed"
        })
    }
}

async function authSystemUserMiddleware(req,res,next){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    //condition 1 : check if token is present or not
    console.log(token);
    
    if(!token){
        return res.status(401).json({
            success:false,
            message:"Unauthorized access",
            status: "failed"
        })
    }

    const isBlackListed = await tokenBlackListModel.findOne({token})

    if(isBlackListed){
        return res.status(401).json({
            message: "Unauthorized access, token in invalid"
        })
    }

    //condition 2 : verify the token
    try{
        const decoded = jwt.verify(token,process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId).select("+systemUser");

        console.log(user.systemUser);

        if(!user.systemUser){
            return res.status(403).json({
                success:false,
                message:"Forbidden access",
                status: "failed"
            })
        }

        req.user = user;
        return next();
    }
    catch(err){
        return res.status(401).json({
            success:false,
            message:"Unauthorized access",
            status: "failed"
        })
    }
}

module.exports = {authMiddleware, authSystemUserMiddleware};