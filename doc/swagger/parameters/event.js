/**
  * @swagger
  * parameter:
  *   calendar_event_when:
  *     name: when
  *     in: body
  *     description: time of a locale.
  *     required: true
  *     schema:
  *       $ref: "#/definitions/cm_date"
  *   calendar_event_summary:
  *     name: summary
  *     in: body
  *     description: summary of new event.
  *     required: true
  *     schema:
  *       type: string
  *   calendar_event_location:
  *     name: location
  *     in: body
  *     description: location of new event.
  *     required: true
  *     schema:
  *       type: string
  *   calendar_event_id:
  *     name: eventId
  *     description: Identity of an event
  *     in: path
  *     required: true
  *     type: string
  *   calendar_event_search:
  *     name: search
  *     in: body
  *     description: request body of event search
  *     schema:
  *       type: object
  *       properties:
  *         calendars:
  *           type: array
  *           items:
  *             $ref: "#/definitions/calendar_calendar_search_object"
  *         query:
  *           type: string
  *         organizers:
  *           type: array
  *           items:
  *             $ref: "#/definitions/us_email"
  *         attendees:
  *           type: array
  *           items:
  *             $ref: "#/definitions/us_email"
  *   calendar_event_sort_key:
  *     name: sortKey
  *     in: query
  *     description: a way to arrange data based by key
  *     type: string
  *     enum:
  *       - start
  *       - end
  *   calendar_event_sort_order:
  *     name: sortOrder
  *     in: query
  *     description: A way to arrange data based on value or data type.
  *     type: string
  *     enum:
  *       - asc
  *       - desc
  */
