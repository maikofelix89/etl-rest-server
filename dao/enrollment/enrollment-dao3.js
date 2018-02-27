/*jshint -W003, -W097, -W117, -W026 */
'use strict';

var Promise = require('bluebird');
var squel = require('squel');
var _ = require('underscore');
var moment = require('moment');
var connection = require('../../dao/connection/mysql-connection-service.js');
var authorizer = require('../../authorization/etl-authorizer');

var enrollment = {
    getActiveProgramEnrollments : getActiveProgramEnrollments
};

module.exports = enrollment;

function getActiveProgramEnrollments(params) {
    // console.log('Enrollment Dao received....');

      // console.log('Enrollment Dao Params', params);

       var startDate = params.startDate;
       var endDate = params.endDate;
       var locationIds = params.locations;
       var programIds = params.programTypeIds;


       console.log('Enrollment Dao Params start date', startDate);
       console.log('================================================');
       console.log('Enrollment Dao Params end Date', endDate);
       console.log('================================================');
       console.log('Enrollment Dao Params end program Ids', programIds);
       console.log('================================================');
       console.log('Enrollment Dao Params end Location Ids', locationIds);

    return new Promise(function (resolve, reject) {
            connection.getServerConnection()
            .then(function (conn) {
                var query = squel.select()
                .field('pp.patient_id AS person_id')
                .field("GROUP_CONCAT(DISTINCT i.identifier SEPARATOR ', ') AS patient_identifier")
                .field('CONCAT(COALESCE(p3.given_name, "")," ",COALESCE(p3.middle_name, " "), " ", COALESCE(p3.family_name, " ")) AS patient_name')
                .field('pp.patient_program_id AS patient_program_id')
                .field('pp.location_id AS location_id')
                .field('pp.date_enrolled AS enrolled_date')
                .field('pp.program_id AS program_id')
                .field('p1.uuid AS person_uuid')
                .field('s1.name AS program_name')
                .field('s1.uuid AS program_uuid')
                .field('p1.death_date AS death_date')
                .field('pp.date_completed')
                .from('amrs.patient_program', 'pp')
                .join('amrs.person', 'p1', 'p1.person_id = pp.patient_id')
                .join('amrs.person_name', 'p3', 'p1.person_id = p3.person_id')
                .join('amrs.program', 's1', 'pp.program_id = s1.program_id')
                .join('amrs.patient_identifier', 'i', 'i.patient_id = pp.patient_id')
                .left_join('amrs.person_attribute', 't5', 'p1.person_id = t5.person_id and t5.person_attribute_type_id = 28 and t5.voided  = 0')
                .where('pp.location_id IN ?', locationIds)
                .where('date_completed IS NULL || date_completed > ?', endDate)
                .where('DATE(date_enrolled) >= ?', startDate )
                .where('date_enrolled <= ?', endDate )
                .where('p1.death_date IS NULL || p1.death_date < ?', endDate )
                .where('t5.value IS NULL OR t5.value = "false"')
                .group('patient_program_id')
                .toString();

                if(programIds !== [0]){

                    console.log('ProgramIds !== [0]', programIds);

                    var query2 = squel.select().where('pp.program_id IN ?', programIds).toString();

                    query = query + query2;

                }

               
                conn.query(query, {}, function (err, rows, fields) {
                    console.log('Enrollment Query', query);
                    if (err) {
                        console.log('Error', err);
                        reject('Error querying server');
                    }
                    else {
                        resolve(rows);
                    }
                    conn.release();
                });
            })
            .catch(function (err) {
                reject('Error establishing connection to MySql Server');
            });



    });
   
}




