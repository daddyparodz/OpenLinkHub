package cpro

// prepareSoftwarePort clears latched color data before accepting a full software
// frame. Resetting effect groups (0x37) alone does not clear that buffer (0x34).
// The caller holds deviceLock across preparation, color writes, and commit.
func prepareSoftwarePort(port byte, send func(byte, []byte) ([]byte, error)) error {
	for _, command := range []struct {
		op   byte
		data []byte
	}{
		{cmdPortState, []byte{port, 0}},
		{cmdRefresh2, []byte{port}},
	} {
		if _, err := send(command.op, command.data); err != nil {
			return err
		}
	}
	return nil
}
