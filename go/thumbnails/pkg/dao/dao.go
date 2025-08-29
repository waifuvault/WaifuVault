package dao

import (
	"errors"
	"fmt"
	"os"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"github.com/samber/lo"
	"github.com/waifuvault/WaifuVault/shared/utils"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Dao interface {
	ThumbnailDao
	FileEntryDao
}
type dao struct {
	db          *gorm.DB
	redisClient *redis.Client
}

func NewDao(rdb *redis.Client) (Dao, error) {
	connection, err := getConnection()
	if err != nil {
		return nil, err
	}

	return &dao{
		db:          connection,
		redisClient: rdb,
	}, nil
}

func getConnection() (*gorm.DB, error) {
	dbType := os.Getenv("DATABASE_TYPE")
	if dbType == "" {
		return nil, errors.New("db type must be defined")
	}

	if dbType == "sqlite" {
		sqlitePath := lo.Ternary(utils.DockerMode, "../../main.sqlite", "/app/main.sqlite")
		// check to see if file exists
		_, err := os.Stat(sqlitePath)
		if err != nil {
			return nil, errors.New("sqlite file does not exist")
		}
		open, err := gorm.Open(sqlite.Open(sqlitePath), &gorm.Config{
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
	port := lo.Ternary(utils.DockerMode, os.Getenv("POSTGRES_PORT"), "5432")

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=waifu_vault port=%s sslmode=disable TimeZone=UTC",
		lo.Ternary(utils.DockerMode, "localhost", "postgres"),
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
