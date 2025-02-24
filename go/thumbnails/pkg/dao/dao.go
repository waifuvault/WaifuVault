package dao

import (
	"errors"
	"fmt"
	"github.com/rs/zerolog/log"
	"github.com/samber/lo"
	"github.com/waifuvault/WaifuVault/thumbnails/pkg/utils"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"os"
)

type Dao interface {
	ThumbnailDao
}
type dao struct {
	db *gorm.DB
}

func NewDao() (Dao, error) {
	connection, err := getConnection()
	if err != nil {
		return nil, err
	}

	return &dao{
		db: connection,
	}, nil
}

func getConnection() (*gorm.DB, error) {
	dbType := os.Getenv("DATABASE_TYPE")
	if dbType == "" {
		return nil, errors.New("db type must be defined")
	}

	if dbType == "sqlite" {
		open, err := gorm.Open(sqlite.Open("../../main.sqlite"), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Error),
		})
		if err != nil {
			return nil, err
		}
		log.Info().Msg("connected to sqlite")
		return open, nil
	}

	user := os.Getenv("POSTGRES_USER")
	password := os.Getenv("POSTGRES_PASSWORD")
	port := lo.Ternary(utils.DevMode, os.Getenv("POSTGRES_PORT"), "5432")

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=waifu_vault port=%s sslmode=disable TimeZone=Etc/UTC",
		lo.Ternary(utils.DevMode, "localhost", "postgres"),
		user,
		password,
		port,
	)

	open, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Error),
	})
	if err != nil {
		return nil, err
	}
	log.Info().Msg("connected to postgres")
	return open, nil
}

func (d dao) getDb(tx ...*gorm.DB) *gorm.DB {
	db := d.db
	if len(tx) == 1 {
		db = tx[0]
	}
	return db
}
