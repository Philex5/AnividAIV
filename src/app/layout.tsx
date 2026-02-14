import "@/app/globals.css";

import { getLocale, setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { getFaviconUrl } from "@/lib/asset-loader";
import { Agentation } from "agentation";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  setRequestLocale(locale);

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "/";
  const googleAdsenseCode = process.env.NEXT_PUBLIC_GOOGLE_ADCODE || "";

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-T8S2RB6B');`,
          }}
        />
        {/* End Google Tag Manager */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {googleAdsenseCode && (
          <meta name="google-adsense-account" content={googleAdsenseCode} />
        )}

        <link rel="icon" href={getFaviconUrl()} />

        {/* Google Fonts preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Hero assets preconnect for performance */}
        <link rel="preconnect" href="https://artworks.anividai.com" />
        <link
          rel="preload"
          href="https://artworks.anividai.com/assets/hero-poster.webp"
          as="image"
          fetchPriority="high"
        />
        <link
          rel="preload"
          href="https://artworks.anividai.com/assets/hero_video_smaller.mp4"
          as="video"
          type="video/mp4"
        />

        {/* Inter and Inter Display fonts for AnividAI typography system */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Inter+Display:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {locales &&
          locales.map((loc) => (
            <link
              key={loc}
              rel="alternate"
              hrefLang={loc}
              href={`${webUrl}${loc === "en" ? "" : `/${loc}`}/`}
            />
          ))}
        {webUrl && <link rel="alternate" hrefLang="x-default" href={webUrl} />}
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-T8S2RB6B"
height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
          }}
        />
        {/* End Google Tag Manager (noscript) */}
        {children}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
