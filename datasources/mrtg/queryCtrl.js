define([
  'angular',
  'lodash',
  'kbn'
],
function (angular, _, kbn) {
  'use strict';

  var module = angular.module('grafana.controllers');

  module.controller('MRTGQueryCtrl', function($scope) {

    $scope.init = function() {
      $scope.target.errors = validateTarget($scope.target);
      $scope.mrtgcolumns = ['In', 'Out', 'Max In', 'Max Out'];

      if (!$scope.target.mrtgColumnSelect) {
        $scope.target.mrtgColumnSelect = 'Out';
      }
    };

    $scope.targetBlur = function() {
      $scope.target.errors = validateTarget($scope.target);

      // this does not work so good
      if (!_.isEqual($scope.oldTarget, $scope.target) && _.isEmpty($scope.target.errors)) {
        $scope.oldTarget = angular.copy($scope.target);
        $scope.get_data();
      }
    };

    function validateTarget(target) {
      var errs = {};
      // TODO

      return errs;
    }

    $scope.init();
  });

});
