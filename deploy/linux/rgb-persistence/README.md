# RGB persistence on the tested K95 / Commander PRO / DDR4 system

The fork includes these corrections on `main`:

- Load the cluster OFF effect after restart and transmit black frames.
- Force four black initialization frames to every detected DIMM, bypassing the SMBus write cache.
- Resolve SMBus symlinks when looking up RAM temperature sensors.
- Cycle the cluster through `static` and `off` using the K95 profile key; apply the selected effect and colors to the keyboard locally and persist them.
- Debounce duplicate K95 key reports and refresh the web UI after external profile changes.

RAM and Commander PRO belong to the RGB cluster. The K95 uses its local RGB writer and follows the cluster when its profile key is pressed. Disable OpenRGB integration for these devices when using this configuration. Fan port mappings remain device configuration, not part of these patches.

## Persistent Linux configuration

These files capture the configuration used on the tested machine. The udev rule matches its Intel I801 adapter by name, rather than a boot-dependent bus number. Adjust that match for another motherboard after checking `/sys/class/i2c-dev/i2c-*/name`.

Install `98-corsair-memory.rules` in `/etc/udev/rules.d/` and `memory-device.conf` in `/etc/systemd/system/OpenLinkHub.service.d/`. The rule creates `/dev/i2c-openlinkhub-memory`, grants the `openlinkhub` group access, and exposes a systemd device unit. The service drop-in waits for that device.

Set `memorySmBus` to `i2c-openlinkhub-memory` in `/opt/OpenLinkHub/config.json`. This changes the memory serial to `i2copenlinkhubmemory`. When migrating existing settings, copy the old RAM profile and RGB files in `database/profiles/` and `database/rgb/` to that serial; update profile `Serial` and `Path` fields and retain ownership by the service account. Keep a backup of the old files.

Install `openlinkhub-cpro.conf` in `/etc/modprobe.d/` to prevent the kernel Commander PRO hardware-monitoring driver from issuing commands concurrently with OpenLinkHub. This does not change fan curves or RGB port assignments.

Reload udev rules, trigger the i2c-dev subsystem, reload systemd, and restart OpenLinkHub after the files and RAM settings are ready. Confirm the stable device link resolves and all four DIMMs appear in the API. A physical reboot and visual inspection are still necessary to verify the LEDs on a particular machine.

## Build and verification

Use Go 1.26 or newer and the normal OpenLinkHub native build dependencies:

```sh
CGO_CFLAGS_ALLOW='-fno-strict-overflow' go test ./src/cluster ./src/devices/k95platinum ./src/devices/memory ./src/smbus
CGO_CFLAGS_ALLOW='-fno-strict-overflow' go build .
```

The running machine must use a binary built from this fork to retain these changes; installing an upstream binary replaces them. Runtime profiles and machine-specific state are not checked into Git.
