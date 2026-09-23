import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

try {
  const result = await client.send(
    new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, MaxKeys: 1 }),
  );
  console.log(
    JSON.stringify({
      ok: true,
      bucket: process.env.R2_BUCKET_NAME,
      accessible: true,
      hasObjects: (result.KeyCount ?? 0) > 0,
    }),
  );
} catch (error) {
  console.error(error instanceof Error ? error.name : "R2_CHECK_FAILED");
  process.exit(1);
}
