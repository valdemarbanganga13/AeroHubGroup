import type { ReactNode } from "react";
import ExternalLink from "../components/ExternalLink";
import { LINKS } from "../config/links";
import type { Language } from "./languages";

// Todos os textos do app, em cada língua.
// Os resumos dos termos são PROVISÓRIOS — rever com os termos oficiais da AeroHub Group.

type Option = { title: string; description: string };

export type Translations = {
  buttons: { next: string; back: string; install: string; finish: string };
  window: { minimize: string; close: string };
  welcome: { title: string; description: ReactNode; by: string };
  terms: {
    title: string;
    subtitle: string;
    points: { title: string; body: string }[];
    notice: ReactNode;
    accept: ReactNode;
  };
  options: {
    title: string;
    subtitle: string;
    language: string;
    installLocation: string;
    change: string;
    chooseFolder: string;
    desktopShortcut: Option;
    startWithWindows: Option;
  };
  installing: {
    title: string;
    subtitle: string;
    completeTitle: string;
    completeSubtitle: string;
    errorTitle: string;
    errorSubtitle: string;
    preparing: string;
    copying: string;
    tasks: {
      desktopShortcut: string;
      startWithWindows: string;
      registering: string;
      finishing: string;
    };
    complete: string;
    sizeOf: (copied: string, total: string) => string;
    minutesLeft: (minutes: number) => string;
    secondsLeft: (seconds: number) => string;
    calculating: string;
    done: string;
  };
  done: { title: string; text: string; launch: string };
  welcomeScreen: {
    splash: string;
    title: string;
    subtitle: string;
    signIn: string;
    processing: string;
    // Login: código para conferir no site do Radar, abrir o browser outra vez e cancelar
    confirmCode: string;
    reopenBrowser: string;
    cancel: string;
  };
  signIn: {
    successTitle: string;
    successSubtitle: string;
    account: string;
    errorTitle: string;
    errorMessage: string;
    tryAgain: string;
    deniedTitle: string;
    deniedMessage: string;
    getConnector: string;
  };
  update: {
    checking: string;
    availableTitle: string;
    availableSubtitle: (version: string) => string;
    size: string;
    released: string;
    whatsNew: string;
    notesFallback: string;
    latestTitle: string;
    latestText: (version: string) => string;
    errorTitle: string;
    errorText: string;
    retry: string;
    updateButton: string;
    updatingTitle: string;
    updatingSubtitle: string;
    downloading: string;
    tasks: { backup: string; apply: string; finishing: string };
    doneTitle: string;
    doneText: (version: string) => string;
    openApp: string;
  };
  app: {
    nav: { home: string; products: string; feeder: string; storage: string; settings: string; account: string };
    links: { radar: string; photos: string; connector: string };
    home: {
      title: string;
      greeting: (name: string) => string;
      status: { flying: string; online: string; offline: string };
      statusDetail: { flying: string; online: string; offline: string };
      aircraft: string;
      server: string;
      flightTime: string;
      servers: { casual: string; training: string; expert: string };
      discordPreview: string;
      pip: string;
      pipOpen: string;
      // Sem dados do servidor de status (src/lib/flightStatus.ts)
      noStatusTitle: string;
      noStatusText: string;
      // Voo sem plano de voo (sem destino)
      freeFlight: string;
      noFlightPlan: string;
      // Textos do status enviado para o Discord (botões: máximo 32 caracteres, regra do Discord)
      presenceServer: (server: string) => string;
      presenceButton: string;
      presenceDiscordButton: string;
      remaining: (time: string) => string;
      playing: string;
      elapsed: (time: string) => string;
    };
    products: {
      subtitle: string;
      radar: string;
      photos: string;
      connector: string;
      forms: string;
      support: string;
      linkSoon: string;
    };
    storage: {
      subtitle: string;
      flights: string;
      flightsDescription: string;
      total: (size: string, count: number) => string;
      empty: string;
      freeFlight: string;
      points: (n: number) => string;
      recording: string;
      paused: string;
      deletesIn: (time: string) => string;
      deleteNow: string;
      delete: string;
      deleteAll: string;
      confirmDeleteAll: string;
      cancel: string;
      howTitle: string;
      how: string[];
      guide: string;
    };
    feeder: {
      subtitle: string;
      status: string;
      states: { off: string; searching: string; connected: string };
      radar: Record<"off" | "idle" | "connecting" | "waiting" | "on_map" | "retrying" | "needs_login" | "not_verified" | "replaced", string>;
      detail: {
        off: (user: string) => string;
        noIfcUser: string;
        notVerified: string;
        searchingAuto: (user: string) => string;
        searchingManual: (ip: string) => string;
        connectedTo: (user: string, device: string) => string;
        otherUser: (user: string) => string;
      };
      live: {
        title: string;
        waiting: string;
        aircraft: string;
        position: string;
        altitude: string;
        groundSpeed: string;
        heading: string;
        verticalSpeed: string;
        onGround: string;
        server: string;
        route: string;
        noPlan: string;
        remaining: string;
        distance: string;
        yes: string;
        no: string;
      };
      connect: string;
      cancel: string;
      disconnect: string;
      connection: string;
      mode: string;
      modes: { auto: string; manual: string };
      modeAutoDescription: string;
      modeManualDescription: string;
      ip: string;
      ipDescription: (port: number) => string;
      updates: string;
      rate: string;
      rateDescription: string;
      rateOption: (n: number) => string;
      lockedHint: string;
      autoStart: string;
      autoStartDescription: string;
      discordTime: string;
      discordTimeDescription: string;
      discordTimes: { remaining: string; elapsed: string };
      discord: string;
      discordDescription: string;
      howTo: string;
      guide: string;
      steps: string[];
    };
    legal: { terms: string; privacy: string };
    license: { needed: string; discordOnly: string; get: string; freeDescription: string; homeHint: string };
    account: {
      subtitle: string;
      radarAccount: string;
      license: string;
      licenseTitle: string;
      active: string;
      since: (date: string) => string;
      linkedAccounts: string;
      linked: string;
      notLinked: string;
      grade: (grade: number) => string;
      add: string;
      manage: string;
      signOut: string;
      signOutConfirm: string;
      signOutText: string;
      cancel: string;
    };
    settings: {
      subtitle: string;
      general: string;
      language: string;
      languageDescription: string;
      startWithWindows: string;
      startWithWindowsDescription: string;
      // Mac: o mesmo interruptor, com o nome do macOS
      startAtLogin: string;
      startAtLoginDescription: string;
      autopilot: string;
      discordAutopilot: string;
      discordAutopilotDescription: string;
      test: string;
      testDescription: string;
      testButton: string;
      testOpening: string;
      testDone: string;
      pip: string;
      autoPip: string;
      autoPipDescription: string;
      autoPipWhenCovered: string;
      autoPipOnlyFlying: string;
      pinSound: string;
      pinSoundDescription: string;
      pinSoundListen: string;
      pinSounds: Record<"off" | "plim" | "drop" | "marimba" | "kalimba" | "wood", string>;
      updates: string;
      autoUpdate: string;
      autoUpdateDescription: string;
      version: string;
      versionDescription: (version: string) => string;
      checkUpdates: string;
    };
  };
};

const terms = (label: string) => <ExternalLink href={LINKS.termsOfService}>{label}</ExternalLink>;
const privacy = (label: string) => <ExternalLink href={LINKS.privacyPolicy}>{label}</ExternalLink>;

