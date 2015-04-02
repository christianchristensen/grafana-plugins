define([
  'angular',
  'lodash'
],
function (angular, _) {
  'use strict';

  var module = angular.module('grafana.controllers');

  module.controller('ZabbixAPITargetCtrl', function($scope) {

    $scope.init = function() {
      $scope.target.errors = validateTarget($scope.target);
    };

    $scope.targetBlur = function() {
      $scope.target.errors = validateTarget($scope.target);
      if (!_.isEqual($scope.oldTarget, $scope.target) && _.isEmpty($scope.target.errors)) {
        $scope.oldTarget = angular.copy($scope.target);
        $scope.get_data();
      }
    };

    $scope.duplicate = function() {
      var clone = angular.copy($scope.target);
      $scope.panel.targets.push(clone);
    };
    $scope.moveMetricQuery = function(fromIndex, toIndex) {
      _.move($scope.panel.targets, fromIndex, toIndex);
    };


    //////////////////////////////
    // VALIDATION
    //////////////////////////////

    function validateTarget(target) {
      var errs = {};

      return errs;
    }

  });

});
