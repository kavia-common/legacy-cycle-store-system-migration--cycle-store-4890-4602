'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Ensure the directory exists, recursively creating it if needed.
 * @param {string} dirPath - The directory path.
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Read JSON from a file, returning defaultValue if the file does not exist or is invalid.
 * @param {string} filePath - Target file path.
 * @param {any} defaultValue - Default value to return if missing/invalid.
 * @returns {any}
 */
function readJSON(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || 'null') ?? defaultValue;
  } catch (err) {
    console.warn(`fsStore.readJSON: failed to read ${filePath}:`, err.message);
    return defaultValue;
  }
}

/**
 * Write JS object to a file as JSON with pretty formatting.
 * @param {string} filePath - Target file path.
 * @param {any} data - Data to write.
 */
function writeJSON(filePath, data) {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`fsStore.writeJSON: failed to write ${filePath}:`, err.message);
  }
}

module.exports = {
  ensureDir,
  readJSON,
  writeJSON,
};
