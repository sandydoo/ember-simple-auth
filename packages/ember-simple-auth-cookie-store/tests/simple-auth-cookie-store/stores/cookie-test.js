import Cookie from 'simple-auth-cookie-store/stores/cookie';
import Configuration from 'simple-auth-cookie-store/configuration';
import itBehavesLikeAStore from 'tests/simple-auth/stores/shared/store-behavior';

describe('Stores.Cookie', function() {
  beforeEach(function() {
    this.store = Cookie.create();
  });

  itBehavesLikeAStore({
    syncExternalChanges: function() {
      this.store.syncData();
    }
  });

  describe('initilization', function() {
    it('assigns cookieDomain from the configuration object', function() {
      Configuration.cookieDomain = '.example.com';

      expect(Cookie.create().cookieDomain).to.eq('.example.com');
    });

    it('assigns cookieName from the configuration object', function() {
      Configuration.cookieName = 'cookieName';

      expect(Cookie.create().cookieName).to.eq('cookieName');
    });

    it('assigns cookieExpirationTime from the configuration object', function() {
      Configuration.cookieExpirationTime = 123;

      expect(Cookie.create().cookieExpirationTime).to.eq(123);
    });

    afterEach(function() {
      Configuration.load({}, {});
    });
  });

  describe('#persist', function() {
    it('respects the configured cookieName', function() {
      this.store = Cookie.create();
      this.store.cookieName = 'test:session';
      this.store.persist({ key: 'value' });

      expect(document.cookie).to.contain('test:session=%7B%22key%22%3A%22value%22%7D');
    });

    it('respects the configured cookieDomain', function() {
      this.store = Cookie.create();
      this.store.cookieDomain = 'example.com';
      this.store.persist({ key: 'value' });

      expect(document.cookie).to.not.contain('test:session=%7B%22key%22%3A%22value%22%7D');
    });
  });

  describe('#renew', function() {
    beforeEach(function() {
      this.store = Cookie.create();
      this.store.cookieName = 'test:session';
      this.store.cookieExpirationTime = 60; // 1 min
      this.store.expires = new Date().getTime() + this.store.cookieExpirationTime * 1000;
      this.store.renew({key: this.store.expires});
    });

    it('session expiration cookie name should equal "test:session"', function() {
      expect(this.store.cookieName + ':expiration_time').to.eq('test:session:expiration_time');
    });

    it('session data cookie exists', function() {
      expect(document.cookie).to.contain('test:session=%7B%22key%22%3A'+this.store.expires+'%7D');
    });

    it('session expiration cookie exists', function() {
      expect(document.cookie).to.contain(this.store.cookieName + ':expiration_time=60');
    });

    it('session expiration cookie value should be 60', function() {
      var value = document.cookie.match(new RegExp('test:session:expiration_time=([^;]+)')) || [];
      var val = decodeURIComponent(value[1] || '');
      expect(val).to.eq('60');
    });

    it('cookie exists after renew', function() {
      this.store.expires = new Date().getTime() + this.store.cookieExpirationTime * 1000;
      this.store.renew({key: this.store.expires});
      expect(document.cookie).to.contain('test:session=%7B%22key%22%3A'+this.store.expires+'%7D');
    });
  });

  describe('the "sessionDataUpdated" event', function() {
    beforeEach(function() {
      var _this = this;
      _this.triggered = false;
      this.store.persist({ key: 'value' });
      _this.store.one('sessionDataUpdated', function() {
        _this.triggered = true;
      });
    });

    it('is not triggered when the cookie has not actually changed', function(done) {
      document.cookie = 'ember_simple_auth:session=%7B%22key%22%3A%22value%22%7D;path=/;';
      this.store.syncData();

      Ember.run.next(this, function() {
        expect(this.triggered).to.be.false;
        done();
      });
    });

    it('is triggered when the cookie changed', function(done) {
      document.cookie = 'ember_simple_auth:session=%7B%22key%22%3A%22other%20value%22%7D;path=/;';
      this.store.syncData();

      Ember.run.next(this, function() {
        expect(this.triggered).to.be.true;
        done();
      });
    });

    it('is not triggered when the cookie expiration renewed', function(done) {
      this.store.renew({key: 'value'});
      this.store.syncData();

      Ember.run.next(this, function() {
        expect(this.triggered).to.be.false;
        done();
      });
    });
  });

  afterEach(function() {
    this.store.clear();
  });
});
