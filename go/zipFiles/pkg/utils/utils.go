package utils

import (
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog/log"
	"github.com/waifuvault/WaifuVault/pkg/mod"
	"os"
	"path/filepath"
)

const (
	dockerFileDir = "/app/files"
	devFilesDir   = "../../files"
)

func getFileBaseDir() string {
	if _, err := os.Stat(dockerFileDir); err != nil {
		if os.IsNotExist(err) {
			log.Info().Msgf("dev mode detected, using %s as base dir", devFilesDir)
			return devFilesDir
		}
		panic(errors.New("error getting file base dir"))
	}
	log.Info().Msgf("docker mode detected, using %s as base dir", dockerFileDir)
	return dockerFileDir
}

func LoadEnvs() {
	if os.Getenv("BASE_URL") != "" {
		log.Info().Msg("loaded envs for docker")
		return
	}
	env, err := filepath.Abs(".env")
	if err != nil {
		return
	}
	postgresEnv, err := filepath.Abs("postgres.env")
	if err != nil {
		return
	}
	err = godotenv.Load(env, postgresEnv)
	if err != nil {
		panic(err)
	}
	log.Info().Msg("loaded envs for dev")
}

func CreateZipFile(name string) (*os.File, string, error) {
	zipName := fmt.Sprintf("%s_%s.zip", uuid.New(), name)
	zipLocation := BaseUrl + "/" + zipName
	create, err := os.Create(zipLocation)
	if err != nil {
		return nil, "", err
	}
	return create, zipName, nil
}

func GetFileToZip(FileOnDisk mod.ZipFileEntry) (*os.File, error) {
	return os.Open(filepath.Join(BaseUrl, FileOnDisk.FullFileNameOnSystem))
}

var BaseUrl = getFileBaseDir()
