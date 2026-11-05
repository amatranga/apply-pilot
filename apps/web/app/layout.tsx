import type { ReactNode } from "react";
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en"><body style={{ fontFamily: "system-ui", margin: "2rem", maxWidth: 1000 }}>{children}</body></html>; }
