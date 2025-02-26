//go:build darwin

package ffmpeg

import (
	ff "github.com/go-ffstatic/darwin-amd64"
)

var FfmpegPath = ff.FFmpegPath()
var FfprobePath = ff.FFprobePath()