const en: Translations = {
  buttons: { next: "Next", back: "Back", install: "Install", finish: "Finish" },
  window: { minimize: "Minimize", close: "Close" },
  welcome: {
    title: "Your flights, live on Discord.",
    description: (
      <>
        AeroHub Connector brings your Infinite Flight sessions to Discord, showing your{" "}
        <strong>aircraft</strong>, <strong>route</strong> and <strong>server</strong> live on your
        profile, while running quietly in the background.
      </>
    ),
    by: "by",
  },
  terms: {
    title: "Terms of Service",
    subtitle: "Please review the key points and accept to continue.",
    points: [
      { title: "Personal use", body: "For personal, non-commercial use only." },
      { title: "Your data", body: "Only your aircraft, route and server are read." },
      { title: "Third-party", body: "Discord and Infinite Flight terms also apply." },
      { title: "Updates", body: "May be released to improve features and security." },
      { title: "No warranty", body: "Provided as is, without warranties of any kind." },
    ],
    notice: (
      <>
        This is only a summary. Read the full {terms("Terms of Service")} and{" "}
        {privacy("Privacy Policy")} on our website.
      </>
    ),
    accept: (
      <>
        I have read and agree to the {terms("Terms of Service")} and {privacy("Privacy Policy")}.
      </>
    ),
  },
  options: {
    title: "Installation options",
    subtitle: "Choose how AeroHub Connector is installed.",
    language: "Language",
    installLocation: "Install location",
    change: "Change",
    chooseFolder: "Choose install location",
    desktopShortcut: {
      title: "Create desktop shortcut",
      description: "Add an AeroHub Connector icon to your desktop.",
    },
    startWithWindows: {
      title: "Start with Windows",
      description: "Open automatically when you sign in to Windows.",
    },
  },
  installing: {
    title: "Installing AeroHub Connector",
    subtitle: "This will only take a moment.",
    completeTitle: "Installation complete",
    completeSubtitle: "Everything is ready to go.",
    errorTitle: "Installation failed",
    errorSubtitle: "Something went wrong. Close the installer and try again.",
    preparing: "Preparing installation…",
    copying: "Copying",
    tasks: {
      desktopShortcut: "Creating desktop shortcut…",
      startWithWindows: "Adding to Windows startup…",
      registering: "Registering AeroHub Connector…",
      finishing: "Finishing up…",
    },
    complete: "Installation complete",
    sizeOf: (copied, total) => `${copied} of ${total}`,
    minutesLeft: (minutes) => `About ${minutes} min remaining`,
    secondsLeft: (seconds) => `About ${seconds} sec remaining`,
    calculating: "Calculating time remaining…",
    done: "Done",
  },
  done: {
    title: "AeroHub Connector is ready!",
    text: "Your flights will now appear on Discord whenever you're flying.",
    launch: "Launch AeroHub Connector",
  },
  welcomeScreen: {
    splash: "Welcome",
    title: "Welcome aboard",
    subtitle: "Sign in with your AeroHub Radar account to start sharing your flights on Discord.",
    signIn: "Sign in with AeroHub Radar",
    processing: "Processing",
    confirmCode: "Confirm this code in your browser",
    reopenBrowser: "Open the browser again",
    cancel: "Cancel",
  },
  signIn: {
    successTitle: "You're signed in!",
    successSubtitle: "Your AeroHub Radar account is now connected.",
    account: "AeroHub Radar account",
    errorTitle: "Sign in failed",
    errorMessage: "We couldn't sign you in to AeroHub Radar. Check your connection and try again.",
    tryAgain: "Try again",
    deniedTitle: "Access not available",
    deniedMessage: "Your AeroHub Radar account isn't eligible to use AeroHub Connector. Get it on our website, then try again.",
    getConnector: "Get AeroHub Connector",
  },
  update: {
    checking: "Checking for updates",
    availableTitle: "Update available",
    availableSubtitle: (version) => `AeroHub Connector ${version} is ready to install.`,
    size: "Download size",
    released: "Released",
    whatsNew: "What's new",
    notesFallback: "Improvements and bug fixes.",
    latestTitle: "You're up to date",
    latestText: (version) => `AeroHub Connector ${version} is the latest version.`,
    errorTitle: "Couldn't check for updates",
    errorText: "Check your internet connection and try again.",
    retry: "Try again",
    updateButton: "Update",
    updatingTitle: "Updating AeroHub Connector",
    updatingSubtitle: "Please keep the app open.",
    downloading: "Downloading",
    tasks: {
      backup: "Backing up your settings…",
      apply: "Applying the update…",
      finishing: "Finishing up…",
    },
    doneTitle: "Update complete!",
    doneText: (version) => `AeroHub Connector is now on version ${version}.`,
    openApp: "Open AeroHub Connector",
  },
  app: {
    nav: { home: "Home", products: "Products", feeder: "Feeder", storage: "Storage", settings: "Settings", account: "Account" },
    links: { radar: "AeroHub Radar", photos: "AeroHub Photos", connector: "AeroHub Connector" },
    home: {
      title: "Home",
      greeting: (name) => `Welcome back, ${name}`,
      status: { flying: "Flying", online: "Online", offline: "Offline" },
      statusDetail: {
        flying: "Your flight is live on Discord.",
        online: "Connected. Waiting for you to take off.",
        offline: "Infinite Flight isn't running.",
      },
      aircraft: "Aircraft",
      server: "Server",
      flightTime: "Flight time",
      servers: { casual: "Casual", training: "Training", expert: "Expert" },
      discordPreview: "Discord preview",
      pip: "Pin status on screen",
      pipOpen: "Open AeroHub Connector",
      freeFlight: "Free flight",
      noFlightPlan: "No flight plan",
      noStatusTitle: "No status available",
      noStatusText: "When you fly in Infinite Flight, your flight shows up here and on your Discord profile.",
      presenceServer: (server) => `${server} Server`,
      presenceButton: "View flight on AeroHub Radar",
      presenceDiscordButton: "Join AeroHub Radar Discord",
      remaining: (time) => `${time} left`,
      playing: "Playing",
      elapsed: (time) => `${time} elapsed`,
    },
    // PROVISÓRIO: rever as descrições de cada produto
    products: {
      subtitle: "Explore more from AeroHub.",
      radar: "Track flights and pilots in real time.",
      photos: "Share and discover aviation photos.",
      connector: "Show your Infinite Flight sessions on Discord.",
      forms: "Fill in and submit AeroHub forms.",
      support: "Answers and step-by-step help for all AeroHub products.",
      linkSoon: "Link coming soon",
    },
    storage: {
      subtitle: "Flights recorded by the Feeder on this computer. They are temporary.",
      flights: "Recorded flights",
      flightsDescription: "Used for the trail, graphs and playback on AeroHub Radar.",
      total: (size, count) => `${size} in ${count} ${count === 1 ? "flight" : "flights"}`,
      empty: "No flights recorded. Connect the Feeder and fly: the flight is recorded here.",
      freeFlight: "Free flight",
      points: (n) => `${n.toLocaleString()} points`,
      recording: "Recording",
      paused: "Paused: continues if this flight comes back",
      deletesIn: (time) => `Deleted automatically in ${time}`,
      deleteNow: "Delete now",
      delete: "Delete",
      deleteAll: "Delete all",
      confirmDeleteAll: "Confirm",
      cancel: "Cancel",
      howTitle: "How it works",
      how: [
        "While the Feeder is connected, your flight is recorded on this computer once per second: position, altitude, height above the ground, speeds, heading and whether you are on the ground.",
        "AeroHub Radar uses it to show your full trail, the graphs and the playback from takeoff, even if someone opens the map in the middle of your flight.",
        "Each flight has its own file. If the connection drops (phone off, battery, internet, app closed or updated), the same flight continues where it stopped. A new flight always starts a new file.",
        "A flight ends when you leave it in Infinite Flight, start another flight, or nothing arrives for 30 minutes.",
        "1 hour after the flight ends, it is deleted automatically. That is the longest it can stay: you can delete it sooner, but never keep it longer.",
        "Deleting the flight being recorded starts its recording again from now (the trail and graphs on the map also start from now).",
        "A flight uses about 5 KB per minute (around 3 MB for 10 hours). Nothing else is recorded: no other pilots, no files, no passwords.",
      ],
      guide: "Learn more about how flights are recorded",
    },
    feeder: {
      subtitle: "Send your Infinite Flight position to AeroHub Radar.",
      status: "Status",
      states: { off: "Not connected", searching: "Searching…", connected: "Connected" },
      radar: { off: "", idle: "AeroHub Radar: only flights on a Live server appear on the map.", connecting: "Connecting to AeroHub Radar…", waiting: "Connected to AeroHub Radar. Your flight joins the map once Infinite Flight shows it online.", on_map: "Your flight is live on AeroHub Radar.", retrying: "Can't reach AeroHub Radar. Trying again…", needs_login: "Your session has expired. Sign in again to appear on AeroHub Radar.", not_verified: "Your Infinite Flight account is no longer verified, so your flight is not sent to AeroHub Radar.", replaced: "Another computer is sending this account's flight. Turn the Feeder off and on to send it from here." },
      detail: {
        off: (user) => `Connect to show ${user}’s aircraft on the AeroHub Radar map.`,
        noIfcUser: "Link your Infinite Flight account on AeroHub Radar to use the Feeder.",
        notVerified: "Verify your Infinite Flight account on AeroHub Radar to use the Feeder.",
        searchingAuto: (user) => `Looking for ${user} in Infinite Flight on your Wi-Fi network.`,
        searchingManual: (ip) => `Trying to reach Infinite Flight at ${ip}.`,
        connectedTo: (user, device) => `Connected to ${user} on ${device}.`,
        otherUser: (user) => `Found Infinite Flight signed in as ${user}. That’s not your account, so it was skipped.`,
      },
      live: {
        title: "Live data",
        waiting: "Waiting for data from Infinite Flight…",
        aircraft: "Aircraft",
        position: "Position",
        altitude: "Altitude",
        groundSpeed: "Ground speed",
        heading: "Heading",
        verticalSpeed: "Vertical speed",
        onGround: "On ground",
        route: "Flight plan",
        noPlan: "No flight plan",
        remaining: "Time to destination",
        distance: "Distance to destination",
        server: "Server",
        yes: "Yes",
        no: "No",
      },
      connect: "Connect",
      cancel: "Cancel",
      disconnect: "Disconnect",
      connection: "Connection",
      mode: "Connection mode",
      modes: { auto: "Automatic", manual: "Manual (IP)" },
      modeAutoDescription: "Finds Infinite Flight on the same Wi-Fi network.",
      modeManualDescription: "Type the IP address of the device running Infinite Flight.",
      ip: "Device IP address",
      ipDescription: (port) => `Shown in Infinite Flight. Port ${port}.`,
      updates: "Preferences",
      rate: "Updates per second",
      rateDescription: "More is smoother; fewer is lighter on your device.",
      rateOption: (n) => `${n} per second${n === 4 ? " (recommended)" : ""}`,
      lockedHint: "Disconnect to change the connection mode or IP.",
      discord: "Show on my Discord",
      discordDescription: "Your aircraft, server, altitude and speed appear on your Discord profile.",
      discordTime: "Show on Discord",
      discordTimeDescription: "With a flight plan. Without one, Discord always shows the flight time.",
      discordTimes: { remaining: "Time remaining", elapsed: "Flight time" },
      autoStart: "Connect automatically",
      autoStartDescription: "When the app opens, the Feeder starts looking for your Infinite Flight by itself.",
      howTo: "How to connect",
      guide: "Step-by-step guide on AeroHub Support",
      steps: [
        "In Infinite Flight, open Settings → General and turn on \"Enable Infinite Flight Connect\".",
        "Keep this computer and the Infinite Flight device on the same Wi-Fi network.",
        "Start a flight and press Connect.",
      ],
    },
    legal: { terms: "Terms of Service", privacy: "Privacy Policy" },
    license: {
      needed: "Needs a licence",
      discordOnly: "Showing your flight on Discord needs an AeroHub Connector licence. The Feeder, Storage and the mini window are free.",
      get: "Get licence",
      freeDescription: "Not active. The Feeder, Storage and the mini window are free; a licence adds your flight on Discord.",
      homeHint: "This is a preview. To show it on your Discord profile, you need a licence.",
    },
    account: {
      subtitle: "Your AeroHub Radar account.",
      radarAccount: "AeroHub Radar account",
      license: "AeroHub Connector",
      licenseTitle: "License",
      active: "Active",
      since: (date) => `Since ${date}`,
      linkedAccounts: "Linked accounts",
      linked: "Linked",
      notLinked: "Not linked",
      grade: (grade) => `Grade ${grade}`,
      add: "Add",
      manage: "Manage account on AeroHub Radar",
      signOut: "Sign out",
      signOutConfirm: "Sign out?",
      signOutText: "You'll need to sign in again to use AeroHub Connector.",
      cancel: "Cancel",
    },
    settings: {
      subtitle: "Manage how AeroHub Connector works.",
      general: "General",
      language: "Language",
      languageDescription: "Choose the language of the app.",
      startWithWindows: "Start with Windows",
      startWithWindowsDescription: "Open AeroHub Connector when your computer starts.",
      startAtLogin: "Open at login",
      startAtLoginDescription: "Open AeroHub Connector when you log in to your Mac.",
      autopilot: "Autopilot",
      discordAutopilot: "Open Discord automatically",
      discordAutopilotDescription: "Whenever you have a flight (from the Feeder or from our server) and Discord is closed, the app opens it so your status shows. If it stays closed, it tries again every 2 minutes.",
      test: "Test",
      testDescription: "Open Discord now to check that it works.",
      testButton: "Test",
      testOpening: "Opening…",
      testDone: "Done",
      pip: "Pin status on screen",
      autoPip: "Pin status on screen automatically",
      autoPipDescription: "Show your status in a mini window when you minimize the app.",
      autoPipWhenCovered: "Also when the app is hidden behind other windows",
      autoPipOnlyFlying: "Only while flying",
      pinSound: "Pin sound",
      pinSoundDescription: "Plays when the mini window appears.",
      pinSoundListen: "Play sound",
      pinSounds: {
        off: "Off",
        plim: "Plim",
        drop: "Drop",
        marimba: "Marimba",
        kalimba: "Kalimba",
        wood: "Wood tap",
      },
      updates: "Updates",
      autoUpdate: "Install updates automatically",
      autoUpdateDescription: "Update AeroHub Connector as soon as a new version is out.",
      version: "Current version",
      versionDescription: (version) => `You're on version ${version}.`,
      checkUpdates: "Check for updates",
    },
  },
};

