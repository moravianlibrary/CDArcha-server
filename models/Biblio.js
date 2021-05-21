const mongoose = require('mongoose');

const biblioSchema = new mongoose.Schema({
  ean13: String,
  ismn: String,
  oclc: String,
  nbn: String,
  uuid: String,
  title: String,
  authors: String,
  year: String,
  part_year: String,
  part_year_orig: String,
  part_volume: String,
  part_volume_orig: String,
  part_name: String,
  part_name_orig: String,
  part_no: String,
  part_no_orig: String,
  part_note: String,
  part_note_orig: String,

  dtCreated: Date,
  dtLastUpdate: Date
}, { timestamps: true });

const Biblio = mongoose.model('Biblio', biblioSchema, 'biblio');

module.exports = Biblio;
