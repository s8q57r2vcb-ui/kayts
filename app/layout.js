import './globals.css';

export const metadata = {
  title: 'Կայծ — խաղային վիկտորինաներ',
  description: 'Ստեղծեք վիկտորինաներ և խաղացեք միասին իրական ժամանակում',
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0e3b43' };

export default function RootLayout({ children }) {
  return (
    <html lang="hy">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Armenian:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
