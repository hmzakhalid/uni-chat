import { type NextPage } from "next";
import { type ChangeEvent, useRef, useState } from "react";
import type { Message } from "@prisma/client";
import Head from "next/head";
import Image from "next/image";
import { LoadingPage, LoadingSpinner } from "~/components/Loading";
import { api } from "~/utils/api";

// const Feed = () => {
//   const { data, isLoading: postsLoading } = api.posts.getAll.useQuery();

//   if (postsLoading)
//     return (
//       <div className="flex grow">
//         <LoadingPage />
//       </div>
//     );

//   if (!data) return <div>Something went wrong</div>;

//   return (
//     <div className="flex grow flex-col overflow-y-scroll">
//       {[...data, ...data, ...data, ...data].map((fullPost) => (
//         <PostView {...fullPost} key={fullPost.post.id} />
//       ))}
//     </div>
//   );
// };

const Home: NextPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  // Start fetching asap
  const { data, isLoading } = api.message.list.useQuery({});

  const s3Mutation = api.s3.getPresignedUrl.useMutation();
  const addMutation = api.message.add.useMutation();

  const handleSubmit = async (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentFile) {
      const formData = new FormData();
      formData.append("file", currentFile, currentFile.name);
      const { url, Key } = await s3Mutation.mutateAsync({
        fileType: currentFile.type,
      });

      const image = await fetch(url, {
        method: "PUT",
        body: currentFile,
      });

      if (image.ok) {
        const data = await addMutation.mutateAsync({
          text: message,
          hasImage: true,
          imageUrl: image.url,
          imageKey: Key,
        });

        setMessage("");
        setMessages((prev) => [...prev, data]);
        setCurrentFile(null);
      }
    } else {
      const data = await addMutation.mutateAsync({
        text: message,
        hasImage: false,
      });
      setMessage("");
      setMessages((prev) => [...prev, data]);
    }
  };

  if (isLoading)
    return (
      <div className="flex grow">
        <LoadingPage />
      </div>
    );

  return (
    <>
      <Head>
        <title>Uni Chat | A Simple Type-Safe Messaging App</title>
        <meta
          name="description"
          content="Uni Chat | A Simple Type-Safe Messaging App"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="h-screen bg-[#121826]">
        <div className="container mx-auto p-16">
          <div className="">
            <div className="flex h-full flex-col">
              <div className="flex-grow overflow-y-scroll">
                <div className="flex flex-col space-y-4">
                  {isLoading && <div>Loading...</div>}
                  {data?.messages.map((message: Message) => (
                    <div
                      key={message.id}
                      className="flex items-start space-x-4"
                    >
                      <p className="text-white">{message.text}</p>
                      {message.hasImage && (
                        <Image
                          src={message.imageUrl!}
                          alt="message"
                          className="h-32 w-32"
                          width={200}
                          height={200}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <label htmlFor="chat" className="sr-only">
              Your message
            </label>
            <div className="flex items-center rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700">
              <textarea
                id="chat"
                onChange={(e) => setMessage(e.target.value)}
                rows={1}
                className="mx-4 block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                placeholder="Your message..."
              ></textarea>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCurrentFile(file);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="inline-flex cursor-pointer justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white"
              >
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="sr-only">Upload image</span>
              </button>
              <button
                type="submit"
                className="inline-flex cursor-pointer justify-center rounded-full p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-500 dark:hover:bg-gray-600"
              >
                <svg
                  aria-hidden="true"
                  className="h-6 w-6 rotate-90"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                </svg>
                <span className="sr-only">Send message</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
};

export default Home;
