import { z } from 'zod';

// Checks the request body against a zod schema. Only validated fields continue.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: z.flattenError(result.error).fieldErrors
    });
  }
  req.body = result.data;
  next();
};

// Turns :id into a positive integer, or returns 400.
export const parseId = (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' });
  req.id = id;
  next();
};
