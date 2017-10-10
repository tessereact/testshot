const fsp = require('fs-promise')
const path = require('path')

const CONTEXT_DELIMITER = ' - '

/**
 * Read snapshot from the file system.
 *
 * @param {String} snapshotsDir
 * @param {String} name - snapshot name
 * @param {String} context - context name
 * @param {String} [extension='html'] - file extension
 * @returns {Promise<String>} promise with snapshot
 */
function readSnapshot (snapshotsDir, name, context, extension = 'html') {
  const snapshotPath = getSnapshotPath(snapshotsDir, name, context, extension)

  return fsp
    .readFile(snapshotPath)
    .catch(() => null)
    .then((file) =>
      file == null ? null : file.toString()
    )
}

/**
 * Write snapshot to the file system.
 *
 * @param {String} snapshotsDir
 * @param {String} snapshot - snapshot to be writtn
 * @param {String} name - snapshot name
 * @param {String} context - context name
 * @param {String} [extension='html'] - file extension
 * @returns {Promise}
 */
function writeSnapshot (snapshotsDir, snapshot, name, context, extension = 'html') {
  const dir = path.join(snapshotsDir, context || '')
  const snapshotPath = getSnapshotPath(snapshotsDir, name, context, extension)

  return fsp
    .ensureDir(dir)
    .then(() => fsp.writeFile(snapshotPath, snapshot))
}

function getSnapshotPath (snapshotsDir, scenarioName, contextName, extension) {
  const dir = path.join(snapshotsDir, contextName || '')
  return `${dir}/${composeScenarioFileName(scenarioName, contextName, extension)}`
}

function composeScenarioFileName (name, context, extension) {
  const fileName = context ? [context, name].join(CONTEXT_DELIMITER) : name
  return fileName + (extension ? '.' + extension : '')
}

/**
 * Write browserData to the file system as `${snapshotsDir}/lastAcceptedBrowserData.json`.
 *
 * @param {String} snapshotsDir
 * @param {Object} browserData
 * @returns {Promise}
 */
function writeBrowserData (snapshotsDir, browserData) {
  const browserDataFileName = `${snapshotsDir}/lastAcceptedBrowserData.json`

  return fsp
    .ensureDir(snapshotsDir)
    .then(() => fsp.writeFile(browserDataFileName, `${JSON.stringify(browserData, null, '  ')}\n`))
}

/**
 * Read browserData from the file system.
 *
 * @param {String} snapshotsDir
 * @returns {Promise<Object?>}
 */
function readBrowserData (snapshotsDir) {
  const browserDataFileName = `${snapshotsDir}/lastAcceptedBrowserData.json`

  return fsp
    .readFile(browserDataFileName)
    .catch(() => null)
    .then(file => file == null ? null : JSON.parse(file.toString()))
}

module.exports = {
  readSnapshot,
  writeSnapshot,
  writeBrowserData,
  readBrowserData
}
