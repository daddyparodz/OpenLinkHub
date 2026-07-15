package k95platinum

import (
	"OpenLinkHub/src/keyboards"
	"testing"
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
	d := &Device{
		DeviceProfile: &DeviceProfile{
			Profile:   "default",
			Keyboards: map[string]*keyboards.Keyboard{"default": keyboard},
		},
		profileSwitchHook: func() { switches++ },
	}

	press := make([]byte, 64)
	press[0] = 0x03
	press[1+70/8] = 1 << (70 % 8)
	d.processListenerData(press)
	d.processListenerData(press)

	release := make([]byte, 64)
	release[0] = 0x03
	d.processListenerData(release)

	if switches != 1 {
		t.Fatalf("profile switch invoked %d times, want 1", switches)
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
