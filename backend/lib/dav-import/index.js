'use strict';

module.exports = function(dependencies) {
  const logger = dependencies('logger');
  const icsHandler = require('./ics-handler')(dependencies);
  const davImport = dependencies('dav.import');

  return {
    init
  };

  function init() {
    if (davImport) {
      davImport.lib.importer.addFileHandler(icsHandler.contentType, icsHandler);
    } else {
      logger.warn('linagora.esn.dav.import module is not enabled, importing calendar from .ics files will not work');
    }
  }
};
