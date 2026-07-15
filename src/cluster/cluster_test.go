package cluster

import (
	"OpenLinkHub/src/common"
	"OpenLinkHub/src/rgb"
	"bytes"
	"reflect"
	"testing"
)

func testClusterDevice(switchProfiles []string) *Device {
	return &Device{
		DeviceProfile: &DeviceProfile{
			RGBProfile:     "static",
			SwitchProfiles: switchProfiles,
		},
		Rgb: &rgb.RGB{Profiles: map[string]rgb.Profile{
			"static":   {},
			"off":      {},
			"gradient": {},
			"rainbow":  {},
		}},
	}
}

func TestEnsureSwitchProfilesPreservesConfiguredOrder(t *testing.T) {
	want := []string{"off", "static", "gradient"}
	d := testClusterDevice(append([]string(nil), want...))

	if changed := d.ensureSwitchProfiles(); changed {
		t.Fatal("valid switch profile order unexpectedly changed")
	}
	if !reflect.DeepEqual(d.DeviceProfile.SwitchProfiles, want) {
		t.Fatalf("switch profiles = %v, want %v", d.DeviceProfile.SwitchProfiles, want)
	}
}

func TestEnsureSwitchProfilesDefaultsToStaticOff(t *testing.T) {
	d := testClusterDevice(nil)

	if changed := d.ensureSwitchProfiles(); !changed {
		t.Fatal("missing switch profiles were not initialized")
	}
	want := []string{"static", "off"}
	if !reflect.DeepEqual(d.DeviceProfile.SwitchProfiles, want) {
		t.Fatalf("switch profiles = %v, want %v", d.DeviceProfile.SwitchProfiles, want)
	}
}

func TestEnsureSwitchProfilesMigratesLegacyPair(t *testing.T) {
	d := testClusterDevice([]string{"static", "rainbow"})

	if changed := d.ensureSwitchProfiles(); !changed {
		t.Fatal("legacy switch profiles were not migrated")
	}
	want := []string{"static", "off"}
	if !reflect.DeepEqual(d.DeviceProfile.SwitchProfiles, want) {
		t.Fatalf("switch profiles = %v, want %v", d.DeviceProfile.SwitchProfiles, want)
	}
}

func TestDistributeColorsWritesEveryController(t *testing.T) {
	type write struct {
		serial  string
		channel int
		data    []byte
	}
	writes := make(chan write, 3)
	controller := func(serial string, leds uint32, channel int) *common.ClusterController {
		return &common.ClusterController{
			Serial:      serial,
			LedChannels: leds,
			ChannelId:   channel,
			WriteColorEx: func(data []byte, gotChannel int) {
				writes <- write{serial: serial, channel: gotChannel, data: append([]byte(nil), data...)}
			},
		}
	}

	d := &Device{Controllers: []*common.ClusterController{
		controller("k95", 2, 0),
		controller("fans", 1, 1),
		controller("ram", 2, 2),
	}}
	frame := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14}
	d.distributeColors(frame)
	close(writes)

	got := make(map[string]write)
	for item := range writes {
		got[item.serial] = item
	}
	want := map[string]write{
		"k95":  {serial: "k95", channel: 0, data: frame[0:6]},
		"fans": {serial: "fans", channel: 1, data: frame[6:9]},
		"ram":  {serial: "ram", channel: 2, data: frame[9:15]},
	}
	for serial, expected := range want {
		actual, ok := got[serial]
		if !ok {
			t.Fatalf("controller %q received no color data", serial)
		}
		if actual.channel != expected.channel || !bytes.Equal(actual.data, expected.data) {
			t.Fatalf("controller %q write = channel %d data %v, want channel %d data %v", serial, actual.channel, actual.data, expected.channel, expected.data)
		}
	}
}
