const mongoose = require('mongoose');

const cronlogSchema = new mongoose.Schema({
  msg: String,
  dtCreated: Date
}, { timestamps: true });

const Cronlog = mongoose.model('Cronlog', cronlogSchema, 'logcron');

module.exports = Cronlog;
