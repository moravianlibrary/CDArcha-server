const mongoose = require('mongoose');

const filesSchema = new mongoose.Schema({
  archive: {
      type: 'ObjectId',
      ref: 'Archive'
  },
  fileType: String,
	checkSum: String,
  fileSize: Number,

  dtCreated: Date,
  dtLastUpdate: Date
}, { timestamps: true });

const Files = mongoose.model('Files', filesSchema, 'files');

module.exports = Files;
