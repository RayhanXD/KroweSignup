export type FeedbackDetails = {
  whatHappened: string;
  wouldRecommend: "yes" | "not_yet" | null;
};

export type RetoolFeedbackPayload = {
  event: "feedback.created";
  feedback_id: string;
  created_at: string;
  category: string;
  rating: number;
  message: string;
  submitter: {
    user_id: string;
    name: string | null;
    email: string | null;
  };
  context: {
    page_path: string;
    project_id: string | null;
    app_env: string;
  };
  details: FeedbackDetails;
};

type BuildRetoolFeedbackPayloadInput = {
  feedbackId: string;
  createdAt: string;
  category: string;
  rating: number;
  message: string;
  submitterUserId: string;
  submitterName: string | null;
  submitterEmail: string | null;
  pagePath: string;
  projectId: string | null;
  appEnv: string;
  details: FeedbackDetails;
};

export function buildRetoolFeedbackPayload(
  input: BuildRetoolFeedbackPayloadInput
): RetoolFeedbackPayload {
  return {
    event: "feedback.created",
    feedback_id: input.feedbackId,
    created_at: input.createdAt,
    category: input.category,
    rating: input.rating,
    message: input.message,
    submitter: {
      user_id: input.submitterUserId,
      name: input.submitterName,
      email: input.submitterEmail,
    },
    context: {
      page_path: input.pagePath,
      project_id: input.projectId,
      app_env: input.appEnv,
    },
    details: input.details,
  };
}
