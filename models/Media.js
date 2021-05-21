const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  archive: {
      type: 'ObjectId',
      ref: 'Archive'
  },
  mediaNo: String,
  fileType: String,
	checkSum: String,
  quickId: String,
  mediaSize: Number,
  mediaReadProblem: Number,
  forcedUpload: Number,

  dtCreated: Date,
  dtLastUpdate: Date
}, { timestamps: true });

const Media = mongoose.model('Media', mediaSchema, 'media');

module.exports = Media;
