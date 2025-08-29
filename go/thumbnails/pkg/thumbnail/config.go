package thumbnail

import (
	"math/rand"
	"sync"
	"time"
)

// Configuration constants
const (
	DefaultWorkerCount    = 4
	DefaultBatchSize      = 50
	DefaultThumbnailWidth = 400
)

// Global variables used throughout the package
var (
	globalRand      = rand.New(rand.NewSource(time.Now().UnixNano()))
	globalRandMu    sync.Mutex
	albumProcessing sync.Map
)

// ProbeData represents the structure returned by ffprobe
type ProbeData struct {
	Format struct {
		Duration string `json:"duration"`
	} `json:"format"`
}

// globalFloat64 returns a random float64 in a thread-safe manner
func globalFloat64() float64 {
	globalRandMu.Lock()
	defer globalRandMu.Unlock()
	return globalRand.Float64()
}
