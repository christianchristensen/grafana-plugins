define([
  'angular',
  'lodash',
  'kbn',
  'moment'
],
function (angular, _, kbn) {
  'use strict';

  var module = angular.module('grafana.services');

  module.factory('ZabbixAPIDatasource', function($q, $http, templateSrv) {
    function ZabbixAPIDatasource(datasource) {
      this.name             = datasource.name;
      this.type             = 'ZabbixAPIDatasource';
      this.supportMetrics   = true;
      this.url              = datasource.url;
      this.auth             = datasource.auth;
      // TODO user/pass auth to get token
      this.limitmetrics     = datasource.limitmetrics || 5000;

      this.partials = datasource.partials || 'plugins/grafana-plugins/datasources/zabbix';
      this.editorSrc = this.partials + '/editor.html';

      this.annotationEditorSrc = this.partials + '/annotation_editor.html';
      this.supportAnnotations = true;
    }


    ZabbixAPIDatasource.prototype.query = function(options) {
      // get from & to in seconds
      var from = kbn.parseDate(options.range.from).getTime();
      var to = kbn.parseDate(options.range.to).getTime();
      var items = _.indexBy(options.targets, 'itemid')

      from = Math.ceil(from/1000);
      to = Math.ceil(to/1000);

      return this.performTimeSeriesQuery(_.keys(items), from, to)
        .then(_.bind(function (response) {

          // Response should be in the format:
          //[{
          //  target: "Metric name",
          //  datapoints: [[<value>, <unixtime>], ...]
          //},]

          return {
            data: _.map(
              // Index returned datapoints by item/metric id
              _.groupBy(response.data.result, function (p) { return p.itemid }),
                // Foreach itemid index: iterate over the data points and
                //  normalize to Grafana response format.
                function (i, id) {
                  return {
                    // Lookup itemid:alias map
                    target: items[id].alias,
                    datapoints: _.map(i, function (p) { return [p.value, p.clock*1000];})
                  };
              })
          };
        },options));
    };

    ZabbixAPIDatasource.prototype.performTimeSeriesQuery = function(items, start, end) {
      var options = {
        method: 'POST',
        url: this.url + '',
        data: {
          jsonrpc: '2.0',
          method: 'history.get',
          params: {
              output: 'extend',
              history: 0, // TODO this needs to be exposed
              itemids: items,
              sortfield: 'clock',
              sortorder: 'DESC',
              limit: this.limitmetrics,
              time_from: start,
          },
          auth: this.auth,
          id: 1
        },
      };
      // Relative queries (e.g. last hour) don't include an end time
      if (end) {
        options.data.params.time_till = end;
      }

      return $http(options);
    };

    ZabbixAPIDatasource.prototype.annotationQuery = function(annotation, rangeUnparsed) {
      var from = kbn.parseDate(rangeUnparsed.from).getTime();
      var to = kbn.parseDate(rangeUnparsed.to).getTime();
      var self = this;
      from = Math.ceil(from/1000);
      to = Math.ceil(to/1000);

      var tid_options = {
        method: 'POST',
        url: self.url + '',
        data: {
          jsonrpc: '2.0',
          method: 'trigger.get',
          params: {
              output: ['triggerid', 'description'],
              itemids: annotation.aids.split(','), // TODO: validate / pull automatically from dashboard.
              limit: self.limitmetrics,
          },
          auth: self.auth,
          id: 1
        },
      };

      return $http(tid_options).then(function(result) {
        var obs = {};
        obs = _.indexBy(result.data.result, 'triggerid');

        var options = {
          method: 'POST',
          url: self.url + '',
          data: {
            jsonrpc: '2.0',
            method: 'event.get',
            params: {
                output: 'extend',
                sortorder: 'DESC',
                time_from: from,
                time_till: to,
                objectids: _.keys(obs),
                limit: self.limitmetrics,
            },
            auth: self.auth,
            id: 1
          },
        };

        return $http(options).then(function(result2) {
          var list = [];
          _.each(result2.data.result, function(e) {
            list.push({
              annotation: annotation,
              time: e.clock * 1000,
              title: obs[e.objectid].description,
              text: e.eventid,
            });
          });
          return list;
        });
      });
    };

    return ZabbixAPIDatasource;
  });
});
