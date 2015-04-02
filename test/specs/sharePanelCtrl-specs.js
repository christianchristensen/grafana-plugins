define([
  'helpers',
  'controllers/sharePanelCtrl'
], function(helpers) {
  

  describe('SharePanelCtrl', function() {
    var ctx = new helpers.ControllerTestContext();

    function setTime(range) {
      ctx.timeSrv.timeRangeForUrl = sinon.stub().returns(range);
    }

    setTime({ from: 'now-1h', to: 'now' });

    beforeEach(module('grafana.controllers'));

    beforeEach(ctx.providePhase());
    beforeEach(ctx.createControllerPhase('SharePanelCtrl'));

    describe('shareUrl with current time range and panel', function() {


      it('should generate share url relative time', function() {
        ctx.$location.path('/test');
        ctx.scope.panel = { id: 22 };

        setTime({ from: 'now-1h', to: 'now' });

        ctx.scope.buildUrl();
        expect(ctx.scope.shareUrl).to.be('http://server/#/test?from=now-1h&to=now&panelId=22&fullscreen');
      });

      it('should generate share url absolute time', function() {
        ctx.$location.path('/test');
        ctx.scope.panel = { id: 22 };
        setTime({ from: 1362178800000, to: 1396648800000 });

        ctx.scope.buildUrl();
        expect(ctx.scope.shareUrl).to.be('http://server/#/test?from=1362178800000&to=1396648800000&panelId=22&fullscreen');
      });

      it('should remove panel id when toPanel is false', function() {
        ctx.$location.path('/test');
        ctx.scope.panel = { id: 22 };
        ctx.scope.toPanel = false;
        setTime({ from: 'now-1h', to: 'now' });

        ctx.scope.buildUrl();
        expect(ctx.scope.shareUrl).to.be('http://server/#/test?from=now-1h&to=now');
      });

      it('should include template variables in url', function() {
        ctx.$location.path('/test');
        ctx.scope.panel = { id: 22 };
        ctx.scope.includeTemplateVars = true;
        ctx.scope.toPanel = false;
        ctx.templateSrv.variables = [{ name: 'app', current: {text: 'mupp' }}, {name: 'server', current: {text: 'srv-01'}}];
        setTime({ from: 'now-1h', to: 'now' });

        ctx.scope.buildUrl();
        expect(ctx.scope.shareUrl).to.be('http://server/#/test?from=now-1h&to=now&var-app=mupp&var-server=srv-01');
      });

    });

  });

});

