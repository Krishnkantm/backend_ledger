require('dotenv').config();
const app = require('./src/app.js');
const connectToDB = require('./src/config/db.js');

connectToDB();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.status(200).json({
        message: "Backend Ledger API is running",
        status: "success"
    });
});

app.listen(PORT,()=>{
    console.log("Server is running on port " + PORT)
});
