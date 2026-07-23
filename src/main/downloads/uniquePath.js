'use strict';

const fs = require('fs');
const path = require('path');

/** Avoids clobbering an existing file: "report.pdf" -> "report (1).pdf" etc. */
function uniquePath(dir, filename) {
  let candidate = path.join(dir, filename);
  if (!fs.existsSync(candidate)) return candidate;

  const ext = path.extname(filename);
  const base = filename.slice(0, filename.length - ext.length);
  let n = 1;
  do {
    candidate = path.join(dir, `${base} (${n})${ext}`);
    n += 1;
  } while (fs.existsSync(candidate));
  return candidate;
}

module.exports = { uniquePath };
