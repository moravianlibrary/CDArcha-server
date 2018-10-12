/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
  res.redirect(301, '/cdarcha/login')
};
