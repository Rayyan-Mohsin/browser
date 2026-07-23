'use strict';

const path = require('path');
const { app } = require('electron');

function getUserDataPath(...segments) {
  return path.join(app.getPath('userData'), ...segments);
}

module.exports = { getUserDataPath };
