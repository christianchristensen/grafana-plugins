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
      this.username         = datasource.username;
      this.password         = datasource.password;
      this.limitmetrics     = datasource.limitmetrics || 5000;

      this.partials = datasource.partials || 'plugins/datasources/zabbix';
      this.editorSrc = this.partials + '/editor.html';

      this.annotationEditorSrc = this.partials + '/annotation_editor.html';
      this.supportAnnotations = true;

      // Get authentication token
      var authRequestData = {
        jsonrpc: '2.0',
        method: 'user.login',
        params: {
            user: this.username,
            password: this.password
        },
        auth: null,
        id: 1
      };
      var zabbixDataSource = this;
      $http.post(this.url, authRequestData)
        .then(function (response) {
          zabbixDataSource.auth = response.data.result;
        });
    }


    ///////////////////////////////////////////////////////////////////////
    /// Query methods
    ///////////////////////////////////////////////////////////////////////


    ZabbixAPIDatasource.prototype.query = function(options) {
      // get from & to in seconds
      var from = kbn.parseDate(options.range.from).getTime();
      var to = kbn.parseDate(options.range.to).getTime();
      // Need for find target alias
      var targets = options.targets;

      // Check that all targets defined
      var targetsDefined = options.targets.every(function (target, index, array) {
        return target.item;
      });
      if (targetsDefined) {
        // Extract zabbix api item objects from targets
        var target_items = _.map(options.targets, 'item');
      } else {

        // No valid targets, return the empty dataset
        var d = $q.defer();
        d.resolve({ data: [] });
        return d.promise;
      }

      from = Math.ceil(from/1000);
      to = Math.ceil(to/1000);

      return this.performTimeSeriesQuery(target_items, from, to)
        .then(function (response) {
          // Response should be in the format:
          // data: [
          //          {
          //             target: "Metric name",
          //             datapoints: [[<value>, <unixtime>], ...]
          //          },
          //          {
          //             target: "Metric name",
          //             datapoints: [[<value>, <unixtime>], ...]
          //          },
          //       ]

          // Index returned datapoints by item/metric id
          var indexed_result = _.groupBy(response.data.result, function (history_item) {
            return history_item.itemid;
          });

          // Reduce timeseries to the same size for stacking and tooltip work properly
          var min_length = _.min(_.map(indexed_result, function (history) {
            return history.length;
          }));
          _.each(indexed_result, function (item) {
            item.splice(0, item.length - min_length);
          });

          // Sort result as the same as targets for display
          // stacked timeseries in proper order
          var sorted_history = _.sortBy(indexed_result, function (value, key, list) {
            return _.indexOf(_.map(target_items, 'itemid'), key);
          });

          var series = _.map(sorted_history,
              // Foreach itemid index: iterate over the data points and
              // normalize to Grafana response format.
              function (history, index) {
                return {
                  // Lookup itemid:alias map
                  //target: targets[itemid].alias,
                  target: targets[index].alias,

                  datapoints: _.map(history, function (p) {

                    // Value must be a number for properly work
                    var value = Number(p.value);

                    // TODO: Correct time for proper stacking
                    //var clock = Math.round(Number(p.clock) / 60) * 60;
                    return [value, p.clock * 1000];
                  })
                };
            })
          return $q.when({data: series});
        });
    };


    /**
     * Perform time series query to Zabbix API
     *
     * @param items: array of zabbix api item objects
     */
    ZabbixAPIDatasource.prototype.performTimeSeriesQuery = function(items, start, end) {
      var item_ids = items.map(function (item, index, array) {
        return item.itemid;
      });
      // TODO: if different value types passed?
      //       Perform multiple api request.
      var hystory_type = items[0].value_type;
      var options = {
        method: 'POST',
        url: this.url,
        data: {
          jsonrpc: '2.0',
          method: 'history.get',
          params: {
              output: 'extend',
              history: hystory_type,
              itemids: item_ids,
              sortfield: 'clock',
              sortorder: 'ASC',
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


    // Get the list of host groups
    ZabbixAPIDatasource.prototype.performHostGroupSuggestQuery = function() {
      var options = {
        url : this.url,
        method : 'POST',
        data: {
          jsonrpc: '2.0',
          method: 'hostgroup.get',
          params: {
            output: ['name'],
            sortfield: 'name'
          },
          auth: this.auth,
          id: 1
        },
      };
      return $http(options).then(function (result) {
        if (!result.data) {
          return [];
        }
        return result.data.result;
      });
    };


    // Get the list of hosts
    ZabbixAPIDatasource.prototype.performHostSuggestQuery = function(groupid) {
      var options = {
        url : this.url,
        method : 'POST',
        data: {
          jsonrpc: '2.0',
          method: 'host.get',
          params: {
            output: ['name'],
            sortfield: 'name'
          },
          auth: this.auth,
          id: 1
        },
      };
      if (groupid) {
        options.data.params.groupids = groupid;
      }
      return $http(options).then(function (result) {
        if (!result.data) {
          return [];
        }
        return result.data.result;
      });
    };


    // Get the list of applications
    ZabbixAPIDatasource.prototype.performAppSuggestQuery = function(hostid) {
      var options = {
        url : this.url,
        method : 'POST',
        data: {
          jsonrpc: '2.0',
          method: 'application.get',
          params: {
            output: ['name'],
            sortfield: 'name',
            hostids: hostid
          },
          auth: this.auth,
          id: 1
        },
      };
      return $http(options).then(function (result) {
        if (!result.data) {
          return [];
        }
        return result.data.result;
      });
    };


    // Get the list of host items
    ZabbixAPIDatasource.prototype.performItemSuggestQuery = function(hostid, applicationid) {
      var options = {
        url : this.url,
        method : 'POST',
        data: {
          jsonrpc: '2.0',
          method: 'item.get',
          params: {
            output: ['name', 'key_', 'value_type', 'delay'],
            sortfield: 'name',
            hostids: hostid
          },
          auth: this.auth,
          id: 1
        },
      };
      // If application selected return only relative items
      if (applicationid) {
        options.data.params.applicationids = applicationid;
      }
      return $http(options).then(function (result) {
        if (!result.data) {
          return [];
        }
        return result.data.result;
      });
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
