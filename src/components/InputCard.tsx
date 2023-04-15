import { type ChangeEvent, useRef, useState } from "react";
import type { Message } from "@prisma/client";
import Image from "next/image";
import { api } from "~/utils/api";
import {
  Button,
  Card,
  Textarea,
  FileButton,
  Group,
  Stack,
  Loader,
} from "@mantine/core";
import { PaperPlaneIcon, ResetIcon, UploadIcon } from "@radix-ui/react-icons";

export const InputCard: React.FC = () => {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const resetRef = useRef<() => void>(null);
  const utils = api.useContext();

  const s3Mutation = api.s3.getPresignedUrl.useMutation();
  const { mutateAsync: addMutation, isLoading } = api.msg.add.useMutation({
    onMutate: async (newMessage) => {
      await utils.msg.list.cancel({});
      const previousMessages = utils.msg.list.getData({});
      const tempMessage: Message = {
        ...newMessage,
        id: Math.random().toString(),
        imageUrl: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        imageKey: null, // change undefined to null because ts complained
      };
      utils.msg.list.setData({}, (old) => {
        if (!old) return;
        const newMessages = [...old.messages, tempMessage];
        return {
          messages: newMessages,
          nextCursor: old.nextCursor,
        };
      });

      return { previousMessages };
    },

    onError: (err, newMessage, context) => {
      if (context?.previousMessages) {
        utils.msg.list.setData({}, context.previousMessages);
      }
    },

    onSuccess: async () => {
      await utils.msg.list.invalidate();
    },
  });

  const clearFile = () => {
    setFile(null);
    resetRef.current?.();
  };

  const uploadImage = async () => {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);

    const { url, Key } = await s3Mutation.mutateAsync({
      fileType: file.type,
    });

    await fetch(url, {
      method: "PUT",
      body: file,
    });

    return Key;
  };

  const uploadImageIfPresent = async () => {
    if (file) {
      return await uploadImage();
    }
    return null;
  };

  const handleSubmit = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message) return;

    const imageKey = await uploadImageIfPresent();

    await addMutation({
      text: message,
      hasImage: !!file,
      imageKey: imageKey ?? "",
    });

    setMessage("");
    setFile(null);
  };
  return (
    <form onSubmit={handleSubmit}>
      <Group position="right" mt="md" mb="xs">
        <Card className="w-full" radius="sm">
          <Stack>
            <Textarea
              className="w-full"
              size="md"
              placeholder="Enter a message"
              value={message}
              disabled={isLoading}
              onChange={(event) => setMessage(event.target.value)}
            />
            {file && (
              <Image
                src={URL.createObjectURL(file)}
                width="0"
                height="0"
                sizes="100vw"
                className="h-auto w-1/4 rounded-md"
                alt="image"
              />
            )}
          </Stack>
          <Group position="right" mt="md" mb="xs">
            {isLoading ? (
              <Loader variant="dots" color="#fff" />
            ) : (
              <>
                {file && (
                  <Button
                    className="bg-transparent"
                    size="xs"
                    color="red"
                    onClick={clearFile}
                  >
                    <ResetIcon />
                  </Button>
                )}
                <FileButton
                  resetRef={resetRef}
                  onChange={setFile}
                  accept="image/png,image/jpeg"
                >
                  {(props) => (
                    <Button
                      className="bg-transparent hover:bg-sky-600"
                      size="xs"
                      {...props}
                    >
                      <UploadIcon />
                    </Button>
                  )}
                </FileButton>
                <Button
                  className="bg-transparent hover:bg-sky-600"
                  size="xs"
                  type="submit"
                >
                  <PaperPlaneIcon />
                </Button>
              </>
            )}
          </Group>
        </Card>
      </Group>
    </form>
  );
};
