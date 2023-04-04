import { type AppType } from "next/app";
// import { MantineProvider } from "@mantine/core";
import { api } from "~/utils/api";

import "~/styles/globals.css";

import Head from 'next/head';
import { MantineProvider } from '@mantine/core';

const MyApp: AppType = ({ Component, pageProps }) => {

  return (
    <>
      <Head>
        <title>Uni Chat | A Simple Type-Safe Messaging App</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
        <meta
          name="description"
          content="Uni Chat | A Simple Type-Safe Messaging App"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{
          /** Put your mantine theme override here */
          colorScheme: 'dark',
        }}
      >
        <Component {...pageProps} />
      </MantineProvider>
    </>
  );
}

export default api.withTRPC(MyApp);