const pt: Translations = {
  buttons: { next: "Seguinte", back: "Voltar", install: "Instalar", finish: "Concluir" },
  window: { minimize: "Minimizar", close: "Fechar" },
  welcome: {
    title: "Os seus voos, em tempo real no Discord.",
    description: (
      <>
        O AeroHub Connector leva as suas sessões do Infinite Flight para o Discord, mostrando a sua{" "}
        <strong>aeronave</strong>, <strong>rota</strong> e <strong>servidor</strong> em tempo real no
        seu perfil, enquanto funciona discretamente em segundo plano.
      </>
    ),
    by: "por",
  },
  terms: {
    title: "Termos de Serviço",
    subtitle: "Reveja os pontos principais e aceite para continuar.",
    points: [
      { title: "Uso pessoal", body: "Apenas para uso pessoal e não comercial." },
      { title: "Os seus dados", body: "Só são lidos a sua aeronave, rota e servidor." },
      { title: "Terceiros", body: "Aplicam-se também os termos do Discord e do Infinite Flight." },
      { title: "Atualizações", body: "Podem ser lançadas para melhorar funções e segurança." },
      { title: "Sem garantia", body: "Fornecido tal como está, sem garantias de qualquer tipo." },
    ],
    notice: (
      <>
        Isto é apenas um resumo. Leia os {terms("Termos de Serviço")} e a{" "}
        {privacy("Política de Privacidade")} completos no nosso site.
      </>
    ),
    accept: (
      <>
        Li e aceito os {terms("Termos de Serviço")} e a {privacy("Política de Privacidade")}.
      </>
    ),
  },
  options: {
    title: "Opções de instalação",
    subtitle: "Escolha como o AeroHub Connector é instalado.",
    language: "Idioma",
    installLocation: "Local de instalação",
    change: "Alterar",
    chooseFolder: "Escolher local de instalação",
    desktopShortcut: {
      title: "Criar atalho no ambiente de trabalho",
      description: "Adiciona um ícone do AeroHub Connector ao ambiente de trabalho.",
    },
    startWithWindows: {
      title: "Iniciar com o Windows",
      description: "Abre automaticamente ao iniciar sessão no Windows.",
    },
  },
  installing: {
    title: "A instalar o AeroHub Connector",
    subtitle: "Isto só vai demorar um momento.",
    completeTitle: "Instalação concluída",
    completeSubtitle: "Está tudo pronto.",
    errorTitle: "A instalação falhou",
    errorSubtitle: "Algo correu mal. Feche o instalador e tente de novo.",
    preparing: "A preparar a instalação…",
    copying: "A copiar",
    tasks: {
      desktopShortcut: "A criar atalho no ambiente de trabalho…",
      startWithWindows: "A adicionar ao arranque do Windows…",
      registering: "A registar o AeroHub Connector…",
      finishing: "A concluir…",
    },
    complete: "Instalação concluída",
    sizeOf: (copied, total) => `${copied} de ${total}`,
    minutesLeft: (minutes) => `Cerca de ${minutes} min restantes`,
    secondsLeft: (seconds) => `Cerca de ${seconds} s restantes`,
    calculating: "A calcular o tempo restante…",
    done: "Concluído",
  },
  done: {
    title: "O AeroHub Connector está pronto!",
    text: "Os seus voos vão passar a aparecer no Discord sempre que estiver a voar.",
    launch: "Abrir o AeroHub Connector",
  },
  welcomeScreen: {
    splash: "Bem-vindo",
    title: "Bem-vindo a bordo",
    subtitle: "Entre com a sua conta AeroHub Radar para começar a partilhar os seus voos no Discord.",
    signIn: "Entrar com a conta AeroHub Radar",
    processing: "A processar",
    confirmCode: "Confirme este código no browser",
    reopenBrowser: "Abrir o browser outra vez",
    cancel: "Cancelar",
  },
  signIn: {
    successTitle: "Sessão iniciada!",
    successSubtitle: "A sua conta AeroHub Radar está agora ligada.",
    account: "Conta AeroHub Radar",
    errorTitle: "Não foi possível entrar",
    errorMessage: "Não conseguimos iniciar sessão na AeroHub Radar. Verifique a ligação e tente novamente.",
    tryAgain: "Tentar novamente",
    deniedTitle: "Acesso não disponível",
    deniedMessage: "A sua conta AeroHub Radar não tem acesso ao AeroHub Connector. Obtenha-o no nosso site e tente novamente.",
    getConnector: "Obter o AeroHub Connector",
  },
  update: {
    checking: "A procurar atualizações",
    availableTitle: "Atualização disponível",
    availableSubtitle: (version) => `O AeroHub Connector ${version} está pronto a instalar.`,
    size: "Tamanho",
    released: "Publicada",
    whatsNew: "Novidades",
    notesFallback: "Melhorias e correções.",
    latestTitle: "Está tudo em dia",
    latestText: (version) => `O AeroHub Connector ${version} é a versão mais recente.`,
    errorTitle: "Não foi possível procurar atualizações",
    errorText: "Verifique a ligação à internet e tente de novo.",
    retry: "Tentar de novo",
    updateButton: "Atualizar",
    updatingTitle: "A atualizar o AeroHub Connector",
    updatingSubtitle: "Mantenha o app aberto.",
    downloading: "A transferir",
    tasks: {
      backup: "A guardar as suas definições…",
      apply: "A aplicar a atualização…",
      finishing: "A concluir…",
    },
    doneTitle: "Atualização concluída!",
    doneText: (version) => `O AeroHub Connector está agora na versão ${version}.`,
    openApp: "Abrir o AeroHub Connector",
  },
  app: {
    nav: { home: "Início", products: "Produtos", feeder: "Feeder", storage: "Armazenamento", settings: "Definições", account: "Conta" },
    links: { radar: "AeroHub Radar", photos: "AeroHub Photos", connector: "AeroHub Connector" },
    home: {
      title: "Início",
      greeting: (name) => `Bem-vindo de volta, ${name}`,
      status: { flying: "A voar", online: "Online", offline: "Offline" },
      statusDetail: {
        flying: "O seu voo está em direto no Discord.",
        online: "Ligado. À espera da descolagem.",
        offline: "O Infinite Flight não está aberto.",
      },
      aircraft: "Aeronave",
      server: "Servidor",
      flightTime: "Tempo de voo",
      servers: { casual: "Casual", training: "Training", expert: "Expert" },
      discordPreview: "Pré-visualização no Discord",
      pip: "Afixar estado no ecrã",
      pipOpen: "Abrir o AeroHub Connector",
      freeFlight: "Voo livre",
      noFlightPlan: "Sem plano de voo",
      noStatusTitle: "Sem status disponível",
      noStatusText: "Quando voar no Infinite Flight, o seu voo aparece aqui e no seu perfil do Discord.",
      presenceServer: (server) => `Servidor ${server}`,
      presenceButton: "Ver voo no AeroHub Radar",
      presenceDiscordButton: "Entrar no Discord AeroHub Radar",
      remaining: (time) => `${time} restante`,
      playing: "A jogar",
      elapsed: (time) => `${time} decorrido`,
    },
    // PROVISÓRIO: rever as descrições de cada produto
    products: {
      subtitle: "Descubra mais do AeroHub.",
      radar: "Acompanhe voos e pilotos em tempo real.",
      photos: "Partilhe e descubra fotos de aviação.",
      connector: "Mostre as suas sessões do Infinite Flight no Discord.",
      forms: "Preencha e envie formulários do AeroHub.",
      support: "Respostas e ajuda passo a passo para todos os produtos AeroHub.",
      linkSoon: "Link em breve",
    },
    storage: {
      subtitle: "Voos gravados pelo Feeder neste computador. São temporários.",
      flights: "Voos gravados",
      flightsDescription: "Servem para o rasto, os gráficos e o playback no AeroHub Radar.",
      total: (size, count) => `${size} em ${count} ${count === 1 ? "voo" : "voos"}`,
      empty: "Nenhum voo gravado. Liga o Feeder e voa: o voo fica gravado aqui.",
      freeFlight: "Voo livre",
      points: (n) => `${n.toLocaleString()} pontos`,
      recording: "A gravar",
      paused: "Em pausa: continua se este voo voltar",
      deletesIn: (time) => `Apagado sozinho daqui a ${time}`,
      deleteNow: "Apagar já",
      delete: "Apagar",
      deleteAll: "Apagar tudo",
      confirmDeleteAll: "Confirmar",
      cancel: "Cancelar",
      howTitle: "Como funciona",
      how: [
        "Com o Feeder ligado, o teu voo é gravado neste computador uma vez por segundo: posição, altitude, altura ao chão, velocidades, proa e se estás no chão.",
        "O AeroHub Radar usa-o para mostrar o rasto inteiro, os gráficos e o playback desde a descolagem, mesmo que alguém abra o mapa a meio do voo.",
        "Cada voo tem o seu ficheiro. Se a ligação cair (telemóvel desligado, bateria, internet, app fechado ou atualizado), o mesmo voo continua onde parou. Um voo novo começa sempre um ficheiro novo.",
        "Um voo acaba quando sais dele no Infinite Flight, começas outro voo, ou não chega nada durante 30 minutos.",
        "1 hora depois de o voo acabar, é apagado sozinho. É o máximo que pode ficar: podes apagar antes, mas nunca guardar mais tempo.",
        "Apagar o voo que está a ser gravado recomeça a gravação a partir de agora (o rasto e os gráficos no mapa também começam de agora).",
        "Um voo ocupa cerca de 5 KB por minuto (perto de 3 MB em 10 horas). Mais nada é gravado: nem outros pilotos, nem ficheiros, nem palavras-passe.",
      ],
      guide: "Saber mais sobre a gravação dos voos",
    },
    feeder: {
      subtitle: "Envia a posição do teu avião no Infinite Flight para o AeroHub Radar.",
      status: "Estado",
      states: { off: "Desligado", searching: "A procurar…", connected: "Ligado" },
      radar: { off: "", idle: "AeroHub Radar: só os voos num servidor Live aparecem no mapa.", connecting: "A ligar ao AeroHub Radar…", waiting: "Ligado ao AeroHub Radar. O teu voo entra no mapa assim que o Infinite Flight o mostrar online.", on_map: "O teu voo está em direto no AeroHub Radar.", retrying: "Sem ligação ao AeroHub Radar. A tentar outra vez…", needs_login: "A tua sessão expirou. Volta a entrar para apareceres no AeroHub Radar.", not_verified: "A tua conta do Infinite Flight já não está verificada, por isso o voo não é enviado para o AeroHub Radar.", replaced: "Outro computador está a enviar o voo desta conta. Desliga e liga o Feeder para o enviar daqui." },
      detail: {
        off: (user) => `Liga para o avião de ${user} aparecer no mapa do AeroHub Radar.`,
        noIfcUser: "Liga a tua conta do Infinite Flight no AeroHub Radar para usar o Feeder.",
        notVerified: "Verifica a tua conta do Infinite Flight no AeroHub Radar para usar o Feeder.",
        searchingAuto: (user) => `A procurar ${user} no Infinite Flight da tua rede Wi-Fi.`,
        searchingManual: (ip) => `A tentar chegar ao Infinite Flight em ${ip}.`,
        connectedTo: (user, device) => `Ligado a ${user} em ${device}.`,
        otherUser: (user) => `Encontrado um Infinite Flight com a conta ${user}. Não é a tua conta, por isso foi ignorado.`,
      },
      live: {
        title: "Dados ao vivo",
        waiting: "À espera dos dados do Infinite Flight…",
        aircraft: "Avião",
        position: "Posição",
        altitude: "Altitude",
        groundSpeed: "Velocidade no solo",
        heading: "Rumo",
        verticalSpeed: "Velocidade vertical",
        onGround: "No chão",
        route: "Plano de voo",
        noPlan: "Sem plano de voo",
        remaining: "Tempo até ao destino",
        distance: "Distância até ao destino",
        server: "Servidor",
        yes: "Sim",
        no: "Não",
      },
      connect: "Ligar",
      cancel: "Cancelar",
      disconnect: "Desligar",
      connection: "Ligação",
      mode: "Modo de ligação",
      modes: { auto: "Automático", manual: "Manual (IP)" },
      modeAutoDescription: "Encontra o Infinite Flight na mesma rede Wi-Fi.",
      modeManualDescription: "Escreve o IP do aparelho onde corre o Infinite Flight.",
      ip: "IP do aparelho",
      ipDescription: (port) => `Aparece no Infinite Flight. Porta ${port}.`,
      updates: "Preferências",
      rate: "Atualizações por segundo",
      rateDescription: "Mais = mais suave; menos = mais leve para o aparelho.",
      rateOption: (n) => `${n} por segundo${n === 4 ? " (recomendado)" : ""}`,
      lockedHint: "Desliga para mudar o modo de ligação ou o IP.",
      discord: "Mostrar no meu Discord",
      discordDescription: "O teu avião, servidor, altitude e velocidade aparecem no teu perfil do Discord.",
      discordTime: "Mostrar no Discord",
      discordTimeDescription: "Com plano de voo. Sem plano, o Discord mostra sempre o tempo de voo.",
      discordTimes: { remaining: "Tempo que falta", elapsed: "Tempo de voo" },
      autoStart: "Ligar automaticamente",
      autoStartDescription: "Ao abrir o app, o Feeder começa sozinho a procurar o teu Infinite Flight.",
      howTo: "Como ligar",
      guide: "Guia passo a passo no AeroHub Support",
      steps: [
        "No Infinite Flight, abre Settings → General e liga \"Enable Infinite Flight Connect\".",
        "Põe este computador e o aparelho do Infinite Flight na mesma rede Wi-Fi.",
        "Começa um voo e carrega em Ligar.",
      ],
    },
    legal: { terms: "Termos de Serviço", privacy: "Política de Privacidade" },
    license: {
      needed: "Precisa de licença",
      discordOnly: "Mostrar o teu voo no Discord precisa de uma licença do AeroHub Connector. O Feeder, o Armazenamento e a mini janela são grátis.",
      get: "Obter licença",
      freeDescription: "Não ativa. O Feeder, o Armazenamento e a mini janela são grátis; a licença junta o teu voo no Discord.",
      homeHint: "Isto é uma pré-visualização. Para aparecer no teu perfil do Discord, precisas de uma licença.",
    },
    account: {
      subtitle: "A sua conta AeroHub Radar.",
      radarAccount: "Conta AeroHub Radar",
      license: "AeroHub Connector",
      licenseTitle: "Licença",
      active: "Ativa",
      since: (date) => `Desde ${date}`,
      linkedAccounts: "Contas ligadas",
      linked: "Ligada",
      notLinked: "Não ligada",
      grade: (grade) => `Grade ${grade}`,
      add: "Adicionar",
      manage: "Gerir conta no AeroHub Radar",
      signOut: "Terminar sessão",
      signOutConfirm: "Terminar sessão?",
      signOutText: "Vai precisar de entrar outra vez para usar o AeroHub Connector.",
      cancel: "Cancelar",
    },
    settings: {
      subtitle: "Gerir como o AeroHub Connector funciona.",
      general: "Geral",
      language: "Idioma",
      languageDescription: "Escolha o idioma do app.",
      startWithWindows: "Iniciar com o Windows",
      startWithWindowsDescription: "Abrir o AeroHub Connector quando o computador liga.",
      startAtLogin: "Abrir ao iniciar sessão",
      startAtLoginDescription: "Abrir o AeroHub Connector quando inicia sessão no Mac.",
      autopilot: "Piloto automático",
      discordAutopilot: "Abrir o Discord automaticamente",
      discordAutopilotDescription: "Sempre que há um voo (do Feeder ou do nosso servidor) e o Discord está fechado, a app abre-o para mostrar o teu estado. Se continuar fechado, volta a tentar a cada 2 minutos.",
      test: "Testar",
      testDescription: "Abrir o Discord agora para confirmar que funciona.",
      testButton: "Testar",
      testOpening: "A abrir…",
      testDone: "Feito",
      pip: "Fixar estado no ecrã",
      autoPip: "Fixar estado no ecrã automaticamente",
      autoPipDescription: "Mostra o seu estado numa mini janela quando minimiza o app.",
      autoPipWhenCovered: "Também quando o app fica tapado por outras janelas",
      autoPipOnlyFlying: "Só durante um voo",
      pinSound: "Som ao fixar",
      pinSoundDescription: "Toca quando a mini janela aparece.",
      pinSoundListen: "Ouvir som",
      pinSounds: {
        off: "Desligado",
        plim: "Plim",
        drop: "Gota",
        marimba: "Marimba",
        kalimba: "Kalimba",
        wood: "Toque de madeira",
      },
      updates: "Atualizações",
      autoUpdate: "Instalar atualizações automaticamente",
      autoUpdateDescription: "Atualizar o AeroHub Connector assim que sair uma nova versão.",
      version: "Versão atual",
      versionDescription: (version) => `Está na versão ${version}.`,
      checkUpdates: "Procurar atualizações",
    },
  },
};

