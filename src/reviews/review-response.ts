import type { FastifyReply } from 'fastify';

export const REVIEW_CONTENT_SECURITY_POLICY =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export function sendReviewHtml(
  reply: FastifyReply,
  reviewId: string,
  filename: string,
  html: string,
): FastifyReply {
  return reply
    .header('Content-Type', 'text/html; charset=utf-8')
    .header('Content-Disposition', `inline; filename="${filename}"`)
    .header('Cache-Control', 'no-store')
    .header('Pragma', 'no-cache')
    .header('X-Content-Type-Options', 'nosniff')
    .header('Content-Security-Policy', REVIEW_CONTENT_SECURITY_POLICY)
    .header('Referrer-Policy', 'no-referrer')
    .header('X-Review-Id', reviewId)
    .send(html);
}
