const mongoose = require('mongoose');

const archiveSchema = new mongoose.Schema({
  biblio: {
      type: 'ObjectId',
      ref: 'Biblio'
  },
  status: Number,

  dtCreated: Date,
  dtLastUpdate: Date
}, { timestamps: true });

const Archive = mongoose.model('Archive', archiveSchema, 'archive');

module.exports = Archive;
