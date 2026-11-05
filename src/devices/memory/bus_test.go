package memory

import (
	"os"
	"path/filepath"
	"testing"
)

func TestStableBusAliasFollowsAdapterRenumbering(t *testing.T) {
	dir := t.TempDir()
	alias := filepath.Join(dir, "i2c-openlinkhub-memory")
	device := &Device{Path: alias}
	for _, number := range []int{2, 7} {
		name := "i2c-2"
		if number == 7 {
			name = "i2c-7"
		}
		target := filepath.Join(dir, name)
		if err := os.WriteFile(target, nil, 0600); err != nil {
			t.Fatal(err)
		}
		if err := os.Symlink(target, alias); err != nil {
			t.Fatal(err)
		}
		if got := device.getI2cSensor(); got != number {
			t.Fatalf("alias resolves to adapter %d; got sensor bus %d", number, got)
		}
		if err := os.Remove(alias); err != nil {
			t.Fatal(err)
		}
	}
}
