module.exports = {
  filterEventAttachments
};

function filterEventAttachments(event) {
  return function filter(filename) {
    switch (filename) {
      case 'map-marker.png':
        return !!event.location;
      case 'format-align-justify.png':
        return !!event.description;
      case 'folder-download.png':
        return !!event.files;
      case 'to.png':
        return !(event.allDay && event.durationInDays === 1);
      case 'comment-text.png':
        return !!event.comment;
      case 'resource.png':
        return event.hasResources;
      case 'videoconference.png':
        return !!event.videoconferenceLink;
      default:
        return true;
    }
  };
}
