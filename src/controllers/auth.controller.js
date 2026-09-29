const userModel = require("../models/user.model.js");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service.js");
const tokenBlackListModel = require("../models/blackList.model.js");

/**
* - user register controller 
* - POST /api/auth/register
*/
async function userRegisterController(req,res){
    const {email,password,name} = req.body;

    //condition 1 : check if email is already registered or not
    const isExists = await userModel.findOne({email:email});

    if(isExists){
        return res.status(422).json({
            success:false,
            message:"User is already registered",
            status: "failed"
        });
    }
   
    //condition 2 : create new user
    const user = await userModel.create({
                email:email,
                password:password,
                name:name
            });
    
    //generate token for the user
    const token = jwt.sign({userId:user._id},process.env.JWT_SECRET,{expiresIn:"3d"});
    res.cookie("token",token);

    res.status(201).json({
        user:{
            _id:user._id,
            email:user.email,
            name:user.name
        },
        token:token
    }) 
    
    await emailService.sendRegistrationEmail(user.email,user.name);

}

/**
 * - user login controller
 * - POST /api/auth/login
 */
async function userLoginController(req,res){
    const {email,password} = req.body;

    const user = await userModel.findOne({email:email}).select("+password");
    
    //condition 1 : check if user exists or not
    if(!user){
        return res.status(401).json({
            success:false,
            message:"User is not registered",
            status: "failed"
        })
    }
     
    //condition 2 : if user exists then check password is valid or not
    const isValidPassword = await user.comparePassword(password);

    if(!isValidPassword){
        return res.status(401).json({
            success:false,
            message:"Invalid password",
            status: "failed"
        })
    }

    const token = jwt.sign({userId:user._id},process.env.JWT_SECRET,{expiresIn:"3d"});

    res.cookie("token",token);

    res.status(200).json({
        user:{
             user:{
             _id:user._id,
             email:user.email,
             name:user.name
            },
            token:token
        }
    })
}

/**
 * user logout controller
*/

async function userLogoutController(req,res){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if(!token){
        return res.status(200).json({
           message: "user logout successfully"
        })
    }

    await tokenBlackListModel.create({
        token: token
    })

    res.clearCookie("token");

    res.status(200).json({
        message: "user logged out successfully"
    })
}

module.exports = {userRegisterController,userLoginController,userLogoutController};