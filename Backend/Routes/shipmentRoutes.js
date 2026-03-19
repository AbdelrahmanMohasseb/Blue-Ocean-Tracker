const express = require("express");
const {
  createShipment,
  getShipments,
  getShipmentById,
  updateShipment,
  deleteShipment,
  searchByUniversalId
} = require("../controllers/shipmentController");

const auth = require("../middleware/auth");

const router = express.Router();

// Admin only create, update, delete
router.post("/", auth(["admin", "employee"]), createShipment);
router.put("/:id", auth(["admin", "employee"]), updateShipment);
router.delete("/:id", auth(["admin"]), deleteShipment);

// Employee + Admin can read/search
router.get("/", auth(["admin", "employee"]), getShipments);
router.get("/:id", auth(["admin", "employee"]), getShipmentById);
router.get("/search/by-uid", auth(["admin", "employee"]), searchByUniversalId);

module.exports = router;

