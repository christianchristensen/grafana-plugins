define([
  'angular',
  'lodash',
  'kbn'
],
function (angular, _, kbn) {
  'use strict';

  var module = angular.module('grafana.services');

  module.factory('AtlasDatasource', function($q, $http) {
    function AtlasDatasource(datasource) {
      this.name = datasource.name;
      this.type = 'AtlasDatasource';
      this.url = datasource.url;

      this.supportMetrics = true;
      this.partials = datasource.partials || 'plugins/grafana-plugins/datasources/atlas';
      this.editorSrc = this.partials + '/editor.html';

      this.minimumInterval = datasource.minimumInterval || 1000;
    }

    AtlasDatasource.prototype.query = function(options) {
      // Atlas can take multiple concatenated stack queries
      var fullQuery = _(options.targets).reject('hide').pluck('query').value().join(',');

      var interval = options.interval;

      if (kbn.interval_to_ms(interval) < this.minimumInterval) {
        interval = kbn.secondsToHms(this.minimumInterval / 1000);
      }

      var params = {
        q: fullQuery,
        step: interval,
        s: options.range.from,
        e: options.range.to,
        format: options.format || 'json'
      };

      var httpOptions = {
        method: 'GET',
        url:    this.url + '/api/v1/graph',
        params: params,
        inspect: { type: 'atlas' }
      };

      // Note: while Atlas supports PNGs, Grafana can only provide graphite-specific dimension params
      // See https://github.com/grafana/grafana/issues/1273 for status
      if (options.format === "png") {
        var encodedParams = _.map(httpOptions.params, function (v, k) {
          return [k, encodeURIComponent(v)].join("=");
        });

        return $q.when(httpOptions.url + "?" + encodedParams.join("&"));
      } else {
        var deferred = $q.defer();
        $http(httpOptions)
          .success(function (response) {
            deferred.resolve(convertToTimeseries(response))
          })
          .error(function (data, status, headers, config) {
            var error = new Error(data.message);
            error.config = config;
            error.data = JSON.stringify(data);
            deferred.reject(error);
          });
        return deferred.promise;
      }
    };

    function convertToTimeseries (result) {
      var timeseriesData = _.map(result.legend, function (legend, index) {
        var series = {target: legend, datapoints: []};
        var values = _.pluck(result.values, index);

        for (var i = 0; i < values.length; i++) {
          var value = values[i];
          var timestamp = result.start + (i * result.step);
          series.datapoints.push([value, timestamp]);
        }

        return series;
      });

      return {data: timeseriesData};
    }

    return AtlasDatasource;
  });
});
