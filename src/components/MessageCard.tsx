import { useState } from "react";
import type { Message } from "@prisma/client";
import Image from "next/image";
import { api } from "~/utils/api";
import {
  Button,
  Card,
  Group,
  Text,
  Stack,
  Loader,
  Center,
} from "@mantine/core";
import { TrashIcon } from "@radix-ui/react-icons";

export const MessageCard: React.FC<{ message: Message }> = ({ message }) => {
  const utils = api.useContext();
  const { mutateAsync: deleteMutation, isLoading } = api.msg.delete.useMutation(
    {
      onMutate: async (id) => {
        await utils.msg.list.cancel({});
        utils.msg.list.setData({}, (old) => {
          if (!old) return;
          const newMessages = old.messages.filter((m) => m.id !== id);
          return {
            messages: newMessages,
            nextCursor: old.nextCursor,
          };
        });
      },
      onSuccess: async () => {
        await utils.msg.list.invalidate();
      },
    }
  );

  const handleDelete = async () => {
    await deleteMutation(message.id);
  };

  return (
    <>
      <Card shadow="sm" padding="md" radius="md" my="md" withBorder>
        {isLoading ? (
          <Center m="lg">
            <Loader variant="dots" color="#fff" />
          </Center>
        ) : (
          <>
            <Stack mt="md" mb="xs">
              <Text size="md" ml="sm">
                {message.text}
              </Text>
              {message.hasImage && message.imageUrl && (
                <Image
                  src={message.imageUrl}
                  width="0"
                  height="0"
                  sizes="100vw"
                  className="h-auto w-2/4 rounded-md"
                  alt="image"
                />
              )}
            </Stack>
            <Group position="apart" mt="md" mb="xs">
              <Text ml="sm" size="xs" color="dimmed">
                {new Date(message.createdAt).toLocaleString()}
              </Text>
              <Button
                className="bg-transparent text-red-600 hover:bg-red-600 hover:text-white"
                size="md"
                onClick={handleDelete}
              >
                <TrashIcon />
              </Button>
            </Group>
          </>
        )}
      </Card>
    </>
  );
};
