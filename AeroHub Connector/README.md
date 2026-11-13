# AeroHub Connector — source code

AeroHub Connector is a desktop app for Windows and Mac that shows your Infinite Flight flight on your Discord profile, and can send your flight to AeroHub Radar with the Feeder.

We publish the source code here for one reason: **so you can check what the app does on your computer.** It is not open source. You may read it and build it to compare it with the official app, and nothing else. See the [licence](LICENSE).

- Version in this folder: **1.0.0** (the same code as the official release)
- Official download: https://connector.aerohubradar.com
- What the app reads and sends, field by field: [DATA.md](DATA.md)

## What the app does

- **Signs you in** with your AeroHub Radar account and checks whether you have an AeroHub Connector licence. The Feeder, Storage and the mini window are free; the Discord features need a licence.
- **Shows your flight on Discord** (Rich Presence, with a licence): route, aircraft, server, callsign and flight time. Discord only receives this through the Discord app on your own computer.
- **Reads your flight status** from AeroHub Radar (with a licence), so the app and Discord show your real flight.
- **Feeder (optional, off until you turn it on):** connects to Infinite Flight on your local network with the official Infinite Flight Connect API, reads your aircraft's position and flight plan, and, only during a flight on a Live server, sends it to the AeroHub Radar server so your flight appears on the map.
- **Stores Feeder flights on your computer for a short time**, so you can see them in the app. Each flight file is deleted automatically 1 hour after the flight ends, or when you delete it.
- **Checks for updates** and installs them only if they are signed by AeroHub Group.

## What the app does NOT do

- It does not read, scan or upload your files, documents or photos.
- It does not take screenshots or record your screen.
- It does not use your camera or microphone.
- It does not record your keyboard or mouse.
- It does not read other apps, your browser or your passwords.
- It does not include ads, analytics or tracking tools.
- It does not control your aircraft. The Feeder only **reads** from Infinite Flight.
- The Feeder only connects to an Infinite Flight device signed in with **your own** Infinite Flight account (the one linked to your AeroHub Radar account). If it finds someone else's device, it disconnects.

## Where the app connects

| Where | Why | When |
|---|---|---|
| Your Infinite Flight device on your local network (UDP 15000 to find it, TCP 10112 to read) | Feeder: read your aircraft | Only with the Feeder on |
| `aerohubradar.com` (encrypted WebSocket, `wss://`) | Feeder: send your flight to the map | Only during a flight on a Live server |
| AeroHub Radar account service (Supabase, HTTPS) | Sign in, licence, flight status, device name in your account | While you are signed in |
| Discord app on your computer (local connection) | Show your flight on your profile | While you fly, if Discord is open |
| `connector.aerohubradar.com` and GitHub releases (HTTPS) | Updates and airline logos for Discord | When checking for updates, and on Discord |

The full list of every value read and sent is in [DATA.md](DATA.md).

## How to check it yourself

1. **Read the code.** The main parts:
   - `src-tauri/src/feeder.rs` — reads Infinite Flight (Connect API)
   - `src-tauri/src/feeder_uplink.rs` — sends the Feeder flight to AeroHub Radar
   - `src-tauri/src/discord.rs` and `src/lib/useDiscordPresence.ts` — Discord
   - `src/lib/flightStatus.ts`, `src/lib/radarAccount.ts` — account, licence and flight status
   - `src-tauri/src/flight_log.rs` — Feeder flights stored on your computer
2. **Watch the network.** With a tool such as Wireshark, you can see that the app only connects to the places in the table above.
3. **Compare the download.** Check the SHA-256 of the file you downloaded against the list below.
   - Windows (PowerShell): `Get-FileHash .\AeroHub-Connector-Setup.exe -Algorithm SHA256`
   - Mac (Terminal): `shasum -a 256 AeroHub-Connector-Mac.dmg`

### SHA-256 of version 1.0.0

| File | SHA-256 |
|---|---|
| `AeroHub-Connector-Setup.exe` (Windows, from the website) | `6720a577c58031002b540e0598e8c731aef98af05ca27c2d84c9a1c2a735164f` |
| `AeroHub.Connector_1.0.0_x64-setup.exe` (Windows app installer) | `348282df4533833e4f78af3304de81fe6d17fef85eb75df989fd93d87f385977` |
| `AeroHub-Connector-Mac.dmg` (Mac) | `8f7ad478106165eecd27fb9a7b44f7125f2908c4bb2192838eebf67881b2437f` |

The files are published at https://github.com/valdemarbanganga13/aerohub-connector-releases/releases/tag/v1.0.0

## Building it (only to check it)

You need Node.js 22, Rust (stable) and the Tauri 2 requirements for your system.

```bash
npm install
npm run tauri build
```

Notes:
- Copy `.env.example` to `.env`. The official app is built with public values only (the address of the AeroHub Radar account service and its public key). No secret is needed to build.
- The official builds are made by GitHub Actions with `.github/workflows/release.yml`. Updates are signed with a private key that is not part of this code, so a build you make yourself will not be signed and its SHA-256 will not match the official files.
- **Airline logos are not included here** (they are trademarks of the airlines). A build from this folder shows a generic icon instead of the airline logo; everything else works the same.

## Reporting a problem

If you find something that looks wrong, or a security issue, please tell us: https://aerohubradar.com/contact

## Licence and trademarks

The code in this folder is published under the [AeroHub Connector Source Viewing License](LICENSE): you may read it and build it to check it, but you may not use, copy, change or share it.

AeroHub, AeroHub Group, AeroHub Radar, AeroHub Photos and AeroHub Connector are names of AeroHub Group. Infinite Flight is a trademark of Infinite Flight LLC; Discord is a trademark of Discord Inc. AeroHub Connector is an independent app and is not affiliated with Infinite Flight LLC or Discord Inc.
