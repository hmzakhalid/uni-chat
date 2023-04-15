import { env } from "~/env.mjs";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import S3 from "aws-sdk/clients/s3";

const s3 = new S3({
  apiVersion: "2006-03-01",
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION,
  signatureVersion: "v4",
});

export const messageRouter = createTRPCRouter({
  add: publicProcedure
    .input(
      z.object({
        text: z.string(),
        hasImage: z.boolean(),
        imageKey: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const message = await ctx.prisma.message.create({
        data: {
          text: input.text,
          hasImage: input.hasImage,
          imageUrl: input.imageKey
            ? `${env.S3_IMAGE_URL}/${input.imageKey}`
            : null,
          imageKey: input.imageKey,
        },
      });
      return message;
    }),

  delete: publicProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const message = await ctx.prisma.message.findUnique({
      where: { id: input },
    });
    if (!message) {
      throw new Error("Message not found");
    }
    if (message.hasImage && message.imageKey) {
      const params = {
        Bucket: env.S3_BUCKET_NAME,
        Key: message.imageKey,
      };
      await s3
        .deleteObject(params)
        .promise()
        .then((res) => {
          console.log(res);
        })
        .catch((err) => {
          console.log(err);
        });
    }
    return await ctx.prisma.message.delete({ where: { id: input } });
  }),

  list: publicProcedure
    .input(
      z.object({
        take: z.number().optional().default(5),
        cursor: z.string().optional(),
        sortBy: z.enum(["text", "createdAt"]).optional().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
      })
    )
    .query(async ({ input, ctx }) => {
      const { take, cursor, sortBy, sortOrder } = input;

      const orderBy = { [sortBy]: sortOrder };

      const messages = await ctx.prisma.message.findMany({
        take: take + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy,
      });

      const nextCursor =
        messages.length > take ? messages.pop()?.id : undefined;

      if (messages.length > take) {
        messages.pop();
      }

      return { messages, nextCursor };
    }),
});
