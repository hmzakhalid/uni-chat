import { z } from "zod";
import S3 from "aws-sdk/clients/s3";
import { randomUUID } from "crypto";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const s3 = new S3({
  apiVersion: "2006-03-01",
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION,
  signatureVersion: "v4",
});

export const s3Router = createTRPCRouter({
  getPresignedUrl: publicProcedure
    .input(
      z.object({
        fileType: z.string().default("image/png"),
      })
    )
    .mutation(async ({ input }) => {
      const { fileType } = input;
      const Key = `${randomUUID()}-${fileType}`;
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: Key,
        Expires: 60 * 2, // URL expires in 2 minutes
        ContentType: fileType,
      };
      const url = await s3.getSignedUrlPromise("putObject", params);
      return { url, Key };
    }),
});

