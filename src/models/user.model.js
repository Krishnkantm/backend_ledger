const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    email:{
        type:String,
        required:[true,"Email is required"],
        unique:[true,"Email already exists"],
        trim:true,
        lowercase:true,
        match:[/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,"Please fill a valid email address"]
    },
    password:{
        type:String,
        required:[true,"Password is required"],
        minlength:[6,"Password must be at least 6 characters long"],
        select:false
    },
    name:{
        type:String,
        required:[true,"Name is required"],
    },
    systemUser:{
        type:Boolean,
        default:false,
        immutable:true,
        select:false
    }
},{
    timestamps:true
});

userSchema.pre('save', async function(){
    if(!this.isModified('password')){
        return
    }  

    this.password = await bcrypt.hash(this.password,10);
    return
})

userSchema.methods.comparePassword = async function(password){
    
    return await bcrypt.compare(password,this.password);
}

const userModel = mongoose.model("user",userSchema);
module.exports = userModel;