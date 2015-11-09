define([
  'angular',
],
function (angular) {
  'use strict';

  var module = angular.module('grafana.directives');

  module.directive('metricQueryEditorMrtg', function() {
    return {
      controller: 'MRTGQueryCtrl',
      templateUrl: 'app/plugins/datasource/mrtg/partials/query.editor.html',
    };
  });

});
