export const validate = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const err = new Error(
      error.details.map(d => d.message).join(', ')
    );
    err.statusCode = 400;
    throw err;
  }

  return value;
};