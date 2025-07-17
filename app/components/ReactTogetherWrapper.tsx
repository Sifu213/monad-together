"use client";

import { ReactTogether, useConnectedUsers } from "react-together";

interface ReactTogetherWrapperProps {
  children: React.ReactNode;
}

export default function ReactTogetherWrapper({
  children,
}: ReactTogetherWrapperProps) {
  const sessionParams = {
    appId:
      process.env.NEXT_PUBLIC_DEFAULT_APP_ID ||
      "io.multisynq.next-react-together",
    apiKey: process.env.NEXT_PUBLIC_MULTISYNQ_API_KEY || "YOUR_API_KEY_HERE",
    name: process.env.NEXT_PUBLIC_DEFAULT_SESSION_NAME || "default-session",
    password: process.env.NEXT_PUBLIC_DEFAULT_SESSION_PASSWORD || "demo123",
  };

  return (
    <ReactTogether sessionParams={sessionParams} rememberUsers={true}>
      <div className="min-h-screen bg-background">
        

        <main className="relative z-10">{children}</main>
      </div>
    </ReactTogether>
  );
}


