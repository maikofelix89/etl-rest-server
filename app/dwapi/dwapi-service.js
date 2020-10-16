var db = require("../../etl-db");
const Promise = require("bluebird");
import { PatientlistMysqlReport } from "../reporting-framework/patientlist-mysql.report";

var fns = {
  getMFLSites: getMFLSites,
  setSelectedMFLSite:setSelectedMFLSite,
  setMFLSite:setMFLSite,
  clearSelectedMFLSite:clearSelectedMFLSite,
  getPatientListReport: getPatientListReport
};

  function getMFLSites() {
    return new Promise(function (resolve, reject) {

      let queryParts = {};
        let sql = ''
        sql = "select mfl_code,Facility,County from ndwr.mfl_codes group by mfl_code;";
        
        queryParts = {
            sql: sql
        };
        db.queryServer(queryParts, function (result) {
            result.sql = sql;
            resolve(result);
        });
        
      });
  }

  function setSelectedMFLSite(params){
    console.log('setSelectedMFLSite....', params);
    return new Promise(function (resolve, reject) {

      const mflSites = params.mflCodes;
      const sqlParam = mflSites.map((site) => {
        return `(${site})`;
      });
      console.log('sqlParam', sqlParam);

      clearSelectedMFLSite()
      .then((result) => {
        let queryParts = {};
        let sql = ''
        sql = `replace into ndwr.ndwr_selected_site (SiteCode) values ${sqlParam} ;`;
        console.log('sql', sql);
        
        queryParts = {
            sql: sql
        };
        db.queryServer(queryParts, function (result) {
            result.sql = sql;
            resolve(result);
        });

      })
      .catch((error) => {
         reject(error);
      });
        
      });

  }

  function setMFLSite(params) {

    return new Promise(function (resolve, reject) {

      let queryParts = {};
        let sql = ''
        sql = "select mfl_code,Facility,County from ndwr.mfl_codes group by mfl_code;";
        
        queryParts = {
            sql: sql
        };
        db.queryServer(queryParts, function (result) {
            result.sql = sql;
            resolve(result);
        });
        
      });
    
  }

  function clearSelectedMFLSite(){
    console.log('Clearing selected mfl...');
    return new Promise(function (resolve, reject) {

      let queryParts = {};
        let sql = ''
        sql = "delete from ndwr.ndwr_selected_site;";
        
        queryParts = {
            sql: sql
        };
        db.queryServer(queryParts, function (result) {
            result.sql = sql;
            resolve(result);
        });
        
      });

  }

  function getPatientListReport(reportParams){

    const indicators = [];
    const extractType = reportParams.extract;
    const extractReport = determineReport(extractType);
    console.log('Extract report', extractReport);
    let report = new PatientlistMysqlReport(extractReport,reportParams);
    

    return new Promise(function (resolve, reject) {
      Promise.join(report.generatePatientListReport(indicators),
          (results) => {
                  results['result'] = results.results.results;
                  resolve(results);
          }).catch((errors) => {
              console.log('Error', errors);
              reject(errors);
          });
  });

  }

  function determineReport(extractType){
    let reportType = '';
    switch(extractType){
       case 'all_patients':
        reportType = 'dwapiAllPatientsExtractAggregate';
       break;
       case 'art_patients':
        reportType = 'dwapiPatientARTExtractAggregate';
       break;
       case 'patient_baselines':
        reportType = 'dwapiPatientBaselineExtractAggregate';
       break;
      case 'patient_status':
        reportType = 'dwapiPatientStatusExtractAggregate';
      break;
      case 'patient_labs':
        reportType = 'dwapiPatientLabsExtractAggregate';
      break;
      case 'patient_pharmacy':
        reportType = 'dwapiPatientPharmacyAggregate';
      break;
      case 'patient_visit':
        reportType = 'dwapiPatientVisitsExtractAggregate';
      break;
      case 'patient_adverse_events':
        reportType = 'dwapiPatientAdverseEventsAggregate';
      break;
      default:
        reportType = 'all_patients';
    }

    return reportType;

  }

  module.exports  = fns;