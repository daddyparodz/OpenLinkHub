package cpro

import (
	"errors"
	"reflect"
	"testing"
)

func TestPrepareSoftwarePortClearsOnlyTargetPort(t *testing.T) {
	for _, port := range []byte{0, 1} {
		var packets [][]byte
		err := prepareSoftwarePort(port, func(op byte, data []byte) ([]byte, error) {
			packets = append(packets, append([]byte{op}, data...))
			return nil, nil
		})
		want := [][]byte{{0x38, port, 0}, {0x34, port}}
		if err != nil || !reflect.DeepEqual(packets, want) {
			t.Fatalf("port %d: packets=%v err=%v", port, packets, err)
		}
	}
}

func TestPrepareSoftwarePortStopsAtFailedCommand(t *testing.T) {
	failure := errors.New("USB failure")
	for failed := 0; failed < 2; failed++ {
		calls := 0
		err := prepareSoftwarePort(0, func(byte, []byte) ([]byte, error) {
			defer func() { calls++ }()
			if calls == failed {
				return nil, failure
			}
			return nil, nil
		})
		if !errors.Is(err, failure) || calls != failed+1 {
			t.Fatalf("failure %d: calls=%d err=%v", failed, calls, err)
		}
	}
}
