import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import S3 from "aws-sdk/clients/s3";
import { TRPCError } from "@trpc/server";

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
        imageUrl: z.string().optional(),
        imageKey: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const message = await ctx.prisma.message.create({
        data: {
          text: input.text,
          hasImage: input.hasImage,
          imageUrl: input.imageUrl,
          imageKey: input.imageKey,
        },
      });
      return message;
    }),

  delete: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const message = await ctx.prisma.message.findUnique({
      where: { id: input },
    });
    if (!message) {
      throw new Error("Message not found");
    }
    if (message.hasImage && message.imageKey) {
      if (process.env.S3_BUCKET_NAME === undefined)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: message.imageKey as string,
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
    return ctx.prisma.message.delete({ where: { id: input } });
  }),

  list: publicProcedure
    .input(
      z.object({
        take: z.number().optional().default(10),
        cursor: z
          .object({
            id: z.string(),
          })
          .optional(),
        sortBy: z.enum(["text", "createdAt"]).optional().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
      })
    )
    .query(async ({ input, ctx }) => {
      const { take, cursor, sortBy, sortOrder } = input;

      const orderBy = { [sortBy]: sortOrder };

      const messages = await ctx.prisma.message.findMany({
        take,
        cursor: cursor
          ? {
              id: cursor.id,
            }
          : undefined,
        orderBy,
      });

      const nextCursor =
        messages.length > 0 ? messages[messages.length - 1] : null;

      return { messages, nextCursor };
    }),
});