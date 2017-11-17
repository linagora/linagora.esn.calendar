# linagora.esn.calendar

[![build status](https://ci.linagora.com/linagora/lgs/openpaas/linagora.esn.calendar/badges/master/build.svg)](https://ci.linagora.com/linagora/lgs/openpaas/linagora.esn.calendar/commits/master)

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

**3. Run tests**

In order to run tests, you have to create a symbolic link for the `linagora.esn.resource` module:

```
ln -s $PWD/node_modules/linagora.esn.resource node_modules/linagora-rse/node_modules/
```

Make sure you have [gitlab-ci-multi-runner](https://gitlab.com/gitlab-org/gitlab-ci-multi-runner) installed locally, following the [installation instructions](https://docs.gitlab.com/runner/install/).
Make sure you have **Docker** installed.

Run tests:

```
$ gitlab-ci-multi-runner exec docker test
```

This will pull all required images, and run the whole tests suite in a Docker container.
If you only want to run linters and unit-frontend tests, you can run them on your machine directly using:

```
$ grunt linters test-unit-frontend
```


## Troubleshoot

**I can only search events from my default calendar "Events", the events from other calendars are not reachable!**

This may be due the fact that Elasticsearch is not will indexed. To verify please do the following in your terminal (or maybe in [Sense](https://www.elastic.co/guide/en/sense/current/installing.html))

    GET /events.idx/_mapping

and search for the `calendarId` in the `events` mapping type. You may have the following output:

    "calendarId": { "type": "string" }

In such case, the `calendarId` is `analyzed string`. For more information, have a look [here](https://www.elastic.co/guide/en/elasticsearch/guide/current/mapping-intro.html#_index_2). Normally, this attribute should be `not_analyzed`. To solve it, you should reindex Elasticsearch.
To do so you may delete the `events.idx` and start again from scratch as explained in the [Elasticsearch Index](https://ci.linagora.com/linagora/lgs/openpaas/esn#elasticsearch-index) section in the [OpenPaaS documentation](https://ci.linagora.com/linagora/lgs/openpaas/esn). Or you can simply update the `events.idx` as explained in the next section

Once the elasticsearch is reindexed, the `calendarId` in the `events` mapping type should have the following output:

    "calendarId": { "type": "string", "index": "not_analyzed" }

**I want to reindex `events.idx` with out restarting from scratch**

this can be easily done using [Scripting](https://www.elastic.co/guide/en/elasticsearch/reference/2.3/modules-scripting.html) provided by elasticsearch.

* Before starting you should enable scripting in your elasticsearch.yml

        locate elasticsearch.yml // to locate the elasticsearch configuration file
        script.inline: true // this line is to be added to the elasticsearch.yml

* Once done, you should restart elasticsearch

        service elasticsearch restart

* Copy the content of `events.idx` into a temporary index (`events-tmp.idx` for example). For here I will use [Sense](https://www.elastic.co/guide/en/sense/current/installing.html). For sure you can the same using curl ;-). In the following command, we will try to update the `_id` field so it has the following format: `userId--calendarId`

        POST /_reindex
        {
            "source": { "index": "events.idx" },
            "dest": { "index": "events-tmp.idx" },
            "script": {
                "inline": "ctx._id= ctx._source['userId'] + '--' + ctx._source['calendarId']"
            }
        }

* Please verify that `events-tmp.idx` is created before going to the next step. Both commands must give the same output

        GET /events-tmp.idx/_search
        GET /events.idx/_search

* Now we have a backup of our `events.idx`, we can delete it:

        DELETE /events.idx

* Let us create a new `events.idx` with the good configuration. Either you do it using [esn-elasticsearch-configuration](https://www.npmjs.com/package/esn-elasticsearch-configuration), or do it manually. It is worth noting that the configuration we are going to use is the same used by esn-elasticsearch-configuration as can be seen [here](https://github.com/linagora/esn-elasticsearch-configuration/blob/master/data/events.json)

        POST /events.idx
        {
            "settings": {
                "analysis": {
                    "filter": {
                        "nGram_filter": {
                        "type": "nGram",
                        "min_gram": 1,
                        "max_gram": 36,
                        "token_chars": [
                            "letter",
                            "digit",
                            "punctuation",
                            "symbol"
                            ]
                        },
                        "truncate_filter": {
                        "type": "truncate",
                        "length": 36
                        }
                    },
                    "analyzer": {
                        "nGram_analyzer": {
                        "type": "custom",
                        "tokenizer": "whitespace",
                        "filter": [
                            "truncate_filter",
                            "lowercase",
                            "asciifolding",
                            "nGram_filter"
                            ]
                        },
                        "whitespace_analyzer": {
                        "type": "custom",
                        "tokenizer": "whitespace",
                        "filter": [
                            "truncate_filter",
                            "lowercase",
                            "asciifolding"
                            ]
                        }
                    }
                }
            },
            "mappings": {
                "events": {
                    "_all": {
                        "analyzer": "nGram_analyzer",
                        "search_analyzer": "whitespace_analyzer"
                    },
                    "properties": {
                        "uid": {
                        "type": "string",
                        "index" : "not_analyzed"
                        },
                        "calendarId": {
                        "type": "string",
                        "index" : "not_analyzed"
                        },
                        "userId": {
                        "type": "string",
                        "index" : "not_analyzed"
                        },
                        "sequence": {
                        "type": "string",
                        "analyzer": "nGram_analyzer",
                        "search_analyzer": "whitespace_analyzer"
                        },
                        "summary" : {
                        "type": "string",
                        "analyzer": "nGram_analyzer",
                        "search_analyzer": "whitespace_analyzer"
                        },
                        "description" : {
                        "type": "string",
                        "analyzer": "nGram_analyzer",
                        "search_analyzer": "whitespace_analyzer"
                        },
                        "allDay": {
                        "type": "boolean"
                        },
                        "durationInDays": {
                        "type": "short"
                        },
                        "start" : {
                        "type": "date"
                        },
                        "end" : {
                        "type": "date"
                        },
                        "dtstamp": {
                        "type": "date"
                        },
                        "organizer" : {
                            "properties": {
                                "email": { "type": "string", "index": "not_analyzed" },
                                "cn": {
                                "type": "string",
                                "analyzer": "nGram_analyzer",
                                "search_analyzer": "whitespace_analyzer"
                                }
                            }
                        },
                        "attendees" : {
                            "properties": {
                                "email": {
                                "type": "string",
                                "analyzer": "nGram_analyzer",
                                "search_analyzer": "whitespace_analyzer"
                                },
                                "cn": {
                                "type": "string",
                                "analyzer": "nGram_analyzer",
                                "search_analyzer": "whitespace_analyzer"
                                }
                            }
                        }
                    }
                }
            }
        }

* Now we have the `events.idx` created, you can verify this doing the following command. This should display the `events.idx` with the configuration we have passed in the previous step

        GET /events.idx/_mapping

* Now we need to copy back the data from our backup `events-tmp.idx`

        POST /_reindex
        {
            "source": { "index": "events-tmp.idx" },
            "dest": { "index": "events.idx" }
        }

* That it. Now you can verify that you have all the events indexed back in `events.idx`

        GET /events.idx/_search

* This step is optional. You can keep the `events-tmp.idx` as a backup if you want, or simply delete it if you are sure that you do not need it any more:

        DELETE /events-tmp.idx