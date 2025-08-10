package thumbnail

import (
	"bufio"
	"bytes"
	"fmt"
	"os/exec"
	"strings"

	"github.com/davidbyttow/govips/v2/vips"
	"github.com/rs/zerolog/log"
	"github.com/waifuvault/WaifuVault/shared/utils"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/mod"
)

// fileSupported checks if a file type is supported for thumbnail generation
func fileSupported(file mod.FileEntry, ffmpegFormats []string, imageExtensions []string) bool {
	if utils.IsImage(file.MediaType) {
		for _, ext := range imageExtensions {
			lower := strings.ToLower(file.Extension)
			if lower == "jpg" || strings.ToLower(ext) == lower {
				return true
			}
		}
	} else if utils.IsVideo(file.MediaType) {
		for _, f := range ffmpegFormats {
			if f == file.Extension || file.Extension == "mkv" && f == "matroska" {
				return true
			}
		}
		return false
	}
	return false
}

func isAnimatedImage(extension string) bool {
	return extension == "gif" ||
		extension == "webp" ||
		extension == "heif"
}

func getFfmpegSupportedVideoFormats() ([]string, error) {
	cmd := exec.Command("ffmpeg", "-hide_banner", "-formats")
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to run ffmpeg: %w", err)
	}

	scanner := bufio.NewScanner(bytes.NewReader(out))
	var formats []string
	foundSeparator := false
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		if !foundSeparator {
			if strings.HasPrefix(line, "--") {
				foundSeparator = true
			}
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		aliasField := fields[1]
		aliases := strings.Split(aliasField, ",")
		for _, alias := range aliases {
			alias = strings.TrimSpace(alias)
			if alias != "" {
				formats = append(formats, alias)
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error scanning ffmpeg output: %w", err)
	}
	log.Info().Msgf("loaded %d formats from ffmpeg", len(formats))
	return formats, nil
}

func getSupportedImageFormats() []string {
	var formats []string
	formats = append(formats, "jpg")
	for _, f := range vips.ImageTypes {
		formats = append(formats, f)
	}
	return formats
}
