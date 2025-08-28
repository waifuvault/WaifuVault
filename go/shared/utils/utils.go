package utils

import (
	"errors"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
)

const (
	dockerFileDir = "/app/files"
	devFilesDir   = "../../files"
)

var DockerMode = false

func getFileBaseDir() string {
	if _, err := os.Stat(dockerFileDir); err != nil {
		if os.IsNotExist(err) {
			log.Info().Msgf("dev mode detected, using %s as base dir", devFilesDir)
			DockerMode = true
			return devFilesDir
		}
		panic(errors.New("error getting file base dir"))
	}
	log.Info().Msgf("docker mode detected, using %s as base dir", dockerFileDir)
	DockerMode = false
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

var FileBaseUrl = getFileBaseDir()
