'use strict';

/* global chai, sinon: false */

var expect = chai.expect;

describe('The calAttendeesDenormalizerService service', function() {
  var $q, $rootScope, calAttendeesDenormalizerService, esnMemberResolverRegistry, group, individual, resource;

  beforeEach(function() {
    group = {
      email: 'group@open-paas.org',
      cutype: 'GROUP'
    };

    individual = {
      email: 'individual@open-paas.org',
      cutype: 'INDIVIDUAL'
    };

    resource = {
      email: 'resource@open-paas.org',
      cutype: 'RESOURCE'
    };

    esnMemberResolverRegistry = {
      getResolver: sinon.stub()
    };
  });

  beforeEach(function() {
    angular.mock.module('esn.calendar');

    angular.mock.module(function($provide) {
      $provide.value('esnMemberResolverRegistry', esnMemberResolverRegistry);
    });

    angular.mock.inject(function(_$q_, _$rootScope_, _calAttendeesDenormalizerService_) {
      $q = _$q_;
      $rootScope = _$rootScope_;
      calAttendeesDenormalizerService = _calAttendeesDenormalizerService_;
    });
  });

  it('should send back attendee when attendee.cutype is individual', function(done) {
    calAttendeesDenormalizerService([individual]).then(function(result) {
      expect(result).to.deep.equals([individual]);
      done();
    });

    $rootScope.$digest();
  });

  it('should ignore cutype case', function(done) {
    individual.cutype = individual.cutype.toLowerCase();
    calAttendeesDenormalizerService([individual]).then(function(result) {
      expect(result).to.deep.equals([individual]);
      done();
    });

    $rootScope.$digest();
  });

  it('should send back attendee when attendee.cutype is resource', function(done) {
    calAttendeesDenormalizerService([resource]).then(function(result) {
      expect(result).to.deep.equals([resource]);
      done();
    });

    $rootScope.$digest();
  });

  it('should send back attendee when attendee.cutype is undefined', function(done) {
    var attendee = {_id: 1};

    calAttendeesDenormalizerService([attendee]).then(function(result) {
      expect(result).to.deep.equals([attendee]);
      done();
    });

    $rootScope.$digest();
  });

  describe('When cutype is group', function() {
    it('should send back attendee when resolver can not be found in the registry', function(done) {
      esnMemberResolverRegistry.getResolver.returns(undefined);

      calAttendeesDenormalizerService([group]).then(function(result) {
        expect(esnMemberResolverRegistry.getResolver).to.have.been.calledWith('group');
        expect(result).to.deep.equals([group]);
        done();
      });

      $rootScope.$digest();
    });

    it('should resolve attendees from group members', function(done) {
      var member1 = {
        objectType: 'user',
        id: '1',
        member: {
          _id: '1',
          preferredEmail: 'user1@open-paas.org',
          firstname: 'john',
          lastname: 'doe'
        }
      };
      var member2 = {
        objectType: 'user',
        id: '2',
        member: {
          _id: '2',
          preferredEmail: 'user2@open-paas.org',
          firstname: 'jane',
          lastname: 'doe'
        }
      };
      var members = [member1, member2];
      var resolve = sinon.stub().returns($q.when(members));

      esnMemberResolverRegistry.getResolver.returns({resolve: resolve});

      calAttendeesDenormalizerService([group]).then(function(result) {
        expect(esnMemberResolverRegistry.getResolver).to.have.been.calledWith('group');
        expect(resolve).to.have.been.calledWith(group.email);
        expect(result).to.have.lengthOf(members.length);
        done();
      });

      $rootScope.$digest();
    });

    it('should resolve inner groups members', function(done) {
      var member1 = {
        objectType: 'user',
        id: '1',
        member: {
          _id: '1',
          preferredEmail: 'user1@open-paas.org',
          firstname: 'john',
          lastname: 'doe'
        }
      };
      var member2 = {
        objectType: 'user',
        id: '2',
        member: {
          _id: '2',
          preferredEmail: 'user2@open-paas.org',
          firstname: 'jane',
          lastname: 'doe'
        }
      };
      var member3 = {
        objectType: 'group',
        id: 'g1',
        member: {
          _id: '3',
          email: 'group2@open-paas.org',
          members: [
            {
              objectType: 'user',
              id: '3',
              member: {
                _id: '3',
                preferredEmail: 'user3@open-paas.org',
                firstname: 'jane',
                lastname: 'doe'
              }
            },
            {
              objectType: 'user',
              id: '4',
              member: {
                _id: '4',
                preferredEmail: 'user4@open-paas.org',
                firstname: 'jane',
                lastname: 'doe'
              }
            }
          ]
        }
      };
      var members1 = [member1, member2, member3];
      var resolver = sinon.stub();

      resolver.withArgs(group.email).returns($q.when(members1));
      resolver.withArgs(member3.member.email).returns($q.when(member3.member.members));

      esnMemberResolverRegistry.getResolver.returns({resolve: resolver});

      calAttendeesDenormalizerService([group]).then(function(result) {
        expect(esnMemberResolverRegistry.getResolver).to.have.been.calledWith('group');
        expect(resolver).to.have.been.calledTwice;
        expect(resolver).to.have.been.calledWith(group.email);
        expect(resolver).to.have.been.calledWith(member3.member.email);
        expect(result).to.shallowDeepEqual([
          {email: 'user1@open-paas.org', cutype: 'INDIVIDUAL'},
          {email: 'user2@open-paas.org', cutype: 'INDIVIDUAL'},
          {email: 'user3@open-paas.org', cutype: 'INDIVIDUAL'},
          {email: 'user4@open-paas.org', cutype: 'INDIVIDUAL'}
        ]);
        done();
      });

      $rootScope.$digest();
    });

    it('should resolve email members', function(done) {
      var member1 = {
        objectType: 'user',
        id: '1',
        member: {
          _id: '1',
          preferredEmail: 'user1@open-paas.org',
          firstname: 'john',
          lastname: 'doe'
        }
      };
      var member2 = {
        objectType: 'email',
        id: 'user2@open-paas.org',
        member: 'user2@open-paas.org'
      };
      var members1 = [member1, member2];
      var resolver = sinon.stub();

      resolver.withArgs(group.email).returns($q.when(members1));
      esnMemberResolverRegistry.getResolver.returns({resolve: resolver});

      calAttendeesDenormalizerService([group]).then(function(result) {
        expect(esnMemberResolverRegistry.getResolver).to.have.been.calledWith('group');
        expect(resolver).to.have.been.calledOnce;
        expect(resolver).to.have.been.calledWith(group.email);
        expect(result).to.shallowDeepEqual([
          {email: 'user1@open-paas.org', cutype: 'INDIVIDUAL'},
          {email: 'user2@open-paas.org', cutype: 'INDIVIDUAL'}
        ]);
        done();
      });

      $rootScope.$digest();
    });
  });
});
