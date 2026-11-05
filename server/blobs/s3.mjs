// The file store interface (see disk.mjs) on an S3 bucket. Files are objects "<prefix><id>".
//
// Uploads and large downloads do not pass through the API: the browser is given a pre-signed URL and talks to S3
// directly. An upload URL is good for 5 minutes and only for exactly the content type and size the API agreed to
// (both are signed, so S3 refuses anything else). A download URL is good for 15 minutes.
// Small images are read through the API instead (see core/api.mjs › blob) so they stay on the page's own origin.
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * @param options.bucket  the bucket name
 * @param options.prefix  key prefix, default "assets/"
 * @param options.client  an S3Client (optional; one is made from options.clientConfig otherwise)
 */
export function createS3Blobs({ bucket, prefix = "assets/", client, clientConfig }) {
  if (!bucket) throw new Error("createS3Blobs: bucket is required");
  // WHEN_REQUIRED: otherwise the SDK signs a checksum of an empty body into upload URLs and S3 rejects the real one
  const s3 = client || new S3Client({ requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED", ...clientConfig });
  const at = (id) => ({ Bucket: bucket, Key: prefix + id });
  const missing = (e) => {
    if (e.name === "NotFound" || e.name === "NoSuchKey" || (e.$metadata && e.$metadata.httpStatusCode === 404)) return null;
    throw e;
  };
  return {
    async uploadTarget(id, { contentType, size }) {
      const url = await getSignedUrl(s3, new PutObjectCommand({ ...at(id), ContentType: contentType, ContentLength: size }),
        { expiresIn: 300, signableHeaders: new Set(["content-type", "content-length"]) });
      return { url, method: "PUT", headers: { "content-type": contentType } };
    },
    async put(id, bytes, contentType) {
      await s3.send(new PutObjectCommand({ ...at(id), Body: bytes, ContentType: contentType }));
    },
    async stat(id) {
      const r = await s3.send(new HeadObjectCommand(at(id))).catch(missing);
      return r ? { size: r.ContentLength } : null;
    },
    async read(id) {
      const r = await s3.send(new GetObjectCommand(at(id))).catch(missing);
      return r ? Buffer.from(await r.Body.transformToByteArray()) : null;
    },
    async url(id, { contentType } = {}) {
      return getSignedUrl(s3, new GetObjectCommand({ ...at(id), ResponseContentType: contentType, ResponseCacheControl: "private, max-age=600" }), { expiresIn: 900 });
    },
    async delete(id) { await s3.send(new DeleteObjectCommand(at(id))); },
  };
}
