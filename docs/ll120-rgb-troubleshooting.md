# LL120 center-only lighting and dark downstream fans

A Commander PRO configured for six LL120 fans needs 96 RGB LEDs. Each fan has four center LEDs and twelve outer LEDs. Keep the configured fan type and count consistent with the connected hardware when investigating a partial lighting failure.

The Corsair RGB fan hub carries lighting data in series. A failure partway through one fan can also affect later fans, even though their motors continue spinning. Follow the connection order in the [Corsair LL120 installation guide](https://assets.corsair.com/image/upload/corsairmedia/sys_master/productcontent/LL120_RGB_FAN_QSG_WEB.pdf).

## Separate software state from the RGB path

1. Observe the LEDs directly or with a camera. A successful API response or a complete USB frame does not prove that the LEDs displayed it.
2. Confirm the configured LED count, cluster membership, and integration settings. Preserve the fan curves and port mappings while collecting evidence.
3. If necessary, compare against a second controller implementation with OpenLinkHub stopped. Restrict that test to the intended device and restore OpenLinkHub afterward.
4. Shut down and disconnect PC power before changing connections. Exchange the suspect fan's RGB connector with the last fan's RGB connector on the hub; leave the motor/PWM connectors alone. Observe whether the fault follows the fan, stays at a hub position, or disappears after reconnection. Do not leave gaps in the hub's occupied ports.
5. If lighting recovers, test repeated OFF/static changes using both the API and the keyboard profile key. Check all inner and outer rings, RAM, and keyboard. Restart the service with static saved, and again with OFF saved, then verify both the startup state and the next profile change.

A spontaneous recovery does not by itself identify the failing component or prove the problem is permanently fixed.

## Observed recovery on the tested system

With six LL120 fans on one Commander PRO RGB output, the first three fans worked, the fourth showed only its center LEDs, and the fifth and sixth were dark. The same visible failure occurred with the original OpenLinkHub 0.9.4 binary, direct lighting commands, and an independent native OpenRGB instance while OpenLinkHub was stopped.

Exchanging the RGB connectors in hub positions 4 and 6 restored full illumination. After that change, camera checks passed two API OFF/static cycles, four synchronized profile transitions from the K95 profile key, a service restart with static saved, and a service restart with OFF saved followed by another complete OFF/static/OFF check. All six fans, all four DIMMs, and the keyboard responded correctly in the observed checks. The final selected profile was OFF.

This recovery required no additional software patch. Reconnection changed the behavior, but the exact contact, fan, or hub component responsible was not isolated. These observations cover profile changes and service restarts; they do not establish cold-boot behavior or long-term reliability.

## Avoid misleading USB telemetry during diagnosis

Do not inject raw HID commands through another handle while merely suspending OpenLinkHub: input reports can queue on the service's existing handle and make later sensor readings appear incorrect. Stop the service, finish and close the diagnostic connection, then restart the service to obtain a clean reply stream.
