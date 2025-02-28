package utils

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const (
	dockerFileDir = "/app/files"
	devFilesDir   = "../../files"
)

var DevMode = false

func getFileBaseDir() string {
	if _, err := os.Stat(dockerFileDir); err != nil {
		if os.IsNotExist(err) {
			log.Info().Msgf("dev mode detected, using %s as base dir", devFilesDir)
			DevMode = true
			return devFilesDir
		}
		panic(errors.New("error getting file base dir"))
	}
	log.Info().Msgf("docker mode detected, using %s as base dir", dockerFileDir)
	DevMode = false
	return dockerFileDir
}

func LoadEnvs() {
	if os.Getenv("BASE_URL") != "" {
		log.Info().Msg("loaded envs for docker")
		return
	}
	env, err := filepath.Abs("../../.env")
	if err != nil {
		return
	}
	postgresEnv, err := filepath.Abs("../../postgres.env")
	if err != nil {
		return
	}
	err = godotenv.Load(env, postgresEnv)
	if err != nil {
		panic(err)
	}
	log.Info().Msg("loaded envs for dev")
}

func IsImage(mediaType string) bool {
	return strings.HasPrefix(mediaType, "image/")
}

func IsVideo(mediaType string) bool {
	return strings.HasPrefix(mediaType, "video/")
}

func GetFfmpegSupportedVideoFormats() ([]string, error) {
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

var BaseUrl = getFileBaseDir()
