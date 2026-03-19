const Shipment = require("../models/Shipment");

exports.createShipment = async (req, res) => {
  try {
    const shipment = await Shipment.create(req.body);
    res.status(201).json(shipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getShipments = async (req, res) => {
  // const page=req.query.page || 1;
  // const limit=req.query.limit || 30;
  // const offset=(page-1)*limit;
  // .skip(offset).limit(30)
  try {
    const shipments = await Shipment.findAll();
    res.json(shipments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findByPk(req.params.id);
    if (!shipment) return res.status(404).json({ error: "Not found" });
    res.json(shipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findByPk(req.params.id);
    if (!shipment) return res.status(404).json({ error: "Not found" });

    await shipment.update(req.body);
    res.json(shipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findByPk(req.params.id);
    if (!shipment) return res.status(404).json({ error: "Not found" });

    await shipment.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.searchByUniversalId = async (req, res) => {
  try {
    const { uid } = req.query;
    const shipment = await Shipment.findOne({ where: { universalId: uid } });
    if (!shipment) return res.status(404).json({ error: "Not found" });
    res.json(shipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
