'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = postJSON;
/**
 * Fetch url with method POST and with the given request body.
 *
 * @param {String} url
 * @param {Object} body - request body
 * @returns {Promise<Object>} promise with response
 */
function postJSON(url, body) {
  return window.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify(body)
  });
}