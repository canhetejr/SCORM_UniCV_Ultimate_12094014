import { Metadata } from "next";

export const metadata: Metadata = { title: "Player — UniCV" };

export default function PlayerPage() {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Player UniCV</title>
        <script src="/player/config-loader.js" />
        <link rel="stylesheet" href="/player/style.css" />
      </head>
      <body>
        <div id="root" />
        <script src="/player/scorm.js" />
        <script src="/player/player.js" />
      </body>
    </html>
  );
}
