define([
  'angular',
  'lodash'
],
function (angular, _) {
  'use strict';

  var module = angular.module('grafana.controllers');

  var seriesList = null;

  module.controller('AtlasTargetCtrl', function($scope) {

    $scope.init = function() {
    };

    $scope.moveMetricQuery = function(fromIndex, toIndex) {
      _.move($scope.panel.targets, fromIndex, toIndex);
      $scope.get_data();
    };

    $scope.duplicate = function() {
      var clone = angular.copy($scope.target);
      $scope.panel.targets.push(clone);
      $scope.get_data();
    };

  });

});
