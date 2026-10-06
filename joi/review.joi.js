import Joi from "joi";

const createReviewSchema = Joi.object({
  listingId: Joi.string().required(),
  rating:    Joi.number().min(1).max(5).required(),
  comment:   Joi.string().min(5).max(1000).required(),
});

export {
  createReviewSchema,
};