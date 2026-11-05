# K95 profile key and RGB scenes

The K95 profile key cycles the cluster's persisted `SwitchProfiles` list in
`database/profiles/cluster.json`. To include a keyboard-only white scene:

```json
"SwitchProfiles": ["static", "keyboard-white", "off"]
```

- `static`: the configured cluster color, also followed by the K95.
- `keyboard-white`: black frames for the cluster; static white for the K95.
- `off`: black frames for the cluster and the K95.

Brightness remains independently controlled and is preserved by profile changes.
A keyboard brightness of zero can therefore make the keyboard look off while the
selected group profile is still `static`. The keyboard-only scene also respects
zero brightness. The white scene does not replace the configured static color.

Profile transitions and cluster frame generation are serialized. Each animation
worker owns its cancellation channel, and a replaced worker cannot emit another
frame. This prevents rapid transitions from replacing the shared worker state
while another transition or frame is using it. Missing effect data also produces
a full-size black frame, so downstream controllers are not left unchanged by a
three-byte fallback.

Validation includes concurrent profile rotation under Go's race detector, full
black-frame coverage for four 10-LED DIMMs plus six 16-LED fans, and K95 scene
selection tests. On the configured workstation, 120 concurrent API changes were
followed by OFF/static/keyboard-white/OFF checks with the camera and unchanged
brightness settings. The keyboard-white scene was also checked after a service
restart. These tests do not identify the cause of earlier intermittent failures
within individual fan rings.
