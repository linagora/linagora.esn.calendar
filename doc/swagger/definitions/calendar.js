/**
  * @swagger
  * definition:
  *   calendar_calendar_event:
  *     description: some details of calendar event.
  *     type: object
  *     properties:
  *       event_id:
  *         $ref: "#/definitions/cm_id"
  *       type:
  *         type: string
  *         enum:
  *           - created
  *           - updated
  *           - removed
  *       event:
  *         type: string
  *   calendar_invite:
  *     description: Describes a calendar invite attendee
  *     type: object
  *     properties:
  *       emails:
  *         type: array
  *         items:
  *           $ref: "#/definitions/us_email"
  *       notify:
  *         type: boolean
  *       event:
  *         type: string
  *       calendarURI:
  *         type: string
  *       method:
  *         type: string
  *   calendar_calendar_search_object:
  *     description: Describes the necessary fields to specify a calendar to search in
  *     type: object
  *     properties:
  *       userId:
  *         type: string
  *       calendarId:
  *         type: string
  */
