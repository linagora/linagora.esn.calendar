# linagora.esn.calendar

[![build status](https://ci.linagora.com/linagora/lgs/openpaas/linagora.esn.calendar/badges/master/build.svg)](https://ci.linagora.com/linagora/lgs/openpaas/linagora.esn.calendar/commits/master)

[![Build Status](https://travis-ci.org/linagora/linagora.esn.calendar.svg?branch=master)](https://travis-ci.org/linagora/linagora.esn.calendar)

This repository contains source code of Calendar module for OpenPaaS ESN.

## Install

The current module is activated by default in the OpenPaaS ESN repository. Doing a `npm install` from there will install and enable the calendar module in OpenPaaS.

## Develop

**1. Clone linagora.esn.calendar**

```
git clone git+https://ci.linagora.com/linagora/lgs/openpaas/linagora.esn.calendar.git
cd linagora.esn.calendar
```

**2. Install dependencies and link in OpenPaaS**

*Note: The following instructions assumes that you have already installed OpenPaaS ESN in the path referenced by $ESN below.*

In order to develop, you will have to launch several commands from your favorite terminal:

1. In the current repository, install dependencies with `npm install`
2. In the current repository, create a npm link by using `npm link`
3. In your OpenPaaS ESN repository, link the calendar module

```
cd $ESN
npm link linagora.esn.calendar
```

## Troubleshoot

**I can only search events from my default calendar "Events", the events from other calendars are not reachable!**

This may be due the fact that Elasticsearch is not will indexed. To verify please do the following in your terminal (or maybe in [Sense](https://www.elastic.co/guide/en/sense/current/installing.html))

    GET /events.idx/_mapping

and search for the `calendarId` in the `events` mapping type. You may have the following output:

    "calendarId": { "type": "string" }

In such case, the `calendarId` is `analyzed string`. For more information, have a look [here](https://www.elastic.co/guide/en/elasticsearch/guide/current/mapping-intro.html#_index_2). Normally, this attribute should be `not_analyzed`. To solve it, you should reindex Elasticsearch as explained in the [Elasticsearch Index](https://ci.linagora.com/linagora/lgs/openpaas/esn#elasticsearch-index) section in the [OpenPaaS documentation](https://ci.linagora.com/linagora/lgs/openpaas/esn).

Once the elasticsearch is reindexed, the `calendarId` in the `events` mapping type should have the following output:
    
    "calendarId": { "type": "string", "index": "not_analyzed" }