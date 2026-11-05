package k95platinum

import "testing"

func TestProfileKeyTargetsClusterWithoutJoiningItsRGBStream(t *testing.T) {
	switches := 0
	device := &Device{
		DeviceProfile: &DeviceProfile{RGBCluster: false, RGBProfile: "gpu-temperature"},
		clusterSwitchHook: func() bool {
			switches++
			return true
		},
	}
	device.rotateDeviceProfile()
	if switches != 1 {
		t.Fatalf("profile key reached cluster %d times, want once", switches)
	}
	if device.DeviceProfile.RGBCluster || device.DeviceProfile.RGBProfile != "gpu-temperature" {
		t.Fatal("using the profile key changed the keyboard RGB configuration")
	}
}

func TestProfileKeyHandlesMissingCluster(t *testing.T) {
	device := &Device{clusterSwitchHook: func() bool { return false }}
	device.rotateDeviceProfile()
}
