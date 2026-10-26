const userModel = require("../models/userSchema");


const getalluserController = async (req, res) => {
    try {
        const loggedinUser = await userModel.findById({_id: "6ade2d84672ca90c6ccfc9d9"})
        const users = await userModel.find()
        res.status(200).json({
            success: true,
            message: "users get successfully",
            data: users
        })
      
    
    } catch (error) {
     res.send("catch error")
        
    }

};




module.exports = {
    getalluserController,
}