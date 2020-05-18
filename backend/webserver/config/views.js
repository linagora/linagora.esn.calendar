'use strict';

const express = require('express');
const FRONTEND_PATH = require('../constants').FRONTEND_PATH;
const FRONTEND_PATH_BUILD = require('../constants').FRONTEND_PATH_BUILD;
const CORE_FRONTEND_PATH = require('../constants').CORE_FRONTEND_PATH;

module.exports = (dependencies, application) => {
  application.use(express.static(FRONTEND_PATH_BUILD));
  application.set('views', [`${FRONTEND_PATH}/app`, `${FRONTEND_PATH}/event-consultation-app`]);
  application.get('/app/*', (req, res) => {
    const templateName = req.params[0].replace(/\.html$/, '');

    res.render(templateName, { basedir: CORE_FRONTEND_PATH + '/views' });
  });
};
