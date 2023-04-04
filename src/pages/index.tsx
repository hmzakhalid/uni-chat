import { type NextPage } from "next";
import { type ChangeEvent, useRef, useState, useEffect } from "react";
import type { Message } from "@prisma/client";
import Image from "next/image";
import { LoadingPage } from "~/components/Loading";
import { api } from "~/utils/api";
import {
  Container,
  Button,
  Card,
  Textarea,
  FileButton,
  Group,
  Text,
  Stack,
  Loader,
  Center,
} from "@mantine/core";
import {
  PaperPlaneIcon,
  ResetIcon,
  TrashIcon,
  UploadIcon,
} from "@radix-ui/react-icons";

const MessageCard: React.FC<{ message: Message }> = ({ message }) => {
  const [loading, setLoading] = useState(false);
  const utils = api.useContext();
  const deleteMutation = api.msg.delete.useMutation({
    onSuccess: async () => {
      await utils.msg.list.invalidate();
    },
  });

  const handleDelete = async () => {
    setLoading(true);
    await deleteMutation.mutateAsync(message.id);
    setLoading(false);
  };

  return (
    <>
      <Card shadow="sm" padding="md" radius="md" my="md" withBorder>
        {loading ? (
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

function useScrollPosition() {
  const [scrollPosition, setScrollPosition] = useState(0);

  const handleScroll = () => {
    const height =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const winScroll =
      document.body.scrollTop || document.documentElement.scrollTop;

    const scrolled = (winScroll / height) * 100;
    setScrollPosition(scrolled);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return scrollPosition;
}

const Home: NextPage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const resetRef = useRef<() => void>(null);
  const scrollPosition = useScrollPosition();

  // tRPC stuff
  const utils = api.useContext();
  const { data, hasNextPage, fetchNextPage, isFetching, isError, isLoading } =
    api.msg.list.useInfiniteQuery(
      {
        take: 5,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const messages = data?.pages.flatMap((page) => page.messages) ?? [];

  useEffect(() => {
    const handleScroll = async () => {
      if (scrollPosition > 90 && hasNextPage && !isFetching) {
        await fetchNextPage();
      }
    };
    handleScroll().catch(console.error);
  }, [scrollPosition, hasNextPage, isFetching, fetchNextPage]);

  const s3Mutation = api.s3.getPresignedUrl.useMutation();
  const addMutation = api.msg.add.useMutation({
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

  const handleSubmit = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message) return;
    setLoading(true);

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
    setLoading(false);
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
          <Card className="w-full" radius="sm">
            <Stack>
              <Textarea
                className="w-full"
                size="md"
                placeholder="Enter a message"
                value={message}
                disabled={loading}
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
              {loading ? (
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

      <Group position="apart" mt="md" mb="xs">
        <div className="mb-4 w-full">
          {isLoading ? (
            <LoadingPage />
          ) : isError ? (
            <Text>Error fetching messages</Text>
          ) : (
            messages.map((msg) => <MessageCard key={msg.id} message={msg} />)
          )}
        </div>

        {!hasNextPage && (
          <div className="mb-4 w-full text-center">
            <Text color="dimmed" size="sm">
              That&apos;s all folks!
            </Text>
          </div>
        )}

        {isFetching && (
          <div className="w-full text-center">
            <Loader variant="dots" color="#fff" />
          </div>
        )}
      </Group>
    </Container>
  );
};

export default Home;
