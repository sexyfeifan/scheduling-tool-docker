const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    unique: true
  },
  commonLocations: [{
    type: String,
    trim: true
  }],
  commonDirectors: [{
    type: String,
    trim: true
  }],
  commonPhotographers: [{
    type: String,
    trim: true
  }],
  commonProductionFacilities: [{
    type: String,
    trim: true
  }],
  commonRdFacilities: [{
    type: String,
    trim: true
  }],
  commonOperationalFacilities: [{
    type: String,
    trim: true
  }],
  commonAudioFacilities: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema);