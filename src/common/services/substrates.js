'use strict';

angular.module('services.substrates', [])

  .factory('Substrates', function ($http, $q, SERVER_BASE_URL) {

    var rawData;

    function load() {
      if (rawData === undefined) {
        var deferred = $q.defer();
        $http({
          url: SERVER_BASE_URL + '/substrates',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }).then(function (result) {
          rawData = result.data;
          deferred.resolve(rawData);
        }, function (error) {
          // TODO: error handler
          deferred.reject(error);
        });
      }
      return rawData;
    }

    function substrates() {
      return rawData.sr.substrates;
    }

    function translateSubstrate(substrateKey){
      return rawData.sr.substrates[substrateKey];
    }

    return {
      load: load,
      substrates: substrates,
      translateSubstrate: translateSubstrate
    };
  });