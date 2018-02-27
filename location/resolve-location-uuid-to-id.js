"use strict";

var Promise = require("bluebird");
const _ = require('lodash');
const dao = require('../etl-dao');
var locationService = require('./location.service');
var locationMapping;

var locationDef = {
    getLocationUUidIdMap: getLocationUUidIdMap,
    resolveLocationUuidsParamsToIds: resolveLocationUuidsParamsToIds,
     
};


module.exports = locationDef;


// Get a map of locations uuids and ids

function getLocationUUidIdMap(){

      var locationMap = new Map();
      var resolveCount = 0;

       return new Promise(function (resolve, reject) {

                function checkResolveCount(){
                       // console.log('Resolve Count', resolveCount);
                      if(resolveCount == 1){

                        //console.log('Location Mapping', locationMapping);
                            
                            resolve(locationMapping);

                      }
                }
      
                 //first get the location map

                  locationService.loadAndMaplocationUuidToId()
                  .then((result)=>{
                        locationMapping = result;
                        resolveCount++;
                        checkResolveCount();
                        // console.log('All Locations', result);
                  })
                  .catch(function(e) {
                         resolveCount++;
                         checkResolveCount();
                         // console.log("handled error", e);
                  });;


   });

}

function resolveLocationUuidsParamsToIds(request){

      var locationMap = {};
      var resolvedLocationIds = [];
      var resolvedLocation = [-1];
      var resolveCount = 0;

      var encodedUrl = request.locationUuids;
      var decodedUrl  = JSON.parse((decodeURI(encodedUrl)));
      // console.log('Decoded Url', decodedUrl);
      var locationUuids = [];

      if(typeof decodedUrl !== 'undefined'){
          locationUuids = decodedUrl;
      }

      // console.log('Locations', decodedUrl);

       return new Promise(function (resolve, reject) {

       function checkResolveCount(){
             if(resolveCount > 0){
                 resolve(resolvedLocationIds);
             }else{
                  reject('Error')
             }
       }

       getLocationUUidIdMap().
                  then((result)=>{
                        locationMap = result;
                       // console.log('All Locations Map', result);
                        if (locationUuids.length > 0) {
                              // console.log('locations.length > 0');
                              _.each(locationUuids, (location) => {
                                var locationUuid = location;
                                var locationId = locationMapping.get(locationUuid);
                                if(typeof locationId !== 'undefined'){

                                    resolvedLocation.push(locationId);

                                }else{

                                     console.error('ERROR : Undefined Location UUID', locationUuid);
                                }
                               

                              });



                        }else{

                        }
                    

                            resolvedLocationIds = _.uniq(resolvedLocation)

                              resolveCount++;


                             checkResolveCount();
                  })
                  .catch(function(e) {
                         console.log("handled error", e);
                  });;

       });

}








