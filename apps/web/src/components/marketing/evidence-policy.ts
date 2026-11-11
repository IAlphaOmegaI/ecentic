/** Approval is enforced before constructing props that cross the RSC boundary. */
export const canPublishEvidence = (status: string, review = false) =>
  status === "approved" || review;

export const selectPublishedEvidence = <Row extends { approval: string }>(
  rows: readonly Row[],
  review = false,
) => rows.filter((row) => canPublishEvidence(row.approval, review));
