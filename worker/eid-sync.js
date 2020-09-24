var
  db = require('../etl-db'),
  Promise = require('bluebird'),
  https = require('http'),
  config = require('../conf/config'),
  moment = require('moment'),
  curl = require('curlrequest');

var Sync = {

  timeout: 30000,

  nextSyncDateTime: moment().subtract(1, 'minute'),

  records_limit: 1,

  processing: false,

  start: function () {
    console.log('Starting EID sync');
    if (!config.eidSyncCredentials) {
      console.log('openmrs sync user credentials should be provided');
      process.exit(1);
    }

    if (config.etl.tls) {
      https = require('https');
    }

    // load records from sync queue
    setInterval(function () {

      if (!Sync.processing)
        Sync.process();
    }, Sync.timeout);
  },

  process: function () {

    var today = new Date().getHours();

    //sync records after working hours only
    // if (today >= 7 && today <= 17) {
    //   Sync.processing = false;
    //   return;
    // }

    // incase of server unavailability, postpone sync    
    if (moment().isBefore(Sync.nextSyncDateTime)) {
      console.log('Sync paused and will resume ' + Sync.nextSyncDateTime.fromNow());
      console.log('Sync will resume at ' + Sync.nextSyncDateTime.format());
      Sync.processing = false;
      return;
    }

    // if(!moment().isBefore(Sync.nextSyncDateTime)) {
    //   console.log('simulating syncing at this point');
    //   if(moment().minutes() >= 59){
    //     console.log('simulating error');
    //     Sync.nextSyncDateTime = moment().add(2, 'minute');
    //   }
    //   Sync.processing = false;
    //   return;
    // }

    this.loadDbRecords()
      .then(function (data) {

        if (data.length > 0) {

          Sync.processing = true;

          Sync.sync(data)
            .then(function () {

              return Sync.deleteProcessed(data);
            })
            .then(function (deleted) {
              console.log('wait 2 seconds ..');
              setTimeout(function(){
                Sync.process();
              },20);
            })
            .catch(function (err) {

              Sync.processing = false;
            });

        } else {
          Sync.processing = false;
        }
      });
  },

  loadDbRecords: function () {
    console.log('Load Db record..');

    var limit = Sync.records_limit;

    var sql = 'select * from etl.eid_sync_queue limit ?';

    var qObject = {
      query: sql,
      sqlParams: [limit]
    };

    return new Promise(function (resolve, reject) {
      db.queryReportServer(qObject, function (data) {
        resolve(data.result);
      });
    });
  },

  sync: function (data) {

    var list = [];

    for (var i = 0; i < data.length; i++) {

      var row = data[i];
      list.push(Sync.syncSingleRecord(row.person_uuid));
    }

    return Promise.all(list);
  },

  syncSingleRecord: function (patientUuId) {

    console.log('syncing single record. ' + patientUuId);

    var protocol = config.etl.tls ? 'https' : 'http';

    var url = protocol + '://10.50.80.56:8007/etl/patient-lab-orders?patientUuId=' + patientUuId + '&mode=batch';

    var usernamePass = config.eidSyncCredentials.username + ":" + config.eidSyncCredentials.password;
    var auth = "Basic " + new Buffer(usernamePass).toString('base64');

    var options = {
      url: url,
      headers: {
        'Authorization': auth
      }
    }

    console.log('Options ..', options);

    return new Promise(function (resolve, reject) {

      Sync.deleteLogEntry(patientUuId)
      .then(function (result) {

            curl.request(options, function (err, parts) {

              if (err) {
                if (err === 'Failed to connect to host.') {
                  console.error('ETL Backend Service might be down.');
                  Sync.nextSyncDateTime = moment().add(10, 'minute');
                }

                console.log('error while syncing ' + patientUuId + '. Logging error.' + err);
                Sync.logError(patientUuId, err)
                  .then(function () {
                    resolve('str');
                  })
                  .catch(function (err) {
                    resolve('str');
                  });
              } else {
                console.log('Curl parts ..', parts);
                console.log('syncing single record done. ' + patientUuId);
                resolve('str');
              }

            });
          }).catch(function(error){
              console.log('Error deleting log record...', error);
              resolve('str');
          });
    });
  },

  logError: function (patientUuId, error) {
    var sql = "INSERT INTO etl.eid_sync_queue_errors(person_uuid, error, date_created)" +
      " VALUES('" + patientUuId + "','" + error + "', NOW())";

    var queryObject = {
      query: sql,
      sqlParams: []
    };

    return new Promise(function (resolve, reject) {
      db.queryReportServer(queryObject, function (response) {
        if (response.error) {
          reject(response);
        } else {
          resolve(response);
        }
      });
    });
  },

  deleteProcessed: function (data) {

    var lst = [];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      lst.push(row.person_uuid);
    }

    var sql = 'delete from etl.eid_sync_queue where person_uuid in (?)';

    var qObject = {
      query: sql,
      sqlParams: [lst]
    }

    return new Promise(function (resolve, reject) {
      try {
        db.queryReportServer(qObject, function (result) {
          resolve(result);
        });
      } catch (e) {

        //TODO - ignoring delete
        resolve(e);
      }
    });
  },
  deleteLogEntry: function (uuid){

    console.log('Delete sync log for', uuid);

    var sql = 'delete from etl.eid_sync_log where person_uuid = ' + uuid;

    var qObject = {
      query: sql,
      sqlParams: []
    }

    return new Promise(function (resolve, reject) {
      try {
        db.queryReportServer(qObject, function (result) {
          resolve(result);
        });
      } catch (e) {

        //TODO - ignoring delete
        resolve(e);
      }
    });
      
  }
}

Sync.start();

module.exports = Sync;