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
  *   calendar_event_summany:
  *     name: summany
  *     in: body
  *     description: summany of new event.
  *     required: true
  *     schema:
  *       $ref: "#/definitions/cm_id"
  *   calendar_event_location:
  *     name: location
  *     in: body
  *     description: location of new event.
  *     required: true
  *     schema:
  *       $ref: "#/definitions/cm_id"
  *   calendar_event_id:
  *     name: eventId
  *     description: Identity of an event
  *     in: path
  *     required: true
  *     type: string
  */
