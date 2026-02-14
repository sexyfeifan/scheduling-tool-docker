const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  director: {
    type: String,
    trim: true
  },
  photographer: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    trim: true
  },
  startTime: {
    type: String,
    trim: true
  }
});

const scheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  date: {
    type: String,
    required: true,
    trim: true
  },
  projects: [projectSchema]
}, {
  timestamps: true
});

// 创建复合索引确保每个用户每天只有一条记录
scheduleSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Schedule', scheduleSchema);