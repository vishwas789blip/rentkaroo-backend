import { ReviewService } from "../services/review.service.js";

/* Get reviews for a listing */
export const getListingReviews = async (req, res) => {
  const reviews = await ReviewService.getReviewsByListing(
    req.params.listingId
  );

  res.status(200).json({
    success: true,
    data: reviews,
  });
};

/* Get single review */
export const getReview = async (req, res) => {
  const review = await ReviewService.getReviewById(req.params.id);

  res.status(200).json({
    success: true,
    data: review,
  });
};

/* Get current user's reviews */
export const getUserReviews = async (req, res) => {
  const reviews = await ReviewService.getUserReviews(req.user.id);

  res.status(200).json({
    success: true,
    data: reviews,
  });
};

/* Create review */
export const createReview = async (req, res) => {
  const review = await ReviewService.createReview(
    req.body,
    req.user.id
  );

  res.status(201).json({
    success: true,
    message: "Review created successfully",
    data: review,
  });
};

/* Delete review */
export const deleteReview = async (req, res) => {
  await ReviewService.deleteReview(
    req.params.id,
    req.user.id,
    req.user.role
  );

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
};

/* Toggle helpful vote */
export const markHelpful = async (req, res) => {
  const review = await ReviewService.markHelpful(
    req.params.id,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: review.votedHelpful
      ? "Marked as helpful"
      : "Removed helpful vote",
    data: review,
  });
};