const es: Translations = {
  buttons: { next: "Siguiente", back: "Atrás", install: "Instalar", finish: "Finalizar" },
  window: { minimize: "Minimizar", close: "Cerrar" },
  welcome: {
    title: "Tus vuelos, en tiempo real en Discord.",
    description: (
      <>
        AeroHub Connector lleva tus sesiones de Infinite Flight a Discord, mostrando tu{" "}
        <strong>aeronave</strong>, <strong>ruta</strong> y <strong>servidor</strong> en tiempo real en
        tu perfil, mientras funciona discretamente en segundo plano.
      </>
    ),
    by: "por",
  },
  terms: {
    title: "Términos de servicio",
    subtitle: "Revisa los puntos clave y acepta para continuar.",
    points: [
      { title: "Uso personal", body: "Solo para uso personal y no comercial." },
      { title: "Tus datos", body: "Solo se leen tu aeronave, ruta y servidor." },
      { title: "Terceros", body: "También se aplican los términos de Discord e Infinite Flight." },
      { title: "Actualizaciones", body: "Pueden publicarse para mejorar funciones y seguridad." },
      { title: "Sin garantía", body: "Se ofrece tal cual, sin garantías de ningún tipo." },
    ],
    notice: (
      <>
        Esto es solo un resumen. Lee los {terms("Términos de servicio")} y la{" "}
        {privacy("Política de privacidad")} completos en nuestro sitio web.
      </>
    ),
    accept: (
      <>
        He leído y acepto los {terms("Términos de servicio")} y la {privacy("Política de privacidad")}.
      </>
    ),
  },
  options: {
    title: "Opciones de instalación",
    subtitle: "Elige cómo se instala AeroHub Connector.",
    language: "Idioma",
    installLocation: "Ubicación de instalación",
    change: "Cambiar",
    chooseFolder: "Elegir ubicación de instalación",
    desktopShortcut: {
      title: "Crear acceso directo en el escritorio",
      description: "Añade un icono de AeroHub Connector a tu escritorio.",
    },
    startWithWindows: {
      title: "Iniciar con Windows",
      description: "Se abre automáticamente al iniciar sesión en Windows.",
    },
  },
  installing: {
    title: "Instalando AeroHub Connector",
    subtitle: "Solo tardará un momento.",
    completeTitle: "Instalación completada",
    completeSubtitle: "Todo está listo.",
    errorTitle: "La instalación falló",
    errorSubtitle: "Algo salió mal. Cierra el instalador e inténtalo de nuevo.",
    preparing: "Preparando la instalación…",
    copying: "Copiando",
    tasks: {
      desktopShortcut: "Creando acceso directo en el escritorio…",
      startWithWindows: "Añadiendo al inicio de Windows…",
      registering: "Registrando AeroHub Connector…",
      finishing: "Finalizando…",
    },
    complete: "Instalación completada",
    sizeOf: (copied, total) => `${copied} de ${total}`,
    minutesLeft: (minutes) => `Quedan unos ${minutes} min`,
    secondsLeft: (seconds) => `Quedan unos ${seconds} s`,
    calculating: "Calculando el tiempo restante…",
    done: "Listo",
  },
  done: {
    title: "¡AeroHub Connector está listo!",
    text: "Tus vuelos aparecerán en Discord siempre que estés volando.",
    launch: "Abrir AeroHub Connector",
  },
  welcomeScreen: {
    splash: "Bienvenido",
    title: "Bienvenido a bordo",
    subtitle: "Inicia sesión con tu cuenta AeroHub Radar para empezar a compartir tus vuelos en Discord.",
    signIn: "Iniciar sesión con AeroHub Radar",
    processing: "Procesando",
    confirmCode: "Confirma este código en el navegador",
    reopenBrowser: "Abrir el navegador otra vez",
    cancel: "Cancelar",
  },
  signIn: {
    successTitle: "¡Sesión iniciada!",
    successSubtitle: "Tu cuenta de AeroHub Radar ya está conectada.",
    account: "Cuenta de AeroHub Radar",
    errorTitle: "No se pudo iniciar sesión",
    errorMessage: "No pudimos iniciar sesión en AeroHub Radar. Revisa tu conexión e inténtalo de nuevo.",
    tryAgain: "Reintentar",
    deniedTitle: "Acceso no disponible",
    deniedMessage: "Tu cuenta de AeroHub Radar no tiene acceso a AeroHub Connector. Consíguelo en nuestro sitio web y vuelve a intentarlo.",
    getConnector: "Conseguir AeroHub Connector",
  },
  update: {
    checking: "Buscando actualizaciones",
    availableTitle: "Actualización disponible",
    availableSubtitle: (version) => `AeroHub Connector ${version} está listo para instalar.`,
    size: "Tamaño",
    released: "Publicada",
    whatsNew: "Novedades",
    notesFallback: "Mejoras y correcciones.",
    latestTitle: "Todo está al día",
    latestText: (version) => `AeroHub Connector ${version} es la versión más reciente.`,
    errorTitle: "No se pudieron buscar actualizaciones",
    errorText: "Comprueba tu conexión a internet e inténtalo de nuevo.",
    retry: "Reintentar",
    updateButton: "Actualizar",
    updatingTitle: "Actualizando AeroHub Connector",
    updatingSubtitle: "Mantén la app abierta.",
    downloading: "Descargando",
    tasks: {
      backup: "Guardando tus ajustes…",
      apply: "Aplicando la actualización…",
      finishing: "Finalizando…",
    },
    doneTitle: "¡Actualización completada!",
    doneText: (version) => `AeroHub Connector ya está en la versión ${version}.`,
    openApp: "Abrir AeroHub Connector",
  },
  app: {
    nav: { home: "Inicio", products: "Productos", feeder: "Feeder", storage: "Almacenamiento", settings: "Ajustes", account: "Cuenta" },
    links: { radar: "AeroHub Radar", photos: "AeroHub Photos", connector: "AeroHub Connector" },
    home: {
      title: "Inicio",
      greeting: (name) => `Bienvenido de nuevo, ${name}`,
      status: { flying: "Volando", online: "En línea", offline: "Desconectado" },
      statusDetail: {
        flying: "Tu vuelo está en directo en Discord.",
        online: "Conectado. Esperando el despegue.",
        offline: "Infinite Flight no está abierto.",
      },
      aircraft: "Aeronave",
      server: "Servidor",
      flightTime: "Tiempo de vuelo",
      servers: { casual: "Casual", training: "Training", expert: "Expert" },
      discordPreview: "Vista previa en Discord",
      pip: "Fijar estado en pantalla",
      pipOpen: "Abrir AeroHub Connector",
      freeFlight: "Vuelo libre",
      noFlightPlan: "Sin plan de vuelo",
      noStatusTitle: "Sin estado disponible",
      noStatusText: "Cuando vueles en Infinite Flight, tu vuelo aparecerá aquí y en tu perfil de Discord.",
      presenceServer: (server) => `Servidor ${server}`,
      presenceButton: "Ver vuelo en AeroHub Radar",
      presenceDiscordButton: "Únete al Discord AeroHub Radar",
      remaining: (time) => `quedan ${time}`,
      playing: "Jugando a",
      elapsed: (time) => `${time} transcurrido`,
    },
    // PROVISÓRIO: rever as descrições de cada produto
    products: {
      subtitle: "Descubre más de AeroHub.",
      radar: "Sigue vuelos y pilotos en tiempo real.",
      photos: "Comparte y descubre fotos de aviación.",
      connector: "Muestra tus sesiones de Infinite Flight en Discord.",
      forms: "Rellena y envía formularios de AeroHub.",
      support: "Respuestas y ayuda paso a paso para todos los productos AeroHub.",
      linkSoon: "Enlace próximamente",
    },
    storage: {
      subtitle: "Vuelos grabados por el Feeder en este ordenador. Son temporales.",
      flights: "Vuelos grabados",
      flightsDescription: "Sirven para la estela, los gráficos y el playback en AeroHub Radar.",
      total: (size, count) => `${size} en ${count} ${count === 1 ? "vuelo" : "vuelos"}`,
      empty: "Ningún vuelo grabado. Conecta el Feeder y vuela: el vuelo se graba aquí.",
      freeFlight: "Vuelo libre",
      points: (n) => `${n.toLocaleString()} puntos`,
      recording: "Grabando",
      paused: "En pausa: continúa si este vuelo vuelve",
      deletesIn: (time) => `Se borra solo en ${time}`,
      deleteNow: "Borrar ya",
      delete: "Borrar",
      deleteAll: "Borrar todo",
      confirmDeleteAll: "Confirmar",
      cancel: "Cancelar",
      howTitle: "Cómo funciona",
      how: [
        "Con el Feeder conectado, tu vuelo se graba en este ordenador una vez por segundo: posición, altitud, altura sobre el suelo, velocidades, rumbo y si estás en tierra.",
        "AeroHub Radar lo usa para mostrar la estela completa, los gráficos y el playback desde el despegue, aunque alguien abra el mapa a mitad del vuelo.",
        "Cada vuelo tiene su archivo. Si la conexión se cae (teléfono apagado, batería, internet, app cerrada o actualizada), el mismo vuelo continúa donde se quedó. Un vuelo nuevo siempre empieza un archivo nuevo.",
        "Un vuelo termina cuando sales de él en Infinite Flight, empiezas otro vuelo o no llega nada durante 30 minutos.",
        "1 hora después de terminar el vuelo, se borra solo. Es lo máximo que puede quedarse: puedes borrarlo antes, pero nunca guardarlo más tiempo.",
        "Borrar el vuelo que se está grabando reinicia la grabación desde ahora (la estela y los gráficos del mapa también empiezan desde ahora).",
        "Un vuelo ocupa unos 5 KB por minuto (cerca de 3 MB en 10 horas). No se graba nada más: ni otros pilotos, ni archivos, ni contraseñas.",
      ],
      guide: "Saber más sobre la grabación de los vuelos",
    },
    feeder: {
      subtitle: "Envía la posición de tu avión en Infinite Flight a AeroHub Radar.",
      status: "Estado",
      states: { off: "Desconectado", searching: "Buscando…", connected: "Conectado" },
      radar: { off: "", idle: "AeroHub Radar: solo los vuelos en un servidor Live aparecen en el mapa.", connecting: "Conectando con AeroHub Radar…", waiting: "Conectado a AeroHub Radar. Tu vuelo entra en el mapa cuando Infinite Flight lo muestre en línea.", on_map: "Tu vuelo está en directo en AeroHub Radar.", retrying: "Sin conexión con AeroHub Radar. Reintentando…", needs_login: "Tu sesión ha caducado. Vuelve a entrar para aparecer en AeroHub Radar.", not_verified: "Tu cuenta de Infinite Flight ya no está verificada, así que el vuelo no se envía a AeroHub Radar.", replaced: "Otro ordenador está enviando el vuelo de esta cuenta. Apaga y enciende el Feeder para enviarlo desde aquí." },
      detail: {
        off: (user) => `Conéctate para que el avión de ${user} aparezca en el mapa de AeroHub Radar.`,
        noIfcUser: "Vincula tu cuenta de Infinite Flight en AeroHub Radar para usar el Feeder.",
        notVerified: "Verifica tu cuenta de Infinite Flight en AeroHub Radar para usar el Feeder.",
        searchingAuto: (user) => `Buscando a ${user} en Infinite Flight en tu red Wi-Fi.`,
        searchingManual: (ip) => `Intentando llegar a Infinite Flight en ${ip}.`,
        connectedTo: (user, device) => `Conectado a ${user} en ${device}.`,
        otherUser: (user) => `Se encontró un Infinite Flight con la cuenta ${user}. No es tu cuenta, así que se ignoró.`,
      },
      live: {
        title: "Datos en vivo",
        waiting: "Esperando datos de Infinite Flight…",
        aircraft: "Avión",
        position: "Posición",
        altitude: "Altitud",
        groundSpeed: "Velocidad en tierra",
        heading: "Rumbo",
        verticalSpeed: "Velocidad vertical",
        onGround: "En tierra",
        route: "Plan de vuelo",
        noPlan: "Sin plan de vuelo",
        remaining: "Tiempo hasta el destino",
        distance: "Distancia hasta el destino",
        server: "Servidor",
        yes: "Sí",
        no: "No",
      },
      connect: "Conectar",
      cancel: "Cancelar",
      disconnect: "Desconectar",
      connection: "Conexión",
      mode: "Modo de conexión",
      modes: { auto: "Automático", manual: "Manual (IP)" },
      modeAutoDescription: "Encuentra Infinite Flight en la misma red Wi-Fi.",
      modeManualDescription: "Escribe la IP del dispositivo donde se ejecuta Infinite Flight.",
      ip: "IP del dispositivo",
      ipDescription: (port) => `Aparece en Infinite Flight. Puerto ${port}.`,
      updates: "Preferencias",
      rate: "Actualizaciones por segundo",
      rateDescription: "Más es más fluido; menos es más ligero para tu dispositivo.",
      rateOption: (n) => `${n} por segundo${n === 4 ? " (recomendado)" : ""}`,
      lockedHint: "Desconéctate para cambiar el modo de conexión o la IP.",
      discord: "Mostrar en mi Discord",
      discordDescription: "Tu avión, servidor, altitud y velocidad aparecen en tu perfil de Discord.",
      discordTime: "Mostrar en Discord",
      discordTimeDescription: "Con plan de vuelo. Sin plan, Discord muestra siempre el tiempo de vuelo.",
      discordTimes: { remaining: "Tiempo restante", elapsed: "Tiempo de vuelo" },
      autoStart: "Conectar automáticamente",
      autoStartDescription: "Al abrir la app, el Feeder empieza solo a buscar tu Infinite Flight.",
      howTo: "Cómo conectar",
      guide: "Guía paso a paso en AeroHub Support",
      steps: [
        "En Infinite Flight, abre Settings → General y activa \"Enable Infinite Flight Connect\".",
        "Pon este ordenador y el dispositivo de Infinite Flight en la misma red Wi-Fi.",
        "Empieza un vuelo y pulsa Conectar.",
      ],
    },
    legal: { terms: "Términos de servicio", privacy: "Política de privacidad" },
    license: {
      needed: "Necesita licencia",
      discordOnly: "Mostrar tu vuelo en Discord necesita una licencia de AeroHub Connector. El Feeder, el Almacenamiento y la mini ventana son gratis.",
      get: "Obtener licencia",
      freeDescription: "No activa. El Feeder, el Almacenamiento y la mini ventana son gratis; la licencia añade tu vuelo en Discord.",
      homeHint: "Esto es una vista previa. Para mostrarlo en tu perfil de Discord, necesitas una licencia.",
    },
    account: {
      subtitle: "Tu cuenta de AeroHub Radar.",
      radarAccount: "Cuenta de AeroHub Radar",
      license: "AeroHub Connector",
      licenseTitle: "Licencia",
      active: "Activa",
      since: (date) => `Desde el ${date}`,
      linkedAccounts: "Cuentas vinculadas",
      linked: "Vinculada",
      notLinked: "Sin vincular",
      grade: (grade) => `Grado ${grade}`,
      add: "Añadir",
      manage: "Gestionar cuenta en AeroHub Radar",
      signOut: "Cerrar sesión",
      signOutConfirm: "¿Cerrar sesión?",
      signOutText: "Tendrás que iniciar sesión de nuevo para usar AeroHub Connector.",
      cancel: "Cancelar",
    },
    settings: {
      subtitle: "Gestiona cómo funciona AeroHub Connector.",
      general: "General",
      language: "Idioma",
      languageDescription: "Elige el idioma de la app.",
      startWithWindows: "Iniciar con Windows",
      startWithWindowsDescription: "Abrir AeroHub Connector al encender el ordenador.",
      startAtLogin: "Abrir al iniciar sesión",
      startAtLoginDescription: "Abrir AeroHub Connector al iniciar sesión en tu Mac.",
      autopilot: "Piloto automático",
      discordAutopilot: "Abrir Discord automáticamente",
      discordAutopilotDescription: "Siempre que hay un vuelo (del Feeder o de nuestro servidor) y Discord está cerrado, la app lo abre para mostrar tu estado. Si sigue cerrado, vuelve a intentarlo cada 2 minutos.",
      test: "Probar",
      testDescription: "Abrir Discord ahora para comprobar que funciona.",
      testButton: "Probar",
      testOpening: "Abriendo…",
      testDone: "Listo",
      pip: "Fijar estado en pantalla",
      autoPip: "Fijar estado en pantalla automáticamente",
      autoPipDescription: "Muestra tu estado en una mini ventana al minimizar la app.",
      autoPipWhenCovered: "También cuando otras ventanas tapan la app",
      autoPipOnlyFlying: "Solo durante un vuelo",
      pinSound: "Sonido al fijar",
      pinSoundDescription: "Suena cuando aparece la mini ventana.",
      pinSoundListen: "Escuchar sonido",
      pinSounds: {
        off: "Desactivado",
        plim: "Plim",
        drop: "Gota",
        marimba: "Marimba",
        kalimba: "Kalimba",
        wood: "Toque de madera",
      },
      updates: "Actualizaciones",
      autoUpdate: "Instalar actualizaciones automáticamente",
      autoUpdateDescription: "Actualizar AeroHub Connector en cuanto salga una nueva versión.",
      version: "Versión actual",
      versionDescription: (version) => `Tienes la versión ${version}.`,
      checkUpdates: "Buscar actualizaciones",
    },
  },
};

