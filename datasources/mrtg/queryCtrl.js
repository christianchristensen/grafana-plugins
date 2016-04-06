define([
  'angular',
  'lodash',
],
function (angular, _) {
  'use strict';

  var module = angular.module('grafana.controllers');

  module.controller('MRTGQueryCtrl', function($scope) {

    $scope.init = function() {
      $scope.target.errors = validateTarget($scope.target);
      $scope.mrtgcolumns = [1, 2, 3, 4];

      if (!$scope.target.mrtgColumnSelect) {
        $scope.target.mrtgColumnSelect = 2;
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
