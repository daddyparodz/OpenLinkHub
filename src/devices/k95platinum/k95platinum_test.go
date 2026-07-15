package k95platinum

import (
	"OpenLinkHub/src/keyboards"
	"testing"
	"time"
)

func TestProfileKeyReportInvokesSwitchOnce(t *testing.T) {
	const profileKeyHash = "1180591620717411303424" // 1 << 70

	keyboard := &keyboards.Keyboard{
		Row: map[int]keyboards.Row{
			0: {
				Keys: map[int]keyboards.Key{
					20: {
						KeyHash:       []string{profileKeyHash},
						ProfileSwitch: true,
					},
				},
			},
		},
	}

	switches := 0
	now := time.Unix(1, 0)
	d := &Device{
		DeviceProfile: &DeviceProfile{
			Profile:   "default",
			Keyboards: map[string]*keyboards.Keyboard{"default": keyboard},
		},
		profileSwitchHook: func() { switches++ },
		profileSwitchNow:  func() time.Time { return now },
	}

	report := func(pressed bool) []byte {
		data := make([]byte, 64)
		data[0] = 0x03
		if pressed {
			data[1+70/8] = 1 << (70 % 8)
		}
		return data
	}
	d.processListenerData(report(true))
	d.processListenerData(report(true))
	d.processListenerData(report(false))

	// Some K95 firmware reports briefly clear the profile bit while the key is
	// still held. Treat a sustained stream of those edges as one press.
	for range 200 {
		now = now.Add(10 * time.Millisecond)
		d.processListenerData(report(true))
		d.processListenerData(report(false))
	}

	if switches != 1 {
		t.Fatalf("profile switch invoked %d times, want 1", switches)
	}

	// A deliberate later press after a stable release must switch normally.
	now = now.Add(profileSwitchDebounce + time.Millisecond)
	d.processListenerData(report(true))
	if switches != 2 {
		t.Fatalf("profile switch invoked %d times after debounce, want 2", switches)
	}
}

func TestNonKeyboardReportDoesNotInvokeProfileSwitch(t *testing.T) {
	switches := 0
	d := &Device{profileSwitchHook: func() { switches++ }}

	report := make([]byte, 64)
	report[0] = 0x0e
	report[1+70/8] = 1 << (70 % 8)
	d.processListenerData(report)

	if switches != 0 {
		t.Fatalf("profile switch invoked %d times for non-keyboard report", switches)
	}
}
