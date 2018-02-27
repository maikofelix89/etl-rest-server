var Promise = require("bluebird");
var enrollmentDao = require('../dao/enrollment/enrollment-dao');
const _ = require('lodash');

var def = {
    getActiveProgramEnrollments: getActiveProgramEnrollments,
};

module.exports = def;


function getActiveProgramEnrollments(params){

    /*
     returns a list of all program-types with their id
     and uuid

    */

  return new Promise(function (resolve, reject) {

           // console.log('params' , params);
           enrollmentDao.getActiveProgramEnrollments(params).then(function (result) {
                     if(result){
                          // console.log('Enrollment result', result);
                          var enrolled = result;
                          resolve(enrolled);
                     }else{
                        // console.log('Enrollment result Error', result);
                         reject('error');
                     }              
                 })
                .catch(function (error) {
                       // console.log('Enrollment result Error', error);
                       reject('error');
                });


      });




}





