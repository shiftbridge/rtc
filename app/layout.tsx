import "./globals.css";

export const metadata = {
  title: "HiChat",
  description: "Real Time Chat",
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