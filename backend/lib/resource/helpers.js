module.exports = {
  getResourceEmail
};

function getResourceEmail(resource) {
  return `${resource._id}@${resource.domain.name}`;
}
