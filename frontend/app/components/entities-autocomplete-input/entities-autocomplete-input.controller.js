(function() {
  'use strict';

  angular.module('esn.calendar')
    .controller('calEntitiesAutocompleteInputController', calEntitiesAutocompleteInputController);

  function calEntitiesAutocompleteInputController(calendarAttendeeService, naturalService, session, CAL_ATTENDEE_OBJECT_TYPE, CAL_AUTOCOMPLETE_MAX_RESULTS, CAL_AUTOCOMPLETE_DEFAULT_PLACEHOLDER) {
    var self = this;

    self.mutableEntities = self.mutableEntities || [];
    self.originalEntities = self.originalEntities || [];
    self.placeHolder = self.placeHolder || CAL_AUTOCOMPLETE_DEFAULT_PLACEHOLDER;
    self.showIcon = self.showIcon || false;
    self.onAddingEntity = self.onAddingEntity || _onAddingEntity;
    self.getInvitableEntities = getInvitableEntities;

    ////////////

    function _onAddingEntity(entity) {
      if (!entity.id) {
        entity.id = entity.displayName;
        entity.email = entity.displayName;
      }

      return !_isDuplicateEntity(entity, _getAddedEntitiesEmails());
    }

    function getInvitableEntities(query) {
      self.query = query;
      var types = self.types ? self.types : [CAL_ATTENDEE_OBJECT_TYPE.user, CAL_ATTENDEE_OBJECT_TYPE.resource];

      return calendarAttendeeService.getAttendeeCandidates(query, CAL_AUTOCOMPLETE_MAX_RESULTS * 2, types).then(function(entityCandidates) {
        entityCandidates = _fillNonDuplicateEntities(entityCandidates);
        entityCandidates.sort(function(a, b) {
          return naturalService.naturalSort(a.displayName, b.displayName);
        });

        return entityCandidates.slice(0, CAL_AUTOCOMPLETE_MAX_RESULTS);
      });
    }

    function _fillNonDuplicateEntities(entities) {
      var addedEntitiesEmails = _getAddedEntitiesEmails();

      return entities.filter(function(entity) {
        return !_isDuplicateEntity(entity, addedEntitiesEmails);
      });
    }

    function _getAddedEntitiesEmails() {
      var addedEntities = self.mutableEntities.concat(self.originalEntities);
      var addedEntitiesEmails = [];

      addedEntities.forEach(function(entity) {
        if (entity.emails) {
          entity.emails.forEach(function(email) {
            addedEntitiesEmails.push(email);
          });
        } else {
          addedEntitiesEmails.push(entity.email);
        }
      });

      return addedEntitiesEmails;
    }

    function _isDuplicateEntity(entity, addedEntitiesEmails) {
      return (entity.email in session.user.emailMap) || addedEntitiesEmails.indexOf(entity.email) > -1;
    }
  }

})();
