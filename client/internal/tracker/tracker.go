package tracker

import (
	"io"
	"net"
	"sync/atomic"
)

// Tracker keeps global statistics.
type Tracker struct {
	TotalBytesSent     uint64
	TotalBytesReceived uint64
}

// NewTracker creates a new instance.
func NewTracker() *Tracker {
	return &Tracker{}
}

func (t *Tracker) AddSent(n int64) {
	atomic.AddUint64(&t.TotalBytesSent, uint64(n))
}

func (t *Tracker) AddReceived(n int64) {
	atomic.AddUint64(&t.TotalBytesReceived, uint64(n))
}

// TrackedConn wraps a net.Conn to track bytes read and written.
type TrackedConn struct {
	net.Conn
	tracker *Tracker
}

func NewTrackedConn(conn net.Conn, tracker *Tracker) *TrackedConn {
	return &TrackedConn{
		Conn:    conn,
		tracker: tracker,
	}
}

func (c *TrackedConn) Read(b []byte) (int, error) {
	n, err := c.Conn.Read(b)
	if n > 0 && c.tracker != nil {
		c.tracker.AddReceived(int64(n))
	}
	return n, err
}

func (c *TrackedConn) Write(b []byte) (int, error) {
	n, err := c.Conn.Write(b)
	if n > 0 && c.tracker != nil {
		c.tracker.AddSent(int64(n))
	}
	return n, err
}

// TrackedCopy is a helper to copy and track if you just want to track one direction without wrapping the conn.
func TrackedCopy(dst io.Writer, src io.Reader, addFunc func(int64)) (int64, error) {
	n, err := io.Copy(dst, src)
	if n > 0 && addFunc != nil {
		addFunc(n)
	}
	return n, err
}
