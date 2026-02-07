/* ================================================================
   TinyHumanMD | IndexedDB Local Storage Wrapper
   All data stays on the user's device. No server, no tracking.
   ================================================================ */
var Storage = (function () {
  'use strict';

  var DB_NAME = 'tinyhumanmd';
  var DB_VERSION = 1;
  var db = null;

  function open() {
    return new Promise(function (resolve, reject) {
      if (db) { resolve(db); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains('patients')) {
          var store = d.createObjectStore('patients', { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
        }
        if (!d.objectStoreNames.contains('measurements')) {
          var mStore = d.createObjectStore('measurements', { keyPath: 'id' });
          mStore.createIndex('patientId', 'patientId', { unique: false });
          mStore.createIndex('type', 'type', { unique: false });
        }
      };
      req.onsuccess = function (e) { db = e.target.result; resolve(db); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function tx(storeName, mode) {
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function promisify(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  return {
    /** Initialize the database */
    init: function () { return open(); },

    /** Save a patient (local only, no PHI leaves device) */
    savePatient: function (patient) {
      return open().then(function () {
        if (!patient.id) patient.id = generateId();
        patient.updatedAt = new Date().toISOString();
        return promisify(tx('patients', 'readwrite').put(patient));
      }).then(function () { return patient; });
    },

    /** Get all patients */
    getPatients: function () {
      return open().then(function () {
        return promisify(tx('patients', 'readonly').getAll());
      });
    },

    /** Get a patient by ID */
    getPatient: function (id) {
      return open().then(function () {
        return promisify(tx('patients', 'readonly').get(id));
      });
    },

    /** Delete a patient and their measurements */
    deletePatient: function (id) {
      return open().then(function () {
        return promisify(tx('patients', 'readwrite').delete(id));
      }).then(function () {
        return Storage.getMeasurements(id);
      }).then(function (measurements) {
        if (!measurements.length) return;
        return open().then(function () {
          var store = tx('measurements', 'readwrite');
          measurements.forEach(function (m) { store.delete(m.id); });
        });
      });
    },

    /** Save a measurement (growth, bili, etc.) */
    saveMeasurement: function (measurement) {
      return open().then(function () {
        if (!measurement.id) measurement.id = generateId();
        measurement.createdAt = measurement.createdAt || new Date().toISOString();
        return promisify(tx('measurements', 'readwrite').put(measurement));
      }).then(function () { return measurement; });
    },

    /** Get measurements for a patient */
    getMeasurements: function (patientId) {
      return open().then(function () {
        var store = tx('measurements', 'readonly');
        var idx = store.index('patientId');
        return promisify(idx.getAll(patientId));
      });
    },

    /** Delete a measurement */
    deleteMeasurement: function (id) {
      return open().then(function () {
        return promisify(tx('measurements', 'readwrite').delete(id));
      });
    },

    /** Clear all data */
    clearAll: function () {
      return open().then(function () {
        return Promise.all([
          promisify(tx('patients', 'readwrite').clear()),
          promisify(tx('measurements', 'readwrite').clear())
        ]);
      });
    },

    generateId: generateId
  };
})();
