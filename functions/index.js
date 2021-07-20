const functions = require("firebase-functions");

const exportToNotion = require('./exportToNotion');

exports.exportToNotion = exportToNotion.exportToNotion;