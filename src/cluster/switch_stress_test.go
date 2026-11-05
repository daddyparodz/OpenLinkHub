package cluster

import (
	"OpenLinkHub/src/common"
	"OpenLinkHub/src/rgb"
	"bytes"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"testing"
	"time"
)

func TestRapidSwitchesFinishWithEveryControllerOff(t *testing.T) {
	oldPwd := pwd
	pwd = t.TempDir()
	defer func() { pwd = oldPwd }()
	if err := os.MkdirAll(filepath.Join(pwd, "database", "profiles"), 0755); err != nil {
		t.Fatal(err)
	}
	brightness := uint8(37)
	cyan := rgb.Color{Green: 255, Blue: 255, Brightness: 1}
	d := &Device{Serial: "stress", DeviceProfile: &DeviceProfile{RGBProfile: "off", BrightnessSlider: &brightness, SwitchProfiles: []string{"static", "off", "keyboard-white"}}, Rgb: &rgb.RGB{Profiles: map[string]rgb.Profile{"static": {StartColor: cyan, EndColor: cyan}, "off": {}, "keyboard-white": {}}}}
	var framesMu sync.Mutex
	frames := map[int][]byte{}
	for i, n := range []int{10, 10, 10, 10, 96} {
		index := i
		d.AddDeviceController(&common.ClusterController{Serial: strconv.Itoa(i), ChannelId: i, LedChannels: uint32(n), WriteColorEx: func(b []byte, _ int) { framesMu.Lock(); frames[index] = bytes.Clone(b); framesMu.Unlock() }})
	}
	defer func() {
		for i := 0; i < 5; i++ {
			d.RemoveDeviceControllerBySerial(strconv.Itoa(i))
		}
	}()
	var wg sync.WaitGroup
	for worker := 0; worker < 4; worker++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for n := 0; n < 40; n++ {
				d.RotateSwitchProfile()
			}
		}()
	}
	wg.Wait()
	for _, mode := range []string{"off", "keyboard-white"} {
		if d.UpdateRgbProfile(0, mode) != 1 {
			t.Fatal("profile rejected", mode)
		}
		deadline := time.Now().Add(time.Second)
		for {
			framesMu.Lock()
			allBlack := len(frames) == 5
			for i, n := range []int{10, 10, 10, 10, 96} {
				allBlack = allBlack && len(frames[i]) == n*3 && bytes.Equal(frames[i], make([]byte, n*3))
			}
			framesMu.Unlock()
			if allBlack {
				break
			}
			if time.Now().After(deadline) {
				t.Fatal("not every controller received complete black frame", mode)
			}
			time.Sleep(time.Millisecond)
		}
	}
	if *d.DeviceProfile.BrightnessSlider != 37 {
		t.Fatal("profile switch changed brightness")
	}
}
