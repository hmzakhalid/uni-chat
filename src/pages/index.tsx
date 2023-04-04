import { type NextPage } from "next";
import {  useState, useEffect } from "react";
import { LoadingPage } from "~/components/Loading";
import { MessageCard } from "~/components/MessageCard";
import { InputCard } from "~/components/InputCard";
import { api } from "~/utils/api";
import useScrollPosition from "~/hooks/useScrollPosition";
import {
  Container,
  Group,
  Select,
  Text,
  Loader,
  Center,
} from "@mantine/core";


const Home: NextPage = () => {
  const [sortBy, setSortBy] = useState<"createdAt" | "text">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const scrollPosition = useScrollPosition();
  const { data, hasNextPage, fetchNextPage, isFetching, isError, isLoading } =
    api.msg.list.useInfiniteQuery(
      {
        take: 5,
        sortBy,
        sortOrder,
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

  return (
    <Container size="sm" mt="sm">
      <InputCard />
      <Group position="right" mt="md" mb="xs">
        <Select
          label="Sort by"
          defaultValue={sortBy}
          onChange={(value: string) => {
            setSortBy(value as "createdAt" | "text");
          }}
          data={[
            { value: "text", label: "Message" },
            { value: "createdAt", label: "Created At" }
          ]}
        />
        <Select
          label="Order"
          defaultValue={sortOrder}
          onChange={(value: string) => {
            setSortOrder(value as "asc" | "desc");
          }}
          data={[
            { value: "asc", label: "Ascending" },
            { value: "desc", label: "Descending" }
          ]}
        />
      </Group>
      <Group position="apart" mt="md" mb="xs">
        <div className="mb-4 w-full">
          {isLoading ? (
            <LoadingPage />
          ) : isError ? (
            <Center>
              <Text color="dimmed">Error fetching messages</Text>
            </Center>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageCard key={msg.id} message={msg} />
              ))}
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
            </>
          )}
        </div>
      </Group>
    </Container>
  );
};

export default Home;
