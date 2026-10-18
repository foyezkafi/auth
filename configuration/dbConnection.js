const mongoose = require('mongoose');
const url = process.env.MONGODB_URL
// 'mongodb+srv://erp:Wvkz1N5Hs8L5UOvn@cluster0.ojgbkvg.mongodb.net/erp?appName=Cluster0'

function dbConnection(){
  console.log(url)
    mongoose.connect(url)
  .then(() => console.log('Database connected')).catch((error) => {
    console.log("Database Connection Faild", error)
  });
}

module.exports = dbConnection