const Schedule = require('../models/Schedule');
const Setting = require('../models/Setting');

// @desc    获取指定日期范围的排期数据
// @route   GET /api/schedules
// @access  Private
const getSchedules = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    // 构建查询条件
    const query = {
      userId: req.user._id
    };

    // 如果提供了日期范围，则添加日期过滤条件
    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const schedules = await Schedule.find(query).sort({ date: 1 });
    
    // 将数据转换为前端期望的格式
    const scheduleData = {};
    schedules.forEach(schedule => {
      scheduleData[schedule.date] = schedule.projects;
    });

    res.json(scheduleData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// @desc    保存或更新排期数据
// @route   POST /api/schedules
// @access  Private
const saveSchedule = async (req, res) => {
  const { date, projects } = req.body;

  try {
    // 查找或创建排期记录
    let schedule = await Schedule.findOne({ userId: req.user._id, date });

    if (schedule) {
      // 更新现有记录
      schedule.projects = projects;
      await schedule.save();
    } else {
      // 创建新记录
      schedule = new Schedule({
        userId: req.user._id,
        date,
        projects
      });
      await schedule.save();
    }

    res.json(schedule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// @desc    删除指定日期的排期数据
// @route   DELETE /api/schedules/:date
// @access  Private
const deleteSchedule = async (req, res) => {
  const { date } = req.params;

  try {
    const schedule = await Schedule.findOneAndDelete({ 
      userId: req.user._id, 
      date 
    });

    if (schedule) {
      res.json({ message: '删除成功' });
    } else {
      res.status(404).json({ message: '未找到指定日期的排期数据' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// @desc    获取用户设置
// @route   GET /api/settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    const settings = await Setting.findOne({ userId: req.user._id });

    if (settings) {
      res.json({
        commonLocations: settings.commonLocations,
        commonDirectors: settings.commonDirectors,
        commonPhotographers: settings.commonPhotographers,
        commonProductionFacilities: settings.commonProductionFacilities,
        commonRdFacilities: settings.commonRdFacilities
      });
    } else {
      // 如果没有设置，返回空数组
      res.json({
        commonLocations: [],
        commonDirectors: [],
        commonPhotographers: [],
        commonProductionFacilities: [],
        commonRdFacilities: []
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// @desc    保存用户设置
// @route   POST /api/settings
// @access  Private
const saveSettings = async (req, res) => {
  const { commonLocations, commonDirectors, commonPhotographers, commonProductionFacilities, commonRdFacilities } = req.body;

  try {
    // 查找或创建设置记录
    let settings = await Setting.findOne({ userId: req.user._id });

    if (settings) {
      // 更新现有设置
      settings.commonLocations = commonLocations;
      settings.commonDirectors = commonDirectors;
      settings.commonPhotographers = commonPhotographers;
      settings.commonProductionFacilities = commonProductionFacilities;
      settings.commonRdFacilities = commonRdFacilities;
      await settings.save();
    } else {
      // 创建新设置
      settings = new Setting({
        userId: req.user._id,
        commonLocations,
        commonDirectors,
        commonPhotographers,
        commonProductionFacilities,
        commonRdFacilities
      });
      await settings.save();
    }

    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
};

module.exports = {
  getSchedules,
  saveSchedule,
  deleteSchedule,
  getSettings,
  saveSettings
};