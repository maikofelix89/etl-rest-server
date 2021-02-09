'use strict';
var db = require('../etl-db');
const Promise = require('bluebird');

var serviceDefinition = {
  getPatientLatestEACSessionData: getPatientLatestEACSessionData,
  getPatientLatestEACSessionNo: getPatientLatestEACSessionNo,
  determinePatientLatestEACSessionNo: determinePatientLatestEACSessionNo
};

module.exports = serviceDefinition;

function getPatientLatestEACSessionData(patientUuid) {
  return new Promise((resolve, reject) => {
    let queryParts = {};
    const sql = `select 
    mdt.person_id,
    mdt.obs_datetime,
    mdt.concept_id,
    mdt.mdt_session_number
    from 
    (SELECT 
        o.person_id,
        o.obs_datetime,
        o.concept_id,
        case
          when o.concept_id = 10532 then  4
          when o.concept_id in (10527,10528,10529,10530,10531) then  3
          when o.concept_id in (10523,10524,10525,10526) then  2
          when o.concept_id in (10518,10519,10520,10521,10522) then  1
          else null
      end as mdt_session_number
    FROM
        amrs.obs o
        join amrs.person p on (p.person_id = p.person_id)
    WHERE
        o.concept_id in (10527,10528,10529,10530,10531,10523,10524,10525,10526,10518,10519,10520,10521,10522)
            AND p.uuid = "${patientUuid}"
            order by o.obs_datetime desc) mdt
            order by mdt.obs_datetime desc, mdt.mdt_session_number desc
            limit 1;`;

    queryParts = {
      sql: sql
    };
    return db.queryServer(queryParts, function (result) {
      result.sql = sql;
      resolve(result);
    });
  });
}

function determinePatientLatestEACSessionNo(sessionData) {
  let eacSessionNo = 0;
  const mdtSessionNo = sessionData.mdt_session_number;
  const vl = sessionData.vl_1;
  if (
    (mdtSessionNo === 4 && vl > 1000) ||
    mdtSessionNo === null ||
    mdtSessionNo === ''
  ) {
    eacSessionNo = 0;
  } else {
    eacSessionNo = mdtSessionNo;
  }

  return eacSessionNo;
}

function getPatientLatestEACSessionNo(patientUuid) {
  let sessionData = [];
  let latestEacSessionNo = null;

  return new Promise((resolve, reject) => {
    getPatientLatestEACSessionData(patientUuid)
      .then((result) => {
        if (result.size > 0) {
          sessionData = result.result[0];
          latestEacSessionNo = determinePatientLatestEACSessionNo(sessionData);
        }
        const resultData = {
          patientUuid: patientUuid,
          eacSessionNo: latestEacSessionNo,
          data: sessionData
        };

        resolve(resultData);
      })
      .catch((error) => {
        console.log('Error', error);
        reject(error);
      });
  });
}