const fr: Translations = {
  buttons: { next: "Suivant", back: "Retour", install: "Installer", finish: "Terminer" },
  window: { minimize: "Réduire", close: "Fermer" },
  welcome: {
    title: "Vos vols, en direct sur Discord.",
    description: (
      <>
        AeroHub Connector affiche vos sessions Infinite Flight sur Discord : votre{" "}
        <strong>avion</strong>, votre <strong>itinéraire</strong> et votre <strong>serveur</strong> en
        direct sur votre profil, tout en restant discret en arrière-plan.
      </>
    ),
    by: "par",
  },
  terms: {
    title: "Conditions d'utilisation",
    subtitle: "Consultez les points clés et acceptez pour continuer.",
    points: [
      { title: "Usage personnel", body: "Réservé à un usage personnel et non commercial." },
      { title: "Vos données", body: "Seuls votre avion, votre itinéraire et votre serveur sont lus." },
      { title: "Services tiers", body: "Les conditions de Discord et d'Infinite Flight s'appliquent aussi." },
      { title: "Mises à jour", body: "Publiées pour améliorer l'app et sa sécurité." },
      { title: "Aucune garantie", body: "Fourni tel quel, sans garantie d'aucune sorte." },
    ],
    notice: (
      <>
        Ceci n'est qu'un résumé. Lisez les {terms("Conditions d'utilisation")} et la{" "}
        {privacy("Politique de confidentialité")} complètes sur notre site.
      </>
    ),
    accept: (
      <>
        J'ai lu et j'accepte les {terms("Conditions d'utilisation")} et la{" "}
        {privacy("Politique de confidentialité")}.
      </>
    ),
  },
  options: {
    title: "Options d'installation",
    subtitle: "Choisissez comment installer AeroHub Connector.",
    language: "Langue",
    installLocation: "Emplacement d'installation",
    change: "Modifier",
    chooseFolder: "Choisir l'emplacement d'installation",
    desktopShortcut: {
      title: "Créer un raccourci sur le bureau",
      description: "Ajoute une icône AeroHub Connector sur votre bureau.",
    },
    startWithWindows: {
      title: "Lancer avec Windows",
      description: "S'ouvre automatiquement à l'ouverture de session Windows.",
    },
  },
  installing: {
    title: "Installation d'AeroHub Connector",
    subtitle: "Cela ne prendra qu'un instant.",
    completeTitle: "Installation terminée",
    completeSubtitle: "Tout est prêt.",
    errorTitle: "L'installation a échoué",
    errorSubtitle: "Un problème est survenu. Fermez l'installateur et réessayez.",
    preparing: "Préparation de l'installation…",
    copying: "Copie",
    tasks: {
      desktopShortcut: "Création du raccourci sur le bureau…",
      startWithWindows: "Ajout au démarrage de Windows…",
      registering: "Enregistrement d'AeroHub Connector…",
      finishing: "Finalisation…",
    },
    complete: "Installation terminée",
    sizeOf: (copied, total) => `${copied} sur ${total}`,
    minutesLeft: (minutes) => `Environ ${minutes} min restantes`,
    secondsLeft: (seconds) => `Environ ${seconds} s restantes`,
    calculating: "Calcul du temps restant…",
    done: "Terminé",
  },
  done: {
    title: "AeroHub Connector est prêt !",
    text: "Vos vols apparaîtront désormais sur Discord dès que vous volez.",
    launch: "Lancer AeroHub Connector",
  },
  welcomeScreen: {
    splash: "Bienvenue",
    title: "Bienvenue à bord",
    subtitle: "Connectez-vous avec votre compte AeroHub Radar pour partager vos vols sur Discord.",
    signIn: "Se connecter avec AeroHub Radar",
    processing: "Traitement en cours",
    confirmCode: "Confirmez ce code dans votre navigateur",
    reopenBrowser: "Rouvrir le navigateur",
    cancel: "Annuler",
  },
  signIn: {
    successTitle: "Vous êtes connecté !",
    successSubtitle: "Votre compte AeroHub Radar est maintenant lié.",
    account: "Compte AeroHub Radar",
    errorTitle: "Échec de la connexion",
    errorMessage: "Impossible de vous connecter à AeroHub Radar. Vérifiez votre connexion et réessayez.",
    tryAgain: "Réessayer",
    deniedTitle: "Accès non disponible",
    deniedMessage: "Votre compte AeroHub Radar n'a pas accès à AeroHub Connector. Obtenez-le sur notre site, puis réessayez.",
    getConnector: "Obtenir AeroHub Connector",
  },
  update: {
    checking: "Recherche de mises à jour",
    availableTitle: "Mise à jour disponible",
    availableSubtitle: (version) => `AeroHub Connector ${version} est prêt à être installé.`,
    size: "Taille",
    released: "Publiée",
    whatsNew: "Nouveautés",
    notesFallback: "Améliorations et corrections.",
    latestTitle: "Tout est à jour",
    latestText: (version) => `AeroHub Connector ${version} est la dernière version.`,
    errorTitle: "Impossible de rechercher les mises à jour",
    errorText: "Vérifiez votre connexion internet et réessayez.",
    retry: "Réessayer",
    updateButton: "Mettre à jour",
    updatingTitle: "Mise à jour d'AeroHub Connector",
    updatingSubtitle: "Gardez l'app ouverte.",
    downloading: "Téléchargement",
    tasks: {
      backup: "Sauvegarde de vos paramètres…",
      apply: "Application de la mise à jour…",
      finishing: "Finalisation…",
    },
    doneTitle: "Mise à jour terminée !",
    doneText: (version) => `AeroHub Connector est maintenant en version ${version}.`,
    openApp: "Ouvrir AeroHub Connector",
  },
  app: {
    nav: { home: "Accueil", products: "Produits", feeder: "Feeder", storage: "Stockage", settings: "Paramètres", account: "Compte" },
    links: { radar: "AeroHub Radar", photos: "AeroHub Photos", connector: "AeroHub Connector" },
    home: {
      title: "Accueil",
      greeting: (name) => `Bon retour, ${name}`,
      status: { flying: "En vol", online: "En ligne", offline: "Hors ligne" },
      statusDetail: {
        flying: "Votre vol est en direct sur Discord.",
        online: "Connecté. En attente du décollage.",
        offline: "Infinite Flight n'est pas lancé.",
      },
      aircraft: "Avion",
      server: "Serveur",
      flightTime: "Temps de vol",
      servers: { casual: "Casual", training: "Training", expert: "Expert" },
      discordPreview: "Aperçu Discord",
      pip: "Épingler le statut à l'écran",
      pipOpen: "Ouvrir AeroHub Connector",
      freeFlight: "Vol libre",
      noFlightPlan: "Sans plan de vol",
      noStatusTitle: "Aucun statut disponible",
      noStatusText: "Quand vous volez sur Infinite Flight, votre vol s’affiche ici et sur votre profil Discord.",
      presenceServer: (server) => `Serveur ${server}`,
      presenceButton: "Voir le vol sur AeroHub Radar",
      presenceDiscordButton: "Rejoindre AeroHub Radar Discord",
      remaining: (time) => `${time} restant`,
      playing: "Joue à",
      elapsed: (time) => `${time} écoulé`,
    },
    // PROVISÓRIO: rever as descrições de cada produto
    products: {
      subtitle: "Découvrez l'univers AeroHub.",
      radar: "Suivez les vols et les pilotes en temps réel.",
      photos: "Partagez et découvrez des photos d'aviation.",
      connector: "Affichez vos sessions Infinite Flight sur Discord.",
      forms: "Remplissez et envoyez des formulaires AeroHub.",
      support: "Réponses et aide pas à pas pour tous les produits AeroHub.",
      linkSoon: "Lien bientôt disponible",
    },
    storage: {
      subtitle: "Vols enregistrés par le Feeder sur cet ordinateur. Ils sont temporaires.",
      flights: "Vols enregistrés",
      flightsDescription: "Utilisés pour la trace, les graphiques et le playback sur AeroHub Radar.",
      total: (size, count) => `${size} dans ${count} ${count === 1 ? "vol" : "vols"}`,
      empty: "Aucun vol enregistré. Connectez le Feeder et volez : le vol est enregistré ici.",
      freeFlight: "Vol libre",
      points: (n) => `${n.toLocaleString()} points`,
      recording: "Enregistrement",
      paused: "En pause : continue si ce vol revient",
      deletesIn: (time) => `Supprimé automatiquement dans ${time}`,
      deleteNow: "Supprimer maintenant",
      delete: "Supprimer",
      deleteAll: "Tout supprimer",
      confirmDeleteAll: "Confirmer",
      cancel: "Annuler",
      howTitle: "Comment ça marche",
      how: [
        "Avec le Feeder connecté, votre vol est enregistré sur cet ordinateur une fois par seconde : position, altitude, hauteur au-dessus du sol, vitesses, cap et si vous êtes au sol.",
        "AeroHub Radar l'utilise pour afficher la trace complète, les graphiques et le playback depuis le décollage, même si quelqu'un ouvre la carte en plein vol.",
        "Chaque vol a son propre fichier. Si la connexion tombe (téléphone éteint, batterie, internet, app fermée ou mise à jour), le même vol continue là où il s'était arrêté. Un nouveau vol commence toujours un nouveau fichier.",
        "Un vol se termine quand vous le quittez dans Infinite Flight, commencez un autre vol, ou si rien n'arrive pendant 30 minutes.",
        "1 heure après la fin du vol, il est supprimé automatiquement. C'est le maximum : vous pouvez le supprimer avant, mais jamais le garder plus longtemps.",
        "Supprimer le vol en cours d'enregistrement recommence l'enregistrement à partir de maintenant (la trace et les graphiques sur la carte aussi).",
        "Un vol occupe environ 5 Ko par minute (près de 3 Mo pour 10 heures). Rien d'autre n'est enregistré : ni autres pilotes, ni fichiers, ni mots de passe.",
      ],
      guide: "En savoir plus sur l'enregistrement des vols",
    },
    feeder: {
      subtitle: "Envoyez la position de votre avion Infinite Flight à AeroHub Radar.",
      status: "État",
      states: { off: "Déconnecté", searching: "Recherche…", connected: "Connecté" },
      radar: { off: "", idle: "AeroHub Radar : seuls les vols sur un serveur Live apparaissent sur la carte.", connecting: "Connexion à AeroHub Radar…", waiting: "Connecté à AeroHub Radar. Votre vol rejoint la carte dès qu'Infinite Flight l'affiche en ligne.", on_map: "Votre vol est en direct sur AeroHub Radar.", retrying: "AeroHub Radar est injoignable. Nouvel essai…", needs_login: "Votre session a expiré. Reconnectez-vous pour apparaître sur AeroHub Radar.", not_verified: "Votre compte Infinite Flight n'est plus vérifié : le vol n'est pas envoyé à AeroHub Radar.", replaced: "Un autre ordinateur envoie le vol de ce compte. Éteignez et rallumez le Feeder pour l'envoyer depuis celui-ci." },
      detail: {
        off: (user) => `Connectez-vous pour afficher l’avion de ${user} sur la carte AeroHub Radar.`,
        noIfcUser: "Associez votre compte Infinite Flight sur AeroHub Radar pour utiliser le Feeder.",
        notVerified: "Vérifiez votre compte Infinite Flight sur AeroHub Radar pour utiliser le Feeder.",
        searchingAuto: (user) => `Recherche de ${user} dans Infinite Flight sur votre réseau Wi-Fi.`,
        searchingManual: (ip) => `Tentative de connexion à Infinite Flight sur ${ip}.`,
        connectedTo: (user, device) => `Connecté à ${user} sur ${device}.`,
        otherUser: (user) => `Infinite Flight trouvé avec le compte ${user}. Ce n’est pas votre compte, il a été ignoré.`,
      },
      live: {
        title: "Données en direct",
        waiting: "En attente des données d’Infinite Flight…",
        aircraft: "Avion",
        position: "Position",
        altitude: "Altitude",
        groundSpeed: "Vitesse sol",
        heading: "Cap",
        verticalSpeed: "Vitesse verticale",
        onGround: "Au sol",
        route: "Plan de vol",
        noPlan: "Pas de plan de vol",
        remaining: "Temps jusqu’à destination",
        distance: "Distance jusqu’à destination",
        server: "Serveur",
        yes: "Oui",
        no: "Non",
      },
      connect: "Connecter",
      cancel: "Annuler",
      disconnect: "Déconnecter",
      connection: "Connexion",
      mode: "Mode de connexion",
      modes: { auto: "Automatique", manual: "Manuel (IP)" },
      modeAutoDescription: "Trouve Infinite Flight sur le même réseau Wi-Fi.",
      modeManualDescription: "Saisissez l'IP de l'appareil qui exécute Infinite Flight.",
      ip: "IP de l'appareil",
      ipDescription: (port) => `Affichée dans Infinite Flight. Port ${port}.`,
      updates: "Préférences",
      rate: "Mises à jour par seconde",
      rateDescription: "Plus = plus fluide ; moins = plus léger pour votre appareil.",
      rateOption: (n) => `${n} par seconde${n === 4 ? " (recommandé)" : ""}`,
      lockedHint: "Déconnectez-vous pour changer le mode de connexion ou l’IP.",
      discord: "Afficher sur mon Discord",
      discordDescription: "Votre avion, serveur, altitude et vitesse apparaissent sur votre profil Discord.",
      discordTime: "Afficher sur Discord",
      discordTimeDescription: "Avec un plan de vol. Sans plan, Discord affiche toujours le temps de vol.",
      discordTimes: { remaining: "Temps restant", elapsed: "Temps de vol" },
      autoStart: "Connexion automatique",
      autoStartDescription: "À l’ouverture de l’app, le Feeder commence seul à chercher votre Infinite Flight.",
      howTo: "Comment se connecter",
      guide: "Guide pas à pas sur AeroHub Support",
      steps: [
        "Dans Infinite Flight, ouvrez Settings → General et activez \"Enable Infinite Flight Connect\".",
        "Mettez cet ordinateur et l'appareil Infinite Flight sur le même réseau Wi-Fi.",
        "Lancez un vol et appuyez sur Connecter.",
      ],
    },
    legal: { terms: "Conditions d'utilisation", privacy: "Politique de confidentialité" },
    license: {
      needed: "Licence requise",
      discordOnly: "Afficher votre vol sur Discord nécessite une licence AeroHub Connector. Le Feeder, le Stockage et la mini fenêtre sont gratuits.",
      get: "Obtenir une licence",
      freeDescription: "Non active. Le Feeder, le Stockage et la mini fenêtre sont gratuits ; la licence ajoute votre vol sur Discord.",
      homeHint: "Ceci est un aperçu. Pour l'afficher sur votre profil Discord, il vous faut une licence.",
    },
    account: {
      subtitle: "Votre compte AeroHub Radar.",
      radarAccount: "Compte AeroHub Radar",
      license: "AeroHub Connector",
      licenseTitle: "Licence",
      active: "Active",
      since: (date) => `Depuis le ${date}`,
      linkedAccounts: "Comptes liés",
      linked: "Lié",
      notLinked: "Non lié",
      grade: (grade) => `Grade ${grade}`,
      add: "Ajouter",
      manage: "Gérer le compte sur AeroHub Radar",
      signOut: "Se déconnecter",
      signOutConfirm: "Se déconnecter ?",
      signOutText: "Vous devrez vous reconnecter pour utiliser AeroHub Connector.",
      cancel: "Annuler",
    },
    settings: {
      subtitle: "Gérez le fonctionnement d'AeroHub Connector.",
      general: "Général",
      language: "Langue",
      languageDescription: "Choisissez la langue de l'app.",
      startWithWindows: "Lancer avec Windows",
      startWithWindowsDescription: "Ouvrir AeroHub Connector au démarrage de l'ordinateur.",
      startAtLogin: "Ouvrir à la connexion",
      startAtLoginDescription: "Ouvrir AeroHub Connector à l’ouverture de session sur votre Mac.",
      autopilot: "Pilote automatique",
      discordAutopilot: "Ouvrir Discord automatiquement",
      discordAutopilotDescription: "Dès qu'il y a un vol (du Feeder ou de notre serveur) et que Discord est fermé, l'app l'ouvre pour afficher votre statut. S'il reste fermé, elle réessaie toutes les 2 minutes.",
      test: "Tester",
      testDescription: "Ouvrir Discord maintenant pour vérifier que tout marche.",
      testButton: "Tester",
      testOpening: "Ouverture…",
      testDone: "Fait",
      pip: "Épingler le statut à l'écran",
      autoPip: "Épingler le statut automatiquement",
      autoPipDescription: "Affiche votre statut dans une mini fenêtre quand vous réduisez l'app.",
      autoPipWhenCovered: "Aussi quand l'app est cachée par d'autres fenêtres",
      autoPipOnlyFlying: "Seulement pendant un vol",
      pinSound: "Son d'épinglage",
      pinSoundDescription: "Joué quand la mini fenêtre apparaît.",
      pinSoundListen: "Écouter le son",
      pinSounds: {
        off: "Désactivé",
        plim: "Plim",
        drop: "Goutte",
        marimba: "Marimba",
        kalimba: "Kalimba",
        wood: "Toc en bois",
      },
      updates: "Mises à jour",
      autoUpdate: "Installer les mises à jour automatiquement",
      autoUpdateDescription: "Mettre à jour AeroHub Connector dès qu'une nouvelle version sort.",
      version: "Version actuelle",
      versionDescription: (version) => `Vous utilisez la version ${version}.`,
      checkUpdates: "Rechercher des mises à jour",
    },
  },
};

export const TRANSLATIONS: Record<Language, Translations> = { en, pt, es, fr };
