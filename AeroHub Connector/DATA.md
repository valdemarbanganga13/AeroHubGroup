# What AeroHub Connector reads and sends

This page lists every value the app reads from Infinite Flight and everything it sends, for version 1.0.0. The code is the final word: each section names the file to check.

## 1. Read from Infinite Flight (Feeder)

Only with the Feeder turned on. The app talks to your Infinite Flight device with the official **Infinite Flight Connect API v2** (TCP port 10112). It only **reads**: it never writes to Infinite Flight. File: `src-tauri/src/feeder.rs`.

**Finding the device:** the app listens for the announcement Infinite Flight sends on your local network (UDP port 15000), or uses the IP address you type in the app.

**Checking it is you:** after connecting, the app reads `infiniteflight/current_user` and compares it with the Infinite Flight account linked to your AeroHub Radar account. If it is someone else, it disconnects. This is checked again every 10 seconds.

**Every update (1 to 10 times per second, your choice in the app):**

| Connect API state | Name in the app |
|---|---|
| `aircraft/0/latitude` | latitude |
| `aircraft/0/longitude` | longitude |
| `aircraft/0/altitude_msl` | altitudeMsl |
| `aircraft/0/altitude_agl` | altitudeAgl |
| `aircraft/0/heading_true` | headingTrue |
| `aircraft/0/groundspeed` | groundSpeed |
| `aircraft/0/indicated_airspeed` | indicatedAirspeed |
| `aircraft/0/true_airspeed` | trueAirspeed |
| `aircraft/0/mach_speed` | mach |
| `aircraft/0/oat` | oat |
| `aircraft/0/headwind_component` | headwind |
| `aircraft/0/crosswind_component` | crosswind |
| `environment/wind_direction_true` | windFromTrue |
| `environment/wind_velocity` | windSpeed |
| `aircraft/0/vertical_speed` | verticalSpeed |
| `aircraft/0/pitch` | pitch |
| `aircraft/0/bank` | bank |
| `aircraft/0/is_on_ground` | onGround |
| `aircraft/0/name` | aircraft |
| `aircraft/0/livery` | livery |
| `infiniteflight/app_state` | appState |
| `infiniteflight/live/current_server/name` | server |

**Every 10 seconds:** `aircraft/0/flightplan/destination_waypoint_name`, `aircraft/0/flightplan/destination_ete`, `aircraft/0/flightplan/destination_dist`.

**Every 30 seconds:** `aircraft/0/flightplan`, `aircraft/0/flightplan/origin_airport`, `aircraft/0/flightplan/coordinates`, `aircraft/0/flightplan/route`, `aircraft/0/livery_id`, `infiniteflight/live/current_flight/id`.

The app also reads the Connect API "manifest" (the list of available states and their IDs), which is how it finds the states above.

## 2. Sent to AeroHub Radar (Feeder)

Only during a flight on a **Live** server (Casual, Training or Expert), never in Solo. Sent over an encrypted WebSocket to `wss://aerohubradar.com/api/feeder/ws`. File: `src-tauri/src/feeder_uplink.rs`.

| Message | Contents | How often |
|---|---|---|
| Session | Your AeroHub Radar sign-in token, so the server knows the flight is yours. Sent first, inside the encrypted connection (never in the address). | Once per connection |
| Position | latitude, longitude, altitudeMsl, altitudeAgl, headingTrue, groundSpeed, indicatedAirspeed, trueAirspeed, mach, oat, headwind, crosswind, windFromTrue, windSpeed, verticalSpeed, pitch, bank, onGround | At most once per second |
| Flight | server, flightKey, planOrigin, planDestination, originalDestination, divertedTo, destinationEte, destinationDist, takeoffAt, landedAt | Only when something changes |
| Flight plan | planCoordinates, planNames | Only when the plan changes |

Your pilot name is not sent by the app: the server takes it from your AeroHub Radar account.

## 3. Stored on your computer

File: `src-tauri/src/flight_log.rs`.

- **Feeder flights:** one point per second of each Feeder flight, in the app's data folder, so you can see them in the Storage page. Each flight file is deleted 1 hour after the flight ends, or when you delete it.
- **Settings:** your choices in the app (language, sounds, Feeder options).
- **Your sign-in session**, so you stay signed in.

## 4. AeroHub Radar account service

The app uses the AeroHub Radar account service (Supabase) over HTTPS. Files: `src/lib/supabase.ts`, `src/lib/radarAccount.ts`, `src/lib/flightStatus.ts`, `src/lib/account.tsx`.

| What | Why |
|---|---|
| Sign in (through the AeroHub Radar website) | Use your AeroHub Radar account in the app |
| Read your own profile | Your name, picture and linked Infinite Flight account |
| Read your own licence | Check you have AeroHub Connector |
| Read your own flight status | Show your real flight in the app and on Discord |
| `touch_activity` | Mark your account as active, so it is not removed for inactivity |
| `connector_device_ping` with your computer's name | Show "AeroHub Connector on <your computer>" in your account, so you can see and disconnect your devices |

The app can only read **your own** rows: the account service blocks access to anyone else's data.

## 5. Discord

File: `src-tauri/src/discord.rs`, `src/lib/useDiscordPresence.ts`. Sent to the Discord app on your own computer (local connection), which shows it on your profile:

- Route (for example `LPPT → KJFK`) or "Free flight", and the aircraft
- Server, callsign and, with the Feeder, altitude and speed
- Start time and, if known, time remaining
- Airline logo (a link to `connector.aerohubradar.com/airline-logos/…`)
- Two buttons: view the flight on AeroHub Radar, join the AeroHub Radar Discord

Nothing is sent to Discord when you are not flying.

## 6. Updates

File: `src/lib/updater.ts`. The app reads `https://connector.aerohubradar.com/updates/latest.json`, which points to the latest release on GitHub. An update is installed only if its signature matches the AeroHub Group public key built into the app.
