"use client";

import { ReactTogether, useConnectedUsers } from "react-together";
import WalletProvider from "./WalletProvider";

interface ReactTogetherWrapperProps {
  children: React.ReactNode;
}

export default function ReactTogetherWrapper({
  children,
}: ReactTogetherWrapperProps) {
  const sessionParams = {
    appId:
      process.env.NEXT_PUBLIC_DEFAULT_APP_ID ||
      "io.multisynq.monad-togetherlocal",
    apiKey: process.env.NEXT_PUBLIC_MULTISYNQ_API_KEY || "20Ovt2JGkI7CdZQZnZDBLr9sq7x7KwWxEOYuBSrK1C",
    name: process.env.NEXT_PUBLIC_DEFAULT_SESSION_NAME || "",
    password: process.env.NEXT_PUBLIC_DEFAULT_SESSION_PASSWORD || "",
  };

  return (
    <WalletProvider>
      <ReactTogether sessionParams={sessionParams} rememberUsers={true}>
        <div className="min-h-screen bg-background">
          <main className="relative z-10">{children}</main>
        </div>
      </ReactTogether>
    </WalletProvider>
  );
}


