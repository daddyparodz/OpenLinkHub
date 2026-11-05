package smbus

import (
	"os"
	"testing"
)

func TestForcedInitializationWritesBypassCacheForEveryDIMM(t *testing.T) {
	file, err := os.OpenFile(os.DevNull, os.O_RDWR, 0)
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	previous := cacheData
	cacheData = make(map[cacheKey][]byte)
	t.Cleanup(func() { cacheData = previous })
	black := make([]byte, 32)
	for address := uint8(0x58); address <= 0x5b; address++ {
		cacheData[cacheKey{addr: address, reg: 0x31}] = black
		if err := WriteBlockData(file, address, 0x31, black); err != nil {
			t.Fatalf("cached write to %#x unexpectedly touched hardware: %v", address, err)
		}
		// /dev/null rejects I2C ioctls. An error proves this identical startup
		// packet actually reached the transport rather than the cache shortcut.
		if err := WriteBlockDataForced(file, address, 0x31, black); err == nil {
			t.Fatalf("forced write to %#x was incorrectly skipped by the cache", address)
		}
	}
}
