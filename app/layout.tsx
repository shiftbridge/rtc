import "./globals.css";

export const metadata = {
  title: "Bun & Next.js 16 Chat App",
  description: "Real-time chat using native WebSockets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: "#f5f5f7" }}>
        {children}
      </body>
    </html>
  );
}