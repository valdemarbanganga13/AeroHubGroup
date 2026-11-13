// Links públicos do AeroHub (não são segredos, por isso ficam aqui).
// Site do Radar: no PC aponta para o servidor local (VITE_RADAR_SITE_URL no .env)
const RADAR_SITE = (import.meta.env.VITE_RADAR_SITE_URL as string | undefined) || "https://aerohubradar.com";

export const LINKS = {
  termsOfService: "https://connector.aerohubradar.com/policy",
  privacyPolicy: "https://connector.aerohubradar.com/privacy",
  // Página Produtos: as outras partes do AeroHub
  aerohubRadar: "https://aerohubradar.com",
  aerohubPhotos: "https://photos.aerohubradar.com",
  connectorWebsite: "https://connector.aerohubradar.com",
  // Comprar a licença (secção Licence do site)
  buyLicense: "https://connector.aerohubradar.com/#licence",
  aerohubForms: "https://forms.aerohubradar.com",
  aerohubSupport: "https://support.aerohubradar.com",
  // Perfil: gerir a conta e ligar o Infinite Flight (no site da AeroHub Radar)
  manageAccount: `${RADAR_SITE}/account`,
  linkInfiniteFlight: `${RADAR_SITE}/connect-infinite-flight`,
  // Feeder → "Como ligar": guia passo a passo no site de suporte
  feederGuide: "https://support.aerohubradar.com/article/how-do-i-connect-the-feeder-to-my-infinite-flight-account",
  // Armazenamento → "Saber mais": como os voos são gravados e apagados (site de suporte)
  storageGuide: "https://support.aerohubradar.com/article/how-does-the-feeder-record-my-flights",
  // Logos das companhias para o Discord: o Discord só consegue mostrar imagens que estão na internet.
  // Ficam publicados no site do Connector (pasta "AeroHub Connector Site" no ambiente de trabalho).
  // Pasta dos logos (com "/" no fim), onde cada logo é <ICAO>.png, e o ícone para quando não há logo.
  airlineLogosBaseUrl: "https://connector.aerohubradar.com/airline-logos/",
  airlineNoLogoUrl: "https://connector.aerohubradar.com/images/airline-no-logo.png",
  // Redes sociais do AeroHub (rodapé do Início). Vazio = o ícone aparece mas não abre nada
  social: {
    x: "https://x.com/aerohub_group",
    youtube: "https://www.youtube.com/@aerohubradar",
    instagram: "https://www.instagram.com/aerohubradar",
    discord: "https://discord.gg/BdUKbNSxz",
    github: "https://github.com/valdemarbanganga13/AeroHubGroup",
    // Site oficial do Infinite Flight (trocar se quiserem outro endereço)
    infiniteFlight: "https://infiniteflight.com",
  },
};
