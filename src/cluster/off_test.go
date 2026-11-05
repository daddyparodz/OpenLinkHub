package cluster

import (
	"OpenLinkHub/src/rgb"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestSavedOffProfileSurvivesLoadingAndClearsEveryLED(t *testing.T) {
	originalPwd := pwd
	pwd = t.TempDir()
	t.Cleanup(func() { pwd = originalPwd })
	if err := os.MkdirAll(filepath.Join(pwd, "database", "rgb"), 0755); err != nil {
		t.Fatal(err)
	}
	profiles := &rgb.RGB{Profiles: map[string]rgb.Profile{"off": {}}}
	for _, name := range rgbProfileUpgrade {
		profiles.Profiles[name] = rgb.Profile{}
	}
	data, err := json.Marshal(profiles)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(pwd, "database", "rgb", "cluster.json"), data, 0644); err != nil {
		t.Fatal(err)
	}
	brightness := uint8(100)
	device := &Device{
		Serial: "cluster", RGBModes: supportedRGBModes,
		DeviceProfile: &DeviceProfile{RGBProfile: "off", BrightnessSlider: &brightness},
		activeRgb:     rgb.Exit(),
	}
	device.activeRgb.RGBStartColor = &rgb.Color{Brightness: 1}
	device.activeRgb.RGBEndColor = &rgb.Color{Brightness: 1}
	device.loadRgb()
	if device.GetRgbProfile("off") == nil {
		t.Fatal("saved off profile was discarded; cluster cannot send shutdown frames")
	}
	start := time.Now()
	// Six 16-LED fans plus four 10-LED memory modules share this cluster.
	frame := device.generateRgbEffect(136, &start, "off")
	if len(frame) != 136*3 {
		t.Fatalf("off frame contains %d bytes, want %d", len(frame), 136*3)
	}
	for index, value := range frame {
		if value != 0 {
			t.Fatalf("off frame byte %d is %d", index, value)
		}
	}
}

func TestMissingEffectClearsWholeCluster(t *testing.T) {
	d := &Device{Rgb: &rgb.RGB{Profiles: map[string]rgb.Profile{}}}
	start := time.Now()
	frame := d.generateRgbEffect(136, &start, "missing")
	if len(frame) != 136*3 {
		t.Fatalf("fallback frame has %d bytes, want 408", len(frame))
	}
	for _, v := range frame {
		if v != 0 {
			t.Fatal("fallback is not black")
		}
	}
}
