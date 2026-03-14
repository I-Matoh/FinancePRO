function validate(schema) {
  return (req, res, next) => {
    try {
      const data = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      req.validated = data;
      return next();
    } catch (err) {
      return res.status(400).json({ error: 'validation_error', details: err.errors });
    }
  };
}

module.exports = { validate };
