module.exports = {
  getResourceEmail
};

function getResourceEmail(resource) {
  // FIXME
  return `${resource._id}@${resource.domain.name}`;
}
