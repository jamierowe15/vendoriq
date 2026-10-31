// Checks req.body against a zod schema. Bad data → 400, and the route never runs.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors
    });
  }
  req.body = result.data; // only validated fields continue
  next();
};

// Makes sure :id in the URL is a positive whole number.
export const parseId = (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  req.id = id;
  next();
};


