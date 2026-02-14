const express = require('express');
const router = express.Router();
const { 
  getSchedules, 
  saveSchedule, 
  deleteSchedule,
  getSettings,
  saveSettings
} = require('../controllers/scheduleController');
const { protect } = require('../middleware/auth');

// 排期相关路由
router.route('/')
  .get(protect, getSchedules)
  .post(protect, saveSchedule);

router.route('/:date')
  .delete(protect, deleteSchedule);

// 设置相关路由
router.route('/settings')
  .get(protect, getSettings)
  .post(protect, saveSettings);

module.exports = router;