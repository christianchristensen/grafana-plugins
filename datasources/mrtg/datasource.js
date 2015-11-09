define([
  'angular',
  'lodash',
  'app/core/utils/datemath',
  'moment',
  './directives',
  './queryCtrl',
],
function (angular, _, dateMath) {
  'use strict';

  var module = angular.module('grafana.services');

  module.factory('MRTGDatasource', function($q, backendSrv, templateSrv) {

    function MRTGDatasource(datasource) {
      this.type = 'mrtg';
      this.url = datasource.url;
      this.name = datasource.name;
      this.supportMetrics = true;
    }

    // Called once per panel (graph)
    MRTGDatasource.prototype.query = function(options) {
      // Create request for each target
      var promises = _.map(options.targets, function(target) {
        if (target.hide) {
          return {datapoints:[]};
        }
        // Iterate over each specified target.
        var queryoptions = {
          method: 'GET',
          url: this.url + target.mrtglogfile,
        };
        return backendSrv.datasourceRequest(queryoptions).then(_.bind(function(response) {
          // http://oss.oetiker.ch/mrtg/doc/mrtg-logfile.en.html
          var lines = response.data.split('\n');
          var start = Math.ceil(dateMath.parse(options.range.from));
          var end = Math.ceil(dateMath.parse(options.range.to));
          var colsel = target.mrtgColumnSelect;
          var filename = target.alias ? target.alias : (target.mrtglogfile + ':' + colsel);
          var mult = target.mult ? target.mult : 1;
          // TODO: alias override
          lines.shift(); // remove couter line
          lines = lines.map(function(row) {
            var tdata = row.split(" ").map(function(col) { return parseInt(col) });
            // 0: unix timestamp
            // 1: average incoming transfer rate in bytes per second
            // 2: verage outgoing transfer rate in bytes per second since the previous measurement
            // 3: maximum incoming transfer rate in bytes per second for the current interval
            // 4: maximum outgoing transfer rate in bytes per second for the current interval
            var utime = tdata[0]*1000;
            var tvalue = tdata[colsel] * mult;
            if (tvalue != undefined && utime > start && utime < end) {
              return [tvalue, utime];
            }
          });
          lines = _.without(lines,undefined);
          // Response should be in the format:
          //[{
          //  target: "Metric name",
          //  datapoints: [[<value>, <unixtime>], ...]
          //},]
          return {
            target: filename,
            datapoints: lines.reverse()
          };
        }, options));
      }, this);

      return $q.all(_.flatten(promises)).then(function (results) {
        var timeseries_data = _.flatten(results);
        return { data: timeseries_data };
      });
    };

    return MRTGDatasource;
  });

});
