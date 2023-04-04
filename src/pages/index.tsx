import { type NextPage } from "next";
import { type ChangeEvent, useRef, useState } from "react";
import type { Message } from "@prisma/client";
import Image from "next/image";
import { LoadingPage } from "~/components/Loading";
import { api } from "~/utils/api";
import {
  Container,
  TextInput,
  Button,
  Modal,
  Card,
  Textarea,
  FileButton,
  Group,
  Text,
  Paper,
  Stack,
} from "@mantine/core";
import { ChatBubbleIcon, ImageIcon, TrashIcon } from "@radix-ui/react-icons";

const MessageCard: React.FC<{ message: Message }> = ({ message }) => {
  return (
    <>
      <Card shadow="sm" padding="md" radius="md" my="md" withBorder>
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
          <TrashIcon color="red" />
        </Group>
      </Card>
    </>
  );
};

const Home: NextPage = () => {
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const resetRef = useRef<() => void>(null);

  const clearFile = () => {
    setFile(null);
    resetRef.current?.();
  };

  const { data, isLoading, isError } = api.message.list.useQuery({});
  const s3Mutation = api.s3.getPresignedUrl.useMutation();
  const addMutation = api.message.add.useMutation();

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

  const handleSubmit = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message) return;
    let imageKey = null;
    if (file) {
      imageKey = await uploadImage();
    }
    await addMutation.mutateAsync({
      text: message,
      hasImage: !!file,
      imageKey: imageKey ?? "",
    });

    setMessage("");
    setFile(null);
    showModal && setShowModal(false);
  };

  if (isLoading)
    return (
      <div className="flex grow">
        <LoadingPage />
      </div>
    );

  if (!data) return <div>Something went wrong</div>;

  return (
    <Container size="sm" mt="sm">
      <form onSubmit={handleSubmit}>
        <Group position="right" mt="md" mb="xs">
          <Textarea
            className="w-full"
            size="md"
            placeholder="Enter a message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <Button
            variant="outline"
            color="blue"
            onClick={() => setShowModal(true)}
          >
            <ImageIcon className="mr-2" />
            Upload Image
          </Button>
          <Button
            variant="outline"
            color="blue"
            disabled={!message && !file}
            type="submit"
          >
            <ChatBubbleIcon className="mr-2" />
            Send Message
          </Button>
        </Group>
      </form>
      <Group position="apart" mt="md" mb="xs">
        <div className="w-full mb-4">
          {isLoading ? (
            <LoadingPage />
          ) : isError ? (
            <Text>Error fetching messages</Text>
          ) : (
            data.messages.map((msg) => (
              <MessageCard key={msg.id} message={msg} />
            ))
          )}
        </div>
      </Group>

      <Modal
        opened={showModal}
        onClose={() => setShowModal(false)}
        title="Upload Image"
        size="xl"
        centered
      >
        <Paper mb="sm" style={{ textAlign: "center" }}>
          {file ? (
            <div>
              <Image
                src={URL.createObjectURL(file)}
                alt="preview"
                width="0"
                height="0"
                sizes="100vw"
                className="my-4 h-auto w-full rounded"
              />
            </div>
          ) : (
            <Text my="xs">No image selected</Text>
          )}
          <Group position="center">
            <FileButton
              resetRef={resetRef}
              onChange={setFile}
              accept="image/png,image/jpeg"
            >
              {(props) => <Button {...props}>Select image</Button>}
            </FileButton>
            <Button disabled={!file} color="red" onClick={clearFile}>
              Reset
            </Button>
          </Group>
          <Group position="center">
            <form onSubmit={handleSubmit} className="w-full">
              <Group position="right" mt="md" mb="xs">
                <TextInput
                  size="sm"
                  className="w-3/4"
                  placeholder="Enter a message"
                  maxLength={255}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  icon={<ChatBubbleIcon />}
                />
                <Button
                  variant="outline"
                  color="blue"
                  disabled={!file && !message}
                  type="submit"
                >
                  Send Message
                </Button>
              </Group>
            </form>
          </Group>
        </Paper>
      </Modal>
    </Container>
  );
};

export default Home;
