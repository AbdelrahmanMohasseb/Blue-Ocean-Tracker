const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("blueoceantest", "abdelrahmanaly_SQLLogin_1", "d3m3b89yqy", {
  host: "blueoceantest.mssql.somee.com",
  dialect: "mssql",  
  
});


module.exports = sequelize;