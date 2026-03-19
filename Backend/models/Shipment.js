const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Shipment = sequelize.define("Shipment", {
  universalId: { type: DataTypes.STRING, allowNull: false },
  customerName: DataTypes.STRING,
  supplier: DataTypes.STRING,
  commodityType: DataTypes.STRING,
  representativeName: DataTypes.STRING,
  operNum: DataTypes.STRING,
  acid: DataTypes.STRING,
  mbl: DataTypes.STRING,
  bl: DataTypes.STRING,
  blType: DataTypes.STRING,
  shippingLine: DataTypes.STRING,
  containersPackages: DataTypes.STRING,
  pod: DataTypes.STRING,
  eta: DataTypes.DATE,
  ata: DataTypes.DATE,
  collectedDO: DataTypes.DATE,
  documentsUploaded: DataTypes.DATE,
  receivedDocument: DataTypes.DATE,
  declarationNo: DataTypes.STRING,
  customsRegistering: DataTypes.DATE,
  form4Issued: DataTypes.DATE,
  releaseDate: DataTypes.DATE,
  status: DataTypes.STRING,
  lastUpdate: DataTypes.DATE,
  remarks: DataTypes.TEXT,
  archive: DataTypes.BOOLEAN
});

module.exports = Shipment;